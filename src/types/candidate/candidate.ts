import type { InterviewResult } from '@/types/interview/interview';
import type { InterviewAnswersMap } from '@/types/interview/interview-script';
import type { CandidateAvaliacoesEtapas } from './stage-evaluation';

export type CandidateTaskStatus = 'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDA';

export type CandidateTask = {
  id: string;
  titulo: string;
  status: CandidateTaskStatus;
};

export type CandidateAdditionalInfo = {
  titulo: string;
  valor: string;
};

/**
 * Estado de entrevista de um candidato.
 * - notSentEmail: candidato ainda não recebeu o email com horários
 * - sentEmail: email com horários enviado, mas candidato ainda não escolheu
 * - requested: candidato solicitou um horário de entrevista
 * - scheduled: entrevista confirmada (link do Meet enviado)
 */
export type InterviewState =
  | 'notSentEmail'
  | 'sentEmail'
  | 'requested'
  | 'scheduled'
  | 'finished'
  | 'canceled';

/**
 * Dados de entrevista associados a um candidato.
 */
export type CandidateInterview = {
  /** Estado atual da entrevista */
  state: InterviewState;
  /** Data da entrevista no formato ISO (yyyy-MM-dd) */
  date?: string;
  /** Rótulo da data para exibição (ex.: "15/03/2026") */
  dateLabel?: string;
  /** Horário de início (ex.: "09:00") */
  startTime?: string;
  /** Horário de fim (ex.: "10:00") */
  endTime?: string;
  /** Link do Google Meet (preenchido quando scheduled) */
  googleMeetLink?: string;
  /** Resultado da avaliação da entrevista (preenchido pelo entrevistador) */
  result?: InterviewResult;
  /** Respostas das perguntas do roteiro de entrevista (indexadas por questionId) */
  answers?: InterviewAnswersMap;
};

export type Candidate = {
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
  tags?: string[];
  /** ID do formulário PSEL de origem (preenchido para candidatos salvos) */
  formIdOrigem?: string;
  /** Indica se o candidato foi desclassificado (sem alterar a etapa) */
  desclassificado?: boolean;
  /** Dados de entrevista do candidato */
  interview?: CandidateInterview;
  /** Avaliacoes por etapa do PSEL */
  avaliacaoEtapas?: CandidateAvaliacoesEtapas;
};

export type CandidateForm = {
  id: string;
  nomeFormulario: string;
  slug?: string;
};

export type CandidateFormAnswerType =
  | 'string'
  | 'number'
  | 'cpf'
  | 'imageFile'
  | 'pdfFile';

export type CandidateFormAnswer = {
  tituloPergunta: string;
  tipoResposta: CandidateFormAnswerType;
  valor: string;
};

export type CandidateFormResponse = {
  id: string;
  respostas: CandidateFormAnswer[];
  tags?: string[];
  /** Indica se o pré-candidato foi desclassificado */
  desclassificado?: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
};
