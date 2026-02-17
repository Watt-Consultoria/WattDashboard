import type { Timestamp } from 'firebase/firestore';
import type { RuleCode } from '../code-of-conduct';

export type Falta = {
  id: string;
  memberId: string;
  ruleCode: RuleCode;
  description: string;
  dateAdded: Timestamp;
  expiresAt: Timestamp;
  addedBy: string; // ID do gestor que adicionou
  status: 'ativa' | 'expirada' | 'cancelada';
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type CreateFaltaRequest = {
  ruleCode: RuleCode;
  description: string;
};

export type FaltaWithDetails = Falta & {
  ruleName: string;
  ruleType: 'leve' | 'moderada' | 'grave' | 'desligamento';
  daysUntilExpiry: number;
};
