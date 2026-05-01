'use client';
import * as React from 'react';
import PageContainer from '@/components/layout/page-container';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { firestoreDateToInput } from '@/lib/firestore-date';
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
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import useMetadata from '@/hooks/use-metadata';
import acompanhamentoService from '@/services/acompanhamentoService';
import type {
  AcompanhamentoActivity as Activity,
  AcompanhamentoActivityData as ActivityFirestore,
  AcompanhamentoActivityFormState,
  AcompanhamentoConflictingTask as ConflictingTask,
  AcompanhamentoMemberOption as MemberOption,
  AcompanhamentoProjectInfo as ProjectInfo
} from '@/types/acompanhamento/acompanhamento';

const priorities: Record<string, string> = {
  Alta: 'bg-red-500/10 text-red-700',
  Media: 'bg-amber-500/10 text-amber-700',
  'Média': 'bg-amber-500/10 text-amber-700',
  Baixa: 'bg-emerald-500/10 text-emerald-700'
};
const priorityOptions = ['Alta', 'Média', 'Baixa'];
const statusOptions = ['Planejado', 'Em andamento', 'Bloqueado', 'Concluído'];

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

  useMetadata({ title: `Projeto - ${projectInfo.name}` });

  const [isSavingActivity, setIsSavingActivity] = React.useState(false);
  const [isDeletingActivity, setIsDeletingActivity] = React.useState(false);
  const [isDeletingActivityOpen, setIsDeletingActivityOpen] =
    React.useState(false);
  const [memberOptions, setMemberOptions] = React.useState<MemberOption[]>([]);
  const [isMembersLoading, setIsMembersLoading] = React.useState(false);
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [isSavingEdit, setIsSavingEdit] = React.useState(false);

  const [newActivity, setNewActivity] =
    React.useState<AcompanhamentoActivityFormState>({
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
  const [editActivity, setEditActivity] =
    React.useState<AcompanhamentoActivityFormState>({
      name: '',
      description: '',
      dueDate: '',
      owner: '',
      ownerId: '',
      status: statusOptions[1],
      priority: priorityOptions[1]
    });

  React.useEffect(() => {
    let isActive = true;
    const loadMembers = async () => {
      setIsMembersLoading(true);
      try {
        const members = await acompanhamentoService.getMemberOptions();
        if (isActive) {
          setMemberOptions(members);
        }
      } catch (error) {
        console.error('Falha ao carregar membros:', error);
        toast.error('Nao foi possivel carregar membros.');
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

        const detail = await acompanhamentoService.getProjectDetail(projectId);
        if (!detail || !isActive) return;

        setProjectInfo(detail.project);
        setActivityList(detail.activities);
      } catch (error) {
        console.error('Falha ao carregar atividades:', error);
        toast.error('Nao foi possivel carregar atividades.');
      }
    };

    loadActivities();
    return () => {
      isActive = false;
    };
  }, [projectId]);

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

  const handleDeleteActivity = async () => {
    if (!projectId || !selectedActivity) {
      toast.error('Projeto ou atividade nao encontrado.');
      return;
    }

    setIsDeletingActivity(true);
    try {
      await acompanhamentoService.deleteProjectActivity(
        projectId,
        selectedActivity.id
      );
      setActivityList((current) =>
        current.filter((activity) => activity.id !== selectedActivity.id)
      );
      setIsDeletingActivityOpen(false);
      toast.success('Atividade deletada.');
    } catch (error: any) {
      console.error('Erro ao deletar atividade:', error);
      toast.error(error?.message ?? 'Nao foi possivel deletar a atividade.');
    } finally {
      setIsDeletingActivity(false);
    }
  };

  const handleCreateActivity = async () => {
    if (!projectId) {
      toast.error('Projeto nao encontrado.');
      return;
    }

    let activityPayload: ActivityFirestore;
    try {
      activityPayload = acompanhamentoService.createActivityPayload(newActivity);
    } catch (error: any) {
      toast.error(error?.message ?? 'Nao foi possivel preparar a atividade.');
      return;
    }

    if (newActivity.ownerId && newActivity.dueDate) {
      const conflict = await acompanhamentoService.checkMemberConflicts(
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
    if (!projectId) return;

    setIsSavingActivity(true);
    try {
      const savedActivity = await acompanhamentoService.saveProjectActivity(
        projectId,
        activityPayload
      );
      setActivityList((current) => [savedActivity, ...current]);
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
    } catch (error: any) {
      console.error('Falha ao salvar atividade:', error);
      toast.error(error?.message ?? 'Nao foi possivel salvar a atividade.');
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
    if (!projectId || !selectedActivity) {
      toast.error('Projeto ou atividade nao encontrado.');
      return;
    }

    setIsSavingEdit(true);
    try {
      const updatedActivity = await acompanhamentoService.updateProjectActivity(
        projectId,
        selectedActivity,
        editActivity
      );
      setActivityList((current) =>
        current.map((activity) =>
          activity.id === selectedActivity.id ? updatedActivity : activity
        )
      );
      setIsEditOpen(false);
      toast.success('Atividade atualizada.');
    } catch (error: any) {
      console.error('Falha ao atualizar atividade:', error);
      toast.error(error?.message ?? 'Nao foi possivel atualizar a atividade.');
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
          {acompanhamentoService.formatProjectValue(projectInfo.value)}
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
                        Valor:{' '}
                        {acompanhamentoService.formatProjectValue(
                          projectInfo.value
                        )}
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
