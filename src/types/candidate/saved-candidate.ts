import type {
  CandidateTask,
  CandidateAdditionalInfo,
  CandidateInterview
} from './candidate';
import type { CandidateAvaliacoesEtapas } from './stage-evaluation';

/**
 * Candidato salvo na coleção `candidates` do Firestore.
 * Diferente do pré-candidato (que vem das respostas de formulário),
 * este é um candidato já promovido/salvo explicitamente.
 */
export type SavedCandidate = {
  id: string;
  nome: string;
  sobrenome: string;
  curso: string;
  periodo: string;
  etapa: string;
  telefone: string;
  email: string;
  instagram: string;
  origemPsel: string;
  oQueMove: string;
  porqueWatt: string;
  tamanhoCamisa: string;
  curriculumVitaeUrl: string;
  historicoEscolarUrl: string;
  imagemUrl: string;
  tarefas: CandidateTask[];
  informacoesAdicionais: CandidateAdditionalInfo[];
  tags: string[];
  /** ID do formulário PSEL de origem */
  formIdOrigem: string;
  /** ID da resposta de formulário de origem (pré-candidato) */
  respostaIdOrigem: string;
  /** Indica se o candidato salvo foi desclassificado (sem alterar a etapa) */
  desclassificado?: boolean;
  /** Dados de entrevista do candidato */
  interview?: CandidateInterview;
  /** Avaliacoes por etapa do PSEL */
  avaliacaoEtapas?: CandidateAvaliacoesEtapas;
  createdAt?: unknown;
  updatedAt?: unknown;
};

/**
 * Dados necessários para salvar um pré-candidato como candidato.
 * Omite `id`, `createdAt` e `updatedAt` pois são gerados automaticamente.
 */
export type SaveCandidateInput = Omit<
  SavedCandidate,
  'id' | 'createdAt' | 'updatedAt'
>;
