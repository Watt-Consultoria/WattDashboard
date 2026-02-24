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
  createdAt?: unknown;
  updatedAt?: unknown;
};
