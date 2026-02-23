import { Timestamp } from 'firebase/firestore';

export type ActivityUpdate = {
  id: string;
  author: string;
  authorId?: string;
  note: string;
  time: string;
};

export type Activity = {
  id: string;
  description: string;
  dueAt: Timestamp;
  issuedAt: Timestamp;
  name: string;
  owner: string;
  ownerId: string;
  priority: ActivityPriorityEnum;
  status: ActivityStatusEnum;
  projectId?: string;
  projectName?: string;
  updates?: ActivityUpdate[];
};

export type ActivityPriorityEnum = 'Baixa' | 'Média' | 'Alta';

export type ActivityStatusEnum =
  | 'Planejado'
  | 'Em andamento'
  | 'Bloqueado'
  | 'Concluído'
  | 'Indefinido';

export const activityDefaultValues = {
  STATUS: 'Indefinido',
  PRIORITY: 'Média'
} as const satisfies {
  STATUS: ActivityStatusEnum;
  PRIORITY: ActivityPriorityEnum;
};
