import type { Timestamp } from 'firebase/firestore';

export type PselStageVoteType = 'positivo' | 'negativo';

export type CandidateStageStatus = 'ativo' | 'faltou';

export interface PselStageInfo {
  data?: Timestamp | Date | string | number | null;
}

export type PselStagesDocument = Record<string, PselStageInfo | undefined>;

export interface CandidateStageEvaluationVote {
  tipo: PselStageVoteType;
  createdAt: Timestamp | Date;
  avaliadorId: string;
  avaliadorNome?: string;
}

export interface CandidateStageAbsenceInfo {
  registrada: boolean;
  registradaPorId: string;
  registradaPorNome?: string;
  createdAt: Timestamp | Date;
}

export interface CandidateStageEvaluationSummary {
  positivos: number;
  negativos: number;
  total: number;
  saldo: number;
}

export interface CandidateStageEvaluation {
  status?: CandidateStageStatus;
  votos: Record<string, CandidateStageEvaluationVote>;
  falta?: CandidateStageAbsenceInfo;
  resumo: CandidateStageEvaluationSummary;
}

export type CandidateAvaliacoesEtapas = Record<
  string,
  CandidateStageEvaluation | undefined
>;

export interface StageEvaluationActor {
  id: string;
  name: string;
  role?: string | null;
  tags?: string[] | null;
}

export interface PselStageView {
  key: string;
  label: string;
  deadline: Date | null;
  isClosed: boolean;
}

export interface StageEvaluationCandidateView {
  candidateId: string;
  nomeCompleto: string;
  curso: string;
  periodo: string;
  imagemUrl: string;
  stageKey: string;
  status: CandidateStageStatus;
  resumo: CandidateStageEvaluationSummary;
  hasVoted: boolean;
  currentVote?: PselStageVoteType;
}

export interface StageEvaluationResultView {
  candidateId: string;
  nomeCompleto: string;
  imagemUrl: string;
  status: CandidateStageStatus;
  positivos: number;
  negativos: number;
  total: number;
  saldo: number;
}
