import type { Timestamp } from 'firebase/firestore';
import type {
  MemberRoleEnum,
  MemberSectorEnum,
  MemberSectorEnumSimple
} from '@/types/member/member';

// ── Papéis com acesso de coordenação ───────────────────────────────────────

export const HOGWATTS_COORDINATOR_ROLES: MemberRoleEnum[] = [
  'Assessor',
  'Diretor',
  'Presidente'
];

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
  sector: MemberSectorEnumSimple;
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
  proofFileUrl: string | null;
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
  proofFile?: File;
};

export type ReviewSubmissionInput = {
  submissionId: string;
  status: 'Aprovado' | 'Recusado';
  reviewerId: string;
};

// ── Top membros por casa ───────────────────────────────────────────────────

export type HogwattsHouseTopMember = {
  memberId: string;
  memberName: string;
  totalPoints: number;
};

export type HogwattsRanking = {
  houses: HogwattsHouse[];
  topMembers: Record<HogwattsHouseName, HogwattsHouseTopMember[]>;
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
  sector: MemberSectorEnumSimple;
};
