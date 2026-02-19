'use client';
import * as React from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPenToSquare } from '@fortawesome/free-regular-svg-icons';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import PageContainer from '@/components/layout/page-container';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion';
import { firebaseDb } from '@/lib/firebase/client';
import { firestoreDateToLabel } from '@/lib/firestore-date';
import type { FirestoreDateValue } from '@/lib/firestore-date';
import {
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where
} from 'firebase/firestore';
import { format } from 'date-fns';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { useAuth } from '@/features/auth/components/auth-provider';
import { useFcmToken } from '@/hooks/use-fcm';
import memberService from '@/services/memberService';
import { Member, TimeRecord, WeekShedule } from '@/types/member/member';
import useMetadata from '@/hooks/use-metadata';
import {
  WeekScheduleEditor,
  WeekScheduleEditorSkeleton
} from '@/components/week-schedule-editor';

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
  Média: 'bg-amber-500/10 text-amber-700',
  Baixa: 'bg-emerald-500/10 text-emerald-700'
};
const priorityOptions = ['Alta', 'Média', 'Baixa'];

const statusStyles: Record<string, string> = {
  'Em andamento': 'bg-primary/10 text-primary',
  Planejado: 'bg-muted text-muted-foreground',
  Bloqueado: 'bg-red-500/10 text-red-700',
  Concluido: 'bg-emerald-500/10 text-emerald-700'
};
const statusOptions = ['Planejado', 'Em andamento', 'Bloqueado', 'Concluído'];

const priorityRank: Record<string, number> = {
  Alta: 3,
  Média: 2,
  Baixa: 1
};

const alerts: MemberAlert[] = [];

const alertLevelStyles: Record<string, string> = {
  alto: 'bg-red-500/10 text-red-700',
  médio: 'bg-amber-500/10 text-amber-700',
  baixo: 'bg-emerald-500/10 text-emerald-700'
};

const STORAGE_KEYS = {
  member: 'individual.member',
  tasks: 'individual.tasks'
} as const;

type CachedTimeRecord = { id: string; type: string; timestamp: string };
type MemberCacheData = Partial<MemberInfo> & {
  tasks?: MemberTask[];
  alerts?: MemberAlert[];
  agendaTasks?: MemberTask[];
  timeRecords?: { id: string; type: string; timestamp: any }[];
};
type MemberCachePayload = {
  memberId: string;
  data: Partial<MemberInfo> & {
    tasks?: MemberTask[];
    alerts?: MemberAlert[];
    agendaTasks?: MemberTask[];
    timeRecords?: CachedTimeRecord[];
  };
};
type TasksCachePayload = {
  memberId: string;
  tasks: MemberTask[];
};

const readFromStorage = <T,>(key: string): T | null => {
  if (typeof window === 'undefined') return null;
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : null;
  } catch {
    return null;
  }
};

const writeToStorage = (key: string, value: unknown) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota or serialization errors
  }
};

const toCachedTimeRecords = (
  records: { id: string; type: string; timestamp: any }[]
): CachedTimeRecord[] =>
  records
    .map((record) => ({
      id: record.id,
      type: record.type,
      timestamp: record.timestamp?.toDate
        ? record.timestamp.toDate().toISOString()
        : record.timestamp instanceof Date
          ? record.timestamp.toISOString()
          : ''
    }))
    .filter((record) => Boolean(record.timestamp));

const fromCachedTimeRecords = (records?: CachedTimeRecord[]) => {
  if (!Array.isArray(records))
    return [] as { id: string; type: string; timestamp: any }[];
  return records.map((record) => ({
    ...record,
    timestamp: {
      toDate: () => new Date(record.timestamp)
    }
  }));
};

const storeMemberCache = (memberId: string, data: MemberCacheData) => {
  writeToStorage(STORAGE_KEYS.member, {
    memberId,
    data: {
      ...data,
      timeRecords: toCachedTimeRecords(data.timeRecords ?? [])
    }
  } satisfies MemberCachePayload);
};

const storeTasksCache = (memberId: string, tasks: MemberTask[]) => {
  writeToStorage(STORAGE_KEYS.tasks, {
    memberId,
    tasks
  } satisfies TasksCachePayload);
};

const parseDueDate = (value: string) => {
  if (!value) {
    return null;
  }
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
};

const formatDateLabel = (value: string) => {
  if (!value) {
    return '';
  }
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return format(parsed, 'dd/MM/yyyy');
};

const toInputDate = (value: string) => {
  if (!value) {
    return '';
  }
  const parts = value.split('/');
  if (parts.length !== 3) {
    return '';
  }
  const [day, month, year] = parts;
  return `${year}-${month}-${day}`;
};

const getWeekStart = (date: Date) => {
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const weekStart = new Date(date);
  weekStart.setDate(date.getDate() + diff);
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
};

const calculateWorkedHours = (records: { type: string; timestamp: any }[]) => {
  let totalMinutes = 0;
  let lastEntrada: Date | null = null;

  const sorted = [...records].sort((a, b) => {
    const timeA = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : 0;
    const timeB = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : 0;
    return timeA - timeB;
  });

  for (const record of sorted) {
    if (!record.timestamp?.toDate) continue;

    const recordDate = record.timestamp.toDate();

    if (record.type === 'Entrada') {
      lastEntrada = recordDate;
    } else if (record.type === 'Saída' && lastEntrada) {
      const diff = recordDate.getTime() - lastEntrada.getTime();
      totalMinutes += diff / (1000 * 60);
      lastEntrada = null;
    }
  }

  return totalMinutes / 60;
};

function NotFoundMember() {
  const router = useRouter();

  return (
    <div className='absolute top-1/2 left-1/2 mb-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center text-center'>
      <span className='from-foreground bg-linear-to-b to-transparent bg-clip-text text-[10rem] leading-none font-extrabold text-transparent'>
        404
      </span>
      <h2 className='font-heading my-2 text-2xl font-bold'>
        Você não está cadastrado
      </h2>
      <p>Seu email não está registrado no sistema.</p>
      <div className='mt-8 flex justify-center gap-2'>
        <Button
          onClick={() => router.push('/dashboard')}
          variant='default'
          size='lg'
        >
          Ir para Dashboard
        </Button>
      </div>
    </div>
  );
}

export default function IndividualPage() {
  useMetadata({ title: 'Dashboard Individual' });

  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [memberId, setMemberId] = React.useState('');
  const [memberNotFound, setMemberNotFound] = React.useState(false);
  const [isMemberLoading, setIsMemberLoading] = React.useState(true);
  const [isProjectTasksLoading, setIsProjectTasksLoading] =
    React.useState(true);
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
  const [projectTasks, setProjectTasks] = React.useState<MemberTask[]>([]);
  const [agendaTasks, setAgendaTasks] = React.useState<MemberTask[]>([]);
  const [memberAlerts, setMemberAlerts] = React.useState<MemberAlert[]>(alerts);
  const [activeTask, setActiveTask] = React.useState<MemberTask | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = React.useState(false);
  const [isSavingEdit, setIsSavingEdit] = React.useState(false);
  const [deletingAgendaId, setDeletingAgendaId] = React.useState<string | null>(
    null
  );
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);
  const [taskToDelete, setTaskToDelete] = React.useState<MemberTask | null>(
    null
  );
  const [isEditAgendaModalOpen, setIsEditAgendaModalOpen] =
    React.useState(false);
  const [agendaTaskToEdit, setAgendaTaskToEdit] =
    React.useState<MemberTask | null>(null);
  const [isSavingAgendaEdit, setIsSavingAgendaEdit] = React.useState(false);
  const [timeRecords, setTimeRecords] = React.useState<
    { id: string; type: string; timestamp: any }[]
  >([]);
  const [isBatingPonto, setIsBatingPonto] = React.useState(false);
  const [editStatus, setEditStatus] = React.useState(statusOptions[1]);
  const [updateNote, setUpdateNote] = React.useState('');
  const [isSavingAgenda, setIsSavingAgenda] = React.useState(false);
  const [weekTimeRecords, setWeekTimeRecords] = React.useState<
    { id: string; type: string; timestamp: any }[]
  >([]);
  const [currentRunningTime, setCurrentRunningTime] = React.useState(0);
  const [hoveredTaskId, setHoveredTaskId] = React.useState<string | null>(null);
  const [hoveredEditTaskId, setHoveredEditTaskId] = React.useState<
    string | null
  >(null);
  const [agendaForm, setAgendaForm] = React.useState({
    date: '',
    title: '',
    description: '',
    priority: priorityOptions[1],
    status: statusOptions[0]
  });
  const [agendaEditForm, setAgendaEditForm] = React.useState({
    date: '',
    title: '',
    description: '',
    priority: priorityOptions[1],
    status: statusOptions[0]
  });

  const [weekSchedule, setWeekSchedule] = React.useState<
    WeekShedule | undefined
  >(undefined);

  useFcmToken();

  const [minWeeklyHours, setMinWeeklyHours] = React.useState(4);

  // Subscribe to global weekly hours setting
  React.useEffect(() => {
    if (!firebaseDb || authLoading) return;
    const globalRef = doc(firebaseDb, 'GlobalInfo', 'globalInformations');
    const unsubscribe = onSnapshot(
      globalRef,
      (docSnapshot) => {
        console.log(
          'GlobalInfo snapshot:',
          docSnapshot.exists(),
          docSnapshot.data()
        );
        if (docSnapshot.exists()) {
          const data = docSnapshot.data();
          console.log('Semanal Hours from DB:', data.semanalHours);
          if (data.semanalHours !== undefined) {
            setMinWeeklyHours(Number(data.semanalHours));
          }
        }
      },
      (error) => {
        console.error('Erro ao buscar horas semanais:', error);
      }
    );
    return () => unsubscribe();
  }, [authLoading]);

  const buildMemberCache = React.useCallback(
    (overrides: Partial<MemberCacheData> = {}) => ({
      ...memberInfo,
      alerts: memberAlerts,
      agendaTasks,
      timeRecords: weekTimeRecords,
      ...overrides
    }),
    [memberInfo, memberAlerts, agendaTasks, weekTimeRecords]
  );
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
      } else if (priority === 'Média') {
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

  React.useEffect(() => {
    if (authLoading || !user?.email) {
      return;
    }

    let isActive = true;
    setIsMemberLoading(true);

    const applyMemberSnapshot = (memberData: Partial<Member>) => {
      setMemberId(memberData.id ?? '');
      setMemberInfo({
        name: memberData.name ?? '',
        email: memberData.email ?? '',
        sector: memberData.sector ?? '',
        cpf: memberData.cpf ?? '',
        role: memberData.role ?? ''
      });

      if (memberData.weekSchedule) {
        setWeekSchedule(memberData.weekSchedule);
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const weekStart = getWeekStart(new Date());
      const allRecords = memberData.timeRecords ?? [];

      console.log('=== DEBUG PONTO ===');
      console.log('Total de registros no Firestore:', allRecords.length);
      console.log('Data de hoje:', today);
      console.log('Início da semana (segunda-feira):', weekStart);

      const todayRecords = allRecords.filter((r: TimeRecord) => {
        if (!r.timestamp?.toDate) return false;
        const recordDate = r.timestamp.toDate();
        return recordDate >= today && recordDate < tomorrow;
      });
      console.log('Registros de hoje filtrados:', todayRecords.length);
      setTimeRecords(todayRecords);

      const weekRecords = allRecords.filter((r: TimeRecord) => {
        if (!r.timestamp?.toDate) return false;
        const recordDate = r.timestamp.toDate();
        const isInWeek = recordDate >= weekStart;
        if (isInWeek) {
          console.log('Registro da semana:', {
            type: r.type,
            date: recordDate.toLocaleString(),
            weekStart: weekStart.toLocaleString()
          });
        }
        return isInWeek;
      });
      console.log('Registros da semana filtrados:', weekRecords.length);
      console.log('===================');
      setWeekTimeRecords(weekRecords);

      if (Array.isArray(memberData.agendaTasks)) {
        setAgendaTasks(
          memberData.agendaTasks.map((task) => ({
            ...task,
            source: 'agenda'
          }))
        );
      } else {
        setAgendaTasks([]);
      }
      if (Array.isArray(memberData.alerts)) {
        setMemberAlerts(memberData.alerts);
      } else {
        setMemberAlerts(alerts);
      }
    };

    const loadFromCache = () => {
      const cached = readFromStorage<MemberCachePayload>(STORAGE_KEYS.member);
      if (!cached || cached.memberId !== user.uid) {
        return false;
      }
      const hydrated = {
        ...cached.data,
        timeRecords: fromCachedTimeRecords(cached.data.timeRecords)
      };
      applyMemberSnapshot({ ...hydrated, id: cached.memberId } as Member);
      setMemberNotFound(false);
      setIsMemberLoading(false);
      return true;
    };

    const loadMember = async () => {
      try {
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          if (loadFromCache()) {
            return;
          }
        }

        const member = await memberService.getMemberProfile(user.uid);

        if (member && isActive) {
          applyMemberSnapshot(member);
          storeMemberCache(member.id, member);
        } else if (isActive) {
          setMemberNotFound(true);
        }
      } catch (error) {
        const usedCache = loadFromCache();
        console.error('Falha ao carregar membro:', error);
        if (!usedCache) {
          toast.error('Não foi possível carregar seus dados.');
        } else {
          toast.message('Exibindo dados offline.');
        }
      } finally {
        if (isActive) {
          setIsMemberLoading(false);
        }
      }
    };

    loadMember();

    return () => {
      isActive = false;
    };
  }, [user, authLoading]);

  React.useEffect(() => {
    if (!firebaseDb || !memberId) {
      return;
    }
    const db = firebaseDb;

    let isActive = true;
    setIsProjectTasksLoading(true);
    const loadTasksFromCache = () => {
      const cached = readFromStorage<TasksCachePayload>(STORAGE_KEYS.tasks);
      if (!cached || cached.memberId !== memberId) {
        return false;
      }
      setProjectTasks(cached.tasks);
      setIsProjectTasksLoading(false);
      return true;
    };
    const loadTasks = async () => {
      try {
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          if (loadTasksFromCache()) {
            return;
          }
        }

        const activitiesQuery = query(
          collectionGroup(db, 'activities'),
          where('ownerId', '==', memberId)
        );
        const snapshot = await getDocs(activitiesQuery);
        if (!isActive) {
          return;
        }

        const projectNameCache = new Map<string, string>();
        const missingProjectIds = new Set<string>();

        snapshot.docs.forEach((activityDoc) => {
          const data = activityDoc.data() as {
            projectId?: string;
            projectName?: string;
          };
          const inferredProjectId =
            data.projectId ?? activityDoc.ref.parent?.parent?.id ?? '';
          if (!inferredProjectId) {
            return;
          }
          if (data.projectName) {
            projectNameCache.set(inferredProjectId, data.projectName);
            return;
          }
          if (!projectNameCache.has(inferredProjectId)) {
            missingProjectIds.add(inferredProjectId);
          }
        });

        if (missingProjectIds.size > 0) {
          await Promise.all(
            Array.from(missingProjectIds).map(async (projectId) => {
              try {
                const projectSnapshot = await getDoc(
                  doc(db, 'projects', projectId)
                );
                if (projectSnapshot.exists()) {
                  const projectData = projectSnapshot.data() as {
                    name?: string;
                  };
                  projectNameCache.set(
                    projectId,
                    projectData.name ?? 'Projeto'
                  );
                } else {
                  projectNameCache.set(projectId, 'Projeto');
                }
              } catch (error) {
                console.error('Falha ao buscar projeto:', projectId, error);
                projectNameCache.set(projectId, 'Projeto');
              }
            })
          );
        }

        const tasksFromDb: MemberTask[] = snapshot.docs
          .map((activityDoc) => {
            const data = activityDoc.data() as {
              id?: string;
              name?: string;
              dueAt?: FirestoreDateValue;
              status?: string;
              priority?: string;
              owner?: string;
              ownerId?: string;
              description?: string;
              updates?: ActivityUpdate[];
              projectId?: string;
              projectName?: string;
            };
            const parentProjectId = activityDoc.ref.parent?.parent?.id;
            const projectId = data.projectId ?? parentProjectId ?? '';
            if (!projectId) {
              return null;
            }

            const projectName =
              data.projectName ?? projectNameCache.get(projectId) ?? 'Projeto';

            return {
              id: `${projectId}-${activityDoc.id}`,
              activityId: data.id ?? activityDoc.id,
              projectId,
              projectName,
              source: 'project' as const,
              title: data.name ?? 'Tarefa',
              due: firestoreDateToLabel(data.dueAt ?? ''),
              status: data.status ?? statusOptions[0],
              priority: data.priority ?? priorityOptions[1],
              owner: data.owner ?? '',
              ownerId: data.ownerId ?? memberId,
              description: data.description ?? '',
              updates: Array.isArray(data.updates) ? data.updates : []
            } as MemberTask;
          })
          .filter((task): task is MemberTask => task !== null);

        setProjectTasks(tasksFromDb);
        storeTasksCache(memberId, tasksFromDb);
      } catch (error) {
        const usedCache = loadTasksFromCache();
        console.error('Falha ao carregar tarefas:', error);
        if (!usedCache) {
          toast.error('Não foi possível carregar tarefas.');
        } else {
          toast.message('Exibindo tarefas offline.');
        }
      } finally {
        if (isActive) {
          setIsProjectTasksLoading(false);
        }
      }
    };

    loadTasks();

    return () => {
      isActive = false;
    };
  }, [memberId]);

  React.useEffect(() => {
    const hasActiveEntry =
      timeRecords.length > 0 &&
      timeRecords[timeRecords.length - 1].type === 'Entrada';

    if (!hasActiveEntry) {
      setCurrentRunningTime(0);
      return;
    }

    const lastEntry = timeRecords[timeRecords.length - 1];
    if (!lastEntry.timestamp?.toDate) {
      setCurrentRunningTime(0);
      return;
    }

    const entryTime = lastEntry.timestamp.toDate();

    const interval = setInterval(() => {
      const now = new Date();
      const diffMs = now.getTime() - entryTime.getTime();
      const diffSeconds = Math.floor(diffMs / 1000);
      setCurrentRunningTime(diffSeconds);
    }, 1000);

    return () => clearInterval(interval);
  }, [timeRecords]);

  const handleTaskClick = (task: MemberTask) => {
    setActiveTask(task);
    setEditStatus(task.status ?? statusOptions[1]);
    setUpdateNote('');
    setIsTaskModalOpen(true);
  };

  const handleUpdateTask = async () => {
    if (!activeTask?.projectId || !activeTask.activityId) {
      if (activeTask?.source !== 'agenda') {
        toast.error('Atividade não encontrada.');
        return;
      }
    }
    if (!firebaseDb) {
      toast.error('Firebase não configurado.');
      return;
    }
    const db = firebaseDb;
    setIsSavingEdit(true);
    try {
      if (activeTask?.source === 'agenda' || !activeTask.projectId) {
        if (!memberId) {
          toast.error('Membro não encontrado.');
          return;
        }
        const memberRef = doc(db, 'members', memberId);
        const memberSnapshot = await getDoc(memberRef);
        if (!memberSnapshot.exists()) {
          toast.error('Membro não encontrado.');
          return;
        }

        const memberData = memberSnapshot.data() as {
          agendaTasks?: MemberTask[];
        };
        const noteValue = updateNote.trim();
        const updateId =
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `update-${Date.now()}`;
        const updateEntry: ActivityUpdate | null = noteValue
          ? {
              id: updateId,
              author: memberInfo.name || 'Membro',
              authorId: memberId || undefined,
              note: noteValue,
              time: format(new Date(), 'dd/MM/yyyy HH:mm')
            }
          : null;

        const existingAgenda = Array.isArray(memberData.agendaTasks)
          ? memberData.agendaTasks
          : [];
        const nextAgenda = existingAgenda.map((task) => {
          if (task.id !== activeTask.id) {
            return task;
          }
          const existingUpdates = Array.isArray(task.updates)
            ? task.updates
            : [];
          return {
            ...task,
            source: 'agenda',
            status: editStatus,
            updates: updateEntry
              ? [updateEntry, ...existingUpdates]
              : existingUpdates
          };
        });

        const nextLocalAgenda = agendaTasks.map((task) =>
          task.id === activeTask.id
            ? {
                ...task,
                status: editStatus,
                updates: updateEntry
                  ? [updateEntry, ...(task.updates ?? [])]
                  : task.updates
              }
            : task
        );

        await updateDoc(memberRef, {
          agendaTasks: nextAgenda,
          updatedAt: serverTimestamp()
        });

        setAgendaTasks(nextLocalAgenda);
        setActiveTask((current) =>
          current
            ? {
                ...current,
                status: editStatus,
                updates: updateEntry
                  ? [updateEntry, ...(current.updates ?? [])]
                  : current.updates
              }
            : current
        );
        setUpdateNote('');
        storeMemberCache(
          memberId,
          buildMemberCache({ agendaTasks: nextLocalAgenda })
        );
        toast.success('Atualização registrada.');
        return;
      }

      const projectRef = doc(db, 'projects', activeTask.projectId);
      const snapshot = await getDoc(projectRef);
      if (!snapshot.exists()) {
        toast.error('Projeto não encontrado.');
        return;
      }

      const data = snapshot.data() as { Activities?: MemberTask[] };
      const noteValue = updateNote.trim();
      const updateId =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `update-${Date.now()}`;
      const updateEntry: ActivityUpdate | null = noteValue
        ? {
            id: updateId,
            author: memberInfo.name || 'Membro',
            authorId: memberId || undefined,
            note: noteValue,
            time: format(new Date(), 'dd/MM/yyyy HH:mm')
          }
        : null;

      const nextActivities = Array.isArray(data.Activities)
        ? data.Activities.map((activity) => {
            if (activity.id !== activeTask.activityId) {
              return activity;
            }
            const existingUpdates = Array.isArray(activity.updates)
              ? activity.updates
              : [];
            return {
              ...activity,
              status: editStatus,
              updates: updateEntry
                ? [updateEntry, ...existingUpdates]
                : existingUpdates
            };
          })
        : [];

      await updateDoc(projectRef, {
        Activities: nextActivities,
        updatedAt: serverTimestamp()
      });

      const nextProjectTasks = projectTasks.map((task) =>
        task.id === activeTask.id
          ? {
              ...task,
              status: editStatus,
              updates: updateEntry
                ? [updateEntry, ...(task.updates ?? [])]
                : task.updates
            }
          : task
      );

      setProjectTasks(nextProjectTasks);
      setActiveTask((current) =>
        current
          ? {
              ...current,
              status: editStatus,
              updates: updateEntry
                ? [updateEntry, ...(current.updates ?? [])]
                : current.updates
            }
          : current
      );
      setUpdateNote('');
      storeTasksCache(memberId, nextProjectTasks);
      toast.success('Atividade atualizada.');
    } catch (error) {
      console.error('Falha ao atualizar atividade:', error);
      toast.error('Não foi possível atualizar a atividade.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const openEditAgendaTask = (task: MemberTask) => {
    setAgendaTaskToEdit(task);
    setAgendaEditForm({
      date: toInputDate(task.due),
      title: task.title ?? '',
      description: task.description ?? '',
      priority: task.priority ?? priorityOptions[1],
      status: task.status ?? statusOptions[0]
    });
    setIsEditAgendaModalOpen(true);
  };

  const handleSaveAgendaEdit = async () => {
    if (!agendaTaskToEdit) return;
    if (!agendaEditForm.title.trim()) {
      toast.error('Informe o nome da atividade.');
      return;
    }
    if (!agendaEditForm.date) {
      toast.error('Selecione uma data.');
      return;
    }
    if (!firebaseDb || !memberId) {
      toast.error('Membro não encontrado.');
      return;
    }

    setIsSavingAgendaEdit(true);
    try {
      const db = firebaseDb;
      const memberRef = doc(db, 'members', memberId);
      const memberSnapshot = await getDoc(memberRef);
      if (!memberSnapshot.exists()) {
        toast.error('Membro não encontrado.');
        return;
      }

      const memberData = memberSnapshot.data() as {
        agendaTasks?: MemberTask[];
      };
      const existingAgenda = Array.isArray(memberData.agendaTasks)
        ? memberData.agendaTasks
        : [];

      const updatedTask: MemberTask = {
        ...agendaTaskToEdit,
        source: 'agenda',
        title: agendaEditForm.title.trim(),
        due: formatDateLabel(agendaEditForm.date),
        status: agendaEditForm.status,
        priority: agendaEditForm.priority,
        description: agendaEditForm.description.trim()
      };

      const nextAgenda = existingAgenda.map((task) =>
        task.id === agendaTaskToEdit.id ? updatedTask : task
      );

      await updateDoc(memberRef, {
        agendaTasks: nextAgenda,
        updatedAt: serverTimestamp()
      });

      const nextLocalAgenda = agendaTasks.map((task) =>
        task.id === agendaTaskToEdit.id ? updatedTask : task
      );
      setAgendaTasks(nextLocalAgenda);
      setActiveTask((current) =>
        current?.id === agendaTaskToEdit.id ? updatedTask : current
      );
      storeMemberCache(
        memberId,
        buildMemberCache({ agendaTasks: nextLocalAgenda })
      );
      setIsEditAgendaModalOpen(false);
      setAgendaTaskToEdit(null);
      toast.success('Agenda atualizada.');
    } catch (error) {
      console.error('Falha ao atualizar agenda:', error);
      toast.error('Não foi possível atualizar a agenda.');
    } finally {
      setIsSavingAgendaEdit(false);
    }
  };

  const openDeleteAgendaTask = (task: MemberTask) => {
    setTaskToDelete(task);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteAgendaTask = async () => {
    if (!taskToDelete) {
      return;
    }
    if (!firebaseDb || !memberId) {
      toast.error('Membro não encontrado.');
      return;
    }
    setDeletingAgendaId(taskToDelete.id);
    try {
      const db = firebaseDb;
      const memberRef = doc(db, 'members', memberId);
      const memberSnapshot = await getDoc(memberRef);
      if (!memberSnapshot.exists()) {
        toast.error('Membro não encontrado.');
        return;
      }

      const memberData = memberSnapshot.data() as {
        agendaTasks?: MemberTask[];
      };
      const existingAgenda = Array.isArray(memberData.agendaTasks)
        ? memberData.agendaTasks
        : [];
      const nextAgenda = existingAgenda.filter(
        (task) => task.id !== taskToDelete.id
      );

      await updateDoc(memberRef, {
        agendaTasks: nextAgenda,
        updatedAt: serverTimestamp()
      });

      const nextLocalAgenda = agendaTasks.filter(
        (task) => task.id !== taskToDelete.id
      );
      setAgendaTasks(nextLocalAgenda);
      storeMemberCache(
        memberId,
        buildMemberCache({ agendaTasks: nextLocalAgenda })
      );

      if (activeTask?.id === taskToDelete.id) {
        setIsTaskModalOpen(false);
        setActiveTask(null);
      }

      toast.success('Tarefa removida.');
      setIsDeleteModalOpen(false);
      setTaskToDelete(null);
    } catch (error) {
      console.error('Falha ao remover tarefa da agenda:', error);
      toast.error('Não foi possível remover a tarefa.');
    } finally {
      setDeletingAgendaId(null);
    }
  };

  const handleBaterPonto = async () => {
    if (!firebaseDb || !memberId) return;

    setIsBatingPonto(true);
    try {
      const type =
        timeRecords.length === 0 ||
        timeRecords[timeRecords.length - 1].type === 'Saída'
          ? 'Entrada'
          : 'Saída';

      const newRecord = {
        id: `${Date.now()}`,
        type,
        timestamp: Timestamp.now()
      };

      const memberRef = doc(firebaseDb, 'members', memberId);
      const memberDoc = await getDoc(memberRef);
      const currentRecords = (memberDoc.data()?.timeRecords || []) as any[];

      await updateDoc(memberRef, {
        timeRecords: [...currentRecords, newRecord],
        updatedAt: serverTimestamp()
      });

      const localRecord = {
        ...newRecord,
        timestamp: { toDate: () => newRecord.timestamp.toDate() }
      };

      const nextTimeRecords = [...timeRecords, localRecord];
      const nextWeekRecords = [...weekTimeRecords, localRecord];

      setTimeRecords(nextTimeRecords);
      setWeekTimeRecords(nextWeekRecords);
      storeMemberCache(
        memberId,
        buildMemberCache({ timeRecords: nextWeekRecords })
      );
      toast.success(`${type} registrada`);
    } catch (error) {
      console.error('Erro ao bater ponto:', error);
      toast.error('Erro ao registrar ponto');
    } finally {
      setIsBatingPonto(false);
    }
  };

  const handleAddAgendaTask = async () => {
    if (!agendaForm.title.trim()) {
      toast.error('Informe o nome da atividade.');
      return;
    }
    if (!agendaForm.date) {
      toast.error('Informe a data.');
      return;
    }
    if (!firebaseDb) {
      toast.error('Firebase não configurado.');
      return;
    }
    if (!memberId) {
      toast.error('Membro não encontrado.');
      return;
    }

    const db = firebaseDb;
    const memberRef = doc(db, 'members', memberId);
    setIsSavingAgenda(true);
    try {
      const snapshot = await getDoc(memberRef);
      if (!snapshot.exists()) {
        toast.error('Membro não encontrado.');
        return;
      }

      const taskId =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `agenda-${Date.now()}`;
      const agendaTask: MemberTask = {
        id: taskId,
        source: 'agenda',
        title: agendaForm.title.trim(),
        due: formatDateLabel(agendaForm.date),
        status: agendaForm.status,
        priority: agendaForm.priority,
        description: agendaForm.description.trim(),
        updates: []
      };

      const data = snapshot.data() as { agendaTasks?: MemberTask[] };
      const existingAgenda = Array.isArray(data.agendaTasks)
        ? data.agendaTasks
        : [];
      const nextAgenda = [agendaTask, ...existingAgenda];

      await updateDoc(memberRef, {
        agendaTasks: nextAgenda,
        updatedAt: serverTimestamp()
      });

      const nextAgendaTasks = [agendaTask, ...agendaTasks];
      setAgendaTasks(nextAgendaTasks);
      storeMemberCache(
        memberId,
        buildMemberCache({ agendaTasks: nextAgendaTasks })
      );
      setAgendaForm({
        date: '',
        title: '',
        description: '',
        priority: priorityOptions[1],
        status: statusOptions[0]
      });
      toast.success('Agenda adicionada.');
    } catch (error) {
      console.error('Falha ao salvar agenda:', error);
      toast.error('Não foi possível salvar a agenda.');
    } finally {
      setIsSavingAgenda(false);
    }
  };

  if (authLoading) {
    return (
      <div className='flex h-screen items-center justify-center'>
        <div className='text-center'>
          <div className='inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]' />
          <p className='text-muted-foreground mt-4'>Carregando...</p>
        </div>
      </div>
    );
  }

  if (memberNotFound) {
    return <NotFoundMember />;
  }

  return (
    <PageContainer
      pageTitle={memberInfo.name || 'Individual'}
      pageDescription='Tarefas, calendário e alertas'
      hideHeaderOnMobile
    >
      <div className='flex flex-1 flex-col space-y-3 md:space-y-4'>
        {/* Mobile Tabs */}
        <div className='block lg:hidden'>
          <Tabs defaultValue='tasks' className='w-full'>
            <TabsList className='grid h-auto w-full grid-cols-5 gap-0.5'>
              <TabsTrigger
                value='tasks'
                className='px-1 py-2 text-[10px] sm:text-xs'
              >
                Tarefas
              </TabsTrigger>
              <TabsTrigger
                value='calendar'
                className='px-1 py-2 text-[10px] sm:text-xs'
              >
                Calendário
              </TabsTrigger>
              <TabsTrigger
                value='agenda'
                className='px-1 py-2 text-[10px] sm:text-xs'
              >
                Agenda
              </TabsTrigger>
              <TabsTrigger
                value='ponto'
                className='px-1 py-2 text-[10px] sm:text-xs'
              >
                Ponto
              </TabsTrigger>
              <TabsTrigger
                value='horario'
                className='px-1 py-2 text-[10px] sm:text-xs'
              >
                Horário
              </TabsTrigger>
            </TabsList>

            {/* Tarefas Tab */}
            <TabsContent value='tasks' className='mt-3'>
              <Card>
                <CardHeader className='pb-3'>
                  <CardTitle className='text-lg md:text-xl'>
                    Lista de tarefas
                  </CardTitle>
                  <CardDescription className='text-xs md:text-sm'>
                    Atividades da semana
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className='space-y-2'>
                    {isProjectTasksLoading ? (
                      <div className='space-y-2'>
                        {Array.from({ length: 4 }).map((_, index) => (
                          <div
                            key={`task-skeleton-${index}`}
                            className='rounded-lg border p-3'
                          >
                            <Skeleton className='h-4 w-2/3' />
                            <Skeleton className='mt-2 h-3 w-1/3' />
                          </div>
                        ))}
                      </div>
                    ) : allTasks.length === 0 ? (
                      <div className='text-muted-foreground py-8 text-center text-sm'>
                        Nenhuma tarefa encontrada.
                      </div>
                    ) : (
                      <Accordion type='single' collapsible className='w-full'>
                        {allTasks.map((task) => (
                          <AccordionItem key={task.id} value={task.id}>
                            <AccordionTrigger className='py-3 hover:no-underline'>
                              <div className='flex w-full items-start justify-between gap-2 pr-2'>
                                <div className='flex flex-col items-start text-left'>
                                  <span className='line-clamp-1 text-sm font-medium'>
                                    {task.title}
                                  </span>
                                  <span className='text-muted-foreground text-xs'>
                                    {task.due}
                                  </span>
                                </div>
                                <div className='flex shrink-0 flex-col items-end gap-1'>
                                  <Badge
                                    className={`${statusStyles[task.status]} px-1.5 py-0 text-[10px]`}
                                  >
                                    {task.status}
                                  </Badge>
                                  <Badge
                                    className={`${priorityStyles[task.priority]} px-1.5 py-0 text-[10px]`}
                                  >
                                    {task.priority}
                                  </Badge>
                                </div>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className='space-y-2 pt-2'>
                                <div className='flex justify-end gap-2'>
                                  {task.source === 'agenda' ? (
                                    <Button
                                      onClick={() => openEditAgendaTask(task)}
                                      size='sm'
                                      variant='secondary'
                                      className='h-9 border px-3 [&_svg]:!h-[1em] [&_svg]:!w-[1em]'
                                    >
                                      <FontAwesomeIcon
                                        icon={faPenToSquare}
                                        size='lg'
                                        className='mr-2'
                                      />
                                      Editar
                                    </Button>
                                  ) : null}
                                  {task.source === 'agenda' ? (
                                    <Button
                                      onClick={() => openDeleteAgendaTask(task)}
                                      size='sm'
                                      variant='destructive'
                                      className='h-9 border px-3 [&_svg]:!h-[1em] [&_svg]:!w-[1em]'
                                    >
                                      <FontAwesomeIcon
                                        icon={faXmark}
                                        size='lg'
                                        className='mr-2'
                                      />
                                      Excluir
                                    </Button>
                                  ) : null}
                                  <Button
                                    onClick={() => handleTaskClick(task)}
                                    size='sm'
                                  >
                                    Detalhes
                                  </Button>
                                </div>
                                {task.description && (
                                  <p className='text-muted-foreground text-justify text-sm break-all md:break-words'>
                                    {task.description}
                                  </p>
                                )}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Calendar Tab */}
            <TabsContent value='calendar' className='mt-3'>
              <Card>
                <CardHeader className='pb-3'>
                  <CardTitle className='text-lg md:text-xl'>
                    Calendário
                  </CardTitle>
                  <CardDescription className='text-xs md:text-sm'>
                    Dias com atividades
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className='space-y-3'>
                    {isProjectTasksLoading ? (
                      <Skeleton className='h-80 w-full' />
                    ) : (
                      <div className='flex justify-center'>
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
                          className='rounded-md border'
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
                      <div className='space-y-2'>
                        {isProjectTasksLoading ? (
                          <div className='space-y-2'>
                            {Array.from({ length: 2 }).map((_, index) => (
                              <div
                                key={`day-skeleton-${index}`}
                                className='rounded-md border p-2'
                              >
                                <Skeleton className='h-3 w-3/4' />
                                <Skeleton className='mt-2 h-3 w-1/3' />
                              </div>
                            ))}
                          </div>
                        ) : tasksForDay.length === 0 ? (
                          <div className='text-muted-foreground py-4 text-center text-sm'>
                            Nenhuma atividade para este dia.
                          </div>
                        ) : (
                          tasksForDay.map((task) => (
                            <button
                              key={task.id}
                              type='button'
                              onClick={() => handleTaskClick(task)}
                              className='hover:bg-accent w-full rounded-lg border p-3 text-left transition-colors active:scale-95'
                            >
                              <div className='flex items-start justify-between gap-2'>
                                <div className='flex flex-col'>
                                  <span className='line-clamp-1 text-sm font-medium'>
                                    {task.title}
                                  </span>
                                  <span className='text-muted-foreground text-xs'>
                                    {task.due}
                                  </span>
                                </div>
                                <div className='flex flex-shrink-0 flex-col items-end gap-1'>
                                  <Badge
                                    className={`${statusStyles[task.status]} px-1.5 text-[10px]`}
                                  >
                                    {task.status}
                                  </Badge>
                                  <Badge
                                    className={`${priorityStyles[task.priority]} px-1.5 text-[10px]`}
                                  >
                                    {task.priority}
                                  </Badge>
                                </div>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Agenda Tab */}
            <TabsContent value='agenda' className='mt-3'>
              <Card>
                <CardHeader className='pb-3'>
                  <CardTitle className='text-lg md:text-xl'>Agenda</CardTitle>
                  <CardDescription className='text-xs md:text-sm'>
                    Novo compromisso
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isMemberLoading ? (
                    <div className='space-y-3'>
                      <Skeleton className='h-4 w-1/3' />
                      <Skeleton className='h-10 w-full' />
                      <Skeleton className='h-4 w-1/3' />
                      <Skeleton className='h-10 w-full' />
                      <Skeleton className='h-4 w-1/3' />
                      <Skeleton className='h-24 w-full' />
                    </div>
                  ) : (
                    <div className='space-y-3'>
                      <div className='space-y-2'>
                        <label
                          className='text-sm font-medium'
                          htmlFor='agendaDate'
                        >
                          Data
                        </label>
                        <Input
                          id='agendaDate'
                          type='date'
                          value={agendaForm.date}
                          disabled={isSavingAgenda}
                          onChange={(event) =>
                            setAgendaForm((current) => ({
                              ...current,
                              date: event.target.value
                            }))
                          }
                          className='h-11'
                        />
                      </div>

                      <div className='space-y-2'>
                        <label
                          className='text-sm font-medium'
                          htmlFor='agendaTitle'
                        >
                          Nome da atividade
                        </label>
                        <Input
                          id='agendaTitle'
                          placeholder='Ex: Visita técnica'
                          value={agendaForm.title}
                          disabled={isSavingAgenda}
                          onChange={(event) =>
                            setAgendaForm((current) => ({
                              ...current,
                              title: event.target.value
                            }))
                          }
                          className='h-11'
                        />
                      </div>

                      <div className='space-y-2'>
                        <label
                          className='text-sm font-medium'
                          htmlFor='agendaNotes'
                        >
                          Descrição
                        </label>
                        <Textarea
                          id='agendaNotes'
                          placeholder='Detalhes do compromisso'
                          className='min-h-20'
                          value={agendaForm.description}
                          disabled={isSavingAgenda}
                          onChange={(event) =>
                            setAgendaForm((current) => ({
                              ...current,
                              description: event.target.value
                            }))
                          }
                        />
                      </div>

                      <div className='grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-end gap-3'>
                        <div className='space-y-2'>
                          <label className='text-sm font-medium'>
                            Prioridade
                          </label>
                          <Select
                            value={agendaForm.priority}
                            disabled={isSavingAgenda}
                            onValueChange={(value) =>
                              setAgendaForm((current) => ({
                                ...current,
                                priority: value
                              }))
                            }
                          >
                            <SelectTrigger className='h-11'>
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

                        <div className='space-y-2'>
                          <label className='text-sm font-medium'>Status</label>
                          <Select
                            value={agendaForm.status}
                            disabled={isSavingAgenda}
                            onValueChange={(value) =>
                              setAgendaForm((current) => ({
                                ...current,
                                status: value
                              }))
                            }
                          >
                            <SelectTrigger className='h-11'>
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

                        <div className='space-y-2'>
                          <span className='text-sm font-medium opacity-0'>
                            Adicionar
                          </span>
                          <Button
                            type='button'
                            onClick={handleAddAgendaTask}
                            disabled={isSavingAgenda}
                            className='h-11 w-11 rounded-md p-0'
                            size='icon'
                            aria-label='Adicionar'
                          >
                            +
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Ponto Tab */}
            <TabsContent value='ponto' className='mt-3'>
              <Card>
                <CardHeader className='pb-3'>
                  <CardTitle className='text-lg md:text-xl'>Ponto</CardTitle>
                  <CardDescription className='text-xs md:text-sm'>
                    Horas semanais (seg-dom)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className='flex flex-col gap-4'>
                    {(() => {
                      const baseWorkedHours =
                        calculateWorkedHours(weekTimeRecords);
                      const runningHours = currentRunningTime / 3600;
                      const workedHours = baseWorkedHours + runningHours;
                      const isPaid = workedHours >= minWeeklyHours;
                      const progressPercent = Math.min(
                        (workedHours / minWeeklyHours) * 100,
                        100
                      );
                      const hasActiveEntry =
                        timeRecords.length > 0 &&
                        timeRecords[timeRecords.length - 1].type === 'Entrada';

                      return (
                        <>
                          <div className='py-4 text-center'>
                            <div className='text-4xl font-bold md:text-5xl'>
                              {workedHours.toFixed(2)}h
                            </div>
                            <div className='text-muted-foreground mt-1 text-xs'>
                              de {minWeeklyHours}h trabalhadas
                            </div>
                          </div>

                          <div className='space-y-2'>
                            <Progress
                              value={progressPercent}
                              className='h-2.5'
                            />
                            <div className='text-muted-foreground flex justify-between text-xs'>
                              <span>0h</span>
                              <span>{minWeeklyHours}h</span>
                            </div>
                          </div>

                          {isPaid && hasActiveEntry && (
                            <div className='rounded-lg border border-amber-500 bg-amber-500/10 p-3 text-center'>
                              <div className='text-sm font-semibold text-amber-600'>
                                ⚠ Entrada ativa com {minWeeklyHours}h+
                                trabalhadas
                              </div>
                              <div className='text-muted-foreground mt-1 text-xs'>
                                Registre a saída para contabilizar
                              </div>
                            </div>
                          )}

                          {isPaid && !hasActiveEntry && (
                            <div className='rounded-lg border border-green-500 bg-green-500/10 p-3 text-center'>
                              <div className='text-sm font-semibold text-green-600'>
                                ✔ Horas semanais pagas
                              </div>
                              <div className='text-muted-foreground mt-1 text-xs'>
                                {workedHours.toFixed(2)}h / {minWeeklyHours}h
                                completadas
                              </div>
                            </div>
                          )}

                          <Button
                            onClick={handleBaterPonto}
                            disabled={isBatingPonto}
                            className='h-12 w-full'
                            size='lg'
                          >
                            {isBatingPonto
                              ? 'Registrando...'
                              : timeRecords.length === 0 ||
                                  timeRecords[timeRecords.length - 1].type ===
                                    'Saída'
                                ? 'Registrar Entrada'
                                : 'Registrar Saída'}
                          </Button>

                          <div className='mt-4 space-y-2'>
                            <div className='text-muted-foreground text-xs font-medium uppercase'>
                              Registros de Hoje
                            </div>
                            {timeRecords.length === 0 ? (
                              <div className='text-muted-foreground rounded-lg border py-6 text-center text-sm'>
                                Nenhum registro hoje
                              </div>
                            ) : (
                              <div className='space-y-2'>
                                {timeRecords.map((record) => (
                                  <div
                                    key={record.id}
                                    className='flex items-center justify-between rounded-lg border p-3'
                                  >
                                    <span className='text-sm font-medium'>
                                      {record.type}
                                    </span>
                                    <span className='text-muted-foreground font-mono text-sm'>
                                      {record.timestamp?.toDate
                                        ? format(
                                            record.timestamp.toDate(),
                                            'HH:mm:ss'
                                          )
                                        : '--:--:--'}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Horário Tab */}
            <TabsContent value='horario' className='mt-3'>
              {isMemberLoading ? (
                <WeekScheduleEditorSkeleton />
              ) : (
                <WeekScheduleEditor
                  memberId={memberId}
                  initialSchedule={weekSchedule}
                  onSaved={(s) => setWeekSchedule(s)}
                />
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Desktop Grid */}
        <div className='hidden gap-4 lg:grid lg:grid-cols-2'>
          <Card className='h-105'>
            <CardHeader>
              <CardTitle>Lista de tarefas</CardTitle>
              <CardDescription>Atividades da semana</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className='h-56 pr-3'>
                <div className='space-y-2'>
                  {isProjectTasksLoading ? (
                    <div className='space-y-2'>
                      {Array.from({ length: 4 }).map((_, index) => (
                        <div
                          key={`task-skeleton-${index}`}
                          className='rounded-md border p-3'
                        >
                          <Skeleton className='h-4 w-2/3' />
                          <Skeleton className='mt-2 h-3 w-1/3' />
                        </div>
                      ))}
                    </div>
                  ) : allTasks.length === 0 ? (
                    <div className='text-muted-foreground text-sm'>
                      Nenhuma tarefa encontrada.
                    </div>
                  ) : (
                    allTasks.map((task) => (
                      <div
                        key={task.id}
                        onClick={() => handleTaskClick(task)}
                        role='button'
                        tabIndex={0}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            handleTaskClick(task);
                          }
                        }}
                        onMouseEnter={() => setHoveredTaskId(task.id)}
                        onMouseLeave={() => {
                          setHoveredTaskId(null);
                          setHoveredEditTaskId(null);
                        }}
                        className={`focus-visible:ring-ring/50 w-full rounded-md border p-3 text-left transition-colors focus-visible:ring-[3px] focus-visible:outline-none ${
                          hoveredTaskId === task.id &&
                          hoveredEditTaskId !== task.id
                            ? 'bg-accent'
                            : ''
                        }`}
                      >
                        <div className='flex items-center justify-between gap-3'>
                          <div className='flex flex-col'>
                            <span className='text-sm font-medium'>
                              {task.title}
                            </span>
                            <span className='text-muted-foreground text-xs'>
                              Prazo: {task.due}
                            </span>
                            {task.description ? (
                              <span className='text-muted-foreground line-clamp-2 text-justify text-xs break-all'>
                                {task.description}
                              </span>
                            ) : null}
                          </div>
                          <div className='ml-auto flex items-center gap-2'>
                            {task.source === 'agenda' ? (
                              <div
                                className='flex items-center gap-1'
                                onPointerEnter={() =>
                                  setHoveredEditTaskId(task.id)
                                }
                                onPointerMove={() =>
                                  setHoveredEditTaskId(task.id)
                                }
                                onPointerLeave={() =>
                                  setHoveredEditTaskId(null)
                                }
                              >
                                <Button
                                  type='button'
                                  size='icon'
                                  variant='ghost'
                                  className='h-9 w-9 cursor-pointer self-center rounded-md border hover:bg-white/10 [&_svg]:!h-[1em] [&_svg]:!w-[1em]'
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    openEditAgendaTask(task);
                                  }}
                                  aria-label='Editar tarefa da agenda'
                                >
                                  <FontAwesomeIcon
                                    icon={faPenToSquare}
                                    size='lg'
                                  />
                                </Button>
                                <Button
                                  type='button'
                                  size='icon'
                                  variant='ghost'
                                  className='h-9 w-9 cursor-pointer self-center rounded-md border hover:bg-white/10 [&_svg]:!h-[1em] [&_svg]:!w-[1em]'
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    openDeleteAgendaTask(task);
                                  }}
                                  aria-label='Excluir tarefa da agenda'
                                >
                                  <FontAwesomeIcon icon={faXmark} size='lg' />
                                </Button>
                              </div>
                            ) : null}
                            <div className='flex flex-col items-end gap-1'>
                              <Badge className={statusStyles[task.status]}>
                                {task.status}
                              </Badge>
                              <Badge className={priorityStyles[task.priority]}>
                                {task.priority}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className='h-105'>
            <CardHeader>
              <CardTitle>Calendário</CardTitle>
              <CardDescription>Dias clicáveis para agenda</CardDescription>
            </CardHeader>
            <CardContent>
              <div className='grid gap-4 md:grid-cols-[260px_minmax(0,1fr)]'>
                {isProjectTasksLoading ? (
                  <Skeleton className='h-77.5 w-full' />
                ) : (
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
                )}
                <div className='flex flex-col rounded-md border p-3'>
                  <div className='text-muted-foreground text-xs font-semibold uppercase'>
                    Atividades do dia
                  </div>
                  <div className='mt-1 text-sm font-medium'>
                    {selectedDayLabel || 'Selecione uma data'}
                  </div>
                  <ScrollArea className='mt-3 h-48 pr-2'>
                    <div className='space-y-2'>
                      {isProjectTasksLoading ? (
                        <div className='space-y-2'>
                          {Array.from({ length: 3 }).map((_, index) => (
                            <div
                              key={`day-skeleton-${index}`}
                              className='rounded-md border p-2'
                            >
                              <Skeleton className='h-3 w-3/4' />
                              <Skeleton className='mt-2 h-3 w-1/3' />
                            </div>
                          ))}
                        </div>
                      ) : tasksForDay.length === 0 ? (
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

          <Card className='h-105'>
            <CardHeader>
              <CardTitle>Agenda</CardTitle>
              <CardDescription>Novo compromisso</CardDescription>
            </CardHeader>
            <CardContent>
              <div className='space-y-3 rounded-md border p-4'>
                {isMemberLoading ? (
                  <div className='space-y-3'>
                    <Skeleton className='h-4 w-1/3' />
                    <Skeleton className='h-9 w-full' />
                    <Skeleton className='h-4 w-1/3' />
                    <Skeleton className='h-9 w-full' />
                    <Skeleton className='h-4 w-1/3' />
                    <Skeleton className='h-24 w-full' />
                  </div>
                ) : (
                  <>
                    <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                      <div className='space-y-1'>
                        <label
                          className='text-sm font-medium'
                          htmlFor='agendaDate'
                        >
                          Data
                        </label>
                        <Input
                          id='agendaDate'
                          type='date'
                          value={agendaForm.date}
                          disabled={isSavingAgenda}
                          onChange={(event) =>
                            setAgendaForm((current) => ({
                              ...current,
                              date: event.target.value
                            }))
                          }
                        />
                      </div>
                      <div className='space-y-1'>
                        <label
                          className='text-sm font-medium'
                          htmlFor='agendaTitle'
                        >
                          Nome da atividade
                        </label>
                        <Input
                          id='agendaTitle'
                          placeholder='Ex: Visita técnica'
                          value={agendaForm.title}
                          disabled={isSavingAgenda}
                          onChange={(event) =>
                            setAgendaForm((current) => ({
                              ...current,
                              title: event.target.value
                            }))
                          }
                        />
                      </div>
                    </div>
                    <div className='space-y-1'>
                      <label
                        className='text-sm font-medium'
                        htmlFor='agendaNotes'
                      >
                        Descrição
                      </label>
                      <Textarea
                        id='agendaNotes'
                        placeholder='Detalhes do compromisso'
                        className='min-h-16'
                        value={agendaForm.description}
                        disabled={isSavingAgenda}
                        onChange={(event) =>
                          setAgendaForm((current) => ({
                            ...current,
                            description: event.target.value
                          }))
                        }
                      />
                    </div>
                    <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                      <div className='space-y-1'>
                        <label className='text-sm font-medium'>
                          Prioridade
                        </label>
                        <Select
                          value={agendaForm.priority}
                          disabled={isSavingAgenda}
                          onValueChange={(value) =>
                            setAgendaForm((current) => ({
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
                      <div className='space-y-1'>
                        <label className='text-sm font-medium'>Status</label>
                        <Select
                          value={agendaForm.status}
                          disabled={isSavingAgenda}
                          onValueChange={(value) =>
                            setAgendaForm((current) => ({
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
                    <div className='flex justify-end'>
                      <Button
                        type='button'
                        onClick={handleAddAgendaTask}
                        disabled={isSavingAgenda}
                      >
                        {isSavingAgenda ? 'Salvando...' : 'Adicionar'}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className='h-105'>
            <CardHeader>
              <CardTitle>Ponto</CardTitle>
              <CardDescription>Horas semanais (seg-dom)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className='flex flex-col gap-4'>
                {(() => {
                  const baseWorkedHours = calculateWorkedHours(weekTimeRecords);
                  const runningHours = currentRunningTime / 3600;
                  const workedHours = baseWorkedHours + runningHours;
                  const isPaid = workedHours >= 4;
                  const progressPercent = Math.min(
                    (workedHours / 4) * 100,
                    100
                  );
                  const hasActiveEntry =
                    timeRecords.length > 0 &&
                    timeRecords[timeRecords.length - 1].type === 'Entrada';

                  return (
                    <>
                      {isPaid && hasActiveEntry ? (
                        <>
                          <div className='rounded-md border border-amber-500 bg-amber-500/10 p-4 text-center'>
                            <div className='text-sm font-semibold text-amber-600'>
                              ⚠ Entrada ativa com 4h+ trabalhadas
                            </div>
                            <div className='text-muted-foreground mt-1 text-xs'>
                              Registre a saída para contabilizar as horas pagas
                            </div>
                          </div>

                          <Button
                            onClick={handleBaterPonto}
                            disabled={isBatingPonto}
                            className='w-full'
                            size='lg'
                            variant='default'
                          >
                            {isBatingPonto
                              ? 'Registrando...'
                              : 'Registrar Saída'}
                          </Button>

                          <div className='text-center'>
                            <div className='text-3xl font-bold'>
                              {workedHours.toFixed(2)}h
                            </div>
                            <div className='text-muted-foreground text-xs'>
                              de 4h trabalhadas
                            </div>
                          </div>

                          <div className='space-y-2'>
                            <Progress value={progressPercent} className='h-3' />
                            <div className='text-muted-foreground flex justify-between text-xs'>
                              <span>0h</span>
                              <span>4h</span>
                            </div>
                          </div>
                        </>
                      ) : isPaid ? (
                        <div className='rounded-md border border-green-500 bg-green-500/10 p-4 text-center'>
                          <div className='text-sm font-semibold text-green-600'>
                            ✔ Horas semanais pagas
                          </div>
                          <div className='text-muted-foreground mt-1 text-xs'>
                            {workedHours.toFixed(2)}h / {minWeeklyHours}h
                            completadas
                          </div>
                        </div>
                      ) : (
                        <>
                          <Button
                            onClick={handleBaterPonto}
                            disabled={isBatingPonto}
                            className='w-full'
                            size='lg'
                          >
                            {isBatingPonto
                              ? 'Registrando...'
                              : timeRecords.length === 0 ||
                                  timeRecords[timeRecords.length - 1].type ===
                                    'Saída'
                                ? 'Registrar Entrada'
                                : 'Registrar Saída'}
                          </Button>

                          <div className='text-center'>
                            <div className='text-3xl font-bold'>
                              {workedHours.toFixed(2)}h
                            </div>
                            <div className='text-muted-foreground text-xs'>
                              de 4h trabalhadas
                            </div>
                          </div>

                          <div className='space-y-2'>
                            <Progress value={progressPercent} className='h-3' />
                            <div className='text-muted-foreground flex justify-between text-xs'>
                              <span>0h</span>
                              <span>4h</span>
                            </div>
                          </div>
                        </>
                      )}

                      <ScrollArea className='h-32'>
                        <div className='space-y-2'>
                          <div className='text-muted-foreground text-xs font-medium'>
                            Hoje
                          </div>
                          {timeRecords.length === 0 ? (
                            <div className='text-muted-foreground py-4 text-center text-xs'>
                              Nenhum registro hoje
                            </div>
                          ) : (
                            timeRecords.map((record) => (
                              <div
                                key={record.id}
                                className='flex items-center justify-between rounded-md border p-2'
                              >
                                <span className='text-sm font-medium'>
                                  {record.type}
                                </span>
                                <span className='text-muted-foreground text-xs'>
                                  {record.timestamp?.toDate
                                    ? format(
                                        record.timestamp.toDate(),
                                        'HH:mm:ss'
                                      )
                                    : '--:--:--'}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </ScrollArea>
                    </>
                  );
                })()}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Desktop: Week Schedule Editor (full width) */}
        <div className='hidden lg:block'>
          {isMemberLoading ? (
            <WeekScheduleEditorSkeleton />
          ) : (
            <WeekScheduleEditor
              memberId={memberId}
              initialSchedule={weekSchedule}
              onSaved={(s) => setWeekSchedule(s)}
            />
          )}
        </div>
      </div>
      <Dialog open={isTaskModalOpen} onOpenChange={setIsTaskModalOpen}>
        <DialogContent className='max-h-[90vh] max-w-[95vw] overflow-y-auto md:max-w-2xl'>
          <DialogHeader>
            <DialogTitle className='pr-8 text-lg md:text-xl'>
              {activeTask?.title ?? 'Atividade'}
            </DialogTitle>
            <DialogDescription className='text-xs md:text-sm'>
              {activeTask?.projectName
                ? `Projeto: ${activeTask.projectName}`
                : 'Detalhes da atividade'}
            </DialogDescription>
          </DialogHeader>
          <div className='grid gap-3 md:gap-4'>
            <div className='grid grid-cols-2 gap-2'>
              <div className='rounded-lg border p-3 text-sm'>
                <div className='text-muted-foreground mb-1 text-xs'>Prazo</div>
                <div className='text-xs font-medium md:text-sm'>
                  {activeTask?.due || '--'}
                </div>
              </div>
              <div className='rounded-lg border p-3 text-sm'>
                <div className='text-muted-foreground mb-1 text-xs'>
                  Prioridade
                </div>
                {activeTask ? (
                  <Badge
                    className={`${priorityStyles[activeTask.priority]} text-xs`}
                  >
                    {activeTask.priority}
                  </Badge>
                ) : (
                  <span className='text-muted-foreground text-xs'>--</span>
                )}
              </div>
            </div>

            <details className='rounded-lg border p-3 text-sm'>
              <summary className='cursor-pointer text-sm font-medium'>
                Descrição
              </summary>
              <div className='mt-2 text-justify text-sm break-all whitespace-pre-wrap'>
                {activeTask?.description?.trim() || 'Sem descrição'}
              </div>
            </details>

            <div className='grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3'>
              <div className='space-y-2'>
                <label className='text-sm font-medium'>Status</label>
                <Select
                  value={editStatus}
                  disabled={isSavingEdit}
                  onValueChange={setEditStatus}
                >
                  <SelectTrigger className='h-11'>
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
              <Button
                type='button'
                onClick={handleUpdateTask}
                disabled={isSavingEdit}
                className='h-11 w-11 rounded-md p-0'
                size='icon'
                aria-label='Salvar atualização'
              >
                +
              </Button>
            </div>

            <div className='space-y-2'>
              <label className='text-sm font-medium'>
                Adicionar atualização
              </label>
              <Textarea
                placeholder='Descreva sua atualização'
                className='min-h-20'
                value={updateNote}
                disabled={isSavingEdit}
                onChange={(event) => setUpdateNote(event.target.value)}
              />
            </div>

            <div className='rounded-lg border p-3'>
              <div className='mb-3 text-sm font-medium'>
                Atualizações anteriores
              </div>
              <div className='max-h-60 space-y-2 overflow-y-auto'>
                {activeTask?.updates && activeTask.updates.length > 0 ? (
                  activeTask.updates.map((update) => (
                    <div
                      key={update.id}
                      className='bg-muted/30 rounded-lg border p-3'
                    >
                      <div className='mb-1 flex items-start justify-between gap-2'>
                        <div className='text-xs font-medium'>
                          {update.author}
                        </div>
                        <div className='text-muted-foreground text-[10px]'>
                          {update.time}
                        </div>
                      </div>
                      <div className='pr-3 text-justify text-sm'>
                        {update.note}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className='text-muted-foreground py-4 text-center text-sm'>
                    Sem atualizações
                  </div>
                )}
              </div>
            </div>
          </div>
          {activeTask?.projectId ? (
            <DialogFooter className='flex-col gap-2 sm:flex-row sm:gap-0'>
              <Button
                asChild
                type='button'
                variant='secondary'
                className='w-full sm:w-auto'
              >
                <Link
                  href={`/dashboard/acompanhamento/projetos/${activeTask.projectId}`}
                >
                  Abrir projeto
                </Link>
              </Button>
            </DialogFooter>
          ) : null}
        </DialogContent>
      </Dialog>
      <Dialog
        open={isEditAgendaModalOpen}
        onOpenChange={setIsEditAgendaModalOpen}
      >
        <DialogContent className='max-w-[95vw] sm:max-w-lg'>
          <DialogHeader>
            <DialogTitle>Editar tarefa da agenda</DialogTitle>
            <DialogDescription>
              Atualize as informações e salve as mudanças.
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-4'>
            <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
              <div className='space-y-1'>
                <label className='text-sm font-medium' htmlFor='editAgendaDate'>
                  Data
                </label>
                <Input
                  id='editAgendaDate'
                  type='date'
                  value={agendaEditForm.date}
                  disabled={isSavingAgendaEdit}
                  onChange={(event) =>
                    setAgendaEditForm((current) => ({
                      ...current,
                      date: event.target.value
                    }))
                  }
                />
              </div>
              <div className='space-y-1'>
                <label
                  className='text-sm font-medium'
                  htmlFor='editAgendaTitle'
                >
                  Nome da atividade
                </label>
                <Input
                  id='editAgendaTitle'
                  placeholder='Ex: Visita técnica'
                  value={agendaEditForm.title}
                  disabled={isSavingAgendaEdit}
                  onChange={(event) =>
                    setAgendaEditForm((current) => ({
                      ...current,
                      title: event.target.value
                    }))
                  }
                />
              </div>
            </div>
            <div className='space-y-1'>
              <label className='text-sm font-medium' htmlFor='editAgendaNotes'>
                Descrição
              </label>
              <Textarea
                id='editAgendaNotes'
                placeholder='Detalhes do compromisso'
                className='min-h-16'
                value={agendaEditForm.description}
                disabled={isSavingAgendaEdit}
                onChange={(event) =>
                  setAgendaEditForm((current) => ({
                    ...current,
                    description: event.target.value
                  }))
                }
              />
            </div>
            <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
              <div className='space-y-1'>
                <label className='text-sm font-medium'>Prioridade</label>
                <Select
                  value={agendaEditForm.priority}
                  disabled={isSavingAgendaEdit}
                  onValueChange={(value) =>
                    setAgendaEditForm((current) => ({
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
              <div className='space-y-1'>
                <label className='text-sm font-medium'>Status</label>
                <Select
                  value={agendaEditForm.status}
                  disabled={isSavingAgendaEdit}
                  onValueChange={(value) =>
                    setAgendaEditForm((current) => ({
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
          </div>
          <DialogFooter className='gap-2 sm:gap-2'>
            <Button
              type='button'
              variant='secondary'
              onClick={() => setIsEditAgendaModalOpen(false)}
              disabled={isSavingAgendaEdit}
            >
              Cancelar
            </Button>
            <Button
              type='button'
              onClick={handleSaveAgendaEdit}
              disabled={isSavingAgendaEdit}
            >
              {isSavingAgendaEdit ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className='max-w-[95vw] sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Excluir tarefa</DialogTitle>
            <DialogDescription>
              Esta ação não pode ser desfeita. Deseja excluir{' '}
              <span className='font-medium'>
                {taskToDelete?.title || 'esta tarefa'}
              </span>
              ?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className='gap-2 sm:gap-2'>
            <Button
              type='button'
              variant='secondary'
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={Boolean(deletingAgendaId)}
            >
              Cancelar
            </Button>
            <Button
              type='button'
              variant='destructive'
              onClick={handleDeleteAgendaTask}
              disabled={Boolean(deletingAgendaId)}
            >
              {deletingAgendaId ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
