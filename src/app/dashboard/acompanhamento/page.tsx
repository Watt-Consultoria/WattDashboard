'use client';
import * as React from 'react';
import Link from 'next/link';
import PageContainer from '@/components/layout/page-container';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { PieGraph } from '@/features/overview/components/pie-graph';
import { useFirebaseData } from '@/contexts/firebase-data-context';
import { format } from 'date-fns';
import { CalendarIcon, Send } from 'lucide-react';
import { toast } from 'sonner';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPenToSquare } from '@fortawesome/free-regular-svg-icons';
import { faXmark, faTags } from '@fortawesome/free-solid-svg-icons';
import { useRouter } from 'next/navigation';
import useMetadata from '@/hooks/use-metadata';
import acompanhamentoService from '@/services/acompanhamentoService';
import feedbackService from '@/services/feedbackService';
import type {
  AcompanhamentoMemberCard as Member,
  AcompanhamentoProjectCard as Project,
  AcompanhamentoProjectFormState as ProjectFormState
} from '@/types/acompanhamento/acompanhamento';
import {
  FEEDBACK_TYPES,
  type Feedback,
  type FeedbackFormState,
  type FeedbackStatus,
  type FeedbackType
} from '@/types/feedback/feedback';
import { tiposAutomacao, tiposEletrica } from '@/constants/project-types';

const statusOptions = [
  'Todos',
  'Em andamento',
  'Revisão',
  'Planejamento',
  'Execução',
  'Validação'
];

const projectStatusOptions = statusOptions.filter(
  (status) => status !== 'Todos'
);
const healthOptions = ['Estável', 'Atenção', 'Ok'];
const areaOptions = [
  'Automação',
  'Elétrica',
  'Comercial',
  'Institucional',
  'Marketing',
  'Executivo'
];
const feedbackStatusStyles: Record<FeedbackStatus, string> = {
  Aberta: 'bg-muted text-muted-foreground',
  'Em andamento': 'bg-amber-500/10 text-amber-700',
  Resolvida: 'bg-emerald-500/10 text-emerald-700'
};

const formatFeedbackDate = (value?: Feedback['createdAt']): string => {
  if (!value?.toDate) return '--';
  return format(value.toDate(), 'dd/MM/yyyy HH:mm');
};

export default function AcompanhamentoPage() {
  useMetadata({ title: 'Acompanhamento' });

  const router = useRouter();
  const {
    projects: contextProjects,
    members: contextMembers,
    isLoading: isDataLoading,
    currentMember
  } = useFirebaseData();
  const [areaFilter, setAreaFilter] = React.useState('Geral');
  const [statusFilter, setStatusFilter] = React.useState('Todos');
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingProjectId, setEditingProjectId] = React.useState<string | null>(
    null
  );
  const [isDeleteProjectOpen, setIsDeleteProjectOpen] = React.useState(false);
  const [isDeletingProject, setIsDeletingProject] = React.useState(false);
  const [projectToDelete, setProjectToDelete] = React.useState<Project | null>(
    null
  );
  const [isSaving, setIsSaving] = React.useState(false);
  const [leadershipMembers, setLeadershipMembers] = React.useState<Member[]>(
    []
  );
  const [startDate, setStartDate] = React.useState<Date | undefined>(undefined);
  const [isTagsDialogOpen, setIsTagsDialogOpen] = React.useState(false);
  const [selectedMemberForTags, setSelectedMemberForTags] =
    React.useState<Member | null>(null);
  const [newTag, setNewTag] = React.useState('');
  const [isSavingTag, setIsSavingTag] = React.useState(false);
  const [isBulkTagsDialogOpen, setIsBulkTagsDialogOpen] = React.useState(false);
  const [bulkTagName, setBulkTagName] = React.useState('');
  const [bulkTagAction, setBulkTagAction] = React.useState<'add' | 'remove'>(
    'add'
  );
  const [selectedMemberIds, setSelectedMemberIds] = React.useState<Set<string>>(
    new Set()
  );
  const [isSavingBulkTag, setIsSavingBulkTag] = React.useState(false);
  const [feedbackForm, setFeedbackForm] =
    React.useState<FeedbackFormState>({
      type: FEEDBACK_TYPES[0],
      title: '',
      detail: ''
    });
  const [isSubmittingFeedback, setIsSubmittingFeedback] =
    React.useState(false);
  const [isIssuesDialogOpen, setIsIssuesDialogOpen] = React.useState(false);
  const [feedbacks, setFeedbacks] = React.useState<Feedback[]>([]);
  const [isLoadingFeedbacks, setIsLoadingFeedbacks] = React.useState(false);
  const [updatingFeedbackId, setUpdatingFeedbackId] = React.useState<
    string | null
  >(null);
  const canManageOtherMembers =
    acompanhamentoService.canManageOtherMembers(currentMember);
  const canManageFeedbacks = feedbackService.canManageFeedbacks(currentMember);
  const canManageMemberInfo = React.useCallback(
    (memberId: string) =>
      acompanhamentoService.canManageMemberInformation(currentMember, memberId),
    [currentMember]
  );

  const resetProjectForm = React.useCallback(() => {
    setNewProject({
      name: '',
      status: projectStatusOptions[0],
      health: healthOptions[2],
      area: areaOptions[0],
      tipo: tiposAutomacao[0],
      client: '',
      manager: leadershipMembers[0]?.name ?? '',
      managerId: leadershipMembers[0]?.id ?? '',
      start: '',
      next: '',
      value: ''
    });
    setStartDate(undefined);
    setEditingProjectId(null);
  }, [leadershipMembers]);
  const [newProject, setNewProject] = React.useState<ProjectFormState>({
    name: '',
    status: projectStatusOptions[0],
    health: healthOptions[2],
    area: areaOptions[0],
    tipo: tiposAutomacao[0],
    client: '',
    manager: '',
    managerId: '',
    start: '',
    next: '',
    value: ''
  });
  const projectList = React.useMemo(() => {
    return contextProjects.map((project) =>
      acompanhamentoService.mapProjectCard(project)
    );
  }, [contextProjects]);

  const toMemberCard = React.useCallback(
    (member: (typeof contextMembers)[number]) =>
      acompanhamentoService.mapMemberCard(member),
    []
  );

  const memberList = React.useMemo(
    () => contextMembers.map(toMemberCard),
    [contextMembers, toMemberCard]
  );

  const scopedMembers = React.useMemo(() => {
    return acompanhamentoService.getScopedMembers(contextMembers, areaFilter);
  }, [areaFilter, contextMembers]);

  const filteredMembers = React.useMemo(() => {
    return scopedMembers.map(toMemberCard);
  }, [scopedMembers, toMemberCard]);

  const occupancyMetrics = React.useMemo(() => {
    return acompanhamentoService.calculateOccupancyMetrics({
      areaFilter,
      members: contextMembers,
      projects: contextProjects
    });
  }, [areaFilter, contextMembers, contextProjects]);

  const occupancyChartData = React.useMemo(
    () => [
      { name: 'ocupados', value: occupancyMetrics.occupiedCount },
      { name: 'livres', value: occupancyMetrics.availableCount }
    ],
    [occupancyMetrics]
  );

  // Atualizar leadership members quando memberList mudar
  React.useEffect(() => {
    setLeadershipMembers(
      memberList.filter((member) =>
        acompanhamentoService.isLeadershipMember(member)
      )
    );
  }, [memberList]);

  React.useEffect(() => {
    if (leadershipMembers.length === 0) {
      return;
    }

    const managerExists = leadershipMembers.some(
      (member) => member.id === newProject.managerId
    );
    if (newProject.managerId && managerExists) {
      return;
    }

    setNewProject((current) => ({
      ...current,
      managerId: leadershipMembers[0].id,
      manager: leadershipMembers[0].name
    }));
  }, [leadershipMembers, newProject.managerId]);

  const filteredProjects = projectList.filter((project) => {
    const statusMatches =
      statusFilter === 'Todos' || project.status === statusFilter;
    const areaMatches =
      areaFilter === 'Geral' ||
      acompanhamentoService.normalizeValue(project.area) ===
        acompanhamentoService.normalizeValue(areaFilter);

    return statusMatches && areaMatches;
  });

  const openEditProject = (project: Project) => {
    const source = contextProjects.find((item) => item.id === project.id);
    const startValue = source?.start?.toDate
      ? source.start.toDate()
      : source?.start instanceof Date
        ? source.start
        : undefined;

    setEditingProjectId(project.id);
    setNewProject({
      name: project.name ?? '',
      status: project.status ?? projectStatusOptions[0],
      health: project.health ?? healthOptions[2],
      area: project.area ?? areaOptions[0],
      tipo: project.tipo ?? tiposAutomacao[0],
      client: project.client ?? '',
      manager: project.manager ?? '',
      managerId: project.managerId ?? '',
      start: '',
      next: project.next ?? '',
      value: project.value ?? ''
    });
    setStartDate(startValue);
    setIsDialogOpen(true);
  };

  const openDeleteProject = (project: Project) => {
    setProjectToDelete(project);
    setIsDeleteProjectOpen(true);
  };

  const handleCreateProject = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setIsSaving(true);
    try {
      await acompanhamentoService.saveProject({
        projectId: editingProjectId,
        form: newProject,
        startDate,
        managers: leadershipMembers
      });
      toast.success(
        editingProjectId
          ? 'Projeto atualizado com sucesso.'
          : 'Projeto criado com sucesso.'
      );
      resetProjectForm();
      setIsDialogOpen(false);
    } catch (error: any) {
      console.error('Falha ao salvar projeto:', error);
      toast.error(error?.message ?? 'Nao foi possivel salvar o projeto.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!projectToDelete) {
      return;
    }

    setIsDeletingProject(true);
    try {
      await acompanhamentoService.deleteProject(projectToDelete.id);
      toast.success('Projeto removido.');
      setIsDeleteProjectOpen(false);
      setProjectToDelete(null);
    } catch (error) {
      console.error('Falha ao remover projeto:', error);
      toast.error('Nao foi possivel remover o projeto.');
    } finally {
      setIsDeletingProject(false);
    }
  };

  const openCreateProject = () => {
    resetProjectForm();
    setIsDialogOpen(true);
  };

  const areaFilterControl = (
    <Select value={areaFilter} onValueChange={setAreaFilter}>
      <SelectTrigger className='h-8 w-40' aria-label='Filtrar área'>
        <SelectValue placeholder='Área' />
      </SelectTrigger>
      <SelectContent align='end'>
        <SelectItem value='Geral'>Geral</SelectItem>
        {areaOptions.map((area) => (
          <SelectItem key={area} value={area}>
            {area}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  const projectsCardContent = (
    <CardContent className='flex min-h-0 flex-1 flex-col'>
      <ScrollArea className='-mr-3 min-h-0 flex-1 pr-3'>
        <div className='space-y-2'>
          {isDataLoading ? (
            <div className='space-y-2'>
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={`project-skeleton-${index}`}
                  className='rounded-md border p-3'
                >
                  <Skeleton className='h-4 w-2/3' />
                  <Skeleton className='mt-2 h-3 w-1/2' />
                </div>
              ))}
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className='text-muted-foreground text-sm'>
              Nenhum projeto encontrado para o filtro selecionado.
            </div>
          ) : (
            filteredProjects.map((project) => (
              <div
                key={project.id}
                role='button'
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    router.push(
                      `/dashboard/acompanhamento/projetos/${project.id}`
                    );
                  }
                }}
                onClick={() =>
                  router.push(
                    `/dashboard/acompanhamento/projetos/${project.id}`
                  )
                }
                className='hover:bg-accent focus-visible:ring-ring/50 flex w-full items-start justify-between gap-3 rounded-md border p-3 text-left transition-colors focus-visible:ring-[3px] focus-visible:outline-none'
              >
                <div className='flex flex-col'>
                  <span className='text-sm font-medium'>{project.name}</span>
                  <span className='text-muted-foreground text-xs'>
                    {project.status} - Atualizado {project.updated}
                  </span>
                </div>
                <div className='ml-auto flex items-start gap-2'>
                  <div className='flex flex-col items-end gap-1'>
                    <span className='text-muted-foreground text-[10px] uppercase'>
                      {project.area || '--'}
                    </span>
                    <Badge variant='outline'>{project.health}</Badge>
                  </div>
                  <div className='flex items-center gap-1'>
                    <Button
                      type='button'
                      size='icon'
                      variant='ghost'
                      className='h-9 w-9 cursor-pointer self-center rounded-md border hover:bg-white/10 [&_svg]:!h-[1em] [&_svg]:!w-[1em]'
                      onClick={(event) => {
                        event.stopPropagation();
                        openEditProject(project);
                      }}
                      aria-label='Editar projeto'
                    >
                      <FontAwesomeIcon icon={faPenToSquare} size='lg' />
                    </Button>
                    <Button
                      type='button'
                      size='icon'
                      variant='ghost'
                      className='h-9 w-9 cursor-pointer self-center rounded-md border hover:bg-white/10 [&_svg]:!h-[1em] [&_svg]:!w-[1em]'
                      onClick={(event) => {
                        event.stopPropagation();
                        openDeleteProject(project);
                      }}
                      aria-label='Excluir projeto'
                    >
                      <FontAwesomeIcon icon={faXmark} size='lg' />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </CardContent>
  );

  const projectsCardMobile = (
    <Card className='flex h-full min-h-0 flex-col'>
      <CardHeader>
        <CardTitle>Projetos em acompanhamento</CardTitle>
        <CardDescription>Lista priorizada com status</CardDescription>
        <div className='mt-3 flex flex-wrap items-center justify-end gap-2'>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className='h-8 w-40' aria-label='Filtrar por status'>
              <SelectValue placeholder='Status' />
            </SelectTrigger>
            <SelectContent align='end'>
              {statusOptions.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size='sm' onClick={openCreateProject}>
            +
          </Button>
        </div>
      </CardHeader>
      {projectsCardContent}
    </Card>
  );

  const projectsCardDesktop = (
    <Card className='flex h-105 flex-col'>
      <CardHeader>
        <CardTitle>Projetos em acompanhamento</CardTitle>
        <CardDescription>Lista priorizada com status</CardDescription>
        <CardAction>
          <div className='flex items-center gap-2'>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger
                className='h-8 w-40'
                aria-label='Filtrar por status'
              >
                <SelectValue placeholder='Status' />
              </SelectTrigger>
              <SelectContent align='end'>
                {statusOptions.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size='sm' onClick={openCreateProject}>
              +
            </Button>
          </div>
        </CardAction>
      </CardHeader>
      {projectsCardContent}
    </Card>
  );

  const occupancyCard = (
    <div className='h-full lg:h-105 [&>div]:h-full'>
      {isDataLoading ? (
        <Skeleton className='h-full w-full' />
      ) : occupancyMetrics.totalMembers === 0 ? (
        <Card className='h-full'>
          <CardContent className='flex h-full flex-col items-center justify-center gap-2 text-center'>
            <div className='text-sm font-medium'>
              Nenhum membro no setor selecionado
            </div>
            <div className='text-muted-foreground text-xs'>
              Selecione outro setor para ver a ocupação.
            </div>
          </CardContent>
        </Card>
      ) : (
        <PieGraph
          title='Membros ocupados'
          description='Percentual de membros ocupados'
          shortDescription='Ocupação da equipe'
          data={occupancyChartData}
          config={{
            ocupados: {
              label: 'Ocupados',
              color: 'var(--primary)'
            },
            livres: {
              label: 'Livres',
              color: 'var(--muted-foreground)'
            }
          }}
          contentClassName='px-2 pt-0 sm:px-6 sm:pt-0'
          centerValue={`${occupancyMetrics.occupiedPercent}%`}
          centerLabel='Ocupados'
        />
      )}
    </div>
  );

  const openBulkTagsDialog = () => {
    if (!canManageOtherMembers) {
      toast.error(
        'Apenas Assessor ou Presidente do setor Executivo podem alterar informacoes de outros membros.'
      );
      return;
    }
    setSelectedMemberIds(new Set());
    setBulkTagName('');
    setBulkTagAction('add');
    setIsBulkTagsDialogOpen(true);
  };

  const membersCard = (
    <Card className='hover:bg-accent flex h-full flex-col lg:h-105'>
      <CardHeader>
        <div className='flex flex-wrap items-center justify-between gap-2'>
          <div>
            <CardTitle>Membros da equipe</CardTitle>
            <CardDescription>Última atividade registrada</CardDescription>
          </div>
          <div className='flex items-center gap-2'>
            {canManageOtherMembers ? (
              <Button
                size='sm'
                variant='outline'
                onClick={openBulkTagsDialog}
                className='gap-2'
              >
                <FontAwesomeIcon icon={faTags} className='h-3 w-3' />
                Tags
              </Button>
            ) : null}
            <Badge variant='secondary'>Total: {contextMembers.length}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className='flex min-h-0 flex-1 flex-col'>
        <ScrollArea className='-mr-3 min-h-0 flex-1 pr-3'>
          <div className='space-y-2'>
            {isDataLoading ? (
              <div className='space-y-2'>
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={`member-skeleton-${index}`}
                    className='rounded-md border p-3'
                  >
                    <Skeleton className='h-4 w-1/2' />
                    <Skeleton className='mt-2 h-3 w-2/3' />
                  </div>
                ))}
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className='text-muted-foreground text-sm'>
                Nenhum membro no setor selecionado.
              </div>
            ) : (
              filteredMembers.map((member) => (
                <div
                  key={member.id}
                  className='hover:bg-accent flex w-full items-start justify-between gap-3 rounded-md border p-3 transition-all duration-300 ease-in-out'
                >
                  <Link
                    href={`/dashboard/acompanhamento/membros/${member.id}`}
                    className='focus-visible:ring-ring/50 flex flex-1 flex-col transition-colors focus-visible:ring-[3px] focus-visible:outline-none'
                  >
                    <span className='text-sm font-medium'>{member.name}</span>
                    <span className='text-muted-foreground text-xs'>
                      {member.role} - {member.activity || 'Sem atividade'}
                    </span>
                    {member.tags && member.tags.length > 0 && (
                      <div className='mt-1 flex flex-wrap gap-1'>
                        {member.tags.map((tag) => (
                          <Badge
                            key={tag}
                            variant='secondary'
                            className='text-[10px]'
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </Link>
                  <div className='flex items-center gap-1'>
                    {canManageMemberInfo(member.id) ? (
                      <Button
                        type='button'
                        size='icon'
                        variant='ghost'
                        className='h-8 w-8 shrink-0 cursor-pointer rounded-md border hover:bg-white/10 [&_svg]:!h-[0.875em] [&_svg]:!w-[0.875em]'
                        onClick={() => openTagsDialog(member)}
                        aria-label='Gerenciar tags'
                      >
                        <FontAwesomeIcon icon={faTags} />
                      </Button>
                    ) : null}
                    <Badge variant='outline' className='shrink-0'>
                      {member.sector || '--'}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );

  const loadFeedbacks = async () => {
    if (!canManageFeedbacks) return;

    setIsLoadingFeedbacks(true);
    try {
      const data = await feedbackService.getFeedbacks(currentMember);
      setFeedbacks(data);
    } catch (error: any) {
      console.error('Erro ao carregar issues:', error);
      toast.error(error?.message ?? 'Nao foi possivel carregar as issues.');
    } finally {
      setIsLoadingFeedbacks(false);
    }
  };

  const openIssuesDialog = async () => {
    if (!canManageFeedbacks) {
      toast.error(
        'Apenas Presidente ou Assessor do setor Executivo podem gerenciar issues.'
      );
      return;
    }

    setIsIssuesDialogOpen(true);
    await loadFeedbacks();
  };

  const handleFeedbackStatusChange = async (
    feedbackId: string,
    status: FeedbackStatus
  ) => {
    setUpdatingFeedbackId(feedbackId);
    try {
      await feedbackService.updateFeedbackStatus(
        currentMember,
        feedbackId,
        status
      );
      setFeedbacks((current) =>
        current.map((feedback) =>
          feedback.id === feedbackId ? { ...feedback, status } : feedback
        )
      );
      toast.success('Issue atualizada.');
    } catch (error: any) {
      console.error('Erro ao atualizar issue:', error);
      toast.error(error?.message ?? 'Nao foi possivel atualizar a issue.');
    } finally {
      setUpdatingFeedbackId(null);
    }
  };

  const handleSubmitFeedback = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setIsSubmittingFeedback(true);
    try {
      await feedbackService.submitFeedback({
        ...feedbackForm,
        member: currentMember
      });
      setFeedbackForm({
        type: FEEDBACK_TYPES[0],
        title: '',
        detail: ''
      });
      toast.success('Feedback enviado com sucesso.');
    } catch (error: any) {
      console.error('Erro ao enviar feedback:', error);
      toast.error(error?.message ?? 'Nao foi possivel enviar o feedback.');
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const issuesCard = (
    <Card className='flex h-full flex-col lg:h-105'>
      <CardHeader>
        <CardTitle>Central de issues</CardTitle>
        <CardDescription>Feedbacks e solicitacoes do app</CardDescription>
        {canManageFeedbacks ? (
          <CardAction>
            <Button
              type='button'
              size='sm'
              variant='outline'
              onClick={openIssuesDialog}
            >
              Ver issues
            </Button>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent className='flex min-h-0 flex-1 flex-col'>
        <ScrollArea className='-mr-3 min-h-0 flex-1 pr-3'>
          <form className='space-y-4' onSubmit={handleSubmitFeedback}>
            <div className='space-y-2'>
              <label className='text-sm font-medium' htmlFor='feedbackType'>
                Tipo
              </label>
              <Select
                value={feedbackForm.type}
                disabled={isSubmittingFeedback}
                onValueChange={(value) =>
                  setFeedbackForm((current) => ({
                    ...current,
                    type: value as FeedbackType
                  }))
                }
              >
                <SelectTrigger id='feedbackType'>
                  <SelectValue placeholder='Selecione o tipo' />
                </SelectTrigger>
                <SelectContent>
                  {FEEDBACK_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='space-y-2'>
              <label className='text-sm font-medium' htmlFor='feedbackTitle'>
                Titulo
              </label>
              <Input
                id='feedbackTitle'
                placeholder='Resumo da issue'
                value={feedbackForm.title}
                disabled={isSubmittingFeedback}
                onChange={(event) =>
                  setFeedbackForm((current) => ({
                    ...current,
                    title: event.target.value
                  }))
                }
              />
            </div>

            <div className='space-y-2'>
              <label className='text-sm font-medium' htmlFor='feedbackDetail'>
                Detalhamento
              </label>
              <Textarea
                id='feedbackDetail'
                placeholder='Contexto, passos para reproduzir ou melhoria esperada'
                value={feedbackForm.detail}
                disabled={isSubmittingFeedback}
                rows={4}
                onChange={(event) =>
                  setFeedbackForm((current) => ({
                    ...current,
                    detail: event.target.value
                  }))
                }
              />
            </div>

            <div className='rounded-md border p-3 text-xs'>
              <div className='font-medium'>
                {currentMember?.name || 'Membro nao identificado'}
              </div>
              <div className='text-muted-foreground'>
                ID: {currentMember?.id || 'indisponivel'}
              </div>
            </div>

            <Button
              type='submit'
              className='w-full gap-2'
              disabled={isSubmittingFeedback || !currentMember?.id}
            >
              <Send className='h-4 w-4' />
              {isSubmittingFeedback ? 'Enviando...' : 'Enviar issue'}
            </Button>
          </form>
        </ScrollArea>
      </CardContent>
    </Card>
  );

  const openTagsDialog = (member: Member) => {
    if (!canManageMemberInfo(member.id)) {
      toast.error(
        'Apenas Assessor ou Presidente do setor Executivo podem alterar informacoes de outros membros.'
      );
      return;
    }
    setSelectedMemberForTags(member);
    setIsTagsDialogOpen(true);
  };

  const handleAddTag = async () => {
    if (!selectedMemberForTags) return;

    const trimmedTag = newTag.trim();
    if (!trimmedTag) {
      toast.error('Informe o nome da tag.');
      return;
    }

    setIsSavingTag(true);
    try {
      await acompanhamentoService.addTagToMember(
        currentMember,
        selectedMemberForTags.id,
        trimmedTag
      );
      toast.success('Tag adicionada com sucesso.');
      setNewTag('');
      setSelectedMemberForTags((current) => {
        if (!current) return current;
        const updatedTags = [...(current.tags ?? []), trimmedTag];
        return { ...current, tags: updatedTags };
      });
    } catch (error: any) {
      console.error('Erro ao adicionar tag:', error);
      toast.error(error?.message ?? 'Nao foi possivel adicionar a tag.');
    } finally {
      setIsSavingTag(false);
    }
  };

  const handleRemoveTag = async (tag: string) => {
    if (!selectedMemberForTags) return;

    setIsSavingTag(true);
    try {
      await acompanhamentoService.removeTagFromMember(
        currentMember,
        selectedMemberForTags.id,
        tag
      );
      toast.success('Tag removida com sucesso.');
      setSelectedMemberForTags((current) => {
        if (!current) return current;
        const updatedTags = (current.tags ?? []).filter((t) => t !== tag);
        return { ...current, tags: updatedTags };
      });
    } catch (error: any) {
      console.error('Erro ao remover tag:', error);
      toast.error(error?.message ?? 'Nao foi possivel remover a tag.');
    } finally {
      setIsSavingTag(false);
    }
  };

  const toggleMemberSelection = (memberId: string) => {
    setSelectedMemberIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(memberId)) {
        newSet.delete(memberId);
      } else {
        newSet.add(memberId);
      }
      return newSet;
    });
  };

  const toggleAllMembers = () => {
    if (!canManageOtherMembers) return;
    if (selectedMemberIds.size === filteredMembers.length) {
      setSelectedMemberIds(new Set());
    } else {
      setSelectedMemberIds(new Set(filteredMembers.map((m) => m.id)));
    }
  };

  const handleAddBulkTag = async () => {
    const trimmedTag = bulkTagName.trim();
    if (!trimmedTag) {
      toast.error('Informe o nome da tag.');
      return;
    }

    if (selectedMemberIds.size === 0) {
      toast.error('Selecione ao menos um membro.');
      return;
    }

    setIsSavingBulkTag(true);
    try {
      const result = await acompanhamentoService.addTagToMultipleMembers(
        currentMember,
        Array.from(selectedMemberIds),
        trimmedTag
      );

      if (result.success) {
        toast.success(
          'Tag "' +
            trimmedTag +
            '" adicionada a ' +
            selectedMemberIds.size +
            ' membro(s).'
        );
        setBulkTagName('');
        setSelectedMemberIds(new Set());
        setIsBulkTagsDialogOpen(false);
      } else {
        toast.error(result.error ?? 'Erro ao adicionar tag aos membros.');
      }
    } catch (error: any) {
      console.error('Erro ao adicionar tag em lote:', error);
      toast.error(error?.message ?? 'Nao foi possivel adicionar a tag.');
    } finally {
      setIsSavingBulkTag(false);
    }
  };

  const handleRemoveBulkTag = async () => {
    const trimmedTag = bulkTagName.trim();
    if (!trimmedTag) {
      toast.error('Informe o nome da tag.');
      return;
    }

    if (selectedMemberIds.size === 0) {
      toast.error('Selecione ao menos um membro.');
      return;
    }

    setIsSavingBulkTag(true);
    try {
      const result = await acompanhamentoService.removeTagFromMultipleMembers(
        currentMember,
        Array.from(selectedMemberIds),
        trimmedTag
      );

      if (result.success) {
        toast.success(
          'Tag "' +
            trimmedTag +
            '" removida de ' +
            selectedMemberIds.size +
            ' membro(s).'
        );
        setBulkTagName('');
        setSelectedMemberIds(new Set());
        setIsBulkTagsDialogOpen(false);
      } else {
        toast.error(result.error ?? 'Erro ao remover tag dos membros.');
      }
    } catch (error: any) {
      console.error('Erro ao remover tag em lote:', error);
      toast.error(error?.message ?? 'Nao foi possivel remover a tag.');
    } finally {
      setIsSavingBulkTag(false);
    }
  };
  return (
    <PageContainer
      pageTitle='Acompanhamento'
      pageDescription='Visão geral das frentes em andamento'
      pageHeaderAction={areaFilterControl}
      hideHeaderOnMobile
      scrollable={true}
    >
      <div className='flex h-full min-h-0 flex-col gap-3 md:gap-4'>
        <div className='flex min-h-0 flex-1 flex-col lg:hidden'>
          <div className='mb-3 flex shrink-0 justify-end'>
            {areaFilterControl}
          </div>
          <Tabs
            defaultValue='projects'
            className='flex min-h-0 w-full flex-1 flex-col'
          >
            <TabsList className='grid h-auto w-full grid-cols-4'>
              <TabsTrigger value='projects' className='py-2 text-xs'>
                Projetos
              </TabsTrigger>
              <TabsTrigger value='occupancy' className='py-2 text-xs'>
                Ocupação
              </TabsTrigger>
              <TabsTrigger value='members' className='py-2 text-xs'>
                Membros
              </TabsTrigger>
              <TabsTrigger value='issues' className='py-2 text-xs'>
                Issues
              </TabsTrigger>
            </TabsList>
            <TabsContent
              value='projects'
              className='mt-3 flex min-h-0 flex-1 flex-col'
            >
              {projectsCardMobile}
            </TabsContent>
            <TabsContent
              value='occupancy'
              className='mt-3 flex min-h-0 flex-1 flex-col'
            >
              {occupancyCard}
            </TabsContent>
            <TabsContent
              value='members'
              className='mt-3 flex min-h-0 flex-1 flex-col'
            >
              {membersCard}
            </TabsContent>
            <TabsContent
              value='issues'
              className='mt-3 flex min-h-0 flex-1 flex-col'
            >
              {issuesCard}
            </TabsContent>
          </Tabs>
        </div>

        <div className='*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card hidden grid-cols-1 gap-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:shadow-xs lg:grid lg:grid-cols-2'>
          {projectsCardDesktop}
          {occupancyCard}
          {membersCard}
          {issuesCard}
        </div>
      </div>
      <Dialog
        open={isIssuesDialogOpen}
        onOpenChange={(open) => setIsIssuesDialogOpen(open)}
      >
        <DialogContent className='max-h-[90vh] max-w-[95vw] overflow-hidden sm:max-w-3xl'>
          <DialogHeader>
            <DialogTitle>Issues recebidas</DialogTitle>
            <DialogDescription>
              Classifique feedbacks e solicitações como em andamento ou
              resolvidas.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className='max-h-[65vh] pr-3'>
            <div className='space-y-3'>
              {isLoadingFeedbacks ? (
                <div className='space-y-3'>
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div
                      key={`feedback-skeleton-${index}`}
                      className='rounded-md border p-4'
                    >
                      <Skeleton className='h-4 w-2/3' />
                      <Skeleton className='mt-2 h-3 w-1/2' />
                      <Skeleton className='mt-4 h-16 w-full' />
                    </div>
                  ))}
                </div>
              ) : feedbacks.length === 0 ? (
                <div className='text-muted-foreground rounded-md border p-6 text-center text-sm'>
                  Nenhuma issue registrada.
                </div>
              ) : (
                feedbacks.map((feedback) => (
                  <div key={feedback.id} className='rounded-md border p-4'>
                    <div className='flex flex-wrap items-start justify-between gap-3'>
                      <div className='min-w-0 flex-1'>
                        <div className='flex flex-wrap items-center gap-2'>
                          <Badge variant='outline'>{feedback.type}</Badge>
                          <Badge className={feedbackStatusStyles[feedback.status]}>
                            {feedback.status}
                          </Badge>
                        </div>
                        <h3 className='mt-2 text-sm font-semibold'>
                          {feedback.title}
                        </h3>
                        <p className='text-muted-foreground mt-1 text-xs'>
                          {feedback.member.name || 'Membro sem nome'} - ID:{' '}
                          {feedback.member.id || '--'} -{' '}
                          {formatFeedbackDate(feedback.createdAt)}
                        </p>
                      </div>
                      <div className='flex shrink-0 flex-wrap gap-2'>
                        <Button
                          type='button'
                          size='sm'
                          variant={
                            feedback.status === 'Em andamento'
                              ? 'default'
                              : 'outline'
                          }
                          disabled={updatingFeedbackId === feedback.id}
                          onClick={() =>
                            handleFeedbackStatusChange(
                              feedback.id,
                              'Em andamento'
                            )
                          }
                        >
                          Em andamento
                        </Button>
                        <Button
                          type='button'
                          size='sm'
                          variant={
                            feedback.status === 'Resolvida'
                              ? 'default'
                              : 'outline'
                          }
                          disabled={updatingFeedbackId === feedback.id}
                          onClick={() =>
                            handleFeedbackStatusChange(feedback.id, 'Resolvida')
                          }
                        >
                          Resolvida
                        </Button>
                      </div>
                    </div>
                    <p className='mt-3 whitespace-pre-wrap text-sm leading-relaxed'>
                      {feedback.detail}
                    </p>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            resetProjectForm();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingProjectId ? 'Editar projeto' : 'Novo projeto'}
            </DialogTitle>
            <DialogDescription>
              {editingProjectId
                ? 'Atualize as informações principais do projeto.'
                : 'Adicione as informações principais do projeto.'}
            </DialogDescription>
          </DialogHeader>
          <form className='space-y-5' onSubmit={handleCreateProject}>
            <div className='space-y-2'>
              <div className='text-muted-foreground text-xs font-semibold uppercase'>
                Resumo
              </div>
              <div className='grid gap-3 sm:grid-cols-2'>
                <Input
                  placeholder='Nome do projeto'
                  value={newProject.name}
                  disabled={isSaving}
                  className='sm:col-span-2'
                  onChange={(event) =>
                    setNewProject((current) => ({
                      ...current,
                      name: event.target.value
                    }))
                  }
                />
                <Input
                  placeholder='Cliente'
                  value={newProject.client}
                  disabled={isSaving}
                  className='sm:col-span-2'
                  onChange={(event) =>
                    setNewProject((current) => ({
                      ...current,
                      client: event.target.value
                    }))
                  }
                />
              </div>
            </div>
            <div className='space-y-2'>
              <div className='text-muted-foreground text-xs font-semibold uppercase'>
                Gestão
              </div>
              <div className='grid gap-3 sm:grid-cols-2'>
                <Select
                  value={newProject.managerId}
                  disabled={
                    isSaving || isDataLoading || leadershipMembers.length === 0
                  }
                  onValueChange={(value) => {
                    const selected = leadershipMembers.find(
                      (member) => member.id === value
                    );
                    setNewProject((current) => ({
                      ...current,
                      managerId: value,
                      manager: selected?.name ?? ''
                    }));
                  }}
                >
                  <SelectTrigger
                    aria-label='Responsável'
                    className='w-full min-w-0'
                  >
                    <SelectValue
                      placeholder={
                        leadershipMembers.length === 0
                          ? 'Sem usuarios'
                          : 'Responsável'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {leadershipMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={newProject.status}
                  disabled={isSaving}
                  onValueChange={(value) =>
                    setNewProject((current) => ({
                      ...current,
                      status: value
                    }))
                  }
                >
                  <SelectTrigger
                    aria-label='Status do projeto'
                    className='w-full min-w-0'
                  >
                    <SelectValue placeholder='Status' />
                  </SelectTrigger>
                  <SelectContent>
                    {projectStatusOptions.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className='grid gap-3 sm:grid-cols-3'>
                <Select
                  value={newProject.health}
                  disabled={isSaving}
                  onValueChange={(value) =>
                    setNewProject((current) => ({
                      ...current,
                      health: value
                    }))
                  }
                >
                  <SelectTrigger aria-label='Saude do projeto'>
                    <SelectValue placeholder='Saude' />
                  </SelectTrigger>
                  <SelectContent>
                    {healthOptions.map((health) => (
                      <SelectItem key={health} value={health}>
                        {health}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className='grid gap-3 sm:grid-cols-2'>
                <Select
                  value={newProject.area}
                  disabled={isSaving}
                  onValueChange={(value) => {
                    const novosTipos =
                      value === 'Automação' ? tiposAutomacao : tiposEletrica;
                    setNewProject((current) => ({
                      ...current,
                      area: value,
                      tipo: novosTipos[0]
                    }));
                  }}
                >
                  <SelectTrigger aria-label='Area do projeto'>
                    <SelectValue placeholder='Area' />
                  </SelectTrigger>
                  <SelectContent>
                    {areaOptions.map((area) => (
                      <SelectItem key={area} value={area}>
                        {area}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={newProject.tipo}
                  disabled={isSaving}
                  onValueChange={(value) =>
                    setNewProject((current) => ({
                      ...current,
                      tipo: value
                    }))
                  }
                >
                  <SelectTrigger aria-label='Tipo do projeto'>
                    <SelectValue placeholder='Tipo' />
                  </SelectTrigger>
                  <SelectContent>
                    {(newProject.area === 'Automação'
                      ? tiposAutomacao
                      : tiposEletrica
                    ).map((tipo) => (
                      <SelectItem key={tipo} value={tipo}>
                        {tipo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className='space-y-2'>
              <div className='text-muted-foreground text-xs font-semibold uppercase'>
                Cronograma
              </div>
              <div className='grid gap-3 sm:grid-cols-2'>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type='button'
                      variant='outline'
                      disabled={isSaving}
                      className={`w-full justify-between ${
                        startDate ? '' : 'text-muted-foreground'
                      }`}
                    >
                      {startDate
                        ? format(startDate, 'dd/MM/yyyy')
                        : 'Início do projeto'}
                      <CalendarIcon className='ml-2 h-4 w-4 opacity-50' />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className='w-auto p-0' align='start'>
                    <Calendar
                      mode='single'
                      selected={startDate}
                      onSelect={(date) => {
                        setStartDate(date);
                        setNewProject((current) => ({
                          ...current,
                          start: date ? format(date, 'dd/MM/yyyy') : ''
                        }));
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <Input
                  placeholder='Próximo marco'
                  value={newProject.next}
                  disabled={isSaving}
                  onChange={(event) =>
                    setNewProject((current) => ({
                      ...current,
                      next: event.target.value
                    }))
                  }
                />
              </div>
            </div>
            <div className='space-y-2'>
              <div className='text-muted-foreground text-xs font-semibold uppercase'>
                Financeiro
              </div>
              <Input
                placeholder='Valor'
                value={newProject.value}
                disabled={isSaving}
                onChange={(event) =>
                  setNewProject((current) => ({
                    ...current,
                    value: event.target.value
                  }))
                }
              />
            </div>
            <DialogFooter>
              <Button
                type='button'
                variant='outline'
                onClick={() => setIsDialogOpen(false)}
                disabled={isSaving}
              >
                Cancelar
              </Button>
              <Button type='submit' disabled={isSaving}>
                {isSaving
                  ? 'Salvando...'
                  : editingProjectId
                    ? 'Salvar alteracoes'
                    : 'Criar projeto'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={isDeleteProjectOpen} onOpenChange={setIsDeleteProjectOpen}>
        <DialogContent className='max-w-[95vw] sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Excluir projeto</DialogTitle>
            <DialogDescription>
              Esta ação não pode ser desfeita. Deseja excluir{' '}
              <span className='font-medium'>
                {projectToDelete?.name || 'este projeto'}
              </span>
              ?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className='gap-2 sm:gap-2'>
            <Button
              type='button'
              variant='secondary'
              onClick={() => setIsDeleteProjectOpen(false)}
              disabled={isDeletingProject}
            >
              Cancelar
            </Button>
            <Button
              type='button'
              variant='destructive'
              onClick={handleDeleteProject}
              disabled={isDeletingProject}
            >
              {isDeletingProject ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={isTagsDialogOpen}
        onOpenChange={(open) => {
          setIsTagsDialogOpen(open);
          if (!open) {
            setSelectedMemberForTags(null);
            setNewTag('');
          }
        }}
      >
        <DialogContent className='max-h-[90vh] w-[95vw] max-w-[95vw] overflow-y-auto sm:max-w-lg'>
          <DialogHeader>
            <DialogTitle>Gerenciar tags</DialogTitle>
            <DialogDescription>
              {selectedMemberForTags
                ? `Tags de ${selectedMemberForTags.name}`
                : 'Adicione ou remova tags do membro'}
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-4'>
            <div className='space-y-2'>
              <label className='text-sm font-medium' htmlFor='newTag'>
                Adicionar nova tag
              </label>
              <div className='flex flex-col gap-2 sm:flex-row'>
                <Input
                  id='newTag'
                  placeholder='Nome da tag'
                  value={newTag}
                  disabled={isSavingTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                />
                <Button
                  type='button'
                  onClick={handleAddTag}
                  disabled={isSavingTag || !newTag.trim()}
                >
                  Adicionar
                </Button>
              </div>
            </div>
            <div className='space-y-2'>
              <label className='text-sm font-medium'>Tags atuais</label>
              {selectedMemberForTags?.tags &&
              selectedMemberForTags.tags.length > 0 ? (
                <div className='flex flex-wrap gap-2'>
                  {selectedMemberForTags.tags.map((tag) => (
                    <div
                      key={tag}
                      className='flex items-center gap-2 rounded-md border p-2'
                    >
                      <Badge className='capitalize'>{tag}</Badge>
                      <Button
                        type='button'
                        size='icon'
                        variant='ghost'
                        className='h-6 w-6'
                        onClick={() => handleRemoveTag(tag)}
                        disabled={isSavingTag}
                        aria-label={`Remover tag ${tag}`}
                      >
                        <FontAwesomeIcon icon={faXmark} className='h-3 w-3' />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className='text-muted-foreground rounded-md border p-4 text-center text-sm'>
                  Nenhuma tag adicionada ainda
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              type='button'
              onClick={() => setIsTagsDialogOpen(false)}
              disabled={isSavingTag}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={isBulkTagsDialogOpen}
        onOpenChange={(open) => {
          setIsBulkTagsDialogOpen(open);
          if (!open) {
            setSelectedMemberIds(new Set());
            setBulkTagName('');
            setBulkTagAction('add');
          }
        }}
      >
        <DialogContent className='max-h-[90vh] w-[95vw] max-w-[95vw] overflow-y-auto sm:max-w-2xl'>
          <DialogHeader>
            <DialogTitle>
              {bulkTagAction === 'add'
                ? 'Adicionar tag a múltiplos membros'
                : 'Remover tag de múltiplos membros'}
            </DialogTitle>
            <DialogDescription>
              {bulkTagAction === 'add'
                ? 'Selecione os membros e defina uma tag para adicionar a todos'
                : 'Selecione os membros e defina uma tag para remover de todos'}
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-4'>
            <div className='grid gap-3 sm:grid-cols-2'>
              <div className='space-y-2'>
                <label className='text-sm font-medium' htmlFor='bulkTagAction'>
                  Ação
                </label>
                <Select
                  value={bulkTagAction}
                  disabled={isSavingBulkTag}
                  onValueChange={(value) =>
                    setBulkTagAction(value as 'add' | 'remove')
                  }
                >
                  <SelectTrigger id='bulkTagAction'>
                    <SelectValue placeholder='Selecione a ação' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='add'>Adicionar tag</SelectItem>
                    <SelectItem value='remove'>Remover tag</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className='space-y-2'>
                <label className='text-sm font-medium' htmlFor='bulkTagName'>
                  Nome da tag
                </label>
                <Input
                  id='bulkTagName'
                  placeholder='Digite o nome da tag'
                  value={bulkTagName}
                  disabled={isSavingBulkTag}
                  onChange={(e) => setBulkTagName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (bulkTagAction === 'add') {
                        handleAddBulkTag();
                      } else {
                        handleRemoveBulkTag();
                      }
                    }
                  }}
                />
              </div>
            </div>
            <div className='space-y-2'>
              <div className='flex items-center justify-between'>
                <label className='text-sm font-medium'>
                  Selecionar membros ({selectedMemberIds.size} selecionado
                  {selectedMemberIds.size !== 1 ? 's' : ''})
                </label>
                <Button
                  type='button'
                  size='sm'
                  variant='ghost'
                  onClick={toggleAllMembers}
                  disabled={isSavingBulkTag}
                >
                  {selectedMemberIds.size === filteredMembers.length
                    ? 'Desmarcar todos'
                    : 'Selecionar todos'}
                </Button>
              </div>
              <ScrollArea className='h-60 rounded-md border p-4 sm:h-72 lg:h-80'>
                <div className='space-y-3'>
                  {filteredMembers.length === 0 ? (
                    <div className='text-muted-foreground text-center text-sm'>
                      Nenhum membro disponível no setor selecionado.
                    </div>
                  ) : (
                    filteredMembers.map((member) => (
                      <div
                        key={member.id}
                        className='flex items-start gap-3 rounded-md border p-3'
                      >
                        <Checkbox
                          id={`member-${member.id}`}
                          checked={selectedMemberIds.has(member.id)}
                          onCheckedChange={() =>
                            toggleMemberSelection(member.id)
                          }
                          disabled={isSavingBulkTag}
                          className='mt-0.5'
                        />
                        <label
                          htmlFor={`member-${member.id}`}
                          className='flex flex-1 cursor-pointer flex-col'
                        >
                          <span className='text-sm font-medium'>
                            {member.name}
                          </span>
                          <span className='text-muted-foreground text-xs'>
                            {member.role} - {member.sector || '--'}
                          </span>
                          {member.tags && member.tags.length > 0 && (
                            <div className='mt-1 flex flex-wrap gap-1'>
                              {member.tags.map((tag: string) => (
                                <Badge
                                  key={tag}
                                  variant='secondary'
                                  className='text-[10px]'
                                >
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </label>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
          <DialogFooter>
            <Button
              type='button'
              variant='secondary'
              onClick={() => setIsBulkTagsDialogOpen(false)}
              disabled={isSavingBulkTag}
            >
              Cancelar
            </Button>
            <Button
              type='button'
              onClick={
                bulkTagAction === 'add' ? handleAddBulkTag : handleRemoveBulkTag
              }
              disabled={
                isSavingBulkTag ||
                !bulkTagName.trim() ||
                selectedMemberIds.size === 0
              }
            >
              {isSavingBulkTag
                ? bulkTagAction === 'add'
                  ? 'Adicionando...'
                  : 'Removendo...'
                : bulkTagAction === 'add'
                  ? `Adicionar a ${selectedMemberIds.size} membro(s)`
                  : `Remover de ${selectedMemberIds.size} membro(s)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
