// ---------------------------------------------------------------------------
// Tipos para o sistema de entrevistas do PSEL
// ---------------------------------------------------------------------------

// ── Avaliação de entrevista ──────────────────────────────────────────────────

/**
 * Nota de 1 a 5 para qualidades desejadas.
 *
 * - 1: Não apresentou desempenho correspondente com as expectativas
 * - 2: Apresentou um desempenho abaixo do correspondente com as expectativas
 * - 3: Apresentou um desempenho razoável correspondente com as expectativas
 * - 4: Apresentou um bom desempenho correspondente com as expectativas
 * - 5: Apresentou um ótimo desempenho correspondente com as expectativas
 */
export type DesiredTraitRating = 1 | 2 | 3 | 4 | 5;

/**
 * Classificação qualitativa para habilidades/comportamentos indesejados.
 *
 * - 'notPresented': Não apresentou
 * - 'presented': Apresentou
 * - 'unclear': Pareceu apresentar, mas não ficou claro
 */
export type UndesiredTraitAssessment = 'notPresented' | 'presented' | 'unclear';

/** Chaves válidas para as qualidades desejadas. */
export type DesiredTraitKey =
  | 'proatividade'
  | 'compromisso'
  | 'lideranca'
  | 'proposito'
  | 'transparencia'
  | 'autoresponsabilidade'
  | 'uniaoDeTime'
  | 'autoconfianca'
  | 'comunicacao'
  | 'responsabilidadeSocial'
  | 'seriedade'
  | 'criatividade';

/** Chaves válidas para as habilidades indesejadas. */
export type UndesiredTraitKey =
  | 'procrastinacao'
  | 'propositoVago'
  | 'desinteresse'
  | 'vitimizacao'
  | 'faltaDeTransparencia'
  | 'faltaDeConfianca';

/** Mapa de qualidades desejadas com suas respectivas notas (1–5). */
export type InterviewDesiredTraits = Record<
  DesiredTraitKey,
  DesiredTraitRating
>;

/** Mapa de habilidades indesejadas com suas classificações qualitativas. */
export type InterviewUndesiredTraits = Record<
  UndesiredTraitKey,
  UndesiredTraitAssessment
>;

/** Identificação do avaliador que registrou a avaliação. */
export type InterviewReviewer = {
  /** ID do membro avaliador */
  id: string;
  /** Nome do membro avaliador */
  name: string;
};

/**
 * Resultado da avaliação de entrevista, armazenado em `interview.result`.
 *
 * Estrutura escalável para suportar futuramente múltiplos avaliadores,
 * média consolidada, parecer final e recomendação de aprovação/reprovação.
 */
export type InterviewResult = {
  /** Notas das qualidades desejadas */
  desiredTraits: InterviewDesiredTraits;
  /** Avaliações das habilidades indesejadas */
  undesiredTraits: InterviewUndesiredTraits;
  /** Identificação do avaliador */
  reviewer: InterviewReviewer;
  /** Timestamp ISO de quando a avaliação foi registrada */
  reviewedAt: string;
  /** Observações gerais sobre a entrevista (opcional) */
  notes?: string;
};

/**
 * Dados de entrada para submeter uma avaliação de entrevista.
 * Omite campos gerados automaticamente (reviewedAt).
 */
export type SubmitInterviewResultInput = {
  candidateId: string;
  reviewerId: string;
  reviewerName: string;
  desiredTraits: InterviewDesiredTraits;
  undesiredTraits: InterviewUndesiredTraits;
  notes?: string;
};

// ── Estatísticas de entrevista ───────────────────────────────────────────────

/** Resultado individual de entrevista com dados do candidato. */
export type InterviewResultView = {
  candidateId: string;
  candidateName: string;
  /** Média aritmética das notas de qualidades desejadas (1–5). */
  desiredTraitsAverage: number;
  /** Quantidade de habilidades indesejadas marcadas como "presented". */
  undesiredPresented: number;
  /** Pontuação final = desiredTraitsAverage - (penalidade por indesejadas). */
  finalScore: number;
  result: InterviewResult;
};

/** Média de cada qualidade desejada no conjunto de candidatos avaliados. */
export type DesiredTraitAverages = Record<DesiredTraitKey, number>;

/** Distribuição de classificações para cada habilidade indesejada. */
export type UndesiredTraitDistribution = Record<
  UndesiredTraitKey,
  { notPresented: number; presented: number; unclear: number }
>;

/** Estatísticas agregadas de todas as entrevistas avaliadas. */
export type InterviewStatistics = {
  /** Total de candidatos avaliados */
  totalEvaluated: number;
  /** Média geral das médias individuais de qualidades desejadas */
  overallDesiredAverage: number;
  /** Média de cada qualidade desejada */
  desiredTraitAverages: DesiredTraitAverages;
  /** Distribuição de classificações por habilidade indesejada */
  undesiredTraitDistribution: UndesiredTraitDistribution;
  /** Resultados individuais ordenados por pontuação final (decrescente) */
  rankings: InterviewResultView[];
};

// ── Agendamento de entrevista ────────────────────────────────────────────────

/**
 * Status de ocupação de um horário de entrevista.
 * - 'available': horário livre para agendamento
 * - 'booked': horário já reservado por um candidato
 */
export type InterviewSlotStatus = 'available' | 'booked';

/**
 * Representa um horário de entrevista armazenado no Firestore.
 * Inclui flags de ocupação e dados do candidato quando reservado.
 */
export type InterviewSlot = {
  id: string;
  /** Data no formato ISO yyyy-MM-dd */
  isoDate: string;
  /** Data formatada para exibição (ex.: "15/03/2026") */
  dateLabel: string;
  /** Horário de início (ex.: "09:00") */
  startTime: string;
  /** Horário de fim (ex.: "09:30") */
  endTime: string;
  /** Minutos desde meia-noite — início */
  startMinutes: number;
  /** Minutos desde meia-noite — fim */
  endMinutes: number;
  /** ID do membro responsável pela entrevista */
  responsibleMemberId: string;
  /** Nome do membro responsável */
  responsibleMemberName: string;
  /** Status do horário: disponível ou ocupado */
  status: InterviewSlotStatus;
  /** ID do candidato que reservou o horário (quando status === 'booked') */
  bookedByCandidateId?: string;
  /** Nome do candidato que reservou o horário */
  bookedByCandidateName?: string;
  /** Timestamp ISO de quando o horário foi reservado */
  bookedAt?: string;
  /** Link do Google Meet para a entrevista (preenchido ao confirmar) */
  googleMeetLink?: string;
};

/**
 * Dados para criação de um novo horário de entrevista.
 * Omite campos gerados automaticamente.
 */
export type CreateInterviewSlotInput = Omit<
  InterviewSlot,
  'status' | 'bookedByCandidateId' | 'bookedByCandidateName' | 'bookedAt'
>;

/**
 * Horário de entrevista disponível enviado ao candidato por email.
 * Contém apenas os dados relevantes para exibição.
 *
 * Apenas horários que possuem pelo menos 2 membros disponíveis no
 * mesmo dia/horário são considerados válidos. `slotIds` contém os
 * IDs reais dos slots subjacentes (exatamente 2) que serão reservados
 * simultaneamente quando o candidato escolher este horário.
 */
export type AvailableInterviewSlotView = {
  /** Chave composta: isoDate_startTime_endTime */
  id: string;
  /** IDs reais dos slots (exatamente 2, um por membro) para este horário */
  slotIds: string[];
  /** Nomes dos membros entrevistadores emparelhados */
  interviewerNames: string[];
  isoDate: string;
  dateLabel: string;
  startTime: string;
  endTime: string;
};
