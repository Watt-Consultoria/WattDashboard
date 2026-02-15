'use client';
import * as React from 'react';
import PageContainer from '@/components/layout/page-container';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPenToSquare } from '@fortawesome/free-regular-svg-icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverAnchor,
  PopoverContent
} from '@/components/ui/popover';
import {
  Card,
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
import { Calendar } from '@/components/ui/calendar';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where
} from 'firebase/firestore';
import { format } from 'date-fns';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import useMetadata from '@/hooks/use-metadata';

type MemberTask = {
  id: string;
  activityId?: string;
  projectId?: string;
  projectName?: string;
  source?: 'project' | 'agenda';
  title: string;
  due: string;
  status: string;
  priority: string;
  owner?: string;
  ownerId?: string;
  description?: string;
  updates?: ActivityUpdate[];
};

type ActivityUpdate = {
  id: string;
  author: string;
  authorId?: string;
  note: string;
  time: string;
};

type MemberAlert = {
  id: string;
  title: string;
  detail: string;
  level: string;
  time: string;
};

type MemberInfo = {
  name: string;
  email: string;
  sector: string;
  cpf: string;
  role: string;
};

const priorityStyles: Record<string, string> = {
  Alta: 'bg-red-500/10 text-red-700',
  Media: 'bg-amber-500/10 text-amber-700',
  Baixa: 'bg-emerald-500/10 text-emerald-700'
};
const priorityOptions = ['Alta', 'Media', 'Baixa'];

const statusStyles: Record<string, string> = {
  'Em andamento': 'bg-primary/10 text-primary',
  Planejado: 'bg-muted text-muted-foreground',
  Bloqueado: 'bg-red-500/10 text-red-700',
  Concluido: 'bg-emerald-500/10 text-emerald-700'
};
const statusOptions = ['Planejado', 'Em andamento', 'Bloqueado', 'Concluido'];
const roleOptions = [
  'Consultor',
  'Gerente',
  'Diretor',
  'Assessor',
  'Presidente'
];
const sectorOptions = [
  'Automação',
  'Elétrica',
  'Comercial',
  'Institucional',
  'Marketing',
  'Executivo'
];

type MemberOption = {
  id: string;
  name: string;
  role?: string;
};
const priorityRank: Record<string, number> = {
  Alta: 3,
  Media: 2,
  Baixa: 1
};

const alerts: MemberAlert[] = [
  {
    id: 'alert-1',
    title: 'Entrega próxima',
    detail: 'Revisar protótipos até sexta-feira',
    level: 'alto',
    time: 'há 2 horas'
  },
  {
    id: 'alert-2',
    title: 'Pendência de aprovação',
    detail: 'Feedback do cliente pendente',
    level: 'médio',
    time: 'há 5 horas'
  },
  {
    id: 'alert-3',
    title: 'Reunião marcada',
    detail: 'Daily com engenharia amanhã',
    level: 'baixo',
    time: 'há 1 dia'
  },
  {
    id: 'alert-4',
    title: 'Ajuste urgente',
    detail: 'Atualizar layout da home',
    level: 'alto',
    time: 'há 30 min'
  }
];

const alertLevelStyles: Record<string, string> = {
  alto: 'bg-red-500/10 text-red-700',
  medio: 'bg-amber-500/10 text-amber-700',
  baixo: 'bg-emerald-500/10 text-emerald-700'
};

const parseDueDate = (value: string) => firestoreDateToDate(value);

export default function MembroPage() {
  const params = useParams();
  const memberId = Array.isArray(params.memberId)
    ? params.memberId[0]
    : params.memberId;
  const [selectedDay, setSelectedDay] = React.useState<Date | undefined>(
    new Date()
  );
  const [memberInfo, setMemberInfo] = React.useState<MemberInfo>({
    name: '',
    email: '',
    sector: '',
    cpf: '',
    role: ''
  });

  useMetadata({ title: `Membro - ${memberInfo.name.split(' ')[0]}` });
  const [projectTasks, setProjectTasks] = React.useState<MemberTask[]>([]);
  const [agendaTasks, setAgendaTasks] = React.useState<MemberTask[]>([]);
  const [memberAlerts, setMemberAlerts] = React.useState<MemberAlert[]>(alerts);
  const [activeTask, setActiveTask] = React.useState<MemberTask | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = React.useState(false);
  const [isMemberEditOpen, setIsMemberEditOpen] = React.useState(false);
  const [isSavingMemberEdit, setIsSavingMemberEdit] = React.useState(false);
  const [memberOptions, setMemberOptions] = React.useState<MemberOption[]>([]);
  const [isMembersLoading, setIsMembersLoading] = React.useState(false);
  const [isEditOwnerOpen, setIsEditOwnerOpen] = React.useState(false);
  const editOwnerInputRef = React.useRef<HTMLInputElement | null>(null);
  const closeEditOwnerTimeout = React.useRef<NodeJS.Timeout | null>(null);
  const [isSavingEdit, setIsSavingEdit] = React.useState(false);
  const [editTask, setEditTask] = React.useState({
    name: '',
    description: '',
    dueDate: '',
    owner: '',
    ownerId: '',
    status: statusOptions[1],
    priority: priorityOptions[1]
  });
  const [memberEditForm, setMemberEditForm] = React.useState({
    name: '',
    email: '',
    sector: '',
    cpf: '',
    role: ''
  });
  const allTasks = React.useMemo(
    () => [...agendaTasks, ...projectTasks],
    [agendaTasks, projectTasks]
  );
  const selectedDayLabel = selectedDay ? format(selectedDay, 'dd/MM/yyyy') : '';
  const tasksForDay = selectedDayLabel
    ? allTasks.filter((task) => task.due === selectedDayLabel)
    : [];
  const priorityByDate = React.useMemo(() => {
    const map = new Map<string, string>();
    allTasks.forEach((task) => {
      const parsed = parseDueDate(task.due);
      if (!parsed) {
        return;
      }
      const key = format(parsed, 'yyyy-MM-dd');
      const current = map.get(key);
      if (!current || priorityRank[task.priority] > priorityRank[current]) {
        map.set(key, task.priority);
      }
    });
    return map;
  }, [allTasks]);
  const calendarIndicators = React.useMemo(() => {
    const high: Date[] = [];
    const medium: Date[] = [];
    const low: Date[] = [];
    priorityByDate.forEach((priority, key) => {
      const parsed = new Date(`${key}T00:00:00`);
      if (Number.isNaN(parsed.getTime())) {
        return;
      }
      if (priority === 'Alta') {
        high.push(parsed);
      } else if (priority === 'Media') {
        medium.push(parsed);
      } else {
        low.push(parsed);
      }
    });
    return {
      highPriority: high,
      mediumPriority: medium,
      lowPriority: low
    };
  }, [priorityByDate]);

  const closeEditOwnerPopover = React.useCallback(() => {
    if (closeEditOwnerTimeout.current) {
      clearTimeout(closeEditOwnerTimeout.current);
    }
    closeEditOwnerTimeout.current = setTimeout(() => {
      setIsEditOwnerOpen(false);
    }, 120);
  }, []);

  React.useEffect(() => {
    const db = firebaseDb;
    if (!db || !memberId) {
      return;
    }

    let isActive = true;
    const loadMember = async () => {
      if (!db) {
        console.error('Firebase não inicializado');
        return;
      }

      try {
        const snapshot = await getDoc(doc(db, 'members', memberId));
        if (!snapshot.exists() || !isActive) {
          return;
        }

        const data = snapshot.data() as Partial<MemberInfo> & {
          tasks?: MemberTask[];
          alerts?: MemberAlert[];
          agendaTasks?: MemberTask[];
        };

        setMemberInfo({
          name: data.name ?? '',
          email: data.email ?? '',
          sector: data.sector ?? '',
          cpf: data.cpf ?? '',
          role: data.role ?? ''
        });

        if (Array.isArray(data.agendaTasks)) {
          setAgendaTasks(
            data.agendaTasks.map((task) => ({
              ...task,
              source: 'agenda'
            }))
          );
        } else {
          setAgendaTasks([]);
        }
        if (Array.isArray(data.alerts)) {
          setMemberAlerts(data.alerts);
        }
      } catch (error) {
        console.error('Falha ao carregar membro:', error);
        toast.error('Não foi possível carregar o membro.');
      }
    };

    loadMember();

    return () => {
      isActive = false;
    };
  }, [memberId]);

  React.useEffect(() => {
    const db = firebaseDb;
    if (!db) {
      return;
    }

    let isActive = true;
    const loadMembers = async () => {
      if (!db) {
        console.error('Firebase não inicializado');
        setIsMembersLoading(false);
        return;
      }

      setIsMembersLoading(true);
      try {
        const snapshot = await getDocs(collection(db, 'members'));
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
    const db = firebaseDb;
    if (!db || !memberId) {
      return;
    }

    let isActive = true;
    const loadTasks = async () => {
      if (!db) {
        console.error('Firebase não inicializado');
        return;
      }

      try {
        const q = query(
          collectionGroup(db, 'activities'),
          where('ownerId', '==', memberId)
        );

        const snap = await getDocs(q);

        setProjectTasks(
          snap.docs.map((d) => {
            const data = d.data() as {
              id?: string;
              name?: string;
              description?: string;
              dueAt?: FirestoreDateValue;
              owner?: string;
              ownerId?: string;
              status?: string;
              priority?: string;
              projectId?: string;
              projectName?: string;
            };
            const parentProjectId = d.ref.parent?.parent?.id;

            return {
              id: d.id,
              activityId: data.id ?? d.id,
              projectId: data.projectId ?? parentProjectId,
              projectName: data.projectName,
              source: 'project' as const,
              title: data.name ?? 'Atividade',
              description: data.description ?? '',
              due: firestoreDateToLabel(data.dueAt ?? ''),
              owner: data.owner ?? '',
              ownerId: data.ownerId,
              status: data.status ?? statusOptions[1],
              priority: data.priority ?? priorityOptions[1]
            } satisfies MemberTask;
          })
        );
      } catch (error) {
        console.error('Falha ao carregar tarefas:', error);
        toast.error('Não foi possível carregar tarefas.');
      }
    };

    loadTasks();

    return () => {
      isActive = false;
    };
  }, [memberId]);

  const handleTaskClick = (task: MemberTask) => {
    setActiveTask(task);
    setEditTask({
      name: task.title,
      description: task.description ?? '',
      dueDate: firestoreDateToInput(task.due),
      owner: task.owner ?? '',
      ownerId: task.ownerId ?? '',
      status: task.status ?? statusOptions[1],
      priority: task.priority ?? priorityOptions[1]
    });
    setIsTaskModalOpen(true);
  };

  const filteredEditMembers = memberOptions.filter((member) =>
    member.name.toLowerCase().includes(editTask.owner.toLowerCase().trim())
  );

  const handleUpdateTask = async () => {
    if (!activeTask?.id) {
      toast.error('Atividade nao encontrada.');
      return;
    }
    const db = firebaseDb;
    if (!db) {
      toast.error('Firebase nao configurado.');
      return;
    }
    if (!editTask.name.trim()) {
      toast.error('Informe o nome da atividade.');
      return;
    }
    if (!editTask.owner.trim()) {
      toast.error('Informe o responsável.');
      return;
    }
    if (!activeTask.projectId) {
      toast.error('Projeto da atividade nao encontrado.');
      return;
    }

    const activityId = activeTask.activityId ?? activeTask.id;
    if (!activityId) {
      toast.error('Atividade inválida.');
      return;
    }

    setIsSavingEdit(true);
    try {
      const activityRef = doc(
        db,
        'projects',
        activeTask.projectId,
        'activities',
        activityId
      );
      const snapshot = await getDoc(activityRef);

      if (!snapshot.exists()) {
        toast.error('Atividade nao encontrada.');
        return;
      }

      const dueAtValue = editTask.dueDate
        ? inputDateToTimestamp(editTask.dueDate)
        : null;
      if (editTask.dueDate && !dueAtValue) {
        toast.error('Data inválida.');
        return;
      }

      const resolvedOwnerId = editTask.ownerId || activeTask.ownerId || null;
      const dueAtLabel = editTask.dueDate
        ? firestoreDateToLabel(dueAtValue ?? editTask.dueDate)
        : '';

      const updatePayload = {
        name: editTask.name.trim(),
        description: editTask.description.trim(),
        owner: editTask.owner.trim(),
        ownerId: resolvedOwnerId,
        status: editTask.status,
        priority: editTask.priority,
        dueAt: editTask.dueDate ? dueAtValue : null,
        updatedAt: serverTimestamp()
      };

      await updateDoc(activityRef, updatePayload);

      setProjectTasks((current) =>
        current.map((task) =>
          task.id === activeTask.id
            ? {
                ...task,
                title: editTask.name.trim(),
                description: editTask.description.trim(),
                due: dueAtLabel,
                owner: editTask.owner.trim(),
                ownerId: resolvedOwnerId ?? undefined,
                status: editTask.status,
                priority: editTask.priority,
                projectId: activeTask.projectId,
                activityId
              }
            : task
        )
      );
      setActiveTask((current) =>
        current
          ? {
              ...current,
              title: editTask.name.trim(),
              description: editTask.description.trim(),
              due: dueAtLabel,
              owner: editTask.owner.trim(),
              ownerId: resolvedOwnerId ?? undefined,
              status: editTask.status,
              priority: editTask.priority,
              projectId: activeTask.projectId,
              activityId
            }
          : current
      );
      toast.success('Atividade atualizada.');
    } catch (error) {
      console.error('Falha ao atualizar atividade:', error);
      toast.error('Não foi possível atualizar a atividade.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const openMemberEditInfo = () => {
    setMemberEditForm({
      name: memberInfo.name ?? '',
      email: memberInfo.email ?? '',
      sector: memberInfo.sector ?? '',
      cpf: memberInfo.cpf ?? '',
      role: memberInfo.role ?? ''
    });
    setIsMemberEditOpen(true);
  };

  const handleSaveMemberInfo = async () => {
    const db = firebaseDb;
    if (!db || !memberId) {
      toast.error('Membro nao encontrado.');
      return;
    }
    if (!memberEditForm.name.trim()) {
      toast.error('Informe o nome.');
      return;
    }
    if (!memberEditForm.email.trim()) {
      toast.error('Informe o email.');
      return;
    }

    setIsSavingMemberEdit(true);
    try {
      const memberRef = doc(db, 'members', memberId);
      await updateDoc(memberRef, {
        name: memberEditForm.name.trim(),
        email: memberEditForm.email.trim(),
        sector: memberEditForm.sector.trim(),
        cpf: memberEditForm.cpf.trim(),
        role: memberEditForm.role.trim(),
        updatedAt: serverTimestamp()
      });

      setMemberInfo({
        name: memberEditForm.name.trim(),
        email: memberEditForm.email.trim(),
        sector: memberEditForm.sector.trim(),
        cpf: memberEditForm.cpf.trim(),
        role: memberEditForm.role.trim()
      });
      setIsMemberEditOpen(false);
      toast.success('Informações atualizadas.');
    } catch (error) {
      console.error('Falha ao atualizar membro:', error);
      toast.error('Não foi possível atualizar o membro.');
    } finally {
      setIsSavingMemberEdit(false);
    }
  };

  const isDue = (data: string) => {
    const [day, month, year] = data.split('/').map(Number);

    // mês no JS começa em 0
    const date = new Date(year, month - 1, day);

    return date < new Date();
  };

  return (
    <PageContainer
      pageTitle='Membro'
      pageDescription='Tarefas, calendário e alertas'
    >
      <div className='flex flex-1 flex-col space-y-4'>
        <div className='*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:shadow-xs lg:grid-cols-2'>
          <Card className='h-full'>
            <CardHeader>
              <CardTitle>Lista de tarefas</CardTitle>
              <CardDescription>Atividades da semana</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className='h-56 pr-3'>
                <div className='space-y-2'>
                  {allTasks.length === 0 ? (
                    <div className='text-muted-foreground text-sm'>
                      Nenhuma tarefa encontrada.
                    </div>
                  ) : (
                    allTasks.map((task) => (
                      <button
                        key={task.id}
                        type='button'
                        onClick={() => handleTaskClick(task)}
                        className='hover:bg-accent focus-visible:ring-ring/50 w-full cursor-pointer rounded-md border p-3 text-left transition-colors focus-visible:ring-[3px] focus-visible:outline-none'
                      >
                        <div className='flex items-start justify-between gap-3'>
                          <div className='flex flex-col'>
                            <span className='text-sm font-medium'>
                              {task.title}
                            </span>
                            <span className='text-muted-foreground text-xs'>
                              {task.description}
                            </span>
                            <span className='text-muted-foreground text-xs'>
                              Prazo: {isDue(task.due) ? 'Vencido' : task.due}
                            </span>
                          </div>
                          <div className='flex flex-col items-end gap-1'>
                            <Badge className={statusStyles[task.status]}>
                              {task.status}
                            </Badge>
                            <Badge className={priorityStyles[task.priority]}>
                              {task.priority}
                            </Badge>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className='h-full'>
            <CardHeader>
              <CardTitle>Calendário</CardTitle>
              <CardDescription>Dias clicáveis para agenda</CardDescription>
            </CardHeader>
            <CardContent>
              <div className='grid gap-4 md:grid-cols-[260px_minmax(0,1fr)]'>
                <Calendar
                  mode='single'
                  selected={selectedDay}
                  onSelect={setSelectedDay}
                  modifiers={calendarIndicators}
                  modifiersClassNames={{
                    highPriority:
                      "relative after:absolute after:bottom-1 after:left-1/2 after:h-1.5 after:w-1.5 after:-translate-x-1/2 after:rounded-full after:bg-red-500/60 after:content-['']",
                    mediumPriority:
                      "relative after:absolute after:bottom-1 after:left-1/2 after:h-1.5 after:w-1.5 after:-translate-x-1/2 after:rounded-full after:bg-amber-500/60 after:content-['']",
                    lowPriority:
                      "relative after:absolute after:bottom-1 after:left-1/2 after:h-1.5 after:w-1.5 after:-translate-x-1/2 after:rounded-full after:bg-emerald-500/60 after:content-['']"
                  }}
                />
                <div className='flex flex-col rounded-md border p-3'>
                  <div className='text-muted-foreground text-xs font-semibold uppercase'>
                    Atividades do dia
                  </div>
                  <div className='mt-1 text-sm font-medium'>
                    {selectedDayLabel || 'Selecione uma data'}
                  </div>
                  <ScrollArea className='mt-3 h-48 pr-2'>
                    <div className='space-y-2'>
                      {tasksForDay.length === 0 ? (
                        <div className='text-muted-foreground text-sm'>
                          Nenhuma atividade para este dia.
                        </div>
                      ) : (
                        tasksForDay.map((task) => (
                          <button
                            key={task.id}
                            type='button'
                            onClick={() => handleTaskClick(task)}
                            className='hover:bg-accent focus-visible:ring-ring/50 w-full cursor-pointer rounded-md border p-2 text-left transition-colors focus-visible:ring-[3px] focus-visible:outline-none'
                          >
                            <div className='flex items-start justify-between gap-3'>
                              <div className='flex flex-col'>
                                <span className='text-sm font-medium'>
                                  {task.title}
                                </span>
                                <span className='text-muted-foreground text-xs'>
                                  Prazo: {task.due}
                                </span>
                              </div>
                              <div className='flex flex-col items-end gap-1'>
                                <Badge className={statusStyles[task.status]}>
                                  {task.status}
                                </Badge>
                                <Badge
                                  className={priorityStyles[task.priority]}
                                >
                                  {task.priority}
                                </Badge>
                              </div>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className='h-full'>
            <CardHeader className='flex flex-row items-start justify-between'>
              <div>
                <CardTitle>Informações</CardTitle>
                <CardDescription>Dados do membro</CardDescription>
              </div>
              <Button
                type='button'
                size='icon'
                variant='ghost'
                className='h-9 w-9 cursor-pointer self-center rounded-md border hover:bg-white/10 [&_svg]:!h-[1em] [&_svg]:!w-[1em]'
                onClick={openMemberEditInfo}
                aria-label='Editar informações do membro'
              >
                <FontAwesomeIcon icon={faPenToSquare} size='lg' />
              </Button>
            </CardHeader>
            <CardContent>
              <div className='grid grid-cols-1 gap-3 text-sm sm:grid-cols-2'>
                <div className='rounded-md border p-3'>
                  <div className='text-muted-foreground text-xs'>Nome</div>
                  <div className='mt-1 font-medium'>
                    {memberInfo.name || '--'}
                  </div>
                </div>
                <div className='rounded-md border p-3'>
                  <div className='text-muted-foreground text-xs'>Email</div>
                  <div className='mt-1 font-medium'>
                    {memberInfo.email || '--'}
                  </div>
                </div>
                <div className='rounded-md border p-3'>
                  <div className='text-muted-foreground text-xs'>Setor</div>
                  <div className='mt-1 font-medium'>
                    {memberInfo.sector || '--'}
                  </div>
                </div>
                <div className='rounded-md border p-3'>
                  <div className='text-muted-foreground text-xs'>CPF</div>
                  <div className='mt-1 font-medium'>
                    {memberInfo.cpf || '--'}
                  </div>
                </div>
                <div className='rounded-md border p-3 sm:col-span-2'>
                  <div className='text-muted-foreground text-xs'>Cargo</div>
                  <div className='mt-1 font-medium'>
                    {memberInfo.role || '--'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className='h-full'>
            <CardHeader>
              <CardTitle>Alertas</CardTitle>
              <CardDescription>Itens para acompanhamento</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className='h-56 pr-3'>
                <div className='space-y-2'>
                  {memberAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className='flex items-start justify-between gap-3 rounded-md border p-3'
                    >
                      <div className='flex flex-col'>
                        <span className='text-sm font-medium'>
                          {alert.title}
                        </span>
                        <span className='text-muted-foreground text-xs'>
                          {alert.detail}
                        </span>
                        <span className='text-muted-foreground text-xs'>
                          {alert.time}
                        </span>
                      </div>
                      <Badge className={alertLevelStyles[alert.level]}>
                        {alert.level}
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
      <Dialog open={isTaskModalOpen} onOpenChange={setIsTaskModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{activeTask?.title ?? 'Atividade'}</DialogTitle>
            <DialogDescription>
              {activeTask?.projectName
                ? `Projeto: ${activeTask.projectName}`
                : 'Detalhes da atividade'}
            </DialogDescription>
          </DialogHeader>
          <div className='grid gap-3'>
            <Input
              placeholder='Nome da atividade'
              value={editTask.name}
              disabled={isSavingEdit}
              onChange={(event) =>
                setEditTask((current) => ({
                  ...current,
                  name: event.target.value
                }))
              }
            />
            <Textarea
              placeholder='Descricao'
              className='min-h-20'
              value={editTask.description}
              disabled={isSavingEdit}
              onChange={(event) =>
                setEditTask((current) => ({
                  ...current,
                  description: event.target.value
                }))
              }
            />
            <div className='grid gap-2 sm:grid-cols-2'>
              <Input
                type='date'
                value={editTask.dueDate}
                disabled={isSavingEdit}
                onChange={(event) =>
                  setEditTask((current) => ({
                    ...current,
                    dueDate: event.target.value
                  }))
                }
              />
              <Popover open={isEditOwnerOpen} onOpenChange={setIsEditOwnerOpen}>
                <PopoverAnchor asChild>
                  <div>
                    <Input
                      ref={editOwnerInputRef}
                      placeholder='Responsável'
                      value={editTask.owner}
                      disabled={isSavingEdit}
                      onFocus={() => setIsEditOwnerOpen(true)}
                      onBlur={closeEditOwnerPopover}
                      onChange={(event) => {
                        const value = event.target.value;
                        setEditTask((current) => ({
                          ...current,
                          owner: value
                        }));
                        if (!value) {
                          setEditTask((current) => ({
                            ...current,
                            ownerId: ''
                          }));
                        }
                        if (!isEditOwnerOpen) {
                          setIsEditOwnerOpen(true);
                        }
                      }}
                    />
                  </div>
                </PopoverAnchor>
                <PopoverContent
                  align='start'
                  side='top'
                  className='w-[--radix-popover-trigger-width] p-1'
                  onOpenAutoFocus={(event) => event.preventDefault()}
                  onCloseAutoFocus={(event) => event.preventDefault()}
                  onMouseDown={(event) => event.preventDefault()}
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
                    <ScrollArea className='h-32'>
                      <div className='flex flex-col gap-1 p-1'>
                        {filteredEditMembers.map((member) => (
                          <button
                            key={member.id}
                            type='button'
                            className='hover:bg-accent flex flex-col rounded-md px-2 py-1.5 text-left text-sm'
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => {
                              setEditTask((current) => ({
                                ...current,
                                owner: member.name,
                                ownerId: member.id
                              }));
                              setIsEditOwnerOpen(false);
                              editOwnerInputRef.current?.focus();
                            }}
                          >
                            <span className='font-medium'>{member.name}</span>
                            {member.role ? (
                              <span className='text-muted-foreground text-xs'>
                                {member.role}
                              </span>
                            ) : null}
                          </button>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </PopoverContent>
              </Popover>
            </div>
            <div className='grid gap-2 sm:grid-cols-2'>
              <Select
                value={editTask.priority}
                disabled={isSavingEdit}
                onValueChange={(value) =>
                  setEditTask((current) => ({
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
                value={editTask.status}
                disabled={isSavingEdit}
                onValueChange={(value) =>
                  setEditTask((current) => ({
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
          </div>
          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={() => setIsTaskModalOpen(false)}
            >
              Fechar
            </Button>
            {activeTask?.projectId ? (
              <Button asChild type='button' variant='secondary'>
                <Link
                  href={`/dashboard/acompanhamento/projetos/${activeTask.projectId}`}
                >
                  Abrir projeto
                </Link>
              </Button>
            ) : null}
            <Button
              type='button'
              onClick={handleUpdateTask}
              disabled={isSavingEdit}
            >
              {isSavingEdit ? 'Salvando...' : 'Salvar alteracoes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isMemberEditOpen} onOpenChange={setIsMemberEditOpen}>
        <DialogContent className='max-w-[95vw] sm:max-w-lg'>
          <DialogHeader>
            <DialogTitle>Editar informacoes</DialogTitle>
            <DialogDescription>Atualize os dados do membro.</DialogDescription>
          </DialogHeader>
          <div className='space-y-4'>
            <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
              <div className='space-y-1'>
                <label className='text-sm font-medium' htmlFor='memberEditName'>
                  Nome
                </label>
                <Input
                  id='memberEditName'
                  value={memberEditForm.name}
                  disabled={isSavingMemberEdit}
                  onChange={(event) =>
                    setMemberEditForm((current) => ({
                      ...current,
                      name: event.target.value
                    }))
                  }
                />
              </div>
              <div className='space-y-1'>
                <label
                  className='text-sm font-medium'
                  htmlFor='memberEditEmail'
                >
                  Email
                </label>
                <Input
                  id='memberEditEmail'
                  type='email'
                  value={memberEditForm.email}
                  disabled={isSavingMemberEdit}
                  onChange={(event) =>
                    setMemberEditForm((current) => ({
                      ...current,
                      email: event.target.value
                    }))
                  }
                />
              </div>
            </div>
            <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
              <div className='space-y-1'>
                <label
                  className='text-sm font-medium'
                  htmlFor='memberEditSector'
                >
                  Setor
                </label>
                <Select
                  value={memberEditForm.sector}
                  disabled={isSavingMemberEdit}
                  onValueChange={(value) =>
                    setMemberEditForm((current) => ({
                      ...current,
                      sector: value
                    }))
                  }
                >
                  <SelectTrigger id='memberEditSector'>
                    <SelectValue placeholder='Selecione o setor' />
                  </SelectTrigger>
                  <SelectContent>
                    {sectorOptions.map((sector) => (
                      <SelectItem key={sector} value={sector}>
                        {sector}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className='space-y-1'>
                <label className='text-sm font-medium' htmlFor='memberEditRole'>
                  Cargo
                </label>
                <Select
                  value={memberEditForm.role}
                  disabled={isSavingMemberEdit}
                  onValueChange={(value) =>
                    setMemberEditForm((current) => ({
                      ...current,
                      role: value
                    }))
                  }
                >
                  <SelectTrigger id='memberEditRole'>
                    <SelectValue placeholder='Selecione o cargo' />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className='space-y-1'>
              <label className='text-sm font-medium' htmlFor='memberEditCpf'>
                CPF
              </label>
              <Input
                id='memberEditCpf'
                value={memberEditForm.cpf}
                disabled={isSavingMemberEdit}
                onChange={(event) =>
                  setMemberEditForm((current) => ({
                    ...current,
                    cpf: event.target.value
                  }))
                }
              />
            </div>
          </div>
          <DialogFooter className='gap-2 sm:gap-2'>
            <Button
              type='button'
              variant='secondary'
              onClick={() => setIsMemberEditOpen(false)}
              disabled={isSavingMemberEdit}
            >
              Cancelar
            </Button>
            <Button
              type='button'
              onClick={handleSaveMemberInfo}
              disabled={isSavingMemberEdit}
            >
              {isSavingMemberEdit ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
