import type { SavedCandidate } from './saved-candidate';
import type {
  CandidateStageEvaluation,
  PselStagesDocument
} from './stage-evaluation';

export default interface IStageEvaluationRepository {
  /** Le o documento GlobalInfo/etapasPsel */
  getPselStages(): Promise<PselStagesDocument>;

  /** Lista candidatos ativos elegiveis para avaliacao por etapa */
  getCandidatesForStageEvaluation(): Promise<SavedCandidate[]>;

  /** Obtem os dados de avaliacao de uma etapa para um candidato */
  getCandidateStageEvaluation(
    candidateId: string,
    stageKey: string
  ): Promise<CandidateStageEvaluation | null>;

  /** Persiste a avaliacao consolidada de uma etapa */
  submitCandidateStageEvaluation(
    candidateId: string,
    stageKey: string,
    evaluation: CandidateStageEvaluation
  ): Promise<void>;

  /** Persiste o estado de falta da etapa */
  markCandidateStageAbsence(
    candidateId: string,
    stageKey: string,
    evaluation: CandidateStageEvaluation
  ): Promise<void>;

  /** Remove o estado de falta da etapa */
  unmarkCandidateStageAbsence(
    candidateId: string,
    stageKey: string,
    evaluation: CandidateStageEvaluation
  ): Promise<void>;

  /** Lista candidatos ativos para consolidacao de resultados */
  getStageEvaluationResults(): Promise<SavedCandidate[]>;
}
