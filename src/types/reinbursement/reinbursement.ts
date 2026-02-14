import type { Timestamp } from 'firebase/firestore';

export type ReinbursementCategory =
  | 'Transporte'
  | 'Alimentação'
  | 'Materiais'
  | 'Compra de ingressos'
  | 'Eventos'
  | 'Outros';

export type ReinbursementStatus = 'Pendente' | 'Aprovado' | 'Recusado';

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
