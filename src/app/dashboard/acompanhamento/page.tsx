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
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
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
import { PieGraph } from '@/features/overview/components/pie-graph';
import { firebaseDb } from '@/lib/firebase/client';
import { useFirebaseData } from '@/contexts/firebase-data-context';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc
} from 'firebase/firestore';
import { FirebaseError } from 'firebase/app';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';
import type {
  Project as FirebaseProject,
  Member as FirebaseMember
} from '@/contexts/firebase-data-context';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPenToSquare } from '@fortawesome/free-regular-svg-icons';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { useRouter } from 'next/navigation';

type Project = {
  id: string;
  name: string;
  status: string;
  updated: string;
  health: string;
  area?: string;
  tipo?: string;
  client?: string;
  manager?: string;
  managerId?: string;
  start?: string;
  next?: string;
  value?: string;
};

type Member = {
  id: string;
  name: string;
  email?: string;
  sector?: string;
  cpf?: string;
  role: string;
  activity: string;
  status: string;
  isLeadership?: boolean;
};

const alerts = [
  {
    id: 'alert-1',
    title: 'API instável',
    detail: 'Picos de erro no serviço de pedidos',
    level: 'alto',
    time: 'há 10 min'
  },
  {
    id: 'alert-2',
    title: 'Fila de e-mails',
    detail: 'Processamento acima do esperado',
    level: 'médio',
    time: 'há 45 min'
  },
  {
    id: 'alert-3',
    title: 'Deploy pendente',
    detail: 'Aguardando aprovação do time',
    level: 'baixo',
    time: 'há 2 horas'
  }
];

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
const tiposAutomacao = ['Domótica', 'Industrial'];
const tiposEletrica = ['Projeto Elétrico', 'Solar'];
const defaultMemberStatus = 'online';
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

const memberStatusStyles: Record<string, string> = {
  online: 'bg-emerald-500/10 text-emerald-700',
  away: 'bg-amber-500/10 text-amber-700',
  offline: 'bg-muted text-muted-foreground'
};

const alertLevelStyles: Record<string, string> = {
  alto: 'bg-red-500/10 text-red-700',
  medio: 'bg-amber-500/10 text-amber-700',
  baixo: 'bg-emerald-500/10 text-emerald-700'
};

type ProjectFormState = {
  name: string;
  status: string;
  health: string;
  area: string;
  tipo: string;
  client: string;
  manager: string;
  managerId: string;
  start: string;
  next: string;
  value: string;
};

type MemberFormState = {
  name: string;
  email: string;
  sector: string;
  cpf: string;
  role: string;
};

export default function AcompanhamentoPage() {
  const router = useRouter();
  const {
    projects: contextProjects,
    members: contextMembers,
    isLoading: isDataLoading
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
  const [isMemberDialogOpen, setIsMemberDialogOpen] = React.useState(false);
  const [isSavingMember, setIsSavingMember] = React.useState(false);
  const [startDate, setStartDate] = React.useState<Date | undefined>(undefined);

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
  const [newMember, setNewMember] = React.useState<MemberFormState>({
    name: '',
    email: '',
    sector: sectorOptions[0],
    cpf: '',
    role: roleOptions[0]
  });
  const [emailHint, setEmailHint] = React.useState('@wattconsultoria.com.br');

  const handleEmailBlur = () => {
    const email = newMember.email.trim();
    if (!email) {
      setEmailHint('@wattconsultoria.com.br');
      return;
    }

    if (!email.includes('@')) {
      setNewMember((current) => ({
        ...current,
        email: `${email}@wattconsultoria.com.br`
      }));
    }
  };

  // Mapear projects do contexto para o formato da UI
  const projectList = React.useMemo(() => {
    return contextProjects.map((project) => {
      const updatedLabel = project.updatedAt
        ? format(
            project.updatedAt.toDate?.() || project.updatedAt,
            'dd/MM/yyyy'
          )
        : '---';
      const startLabel = project.start
        ? format(project.start.toDate?.() || project.start, 'dd/MM/yyyy')
        : '';

      return {
        id: project.id,
        name: project.name ?? 'Projeto sem nome',
        status: project.status ?? 'Planejamento',
        updated: updatedLabel,
        health: project.health ?? 'Ok',
        area: project.area,
        tipo: project.tipo,
        client: project.client,
        manager: project.manager,
        managerId: project.managerId,
        start: startLabel,
        next: project.next,
        value: project.value?.toString()
      };
    });
  }, [contextProjects]);

  // Mapear members do contexto
  const normalizeValue = React.useCallback(
    (value?: string) =>
      value
        ?.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') ?? '',
    []
  );

  const toMemberCard = React.useCallback(
    (member: FirebaseMember) => ({
      id: member.id,
      name: member.name ?? 'Sem nome',
      email: member.email,
      sector: member.sector,
      cpf: member.cpf,
      role: member.role ?? 'Sem cargo',
      activity: member.activity ?? 'Sem atividade',
      status: member.status ?? 'offline',
      isLeadership: member.isLeadership
    }),
    []
  );

  const memberList = React.useMemo(
    () => contextMembers.map(toMemberCard),
    [contextMembers, toMemberCard]
  );

  const scopedMembers = React.useMemo(() => {
    if (areaFilter === 'Geral') {
      return contextMembers;
    }
    const selectedSector = normalizeValue(areaFilter);
    return contextMembers.filter(
      (member) => normalizeValue(member.sector) === selectedSector
    );
  }, [areaFilter, contextMembers, normalizeValue]);

  const filteredMembers = React.useMemo(() => {
    return scopedMembers.map(toMemberCard);
  }, [scopedMembers, toMemberCard]);

  const parseAgendaDueDate = React.useCallback((value?: string) => {
    if (!value) {
      return null;
    }
    if (value.includes('/')) {
      const parts = value.split('/');
      if (parts.length !== 3) {
        return null;
      }
      const [day, month, year] = parts;
      const parsed = new Date(
        Number.parseInt(year, 10),
        Number.parseInt(month, 10) - 1,
        Number.parseInt(day, 10)
      );
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    const parsed = value.includes('T')
      ? new Date(value)
      : new Date(`${value}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }, []);

  const occupancyMetrics = React.useMemo(() => {
    const isGeneral = areaFilter === 'Geral';
    const selectedSector = normalizeValue(areaFilter);
    const scopedMembers = isGeneral
      ? contextMembers
      : contextMembers.filter(
          (member) => normalizeValue(member.sector) === selectedSector
        );

    const memberIds = new Set(scopedMembers.map((member) => member.id));
    const occupiedIds = new Set<string>();
    const today = new Date();
    const startOfToday = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    const endDate = new Date(startOfToday);
    endDate.setDate(endDate.getDate() + 7);

    contextProjects.forEach((project) => {
      const activities = (project as any)?.Activities as
        | Array<{
            ownerId?: string;
            status?: string;
          }>
        | undefined;
      if (!Array.isArray(activities)) return;

      activities.forEach((activity) => {
        const status = normalizeValue(activity?.status ?? '');
        if (
          activity?.ownerId &&
          memberIds.has(activity.ownerId) &&
          status !== 'bloqueado' &&
          status !== 'concluido'
        ) {
          occupiedIds.add(activity.ownerId);
        }
      });
    });

    scopedMembers.forEach((member) => {
      const agendaTasks = (member as any)?.agendaTasks as
        | Array<{
            priority?: string;
            status?: string;
            due?: string;
          }>
        | undefined;
      if (
        Array.isArray(agendaTasks) &&
        agendaTasks.some((task) => {
          const priority = normalizeValue(task?.priority ?? '');
          if (priority !== 'alta') {
            return false;
          }
          const status = normalizeValue(task?.status ?? '');
          if (status === 'bloqueado' || status === 'concluido') {
            return false;
          }
          const dueDate = parseAgendaDueDate(task?.due);
          if (!dueDate) {
            return false;
          }
          return dueDate >= startOfToday && dueDate <= endDate;
        })
      ) {
        occupiedIds.add(member.id);
      }
    });

    const totalMembers = scopedMembers.length;
    const occupiedCount = occupiedIds.size;
    const availableCount = Math.max(totalMembers - occupiedCount, 0);
    const occupiedPercent =
      totalMembers === 0 ? 0 : Math.round((occupiedCount / totalMembers) * 100);

    return {
      totalMembers,
      occupiedCount,
      availableCount,
      occupiedPercent
    };
  }, [
    areaFilter,
    contextMembers,
    contextProjects,
    normalizeValue,
    parseAgendaDueDate
  ]);

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
      memberList.filter((member) => member.role.toLowerCase() != 'consultor')
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
      normalizeValue(project.area) === normalizeValue(areaFilter);

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

    if (!newProject.name.trim()) {
      toast.error('Informe o nome do projeto.');
      return;
    }

    if (!newProject.managerId) {
      toast.error('Selecione um responsável.');
      return;
    }

    if (!firebaseDb) {
      toast.error('Firebase nao configurado.');
      return;
    }

    const selectedManager = leadershipMembers.find(
      (member) => member.id === newProject.managerId
    );
    if (!selectedManager) {
      toast.error('Selecione um responsável válido.');
      return;
    }
    const managerName = selectedManager.name;

    const parseValueToNumber = (value: string): number => {
      if (!value) return 0;
      const cleanValue = value
        .replace(/R\$/g, '')
        .replace(/\s/g, '')
        .replace(/\./g, '')
        .replace(',', '.');
      const parsed = parseFloat(cleanValue);
      return isNaN(parsed) ? 0 : parsed;
    };

    const projectPayload = {
      name: newProject.name.trim(),
      status: newProject.status,
      health: newProject.health,
      area: newProject.area,
      tipo: newProject.tipo,
      client: newProject.client.trim(),
      manager: managerName,
      managerId: newProject.managerId,
      start: startDate ? Timestamp.fromDate(startDate) : null,
      next: newProject.next.trim(),
      value: parseValueToNumber(newProject.value.trim()),
      updatedLabel: 'agora',
      updatedAt: serverTimestamp()
    };

    setIsSaving(true);
    try {
      if (editingProjectId) {
        const projectRef = doc(firebaseDb, 'projects', editingProjectId);
        await updateDoc(projectRef, projectPayload);
        toast.success('Projeto atualizado com sucesso.');
      } else {
        await addDoc(collection(firebaseDb, 'projects'), {
          ...projectPayload,
          createdAt: serverTimestamp()
        });
        toast.success('Projeto criado com sucesso.');
      }
      resetProjectForm();
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Falha ao salvar projeto:', error);
      if (error instanceof FirebaseError) {
        toast.error(`Não foi possível salvar o projeto: ${error.code}`);
      } else {
        toast.error('Não foi possível salvar o projeto.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!firebaseDb || !projectToDelete) {
      return;
    }

    setIsDeletingProject(true);
    try {
      await deleteDoc(doc(firebaseDb, 'projects', projectToDelete.id));
      toast.success('Projeto removido.');
      setIsDeleteProjectOpen(false);
      setProjectToDelete(null);
    } catch (error) {
      console.error('Falha ao remover projeto:', error);
      toast.error('Não foi possível remover o projeto.');
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

  const membersCard = (
    <Card className='flex h-full flex-col lg:h-105'>
      <CardHeader>
        <div className='flex flex-wrap items-center justify-between gap-2'>
          <div>
            <CardTitle>Membros da equipe</CardTitle>
            <CardDescription>Última atividade registrada</CardDescription>
          </div>
          <Badge variant='secondary'>Total: {contextMembers.length}</Badge>
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
                <Link
                  key={member.id}
                  href={`/dashboard/acompanhamento/membros/${member.id}`}
                  className='hover:bg-accent focus-visible:ring-ring/50 flex w-full items-start justify-between gap-3 rounded-md border p-3 text-left transition-colors focus-visible:ring-[3px] focus-visible:outline-none'
                >
                  <div className='flex flex-col'>
                    <span className='text-sm font-medium'>{member.name}</span>
                    <span className='text-muted-foreground text-xs'>
                      {member.role} - {member.activity}
                    </span>
                  </div>
                  <Badge variant='outline'>{member.sector || '--'}</Badge>
                </Link>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );

  const alertsCard = (
    <Card className='flex h-full flex-col lg:h-105'>
      <CardHeader>
        <CardTitle>Alertas recentes</CardTitle>
        <CardDescription>Eventos que exigem atenção</CardDescription>
      </CardHeader>
      <CardContent className='flex-1 overflow-auto'>
        <div className='space-y-3'>
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className='flex items-start justify-between gap-3 rounded-md border p-3'
            >
              <div className='flex flex-col'>
                <span className='text-sm font-medium'>{alert.title}</span>
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
      </CardContent>
    </Card>
  );

  const handleCreateMember = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!newMember.name.trim()) {
      toast.error('Informe o nome do membro.');
      return;
    }

    if (
      !newMember.email.trim() ||
      !newMember.sector.trim() ||
      !newMember.cpf.trim() ||
      !newMember.role.trim()
    ) {
      toast.error('Preencha nome, email, setor, CPF e cargo.');
      return;
    }

    if (!firebaseDb) {
      toast.error('Firebase nao configurado.');
      return;
    }

    const roleValue = newMember.role.trim() || 'Sem cargo';
    const memberDoc = doc(collection(firebaseDb, 'members'));
    const isLeadership = newMember.role !== 'Consultor';
    const memberPayload = {
      id: memberDoc.id,
      name: newMember.name.trim(),
      email: newMember.email.trim(),
      sector: newMember.sector.trim(),
      cpf: newMember.cpf.trim(),
      role: roleValue,
      activity: 'Novo cadastro',
      status: defaultMemberStatus,
      isLeadership,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    setIsSavingMember(true);
    try {
      await setDoc(memberDoc, memberPayload);
      // O contexto atualiza automaticamente via onSnapshot
      toast.success('Membro criado com sucesso.');
      setNewMember({
        name: '',
        email: '',
        sector: '',
        cpf: '',
        role: roleOptions[0]
      });
      setIsMemberDialogOpen(false);
    } catch (error) {
      toast.error('Não foi possível salvar o membro.');
    } finally {
      setIsSavingMember(false);
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
              <TabsTrigger value='alerts' className='py-2 text-xs'>
                Alertas
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
              value='alerts'
              className='mt-3 flex min-h-0 flex-1 flex-col'
            >
              {alertsCard}
            </TabsContent>
          </Tabs>
        </div>

        <div className='*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card hidden grid-cols-1 gap-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:shadow-xs lg:grid lg:grid-cols-2'>
          {projectsCardDesktop}
          {occupancyCard}
          {membersCard}
          {alertsCard}
        </div>
      </div>
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
    </PageContainer>
  );
}
