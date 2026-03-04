// ---------------------------------------------------------------------------
// Tipos para o roteiro de entrevistas (slider de perguntas)
// ---------------------------------------------------------------------------

/**
 * Seções que agrupam as perguntas do roteiro de entrevista.
 * Cada seção representa um bloco temático da entrevista.
 */
export type InterviewQuestionSection =
  | 'PESSOAL'
  | 'AUTOCONHECIMENTO'
  | 'VISÃO DE OUTROS SOBRE O CANDIDATO'
  | 'SOBRE A WATT CONSULTORIA'
  | 'EXPECTATIVAS SOBRE A EMPRESA'
  | 'VISÃO DE FUTURO'
  | 'LIDERANÇA'
  | 'COMPROMISSO'
  | 'DESTAQUE'
  | 'FEEDBACK / TRABALHO EM EQUIPE'
  | 'CRIATIVIDADE'
  | 'TRANSPARÊNCIA'
  | 'PROPÓSITO'
  | 'AUTORESPONSABILIDADE'
  | 'RESPONSABILIDADE SOCIAL'
  | 'DISPOSIÇÕES FINAIS';

/**
 * Uma dica para o entrevistador sobre como conduzir a pergunta.
 * Pode incluir pontos de atenção, comportamentos a observar ou
 * lembretes para manter a entrevista padronizada.
 */
export type InterviewQuestionTip = string;

/**
 * Representa uma pergunta estruturada do roteiro de entrevista.
 *
 * - `id`: identificador único da pergunta
 * - `section`: bloco/tema ao qual a pergunta pertence
 * - `question`: texto principal da pergunta
 * - `order`: posição no roteiro (usado para ordenação)
 * - `tipsForInterviewer`: lista de dicas para orientar o entrevistador
 * - `whatToObserve`: (opcional) o que analisar na resposta do candidato
 * - `exampleFollowUps`: (opcional) exemplos de perguntas de aprofundamento
 */
export type InterviewQuestion = {
  id: string;
  section: InterviewQuestionSection;
  question: string;
  order: number;
  tipsForInterviewer: InterviewQuestionTip[];
  whatToObserve?: string;
  exampleFollowUps?: string[];
};

/**
 * Estado de navegação do slider de perguntas.
 * Compatível com evolução futura para registro de respostas/avaliações.
 */
export type InterviewSliderState = {
  currentIndex: number;
  totalQuestions: number;
  currentQuestion: InterviewQuestion;
};

/**
 * Contrato do repositório do roteiro de entrevista.
 * Responsável exclusivamente por fornecer os dados brutos do roteiro.
 */
export default interface IInterviewScriptRepository {
  /** Retorna todas as perguntas do roteiro */
  getAllQuestions(): InterviewQuestion[];
}
