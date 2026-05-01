import type { FirestoreDateValue } from '@/lib/firestore-date';

export type AcompanhamentoRole =
  | 'Consultor'
  | 'Gerente'
  | 'Diretor'
  | 'Assessor'
  | 'Presidente'
  | string;

export type AcompanhamentoSector =
  | 'Automacao'
  | 'Eletrica'
  | 'Comercial'
  | 'Institucional'
  | 'Marketing'
  | 'Executivo'
  | string;

export type AcompanhamentoActor = {
  id: string;
  role?: string | null;
  sector?: string | null;
} | null;

export type AcompanhamentoActivityUpdate = {
  id: string;
  author: string;
  authorId?: string;
  note: string;
  time: string;
};

export type AcompanhamentoMemberAlert = {
  id: string;
  title: string;
  detail: string;
  level: string;
  time: string;
};

export type AcompanhamentoMemberInfo = {
  id?: string;
  name: string;
  email: string;
  sector: string;
  cpf: string;
  role: string;
  tags?: string[];
  activity?: string;
  status?: string;
  isLeadership?: boolean;
  agendaTasks?: AcompanhamentoMemberTask[];
  alerts?: AcompanhamentoMemberAlert[];
};

export type AcompanhamentoMemberCard = {
  id: string;
  name: string;
  email?: string;
  sector?: string;
  cpf?: string;
  role: string;
  activity: string;
  status: string;
  isLeadership?: boolean;
  tags?: string[];
};

export type AcompanhamentoMemberOption = {
  id: string;
  name: string;
  role?: string;
};

export type AcompanhamentoMemberFormState = {
  name: string;
  email: string;
  sector: string;
  cpf: string;
  role: string;
};

export type AcompanhamentoMemberEditFormState =
  AcompanhamentoMemberFormState & {
    tags: string[];
  };

export type AcompanhamentoProjectCard = {
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

export type AcompanhamentoProjectFormState = {
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

export type AcompanhamentoProjectInfo = {
  id: string;
  name: string;
  client?: string;
  status?: string;
  start?: string;
  next?: string;
  value?: string | number;
  manager?: string;
};

export type AcompanhamentoProjectData = {
  id: string;
  name?: string;
  area?: string;
  tipo?: string;
  value?: string | number;
  status?: string;
  health?: string;
  start?: FirestoreDateValue;
  next?: string;
  client?: string;
  manager?: string;
  managerId?: string;
  updatedAt?: FirestoreDateValue;
  createdAt?: FirestoreDateValue;
  Activities?: Array<{
    ownerId?: string;
    name?: string;
    dueAt?: FirestoreDateValue;
  }>;
};

export type AcompanhamentoActivityPriority = 'Alta' | 'Media' | 'Média' | 'Baixa';

export type AcompanhamentoActivity = {
  id: string;
  name: string;
  issuedAt: string;
  dueAt: string;
  owner: string;
  ownerId?: string;
  status: string;
  priority: AcompanhamentoActivityPriority;
  description: string;
  updates?: AcompanhamentoActivityUpdate[];
};

export type AcompanhamentoActivityData = {
  id: string;
  name?: string;
  issuedAt?: FirestoreDateValue;
  dueAt?: FirestoreDateValue;
  owner?: string;
  ownerId?: string;
  status?: string;
  priority?: string;
  description?: string;
  updates?: AcompanhamentoActivityUpdate[];
  projectId?: string;
  projectName?: string;
};

export type AcompanhamentoActivityFormState = {
  name: string;
  description: string;
  dueDate: string;
  owner: string;
  ownerId: string;
  status: string;
  priority: string;
};

export type AcompanhamentoMemberTask = {
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
  updates?: AcompanhamentoActivityUpdate[];
};

export type AcompanhamentoConflictingTask = {
  title: string;
  due: string;
  source: string;
};

export type AcompanhamentoConflictResult = {
  hasConflict: boolean;
  message: string;
  tasksCount: number;
  tasks: AcompanhamentoConflictingTask[];
};

export type AcompanhamentoOccupancyMetrics = {
  totalMembers: number;
  occupiedCount: number;
  availableCount: number;
  occupiedPercent: number;
};

export type AcompanhamentoProjectDetail = {
  project: AcompanhamentoProjectInfo;
  activities: AcompanhamentoActivity[];
};

export type AcompanhamentoRepositoryProjectDetailData = {
  project: AcompanhamentoProjectData;
  activities: AcompanhamentoActivityData[];
};

export type AcompanhamentoServiceResult = {
  success: boolean;
  error?: string;
};
