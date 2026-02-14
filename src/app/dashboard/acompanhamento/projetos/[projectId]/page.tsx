'use client';
import * as React from 'react';
import PageContainer from '@/components/layout/page-container';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { firebaseDb } from '@/lib/firebase/client';
import {
  firestoreDateToDate,
  firestoreDateToInput,
  firestoreDateToLabel,
  firestoreDateToTimestamp,
  inputDateToTimestamp
} from '@/lib/firestore-date';
import type { FirestoreDateValue } from '@/lib/firestore-date';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Combobox,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions
} from '@headlessui/react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import {
  arrayUnion,
  collection,
  doc,
  getDocs,
  getDoc,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  setDoc,
  deleteDoc
} from 'firebase/firestore';
import { format } from 'date-fns';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';

const priorities: Record<string, string> = {
  Alta: 'bg-red-500/10 text-red-700',
  Média: 'bg-amber-500/10 text-amber-700',
  Baixa: 'bg-emerald-500/10 text-emerald-700'
};
const priorityOptions = ['Alta', 'Média', 'Baixa'];
const statusOptions = ['Planejado', 'Em andamento', 'Bloqueado', 'Concluído'];

type Activity = {
  id: string;
  name: string;
  issuedAt: string;
  dueAt: string;
  owner: string;
  ownerId?: string;
  status: string;
  priority: keyof typeof priorities;
  description: string;
  updates?: ActivityUpdate[];
};

type ActivityFirestore = Omit<Activity, 'issuedAt' | 'dueAt'> & {
  issuedAt?: FirestoreDateValue;
  dueAt?: FirestoreDateValue;
};

type ActivityUpdate = {
  id: string;
  author: string;
  authorId?: string;
  note: string;
  time: string;
};
type ProjectInfo = {
  id: string;
  name: string;
  client?: string;
  status?: string;
  start?: string;
  next?: string;
  value?: string;
  manager?: string;
};

type MemberOption = {
  id: string;
  name: string;
  role?: string;
};

type ConflictingTask = {
  title: string;
  due: string;
  source: string;
};

const normalizePriority = (value?: string): Activity['priority'] => {
  if (value === 'Alta' || value === 'Baixa') {
    return value;
  }
  return 'Média';
};

const normalizeActivityForUi = (
  activity: Partial<ActivityFirestore>
): Activity => ({
  id: activity.id ?? '',
  name: activity.name ?? '',
  issuedAt: firestoreDateToLabel(activity.issuedAt),
  dueAt: firestoreDateToLabel(activity.dueAt),
  owner: activity.owner ?? '',
  ownerId: activity.ownerId,
  status: activity.status ?? statusOptions[0],
  priority: normalizePriority(activity.priority),
  description: activity.description ?? '',
  updates: Array.isArray(activity.updates) ? activity.updates : []
});

const formatProjectValue = (value?: string | number) => {
  if (!value) {
    return 'R$ --';
  }
  const stringValue = typeof value === 'number' ? value.toString() : value;
  const trimmed = stringValue.trim();
  if (!trimmed) {
    return 'R$ --';
  }
  const normalized = trimmed.replace(/[^0-9.,]/g, '');
  if (!normalized) {
    return 'R$ --';
  }
  const numericValue = normalized.includes(',')
    ? Number.parseFloat(normalized.replace(/\./g, '').replace(',', '.'))
    : Number.parseFloat(normalized);
  if (Number.isNaN(numericValue)) {
    return 'R$ --';
  }
  return (
    'R$ ' +
    new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(numericValue)
  );
};

export default function ProjetoPage() {
  const params = useParams();
  const projectId = Array.isArray(params.projectId)
    ? params.projectId[0]
    : params.projectId;
  const [activityList, setActivityList] = React.useState<Activity[]>([]);
  const [selectedId, setSelectedId] = React.useState('');
  const [projectInfo, setProjectInfo] = React.useState<ProjectInfo>({
    id: '',
    name: 'Projeto',
    client: '',
    status: '',
    start: '',
    next: '',
    value: '',
    manager: ''
  });
  const [isSavingActivity, setIsSavingActivity] = React.useState(false);
  const [isDeletingActivity, setIsDeletingActivity] = React.useState(false);
  const [isDeletingActivityOpen, setIsDeletingActivityOpen] =
    React.useState(false);
  const [memberOptions, setMemberOptions] = React.useState<MemberOption[]>([]);
  const [isMembersLoading, setIsMembersLoading] = React.useState(false);
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [isSavingEdit, setIsSavingEdit] = React.useState(false);

  const [newActivity, setNewActivity] = React.useState({
    name: '',
    description: '',
    dueDate: '',
    owner: '',
    ownerId: '',
    status: statusOptions[1],
    priority: priorityOptions[1]
  });
  const [conflictWarning, setConflictWarning] = React.useState<{
    show: boolean;
    message: string;
    tasksCount: number;
    tasks: ConflictingTask[];
  }>({ show: false, message: '', tasksCount: 0, tasks: [] });
  const [pendingActivity, setPendingActivity] =
    React.useState<ActivityFirestore | null>(null);
  const [editActivity, setEditActivity] = React.useState({
    name: '',
    description: '',
    dueDate: '',
    owner: '',
    ownerId: '',
    status: statusOptions[1],
    priority: priorityOptions[1]
  });

  React.useEffect(() => {
    if (!firebaseDb) {
      return;
    }

    let isActive = true;
    const loadMembers = async () => {
      if (!firebaseDb) {
        console.error('Firebase não inicializado');
        setIsMembersLoading(false);
        return;
      }

      setIsMembersLoading(true);
      try {
        const snapshot = await getDocs(
          query(collection(firebaseDb, 'members'), orderBy('name', 'asc'))
        );
        if (!isActive) {
          return;
        }

        setMemberOptions(
          snapshot.docs.map((docSnapshot) => {
            const data = docSnapshot.data() as Partial<MemberOption>;
            return {
              id: docSnapshot.id,
              name: data.name ?? 'Sem nome',
              role: data.role
            };
          })
        );
      } catch (error) {
        console.error('Falha ao carregar membros:', error);
        toast.error('Não foi possível carregar membros.');
      } finally {
        if (isActive) {
          setIsMembersLoading(false);
        }
      }
    };

    loadMembers();

    return () => {
      isActive = false;
    };
  }, []);

  React.useEffect(() => {
    let isActive = true;

    const loadActivities = async () => {
      try {
        if (!projectId) {
          toast.error('Projeto nao encontrado.');
          return;
        }

        if (!firebaseDb) {
          toast.error('Firebase não inicializado');
          return;
        }

        const projectRef = doc(firebaseDb, 'projects', projectId);
        const projectSnapshot = await getDoc(projectRef);

        const activitiesRef = collection(
          firebaseDb,
          'projects',
          projectId,
          'activities'
        );
        const snapshot = await getDocs(activitiesRef);

        if (!isActive) return;

        const projectData = projectSnapshot.data();

        const startLabel =
          projectData?.start instanceof Timestamp
            ? format(projectData.start.toDate(), 'dd/MM/yyyy')
            : '';

        setProjectInfo({
          id: projectSnapshot.id,
          name: projectData?.name ?? 'Projeto',
          client: projectData?.client,
          status: projectData?.status,
          start: startLabel,
          next: projectData?.next,
          value: projectData?.value,
          manager: projectData?.manager
        });

        // ✅ atividades vêm da subcoleção
        const activities = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any)
        }));

        setActivityList(activities.map(normalizeActivityForUi));
      } catch (error) {
        console.error('Falha ao carregar atividades:', error);
        toast.error('Não foi possível carregar atividades.');
      }
    };

    loadActivities();
    return () => {
      isActive = false;
    };
  }, [firebaseDb, projectId]);

  React.useEffect(() => {
    if (activityList.length === 0) {
      return;
    }

    const exists = activityList.some((activity) => activity.id === selectedId);
    if (!exists) {
      setSelectedId(activityList[0].id);
    }
  }, [activityList, selectedId]);

  const selectedActivity =
    activityList.find((activity) => activity.id === selectedId) ??
    activityList[0];
  const activityUpdates = selectedActivity?.updates ?? [];
  const filteredMembers = memberOptions.filter((member) =>
    member.name.toLowerCase().includes(newActivity.owner.toLowerCase().trim())
  );
  const filteredEditMembers = memberOptions.filter((member) =>
    member.name.toLowerCase().includes(editActivity.owner.toLowerCase().trim())
  );

  const checkMemberConflicts = async (
    ownerId: string,
    dueDate: string
  ): Promise<{
    hasConflict: boolean;
    message: string;
    tasksCount: number;
    tasks: ConflictingTask[];
  }> => {
    if (!firebaseDb || !ownerId || !dueDate) {
      return { hasConflict: false, message: '', tasksCount: 0, tasks: [] };
    }

    try {
      const dueDateTime = firestoreDateToDate(dueDate);
      if (!dueDateTime) {
        return { hasConflict: false, message: '', tasksCount: 0, tasks: [] };
      }

      const now = new Date();
      const next7Days = new Date(now);
      next7Days.setDate(now.getDate() + 7);

      const dueMinus3 = new Date(dueDateTime);
      dueMinus3.setDate(dueDateTime.getDate() - 3);
      const duePlus3 = new Date(dueDateTime);
      duePlus3.setDate(dueDateTime.getDate() + 3);

      // Carregar tarefas da agenda do membro
      const memberDoc = await getDoc(doc(firebaseDb, 'members', ownerId));
      const agendaTasks: Array<{ title: string; due: string; source: string }> =
        [];
      if (memberDoc.exists()) {
        const memberData = memberDoc.data() as {
          agendaTasks?: Array<{ title: string; due: string }>;
        };
        if (Array.isArray(memberData.agendaTasks)) {
          agendaTasks.push(
            ...memberData.agendaTasks.map((task) => ({
              title: task.title,
              due: task.due,
              source: 'Agenda pessoal'
            }))
          );
        }
      }

      // Carregar tarefas de projetos
      const projectsSnapshot = await getDocs(
        collection(firebaseDb, 'projects')
      );
      const projectTasks: Array<{
        title: string;
        due: string;
        source: string;
      }> = [];
      projectsSnapshot.docs.forEach((docSnapshot) => {
        const data = docSnapshot.data() as {
          name?: string;
          Activities?: Array<{
            ownerId?: string;
            name?: string;
            dueAt?: FirestoreDateValue;
          }>;
        };
        if (Array.isArray(data.Activities)) {
          data.Activities.forEach((activity) => {
            const dueLabel = firestoreDateToLabel(activity.dueAt);
            if (activity.ownerId === ownerId && dueLabel) {
              projectTasks.push({
                title: activity.name || 'Tarefa',
                due: dueLabel,
                source: `Projeto: ${data.name || 'Sem nome'}`
              });
            }
          });
        }
      });

      const allTasks = [...agendaTasks, ...projectTasks];
      const tasksNext7Days: ConflictingTask[] = [];
      const tasksNearDueDate: ConflictingTask[] = [];
      const allConflictingTasks: ConflictingTask[] = [];

      allTasks.forEach((task) => {
        const taskDate = firestoreDateToDate(task.due);
        if (!taskDate) return;

        const isNext7Days = taskDate >= now && taskDate <= next7Days;
        const isNearDueDate = taskDate >= dueMinus3 && taskDate <= duePlus3;

        if (isNext7Days || isNearDueDate) {
          const conflictTask: ConflictingTask = {
            title: task.title,
            due: task.due,
            source: task.source
          };
          allConflictingTasks.push(conflictTask);

          if (isNext7Days) tasksNext7Days.push(conflictTask);
          if (isNearDueDate) tasksNearDueDate.push(conflictTask);
        }
      });

      const totalConflicts = allConflictingTasks.length;

      if (totalConflicts > 0) {
        let message = '';

        if (tasksNext7Days.length > 0 && tasksNearDueDate.length > 0) {
          message = `O responsável possui ${tasksNext7Days.length} tarefa(s) nos próximos 7 dias e ${tasksNearDueDate.length} tarefa(s) próximas ao prazo desta atividade (±3 dias).`;
        } else if (tasksNext7Days.length > 0) {
          message = `O responsável possui ${tasksNext7Days.length} tarefa(s) nos próximos 7 dias.`;
        } else {
          message = `O responsável possui ${tasksNearDueDate.length} tarefa(s) próximas ao prazo desta atividade (±3 dias).`;
        }

        return {
          hasConflict: true,
          message,
          tasksCount: totalConflicts,
          tasks: allConflictingTasks
        };
      }

      return { hasConflict: false, message: '', tasksCount: 0, tasks: [] };
    } catch (error) {
      console.error('Erro ao verificar conflitos:', error);
      return { hasConflict: false, message: '', tasksCount: 0, tasks: [] };
    }
  };

  const handleDeleteActivity = async (
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    if (!projectId) {
      toast.error('Projeto nao encontrado.');
      return;
    }

    if (!firebaseDb) {
      toast.error('Firebase nao configurado.');
      return;
    }

    setIsDeletingActivity(true);

    try {
      const activityRef = doc(
        firebaseDb,
        'projects',
        projectId,
        'activities',
        selectedActivity.id
      );

      await deleteDoc(activityRef);

      setActivityList(
        activityList.filter((activity) => activity.id !== selectedActivity.id)
      );
      setIsDeletingActivityOpen(false);
      toast.success('Atividade deletada.');
    } catch (error) {
      console.error('Erro ao deletar atividade:', error);
      toast.error('Não foi possível deletar a atividade.');
    }
  };

  const handleCreateActivity = async () => {
    if (!newActivity.name.trim()) {
      toast.error('Informe o nome da atividade.');
      return;
    }
    if (!newActivity.owner.trim()) {
      toast.error('Informe o responsável.');
      return;
    }
    if (!projectId) {
      toast.error('Projeto nao encontrado.');
      return;
    }
    if (!firebaseDb) {
      toast.error('Firebase nao configurado.');
      return;
    }

    const activityId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `activity-${Date.now()}`;
    const activityPayload: ActivityFirestore = {
      id: activityId,
      name: newActivity.name.trim(),
      issuedAt: Timestamp.now(),
      dueAt: inputDateToTimestamp(newActivity.dueDate),
      owner: newActivity.owner.trim(),
      ownerId: newActivity.ownerId || undefined,
      status: newActivity.status,
      priority: newActivity.priority as Activity['priority'],
      description: newActivity.description.trim(),
      updates: []
    };

    // Verificar conflitos se tiver ownerId
    if (newActivity.ownerId && newActivity.dueDate) {
      const conflict = await checkMemberConflicts(
        newActivity.ownerId,
        newActivity.dueDate
      );
      if (conflict.hasConflict) {
        setPendingActivity(activityPayload);
        setConflictWarning({
          show: true,
          message: conflict.message,
          tasksCount: conflict.tasksCount,
          tasks: conflict.tasks
        });
        return;
      }
    }

    await saveActivity(activityPayload);
  };

  const saveActivity = async (activityPayload: ActivityFirestore) => {
    if (!projectId || !firebaseDb) return;

    setIsSavingActivity(true);
    try {
      const activitiesRef = doc(
        firebaseDb,
        'projects',
        projectId,
        'activities',
        activityPayload.id
      );
      await setDoc(activitiesRef, activityPayload);
      setActivityList((current) => [
        normalizeActivityForUi(activityPayload),
        ...current
      ]);
      setSelectedId(activityPayload.id);
      setNewActivity({
        name: '',
        description: '',
        dueDate: '',
        owner: '',
        ownerId: '',
        status: statusOptions[1],
        priority: priorityOptions[1]
      });
      toast.success('Atividade adicionada.');
    } catch (error) {
      console.error('Falha ao salvar atividade:', error);
      toast.error('Não foi possível salvar a atividade.');
    } finally {
      setIsSavingActivity(false);
    }
  };

  const handleConfirmWithConflict = async () => {
    if (!pendingActivity) return;

    setConflictWarning({ show: false, message: '', tasksCount: 0, tasks: [] });
    await saveActivity(pendingActivity);
    setPendingActivity(null);
  };

  const handleCancelConflict = () => {
    setConflictWarning({ show: false, message: '', tasksCount: 0, tasks: [] });
    setPendingActivity(null);
  };

  const handleEditOpen = () => {
    if (!selectedActivity) {
      return;
    }

    setEditActivity({
      name: selectedActivity.name,
      description: selectedActivity.description,
      dueDate: firestoreDateToInput(selectedActivity.dueAt),
      owner: selectedActivity.owner,
      ownerId: selectedActivity.ownerId ?? '',
      status: selectedActivity.status ?? statusOptions[1],
      priority: selectedActivity.priority
    });
    setIsEditOpen(true);
  };

  const handleUpdateActivity = async () => {
    if (!selectedActivity) {
      return;
    }
    if (!editActivity.name.trim()) {
      toast.error('Informe o nome da atividade.');
      return;
    }
    if (!editActivity.owner.trim()) {
      toast.error('Informe o responsável.');
      return;
    }
    if (!projectId) {
      toast.error('Projeto nao encontrado.');
      return;
    }
    if (!firebaseDb) {
      toast.error('Firebase nao configurado.');
      return;
    }

    setIsSavingEdit(true);
    try {
      const activityRef = doc(
        firebaseDb,
        'projects',
        projectId,
        'activities',
        selectedActivity.id
      );
      const snapshot = await getDoc(activityRef);
      if (!snapshot.exists()) {
        toast.error('Projeto nao encontrado.');
        return;
      }

      const currentData = snapshot.data() as {
        Activities?: ActivityFirestore[];
      };

      await updateDoc(activityRef, {
        name: editActivity.name.trim(),
        description: editActivity.description.trim(),
        dueAt: inputDateToTimestamp(editActivity.dueDate),
        owner: editActivity.owner.trim(),
        ownerId: editActivity.ownerId || undefined,
        status: editActivity.status,
        priority: editActivity.priority as Activity['priority'],
        updatedAt: serverTimestamp()
      });
      setActivityList((current) =>
        current.map((activity) =>
          activity.id === selectedActivity.id
            ? {
                ...activity,
                name: editActivity.name.trim(),
                description: editActivity.description.trim(),
                dueAt: firestoreDateToLabel(
                  inputDateToTimestamp(editActivity.dueDate)
                ),
                owner: editActivity.owner.trim(),
                ownerId: editActivity.ownerId || undefined,
                status: editActivity.status,
                priority: editActivity.priority as Activity['priority']
              }
            : activity
        )
      );
      setIsEditOpen(false);
      toast.success('Atividade atualizada.');
    } catch (error) {
      console.error('Falha ao atualizar atividade:', error);
      toast.error('Não foi possível atualizar a atividade.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  return (
    <PageContainer
      pageTitle={projectInfo.name}
      pageDescription={
        projectInfo.manager ? `Gerente: ${projectInfo.manager}` : ''
      }
      pageHeaderAction={
        <span className='text-foreground text-3xl font-semibold'>
          {formatProjectValue(projectInfo.value)}
        </span>
      }
    >
      <Dialog
        open={isDeletingActivityOpen}
        onOpenChange={setIsDeletingActivityOpen}
      >
        <DialogContent className='max-w-[95vw] sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Excluir atividade</DialogTitle>
            <DialogDescription>
              Esta ação não pode ser desfeita. Deseja excluir{' '}
              <span className='font-medium'>
                {selectedActivity?.name || 'esta atividade'}
              </span>
              ?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className='gap-2 sm:gap-2'>
            <Button
              type='button'
              variant='secondary'
              onClick={() => setIsDeletingActivityOpen(false)}
              disabled={isDeletingActivity}
            >
              Cancelar
            </Button>
            <Button
              type='button'
              variant='destructive'
              onClick={handleDeleteActivity}
              disabled={isDeletingActivity}
            >
              {isDeletingActivity ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <div className='flex flex-1 flex-col space-y-4'>
        <div className='*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:shadow-xs lg:grid-cols-2'>
          <Card className='h-full'>
            <CardHeader>
              <CardTitle>Atividades</CardTitle>
              <CardDescription>Selecione para ver detalhes</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className='h-56 pr-3'>
                <div className='space-y-2'>
                  {activityList.length === 0 ? (
                    <div className='text-muted-foreground text-sm'>
                      Nenhuma atividade registrada.
                    </div>
                  ) : (
                    activityList.map((activity) => (
                      <button
                        key={activity.id}
                        type='button'
                        onClick={() => setSelectedId(activity.id)}
                        className='hover:bg-accent focus-visible:ring-ring/50 flex w-full items-start justify-between gap-3 rounded-md border p-3 text-left transition-colors focus-visible:ring-[3px] focus-visible:outline-none'
                      >
                        <div className='flex flex-col'>
                          <span className='text-sm font-medium'>
                            {activity.name}
                          </span>
                          <span className='text-muted-foreground text-xs'>
                            Emissão {activity.issuedAt} - Prazo {activity.dueAt}
                          </span>
                          <span className='text-muted-foreground text-xs'>
                            Responsável {activity.owner}
                          </span>
                        </div>
                        <Badge className={priorities[activity.priority]}>
                          {activity.priority}
                        </Badge>
                      </button>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className='h-full lg:col-start-1 lg:row-start-2'>
            <CardHeader>
              <CardTitle>Nova atividade</CardTitle>
              <CardDescription>Registrar novo item</CardDescription>
            </CardHeader>
            <CardContent className='space-y-3'>
              <div className='grid grid-cols-1 gap-2'>
                <div className='space-y-1'>
                  <label className='text-sm font-medium' htmlFor='activityName'>
                    Nome da atividade
                  </label>
                  <Input
                    id='activityName'
                    placeholder='Ex: Alinhamento com o time'
                    value={newActivity.name}
                    disabled={isSavingActivity}
                    onChange={(event) =>
                      setNewActivity((current) => ({
                        ...current,
                        name: event.target.value
                      }))
                    }
                  />
                </div>
                <div className='space-y-1'>
                  <label className='text-sm font-medium' htmlFor='activityDesc'>
                    Descrição
                  </label>
                  <Textarea
                    id='activityDesc'
                    placeholder='Detalhes da atividade'
                    className='min-h-16'
                    value={newActivity.description}
                    disabled={isSavingActivity}
                    onChange={(event) =>
                      setNewActivity((current) => ({
                        ...current,
                        description: event.target.value
                      }))
                    }
                  />
                </div>
                <div className='grid grid-cols-1 gap-2 sm:grid-cols-2'>
                  <div className='space-y-1'>
                    <label
                      className='text-sm font-medium'
                      htmlFor='activityDue'
                    >
                      Prazo
                    </label>
                    <Input
                      id='activityDue'
                      type='date'
                      value={newActivity.dueDate}
                      disabled={isSavingActivity}
                      onChange={(event) =>
                        setNewActivity((current) => ({
                          ...current,
                          dueDate: event.target.value
                        }))
                      }
                    />
                  </div>
                  <div className='space-y-1'>
                    <label className='text-sm font-medium'>Responsável</label>
                    <div className='relative'>
                      <Combobox
                        as='div'
                        value={newActivity.owner}
                        onChange={(value: any) => {
                          // value can be the object if selected from list, or string if typed (though strictly Combobox returns the value prop of Option)
                          // Headless UI Combobox value is controlled.
                          // Actually, for custom input handling + selection, we usually rely on onChange providing the 'value' prop of the Option.
                          const member =
                            typeof value === 'string'
                              ? memberOptions.find((m) => m.name === value)
                              : value;

                          if (member) {
                            setNewActivity((current) => ({
                              ...current,
                              owner: member.name,
                              ownerId: member.id
                            }));
                          }
                        }}
                      >
                        <div className='relative'>
                          <ComboboxInput
                            className='border-input placeholder:text-muted-foreground focus-visible:ring-ring flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-1 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm'
                            onChange={(event) => {
                              const value = event.target.value;
                              setNewActivity((current) => ({
                                ...current,
                                owner: value
                              }));
                              if (!value) {
                                setNewActivity((current) => ({
                                  ...current,
                                  ownerId: ''
                                }));
                              }
                            }}
                            placeholder='Digite ou selecione'
                          />
                        </div>
                        <ComboboxOptions
                          anchor='bottom start'
                          className='bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-[var(--input-width)] min-w-[8rem] overflow-hidden rounded-md border p-1 shadow-md'
                        >
                          {isMembersLoading ? (
                            <div className='text-muted-foreground px-2 py-2 text-sm'>
                              Carregando membros...
                            </div>
                          ) : filteredMembers.length === 0 ? (
                            <div className='text-muted-foreground px-2 py-2 text-sm'>
                              Nenhum membro encontrado.
                            </div>
                          ) : (
                            <ScrollArea className='max-h-48'>
                              <div className='flex flex-col gap-1'>
                                {filteredMembers.map((member) => (
                                  <ComboboxOption
                                    key={member.id}
                                    value={member.name}
                                    className='group data-focus:bg-accent data-focus:text-accent-foreground hover:bg-accent hover:text-accent-foreground relative flex cursor-default items-center rounded-sm px-2 py-1.5 text-sm outline-none select-none'
                                  >
                                    <div className='group-hover:text-accent-foreground flex flex-col'>
                                      <span className='font-medium'>
                                        {member.name}
                                      </span>
                                      {member.role ? (
                                        <span className='text-muted-foreground text-xs'>
                                          {member.role}
                                        </span>
                                      ) : null}
                                    </div>
                                  </ComboboxOption>
                                ))}
                              </div>
                            </ScrollArea>
                          )}
                        </ComboboxOptions>
                      </Combobox>
                    </div>
                  </div>
                </div>
                <div className='grid grid-cols-1 gap-2 sm:grid-cols-2'>
                  <div className='space-y-1'>
                    <label className='text-sm font-medium'>Prioridade</label>
                    <Select
                      value={newActivity.priority}
                      disabled={isSavingActivity}
                      onValueChange={(value) =>
                        setNewActivity((current) => ({
                          ...current,
                          priority: value
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder='Prioridade' />
                      </SelectTrigger>
                      <SelectContent>
                        {priorityOptions.map((priority) => (
                          <SelectItem key={priority} value={priority}>
                            {priority}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className='flex items-end'>
                    <Button
                      type='button'
                      className='w-full'
                      onClick={handleCreateActivity}
                      disabled={isSavingActivity}
                    >
                      {isSavingActivity ? 'Salvando...' : 'Adicionar atividade'}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className='h-full lg:col-start-2 lg:row-span-2'>
            <CardHeader>
              <CardTitle>
                {selectedActivity?.name ?? 'Sem atividade selecionada'}
              </CardTitle>
              <CardDescription>
                {selectedActivity?.owner
                  ? `Responsável: ${selectedActivity.owner}`
                  : 'Selecione uma atividade para ver os detalhes.'}
              </CardDescription>
              <CardAction>
                <div className='flex items-center gap-2'>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={handleEditOpen}
                    disabled={!selectedActivity}
                  >
                    Editar atividade
                  </Button>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={setIsDeletingActivityOpen.bind(null, true)}
                    disabled={!selectedActivity || isDeletingActivity}
                  >
                    Excluir Atividade
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant='outline' size='sm'>
                        Info do projeto
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align='end'>
                      <DropdownMenuLabel>
                        Informações do projeto
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>
                        Nome: {projectInfo.name}
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        Cliente: {projectInfo.client || '--'}
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        Status: {projectInfo.status || '--'}
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        Início: {projectInfo.start || '--'}
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        Próximo: {projectInfo.next || '--'}
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        Valor: {formatProjectValue(projectInfo.value)}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardAction>
            </CardHeader>
            <CardContent className='space-y-2 text-sm'>
              <div className='grid grid-cols-1 gap-2 sm:grid-cols-2'>
                <div className='rounded-md border p-3'>
                  <div className='text-muted-foreground text-xs'>Prazo</div>
                  <div className='mt-1 font-medium'>
                    {selectedActivity?.dueAt ?? '--'}
                  </div>
                </div>
                <div className='rounded-md border p-3'>
                  <div className='text-muted-foreground text-xs'>
                    Prioridade
                  </div>
                  {selectedActivity ? (
                    <Badge className={priorities[selectedActivity.priority]}>
                      {selectedActivity.priority}
                    </Badge>
                  ) : (
                    <span className='text-muted-foreground text-xs'>--</span>
                  )}
                </div>
              </div>
              <div className='rounded-md border p-3'>
                <div className='text-muted-foreground text-xs'>Status</div>
                <div className='mt-1 font-medium'>
                  {selectedActivity?.status ?? '--'}
                </div>
              </div>
              <div className='rounded-md border p-3'>
                <div className='text-muted-foreground text-xs'>Descrição</div>
                <p className='mt-1'>{selectedActivity?.description ?? '---'}</p>
              </div>
              <div className='rounded-md border p-3'>
                <div className='text-muted-foreground text-xs'>
                  Atualizações
                </div>
                <ScrollArea className='mt-2 h-40 pr-2'>
                  <div className='space-y-2'>
                    {activityUpdates.length === 0 ? (
                      <div className='text-muted-foreground text-xs'>
                        Sem atualizações.
                      </div>
                    ) : (
                      activityUpdates.map((update) => (
                        <div
                          key={update.id}
                          className='space-y-2 rounded-md border p-3'
                        >
                          <div className='flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between'>
                            <div className='text-sm font-medium'>
                              {update.author}
                            </div>
                            <div className='text-muted-foreground text-xs'>
                              {update.time}
                            </div>
                          </div>
                          <div className='text-muted-foreground text-sm'>
                            {update.note}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar atividade</DialogTitle>
            <DialogDescription>
              Atualize as informações da atividade selecionada.
            </DialogDescription>
          </DialogHeader>
          <div className='grid gap-3'>
            <Input
              placeholder='Nome da atividade'
              value={editActivity.name}
              disabled={isSavingEdit}
              onChange={(event) =>
                setEditActivity((current) => ({
                  ...current,
                  name: event.target.value
                }))
              }
            />
            <Textarea
              placeholder='Descrição'
              className='min-h-20'
              value={editActivity.description}
              disabled={isSavingEdit}
              onChange={(event) =>
                setEditActivity((current) => ({
                  ...current,
                  description: event.target.value
                }))
              }
            />
            <div className='grid gap-2 sm:grid-cols-2'>
              <Input
                type='date'
                value={editActivity.dueDate}
                disabled={isSavingEdit}
                onChange={(event) =>
                  setEditActivity((current) => ({
                    ...current,
                    dueDate: event.target.value
                  }))
                }
              />
              <div className='relative'>
                <Combobox
                  as='div'
                  value={editActivity.owner}
                  onChange={(value: string | null) => {
                    if (!value) return;
                    const member = memberOptions.find((m) => m.name === value);

                    if (member) {
                      setEditActivity((current) => ({
                        ...current,
                        owner: member.name,
                        ownerId: member.id
                      }));
                    }
                  }}
                >
                  <div className='relative'>
                    <ComboboxInput
                      className='border-input placeholder:text-muted-foreground focus-visible:ring-ring flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-1 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm'
                      onChange={(event) => {
                        const value = event.target.value;
                        setEditActivity((current) => ({
                          ...current,
                          owner: value
                        }));
                        if (!value) {
                          setEditActivity((current) => ({
                            ...current,
                            ownerId: ''
                          }));
                        }
                      }}
                      placeholder='Responsável'
                    />
                  </div>
                  <ComboboxOptions
                    portal={false}
                    className='bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 absolute top-full left-0 z-50 mt-1 w-full min-w-[8rem] overflow-hidden rounded-md border p-1 shadow-md'
                  >
                    {isMembersLoading ? (
                      <div className='text-muted-foreground px-2 py-2 text-sm'>
                        Carregando membros...
                      </div>
                    ) : filteredEditMembers.length === 0 ? (
                      <div className='text-muted-foreground px-2 py-2 text-sm'>
                        Nenhum membro encontrado.
                      </div>
                    ) : (
                      <ScrollArea className='max-h-48'>
                        <div className='flex flex-col gap-1'>
                          {filteredEditMembers.map((member) => (
                            <ComboboxOption
                              key={member.id}
                              value={member.name}
                              className='group data-[focus]:bg-accent data-[focus]:text-accent-foreground hover:bg-accent hover:text-accent-foreground relative flex cursor-default items-center rounded-sm px-2 py-1.5 text-sm outline-none select-none'
                            >
                              <div className='group-hover:text-accent-foreground flex flex-col'>
                                <span className='font-medium'>
                                  {member.name}
                                </span>
                                {member.role ? (
                                  <span className='text-muted-foreground text-xs'>
                                    {member.role}
                                  </span>
                                ) : null}
                              </div>
                            </ComboboxOption>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </ComboboxOptions>
                </Combobox>
              </div>
            </div>
            <Select
              value={editActivity.priority}
              disabled={isSavingEdit}
              onValueChange={(value) =>
                setEditActivity((current) => ({
                  ...current,
                  priority: value
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder='Prioridade' />
              </SelectTrigger>
              <SelectContent>
                {priorityOptions.map((priority) => (
                  <SelectItem key={priority} value={priority}>
                    {priority}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={editActivity.status}
              disabled={isSavingEdit}
              onValueChange={(value) =>
                setEditActivity((current) => ({
                  ...current,
                  status: value
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder='Status' />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={() => setIsEditOpen(false)}
              disabled={isSavingEdit}
            >
              Cancelar
            </Button>
            <Button
              type='button'
              onClick={handleUpdateActivity}
              disabled={isSavingEdit}
            >
              {isSavingEdit ? 'Salvando...' : 'Salvar alterações'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação de conflito */}
      <Dialog
        open={conflictWarning.show}
        onOpenChange={(open) => !open && handleCancelConflict()}
      >
        <DialogContent className='max-w-2xl'>
          <DialogHeader>
            <DialogTitle>Aviso: Responsável com tarefas próximas</DialogTitle>
            <DialogDescription>{conflictWarning.message}</DialogDescription>
          </DialogHeader>
          <div className='py-4'>
            <div className='mb-4'>
              <p className='mb-2 text-sm font-medium'>Tarefas conflitantes:</p>
              <ScrollArea className='h-48 rounded-md border'>
                <div className='space-y-2 p-3'>
                  {conflictWarning.tasks.map((task, index) => (
                    <div key={index} className='rounded-md border p-3 text-sm'>
                      <div className='font-medium'>{task.title}</div>
                      <div className='text-muted-foreground mt-1 text-xs'>
                        Prazo: {task.due}
                      </div>
                      <div className='text-muted-foreground text-xs'>
                        {task.source}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
            <p className='text-muted-foreground text-sm'>
              Deseja continuar e criar esta atividade mesmo assim?
            </p>
          </div>
          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={handleCancelConflict}
            >
              Cancelar
            </Button>
            <Button
              type='button'
              onClick={handleConfirmWithConflict}
              disabled={isSavingActivity}
            >
              {isSavingActivity ? 'Salvando...' : 'Confirmar e criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
