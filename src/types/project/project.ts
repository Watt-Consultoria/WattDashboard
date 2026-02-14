import type { Timestamp } from 'firebase/firestore';
import type { Activity } from '../activity/activity';

export type Project = {
  id: string;
  area: ProjectAreaEnum;
  client: string;
  createdAt: Timestamp;
  health: ProjectHealthEnum;
  managerId: string;
  manager: string;
  name: string;
  next: string;
  start: Timestamp;
  status: ProjectStatusEnum;
  tipo: string;
  updatedAt: Timestamp;
  updatedLabel: string;
  value: number;
  activities: Activity[];
};

export type ProjectAreaEnum =
  | 'Automação'
  | 'Elétrica'
  | 'Comercial'
  | 'Institucional'
  | 'Marketing'
  | 'Executivo'
  | 'Indefinido';

export type ProjectHealthEnum = 'Ok' | 'Atenção' | 'Estável' | 'Indefinido';

export type ProjectStatusEnum =
  | 'Planejamento'
  | 'Em andamento'
  | 'Revisão'
  | 'Execução'
  | 'Validação'
  | 'Indefinido';

export const projectDefaultValues = {
  AREA: 'Indefinido',
  HEALTH: 'Indefinido',
  STATUS: 'Indefinido'
} as const satisfies {
  AREA: ProjectAreaEnum;
  HEALTH: ProjectHealthEnum;
  STATUS: ProjectStatusEnum;
};
