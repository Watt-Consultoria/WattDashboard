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
