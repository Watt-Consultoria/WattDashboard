'use client';

import * as React from 'react';
import PageContainer from '@/components/layout/page-container';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion';
import { firebaseDb } from '@/lib/firebase/client';
import {
  firestoreDateToDate,
  firestoreDateToLabel
} from '@/lib/firestore-date';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { addWeeks, endOfWeek, format, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useFirebaseData } from '@/contexts/firebase-data-context';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { MemberSelector } from './member-selector';
import { TaskCard } from './task-card';
import { TaskSkeletons } from './task-skeletons';
import { DayTasksList } from './day-tasks-list';
import { SectorWeeklyOverview } from './sector-weekly-overview';
import {
  normalizeLabel,
  normalizeSearch,
  parseDueDate,
  priorityRank,
  priorityStyles,
  statusStyles
} from './teamview-constants';
import useMetadata from '../../../hooks/use-metadata';

export default function TeamviewPage() {
  useMetadata({
    title: 'Visão do time'
  });

  const { members, currentMember, isLoading } = useFirebaseData();
  const router = useRouter();
  const [selectedDay, setSelectedDay] = React.useState(new Date());
  const [selectedMemberId, setSelectedMemberId] = React.useState('');
  const [searchTerm, setSearchTerm] = React.useState('');
  const [viewMode, setViewMode] = React.useState('member');
  const [selectedSector, setSelectedSector] = React.useState('');
  const [sectorWeekOffset, setSectorWeekOffset] = React.useState(0);
  const [selectedMemberInfo, setSelectedMemberInfo] = React.useState({
    name: '',
    email: '',
    sector: '',
    role: ''
  });
  const [projectTasks, setProjectTasks] = React.useState([]);
  const [agendaTasks, setAgendaTasks] = React.useState([]);
  const [isLoadingTasks, setIsLoadingTasks] = React.useState(true);
  const [isLoadingSectorTasks, setIsLoadingSectorTasks] = React.useState(false);
  const [sectorWeeklyTasks, setSectorWeeklyTasks] = React.useState([]);

  const isAdmin = React.useMemo(() => {
    return (
      currentMember?.role &&
      ['diretor', 'presidente', 'assessor', 'gerente'].includes(
        currentMember?.role?.toLowerCase().trim() ?? ''
      )
    );
  }, [currentMember]);

  React.useEffect(() => {
    if (!isLoading && currentMember && !isAdmin) {
      toast.error('Acesso não autorizado', {
        description: 'Você não tem permissão para acessar esta página.'
      });
      router.push('/dashboard/individual');
    }
  }, [currentMember, isAdmin, isLoading, router]);

  React.useEffect(() => {
    if (!selectedMemberId) {
      if (currentMember?.id) {
        setSelectedMemberId(currentMember.id);
      } else if (members?.length) {
        setSelectedMemberId(members[0].id);
      }
    }
  }, [currentMember, members, selectedMemberId]);

  React.useEffect(() => {
    if (!firebaseDb || !selectedMemberId) return;

    let isActive = true;
    const loadMemberTasks = async () => {
      setIsLoadingTasks(true);
      try {
        const memberSnapshot = await getDoc(
          doc(firebaseDb, 'members', selectedMemberId)
        );

        if (!memberSnapshot.exists() || !isActive) return;

        const memberData = memberSnapshot.data();
        setSelectedMemberInfo({
          name: memberData?.name ?? '',
          email: memberData?.email ?? '',
          sector: memberData?.sector ?? '',
          role: memberData?.role ?? ''
        });

        const agenda = Array.isArray(memberData?.agendaTasks)
          ? memberData.agendaTasks.map((task) => ({
              ...task,
              source: 'agenda'
            }))
          : [];
        setAgendaTasks(agenda);

        const projectsSnapshot = await getDocs(
          collection(firebaseDb, 'projects')
        );
        if (!isActive) return;

        const tasksFromDb = [];
        projectsSnapshot.docs.forEach((projectDoc) => {
          const data = projectDoc.data();
          if (!Array.isArray(data.Activities)) return;

          data.Activities.forEach((activity) => {
            if (activity.ownerId !== selectedMemberId) return;

            tasksFromDb.push({
              id: `${projectDoc.id}-${activity.id}`,
              activityId: activity.id,
              projectId: projectDoc.id,
              projectName: data.name ?? 'Projeto',
              source: 'project',
              title: activity.name ?? 'Tarefa',
              due: firestoreDateToLabel(activity.dueAt),
              status: activity.status ?? 'Planejado',
              priority: activity.priority ?? 'Media',
              owner: activity.owner,
              ownerId: activity.ownerId,
              description: activity.description
            });
          });
        });

        setProjectTasks(tasksFromDb);
      } catch (error) {
        console.error('Falha ao carregar tarefas:', error);
        toast.error('Não foi possível carregar as tarefas.');
      } finally {
        if (isActive) setIsLoadingTasks(false);
      }
    };

    loadMemberTasks();
    return () => {
      isActive = false;
    };
  }, [selectedMemberId]);

  /* ─── Derived data ─── */
  const allTasks = React.useMemo(
    () => [...agendaTasks, ...projectTasks],
    [agendaTasks, projectTasks]
  );
  const selectedDayLabel = selectedDay ? format(selectedDay, 'dd/MM/yyyy') : '';
  const tasksForDay = selectedDayLabel
    ? allTasks.filter((task) => task.due === selectedDayLabel)
    : [];
  const priorityByDate = React.useMemo(() => {
    const map = new Map();
    allTasks.forEach((task) => {
      const parsed = parseDueDate(task.due);
      if (!parsed) return;
      const key = format(parsed, 'yyyy-MM-dd');
      const normalizedPriority = normalizeLabel(task.priority);
      const current = map.get(key);
      if (
        !current ||
        (priorityRank[normalizedPriority] || 0) > (priorityRank[current] || 0)
      ) {
        map.set(key, normalizedPriority);
      }
    });
    return map;
  }, [allTasks]);

  const calendarIndicators = React.useMemo(() => {
    const high = [];
    const medium = [];
    const low = [];
    priorityByDate.forEach((priority, key) => {
      const parsed = new Date(`${key}T00:00:00`);
      if (Number.isNaN(parsed.getTime())) return;
      if (priority === 'Alta') high.push(parsed);
      else if (priority === 'Media') medium.push(parsed);
      else low.push(parsed);
    });
    return { highPriority: high, mediumPriority: medium, lowPriority: low };
  }, [priorityByDate]);

  const sortedMembers = React.useMemo(() => {
    return [...(members || [])].sort((a, b) =>
      (a.name || '').localeCompare(b.name || '', 'pt-BR', {
        sensitivity: 'base'
      })
    );
  }, [members]);

  const sectorOptions = React.useMemo(() => {
    const set = new Set();
    (members || []).forEach((member) => {
      if (member.sector) {
        set.add(member.sector);
      }
    });
    return Array.from(set).sort((a, b) =>
      a.localeCompare(b, 'pt-BR', { sensitivity: 'base' })
    );
  }, [members]);

  const membersInSector = React.useMemo(() => {
    if (!selectedSector) {
      return [];
    }
    const sectorKey = normalizeSearch(selectedSector);
    return (members || []).filter(
      (member) => normalizeSearch(member.sector || '') === sectorKey
    );
  }, [members, selectedSector]);

  const filteredMembers = React.useMemo(() => {
    if (!searchTerm.trim()) return sortedMembers;
    const term = normalizeSearch(searchTerm);
    return sortedMembers.filter((member) => {
      const name = normalizeSearch(member.name || '');
      const sector = normalizeSearch(member.sector || '');
      const role = normalizeSearch(member.role || '');
      const email = normalizeSearch(member.email || '');
      return (
        name.includes(term) ||
        sector.includes(term) ||
        role.includes(term) ||
        email.includes(term)
      );
    });
  }, [sortedMembers, searchTerm]);

  React.useEffect(() => {
    if (!firebaseDb || !selectedSector) {
      setSectorWeeklyTasks([]);
      return;
    }

    if (membersInSector.length === 0) {
      setSectorWeeklyTasks([]);
      return;
    }

    let isActive = true;
    const loadSectorWeeklyTasks = async () => {
      setIsLoadingSectorTasks(true);
      try {
        const memberIds = membersInSector.map((member) => member.id);
        const baseDate = addWeeks(new Date(), sectorWeekOffset);
        const start = startOfWeek(baseDate, { weekStartsOn: 1 });
        const end = endOfWeek(baseDate, { weekStartsOn: 1 });

        const agendaByMember = new Map();
        const memberSnapshots = await Promise.all(
          memberIds.map((memberId) =>
            getDoc(doc(firebaseDb, 'members', memberId))
          )
        );

        memberSnapshots.forEach((snapshot) => {
          if (!snapshot.exists()) return;
          const data = snapshot.data();
          const agenda = Array.isArray(data?.agendaTasks)
            ? data.agendaTasks
            : [];
          const agendaTasksForWeek = agenda
            .map((task) => ({
              ...task,
              source: 'agenda'
            }))
            .filter((task) => {
              const due = parseDueDate(task.due);
              return due && due >= start && due <= end;
            });

          agendaByMember.set(snapshot.id, agendaTasksForWeek);
        });

        const projectsSnapshot = await getDocs(
          collection(firebaseDb, 'projects')
        );
        if (!isActive) return;

        const projectByMember = new Map();
        projectsSnapshot.docs.forEach((projectDoc) => {
          const data = projectDoc.data();
          if (!Array.isArray(data.Activities)) return;

          data.Activities.forEach((activity) => {
            if (!memberIds.includes(activity.ownerId)) return;
            const due = firestoreDateToDate(activity.dueAt);
            if (!due || due < start || due > end) return;

            const entry = {
              id: `${projectDoc.id}-${activity.id}`,
              activityId: activity.id,
              projectId: projectDoc.id,
              projectName: data.name ?? 'Projeto',
              source: 'project',
              title: activity.name ?? 'Tarefa',
              due: firestoreDateToLabel(activity.dueAt),
              status: activity.status ?? 'Planejado',
              priority: activity.priority ?? 'Media',
              owner: activity.owner,
              ownerId: activity.ownerId,
              description: activity.description
            };

            const existing = projectByMember.get(activity.ownerId) || [];
            projectByMember.set(activity.ownerId, [...existing, entry]);
          });
        });

        const combined = membersInSector.map((member) => {
          const agenda = agendaByMember.get(member.id) || [];
          const projects = projectByMember.get(member.id) || [];
          const tasks = [...agenda, ...projects].sort((a, b) => {
            const da = parseDueDate(a.due)?.getTime() || 0;
            const db = parseDueDate(b.due)?.getTime() || 0;
            return da - db;
          });
          return {
            id: member.id,
            name: member.name || 'Membro',
            tasks
          };
        });

        if (isActive) {
          setSectorWeeklyTasks(combined);
        }
      } catch (error) {
        console.error('Falha ao carregar tarefas por setor:', error);
        toast.error('Nao foi possivel carregar atividades do setor.');
      } finally {
        if (isActive) {
          setIsLoadingSectorTasks(false);
        }
      }
    };

    loadSectorWeeklyTasks();

    return () => {
      isActive = false;
    };
  }, [selectedSector, membersInSector, firebaseDb, sectorWeekOffset]);

  const calendarModifiersClassNames = {
    highPriority:
      "relative after:absolute after:bottom-1 after:left-1/2 after:h-1.5 after:w-1.5 after:-translate-x-1/2 after:rounded-full after:bg-red-500/60 after:content-['']",
    mediumPriority:
      "relative after:absolute after:bottom-1 after:left-1/2 after:h-1.5 after:w-1.5 after:-translate-x-1/2 after:rounded-full after:bg-amber-500/60 after:content-['']",
    lowPriority:
      "relative after:absolute after:bottom-1 after:left-1/2 after:h-1.5 after:w-1.5 after:-translate-x-1/2 after:rounded-full after:bg-emerald-500/60 after:content-['']"
  };

  return (
    <PageContainer
      pageTitle='Calendário da equipe'
      pageDescription='Visualize tarefas e agenda dos membros'
      hideHeaderOnMobile
    >
      <div className='flex flex-1 flex-col space-y-3 md:space-y-4'>
        {(() => {
          const sectorWeekStart = startOfWeek(
            addWeeks(new Date(), sectorWeekOffset),
            { weekStartsOn: 1 }
          );
          const sectorWeekEnd = endOfWeek(
            addWeeks(new Date(), sectorWeekOffset),
            { weekStartsOn: 1 }
          );
          const sectorWeekLabel = `Semana de ${format(sectorWeekStart, "dd 'de' MMM", { locale: ptBR })} - ${format(sectorWeekEnd, "dd 'de' MMM", { locale: ptBR })}`;
          return (
            <Tabs
              value={viewMode}
              onValueChange={setViewMode}
              className='w-full'
            >
              <TabsList className='grid h-auto w-full grid-cols-2'>
                <TabsTrigger value='member' className='py-2 text-xs'>
                  Membro
                </TabsTrigger>
                <TabsTrigger value='sector' className='py-2 text-xs'>
                  Setor
                </TabsTrigger>
              </TabsList>
              <TabsContent value='member' className='mt-3'>
                <MemberSelector
                  isLoading={isLoading}
                  sortedMembers={sortedMembers}
                  filteredMembers={filteredMembers}
                  searchTerm={searchTerm}
                  onSearchChange={setSearchTerm}
                  selectedMemberId={selectedMemberId}
                  onMemberChange={setSelectedMemberId}
                  selectedMemberInfo={selectedMemberInfo}
                />
              </TabsContent>
              <TabsContent value='sector' className='mt-3'>
                <SectorWeeklyOverview
                  sectors={sectorOptions}
                  selectedSector={selectedSector}
                  onSectorChange={setSelectedSector}
                  weekLabel={sectorWeekLabel}
                  weekStart={sectorWeekStart}
                  onPrevWeek={() => setSectorWeekOffset((value) => value - 1)}
                  onNextWeek={() => setSectorWeekOffset((value) => value + 1)}
                  isLoading={isLoadingSectorTasks}
                  items={sectorWeeklyTasks}
                />
              </TabsContent>
            </Tabs>
          );
        })()}
        {/* ═══════ Mobile Layout ═══════ */}
        {viewMode === 'member' ? (
          <div className='block lg:hidden'>
            <Tabs defaultValue='calendar' className='w-full'>
              <TabsList className='grid h-auto w-full grid-cols-2'>
                <TabsTrigger value='calendar' className='py-2 text-xs'>
                  Calendário
                </TabsTrigger>
                <TabsTrigger value='tasks' className='py-2 text-xs'>
                  Tarefas
                </TabsTrigger>
              </TabsList>

              {/* ── Calendário Tab ── */}
              <TabsContent value='calendar' className='mt-3'>
                <Card>
                  <CardHeader className='pb-3'>
                    <CardTitle className='text-lg'>Calendário</CardTitle>
                    <CardDescription className='text-xs'>
                      Dias com atividades
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className='space-y-3'>
                      {isLoadingTasks ? (
                        <Skeleton className='h-80 w-full' />
                      ) : (
                        <div className='flex justify-center overflow-x-auto'>
                          <Calendar
                            mode='single'
                            selected={selectedDay}
                            onSelect={setSelectedDay}
                            locale={ptBR}
                            modifiers={calendarIndicators}
                            modifiersClassNames={calendarModifiersClassNames}
                            className='w-full max-w-sm rounded-md border'
                          />
                        </div>
                      )}

                      <div className='rounded-lg border p-3'>
                        <div className='text-muted-foreground mb-2 text-xs font-semibold uppercase'>
                          Atividades do dia
                        </div>
                        <div className='mb-3 text-sm font-medium'>
                          {selectedDayLabel || 'Selecione uma data'}
                        </div>
                        <DayTasksList
                          isLoading={isLoadingTasks}
                          tasks={tasksForDay}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ── Tarefas Tab ── */}
              <TabsContent value='tasks' className='mt-3'>
                <Card>
                  <CardHeader className='pb-3'>
                    <CardTitle className='text-lg'>Todas as tarefas</CardTitle>
                    <CardDescription className='text-xs'>
                      {allTasks.length} atividade
                      {allTasks.length !== 1 ? 's' : ''}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoadingTasks ? (
                      <TaskSkeletons count={4} />
                    ) : allTasks.length === 0 ? (
                      <div className='text-muted-foreground py-8 text-center text-sm'>
                        Nenhuma tarefa encontrada.
                      </div>
                    ) : (
                      <Accordion type='single' collapsible className='w-full'>
                        {allTasks.map((task) => {
                          const nStatus = normalizeLabel(task.status);
                          const nPriority = normalizeLabel(task.priority);
                          return (
                            <AccordionItem key={task.id} value={task.id}>
                              <AccordionTrigger className='py-3 hover:no-underline'>
                                <div className='flex w-full items-start justify-between gap-2 pr-2'>
                                  <div className='flex min-w-0 flex-col items-start text-left'>
                                    <span className='line-clamp-1 text-sm font-medium'>
                                      {task.title}
                                    </span>
                                    <span className='text-muted-foreground text-xs'>
                                      {task.due} &middot;{' '}
                                      {task.projectName || 'Agenda'}
                                    </span>
                                  </div>
                                  <div className='flex shrink-0 flex-col items-end gap-1'>
                                    <Badge
                                      className={`${statusStyles[nStatus] || ''} px-1.5 py-0 text-[10px]`}
                                    >
                                      {task.status}
                                    </Badge>
                                    <Badge
                                      className={`${priorityStyles[nPriority] || ''} px-1.5 py-0 text-[10px]`}
                                    >
                                      {task.priority}
                                    </Badge>
                                  </div>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent>
                                <div className='space-y-2 pt-2'>
                                  {task.description ? (
                                    <p className='text-muted-foreground text-justify text-sm break-all md:break-words'>
                                      {task.description}
                                    </p>
                                  ) : null}
                                  {task.projectId ? (
                                    <div className='flex justify-end'>
                                      <Button
                                        asChild
                                        size='sm'
                                        variant='outline'
                                        className='h-8 text-xs'
                                      >
                                        <Link
                                          href={`/dashboard/acompanhamento/projetos/${task.projectId}`}
                                        >
                                          Abrir projeto
                                        </Link>
                                      </Button>
                                    </div>
                                  ) : null}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          );
                        })}
                      </Accordion>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        ) : null}

        {/* ═══════ Desktop Layout ═══════ */}
        {viewMode === 'member' ? (
          <div className='hidden lg:flex lg:flex-col lg:gap-4'>
            <div className='grid gap-4 lg:grid-cols-2'>
              {/* Calendário + atividades do dia */}
              <Card className='h-[480px]'>
                <CardHeader>
                  <CardTitle>Calendário</CardTitle>
                  <CardDescription>Dias com atividades</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className='grid gap-4 md:grid-cols-[260px_minmax(0,1fr)]'>
                    {isLoadingTasks ? (
                      <Skeleton className='h-72 w-full' />
                    ) : (
                      <Calendar
                        mode='single'
                        selected={selectedDay}
                        onSelect={setSelectedDay}
                        locale={ptBR}
                        modifiers={calendarIndicators}
                        modifiersClassNames={calendarModifiersClassNames}
                      />
                    )}
                    <div className='flex flex-col rounded-md border p-3'>
                      <div className='text-muted-foreground text-xs font-semibold uppercase'>
                        Atividades do dia
                      </div>
                      <div className='mt-1 text-sm font-medium'>
                        {selectedDayLabel || 'Selecione uma data'}
                      </div>
                      <ScrollArea className='mt-3 flex-1 pr-2'>
                        <DayTasksList
                          isLoading={isLoadingTasks}
                          tasks={tasksForDay}
                        />
                      </ScrollArea>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Lista de todas as tarefas */}
              <Card className='h-[480px]'>
                <CardHeader>
                  <CardTitle>Todas as tarefas</CardTitle>
                  <CardDescription>
                    {allTasks.length} atividade
                    {allTasks.length !== 1 ? 's' : ''}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className='h-[340px] pr-3'>
                    <div className='space-y-2'>
                      {isLoadingTasks ? (
                        <TaskSkeletons count={5} />
                      ) : allTasks.length === 0 ? (
                        <div className='text-muted-foreground py-8 text-center text-sm'>
                          Nenhuma tarefa encontrada.
                        </div>
                      ) : (
                        allTasks.map((task) => (
                          <TaskCard key={task.id} task={task} />
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : null}
      </div>
    </PageContainer>
  );
}
