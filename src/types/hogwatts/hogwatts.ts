import type { Timestamp } from 'firebase/firestore';

// ── Casas ──────────────────────────────────────────────────────────────────

export type HogwattsHouseName = 'Nexus' | 'Lumina' | 'Voltus';

export const HOGWATTS_HOUSES: HogwattsHouseName[] = [
  'Nexus',
  'Lumina',
  'Voltus'
];

export type HogwattsHouse = {
  id: string;
  name: HogwattsHouseName;
  totalPoints: number;
  updatedAt: Timestamp;
};

// ── Tarefas pré-definidas ──────────────────────────────────────────────────

export type HogwattsTask = {
  id: string;
  name: string;
  description: string;
  points: number;
  createdAt: Timestamp;
};

// ── Submissões ─────────────────────────────────────────────────────────────

export type HogwattsSubmissionStatus = 'Pendente' | 'Aprovado' | 'Recusado';

export const HOGWATTS_SUBMISSION_STATUSES: HogwattsSubmissionStatus[] = [
  'Pendente',
  'Aprovado',
  'Recusado'
];

export type HogwattsSubmission = {
  id: string;
  taskId: string;
  taskName: string;
  taskPoints: number;
  memberId: string;
  memberName: string;
  houseName: HogwattsHouseName;
  status: HogwattsSubmissionStatus;
  note: string;
  reviewedBy: string;
  reviewedAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

// ── Vínculo membro ↔ casa ──────────────────────────────────────────────────

export type HogwattsMemberProfile = {
  id: string;
  memberId: string;
  memberName: string;
  houseName: HogwattsHouseName;
  createdAt: Timestamp;
};

// ── Inputs auxiliares ──────────────────────────────────────────────────────

export type CreateSubmissionInput = {
  taskId: string;
  memberId: string;
  note?: string;
};

export type ReviewSubmissionInput = {
  submissionId: string;
  status: 'Aprovado' | 'Recusado';
  reviewerId: string;
};

export type HogwattsRanking = {
  houses: HogwattsHouse[];
};

export type HogwattsSubmissionQuery = {
  memberId?: string;
  houseName?: HogwattsHouseName;
  status?: HogwattsSubmissionStatus;
};

export type AssignMemberInput = {
  memberId: string;
  houseName: HogwattsHouseName;
};

export type CreateTaskInput = {
  name: string;
  description: string;
  points: number;
};
