/**
 * Tipos e interfaces para gerenciamento de formularios
 */

export type FormQuestionType =
  | 'shortText'
  | 'paragraph'
  | 'rating'
  | 'number'
  | 'multipleChoice'
  | 'checkbox'
  | 'select'
  | 'fileUpload'
  | 'infoSection';

export type FormType = 'interno' | 'cadastroPsel';

export type FormQuestionItem = {
  id: string;
  valor: string;
};

/**
 * Configuração de validação regex para campos shortText
 */
export type FormQuestionValidation = {
  /** Padrão regex para validar a resposta (ex: '^[A-Za-z]+$') */
  pattern: string;
  /** Mensagem exibida quando a resposta não corresponde ao padrão */
  message: string;
};

export type FormQuestion = {
  id: string;
  titulo: string;
  tipo: FormQuestionType;
  obrigatoria: boolean;
  descricao?: string;
  // Para rating: { minima: 1, maxima: 5 } ou { minima: 1, maxima: 10 }
  opcoes?: {
    minima?: number;
    maxima?: number;
  };
  // Para multipleChoice, checkbox, select
  items?: FormQuestionItem[];
  // Para infoSection: conteúdo informativo (suporta texto com links)
  conteudo?: string;
  // Para shortText: validação regex opcional
  validacao?: FormQuestionValidation;
};

export type Form = {
  id: string;
  nome: string;
  descricao?: string;
  tipo: FormType;
  slug: string;
  perguntas: FormQuestion[];
  ativa: boolean;
  criadoEm: unknown; // Timestamp
  atualizadoEm: unknown; // Timestamp
};

export type CreateFormInput = {
  nome: string;
  descricao?: string;
  tipo: FormType;
  perguntas: Omit<FormQuestion, 'id'>[];
};

export type UpdateFormInput = Partial<
  Omit<Form, 'id' | 'slug' | 'criadoEm' | 'atualizadoEm'>
>;

export type FormAnswer = {
  idPergunta: string;
  tituloPergunta: string;
  tipo: FormQuestionType;
  valor: string | string[]; // array para multipleChoice/checkbox
};

export type FormResponse = {
  id: string;
  formId: string;
  respostas: FormAnswer[];
  criadoEm: unknown; // Timestamp
  atualizadoEm?: unknown; // Timestamp
};

export type SubmitFormInput = {
  respostas: Array<{
    idPergunta: string;
    valor: string | string[];
  }>;
};

/**
 * Configurações padrão para tipos de pergunta
 */
export const FORM_QUESTION_TYPE_LABELS: Record<FormQuestionType, string> = {
  shortText: 'Resposta curta',
  paragraph: 'Parágrafo',
  rating: 'Classificação',
  number: 'Número',
  multipleChoice: 'Múltipla escolha',
  checkbox: 'Caixas de seleção',
  select: 'Lista suspensa',
  fileUpload: 'Upload de arquivo',
  infoSection: 'Seção informativa'
};

/**
 * Validações para campos obrigatórios de cadastroPsel
 * Será atualizado conforme as regras de negócio evoluírem
 */
export const PSEL_REQUIRED_FIELD_TITLES = [
  'Nome',
  'Sobrenome',
  'Curso',
  'Periodo',
  'Telefone para contato',
  'E-mail para contato',
  'Qual o seu instagram',
  'Por onde voce ficou sabendo do PSEL?',
  'O que te move',
  'Por que voce gostaria de entrar na WATT?',
  'Tamanho da camisa',
  'Curriculum Vitae',
  'Historico escolar',
  'Imagem'
];
