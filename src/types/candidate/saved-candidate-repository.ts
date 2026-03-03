import type { SavedCandidate, SaveCandidateInput } from './saved-candidate';
import type { CandidateInterview } from './candidate';

export default interface ISavedCandidateRepository {
  /** Salva um pré-candidato como candidato na coleção `candidates` */
  saveCandidate(data: SaveCandidateInput): Promise<SavedCandidate>;

  /** Lista todos os candidatos salvos */
  listCandidates(): Promise<SavedCandidate[]>;

  /** Busca um candidato pelo ID */
  getCandidateById(candidateId: string): Promise<SavedCandidate | null>;

  /** Verifica se um pré-candidato já foi salvo como candidato */
  existsByRespostaId(respostaId: string): Promise<boolean>;

  /** Lista candidatos que possuem uma determinada tag */
  listCandidatesByTag(tag: string): Promise<SavedCandidate[]>;

  /** Busca múltiplos candidatos por seus IDs */
  getCandidatesByIds(candidateIds: string[]): Promise<SavedCandidate[]>;

  /** Adiciona uma tag a um candidato salvo */
  addTag(candidateId: string, tag: string): Promise<void>;

  /** Remove uma tag de um candidato salvo */
  removeTag(candidateId: string, tag: string): Promise<void>;

  /** Adiciona uma tag a múltiplos candidatos salvos */
  addTagToMultiple(candidateIds: string[], tag: string): Promise<void>;

  /** Remove uma tag de múltiplos candidatos salvos */
  removeTagFromMultiple(candidateIds: string[], tag: string): Promise<void>;

  /** Atualiza a etapa de um candidato salvo */
  setCandidateStage(candidateId: string, stage: string): Promise<void>;

  /** Define a flag desclassificado=true sem alterar a etapa */
  disqualifyCandidate(candidateId: string): Promise<void>;

  /** Atualiza o estado de entrevista de um candidato */
  updateInterviewState(
    candidateId: string,
    interview: CandidateInterview
  ): Promise<void>;

  /** Atualiza o estado de entrevista de múltiplos candidatos */
  updateInterviewStateForMultiple(
    candidateIds: string[],
    interview: CandidateInterview
  ): Promise<void>;
}
