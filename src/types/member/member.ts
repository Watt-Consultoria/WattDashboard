import type { Timestamp } from 'firebase/firestore';
import { Activity } from '../activity/activity';

export type Member = {
  id: string;
  cpf: string;
  createdAt: Timestamp;
  email: string;
  name: string;
  role: MemberRoleEnum;
  sector: MemberSectorEnum;
  status: MemberStatusEnum;
  timeRecords: TimeRecord[];
  updatedAt: Timestamp;
  alerts: Alert[];
  agendaTasks: AgendaTask[];
  weekSchedule?: WeekShedule;
};

export type MemberRoleEnum =
  | 'Consultor'
  | 'Asessor'
  | 'Gerente'
  | 'Diretor'
  | 'Presidente';

export type MemberSectorEnum =
  | 'Automação'
  | 'Elétrica'
  | 'Comercial'
  | 'Institucional'
  | 'Marketing'
  | 'Executivo';

export type MemberStatusEnum = 'Ativo' | 'Inativo';

export type TimeRecord = {
  id: string;
  timestamp: Timestamp;
  type: 'entrada' | 'saída';
};

export type Alert = {
  id: string;
  activityKey: string;
  activityId: string;
  projectId: string;
  title: string;
  detail: string;
  level: 'baixo' | 'médio' | 'alto';
  time: string;
};

export type AgendaTask = {
  id: string;
  description: string;
  due: string;
  priority: 'baixa' | 'média' | 'alta';
  source: 'agenda';
  status: 'planejado' | 'em andamento' | 'concluído' | 'bloqueado';
  title: string;
  updates: AgendaTaskUpdate[];
};

export type AgendaTaskUpdate = {
  id: string;
  author: string;
  authorId: string;
  note: string;
  time: string;
};

export type MemberTask =
  | ({ type: 'agenda' } & AgendaTask)
  | ({ type: 'project' } & Activity);

export type DA = 'D' | 'I';

export type DayShedule = [
  DA,
  DA,
  DA,
  DA,
  DA,
  DA,
  DA,
  DA,
  DA,
  DA,
  DA,
  DA,
  DA,
  DA
];

export type WeekShedule = {
  monday: DayShedule;
  tuesday: DayShedule;
  wednesday: DayShedule;
  thursday: DayShedule;
  friday: DayShedule;
  saturday: DayShedule;
  sunday: DayShedule;
};

export const WEEK_DAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday'
] as const;

export const WEEK_DAY_LABELS: Record<string, string> = {
  monday: 'Segunda',
  tuesday: 'Terça',
  wednesday: 'Quarta',
  thursday: 'Quinta',
  friday: 'Sexta',
  saturday: 'Sábado',
  sunday: 'Domingo'
};

export const TIME_SLOTS = [
  '08-09',
  '09-10',
  '10-11',
  '11-12',
  '12-13',
  '13-14',
  '14-15',
  '15-16',
  '16-17',
  '17-18',
  '18-19',
  '19-20',
  '20-21',
  '21-22'
] as const;

export const DEFAULT_DAY_SCHEDULE: DayShedule = [
  'D',
  'D',
  'D',
  'D',
  'D',
  'D',
  'D',
  'D',
  'D',
  'D',
  'D',
  'D',
  'D',
  'D'
];

export const DEFAULT_WEEK_SCHEDULE: WeekShedule = {
  monday: [...DEFAULT_DAY_SCHEDULE] as unknown as DayShedule,
  tuesday: [...DEFAULT_DAY_SCHEDULE] as unknown as DayShedule,
  wednesday: [...DEFAULT_DAY_SCHEDULE] as unknown as DayShedule,
  thursday: [...DEFAULT_DAY_SCHEDULE] as unknown as DayShedule,
  friday: [...DEFAULT_DAY_SCHEDULE] as unknown as DayShedule,
  saturday: [...DEFAULT_DAY_SCHEDULE] as unknown as DayShedule,
  sunday: [...DEFAULT_DAY_SCHEDULE] as unknown as DayShedule
};

export function countAvailableHours(schedule: WeekShedule): number {
  let total = 0;
  for (const day of WEEK_DAYS) {
    for (const slot of schedule[day]) {
      if (slot === 'D') total++;
    }
  }
  return total;
}

export const MIN_WEEKLY_AVAILABLE_HOURS = 10;
