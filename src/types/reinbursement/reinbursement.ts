import type { Timestamp } from 'firebase/firestore';

export type ReinbursementCategory =
  | 'Transporte'
  | 'Alimentação'
  | 'Materiais'
  | 'Compra de ingressos'
  | 'Eventos'
  | 'Outros';

export type ReinbursementStatus = 'Pendente' | 'Aprovado' | 'Recusado';

export const REINBURSEMENT_CATEGORIES: ReinbursementCategory[] = [
  'Transporte',
  'Alimentação',
  'Materiais',
  'Compra de ingressos',
  'Eventos',
  'Outros'
];

export const REINBURSEMENT_STATUSES: ReinbursementStatus[] = [
  'Pendente',
  'Aprovado',
  'Recusado'
];

export type ReinbursementReceipt = {
  url: string;
  path: string;
  name: string;
  contentType: string;
  size: number;
};

export type Reinbursement = {
  id: string;
  memberId: string;
  memberName: string;
  memberEmail: string;
  title: string;
  description: string;
  category: ReinbursementCategory;
  amountCents: number;
  pixKey: string;
  receipt?: ReinbursementReceipt;
  status: ReinbursementStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type CreateReinbursementInput = Omit<
  Reinbursement,
  'id' | 'createdAt' | 'updatedAt'
>;

export type ReinbursementQuery = {
  memberId?: string;
  category?: ReinbursementCategory;
  status?: ReinbursementStatus;
  startDate?: Timestamp;
  endDate?: Timestamp;
};

export type ReinbursementDashboardFilters = {
  memberId?: string;
  category?: ReinbursementCategory;
  status?: ReinbursementStatus;
  searchText?: string;
  startDate?: Date | null;
  endDate?: Date | null;
};

export type ReinbursementSummary = {
  totalCount: number;
  totalRequestedCents: number;
  totalApprovedCents: number;
  totalPendingCents: number;
  totalRejectedCents: number;
};

export type ReinbursementCategoryShare = {
  category: ReinbursementCategory;
  amountCents: number;
  percentage: number;
};

export type ReinbursementMemberTotal = {
  memberId: string;
  memberName: string;
  amountCents: number;
};

export type ReinbursementDashboardData = {
  reinbursements: Reinbursement[];
  summary: ReinbursementSummary;
  categoryShares: ReinbursementCategoryShare[];
  memberTotals: ReinbursementMemberTotal[];
};
