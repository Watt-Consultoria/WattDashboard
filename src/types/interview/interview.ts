// ---------------------------------------------------------------------------
// Tipos para o sistema de entrevistas do PSEL
// ---------------------------------------------------------------------------

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
 * Slots de múltiplos membros para o mesmo horário são agrupados numa
 * única entrada. `slotIds` contém os IDs reais dos slots subjacentes
 * para que a reserva possa escolher um aleatoriamente.
 */
export type AvailableInterviewSlotView = {
  /** Chave composta: isoDate_startTime_endTime */
  id: string;
  /** IDs reais dos slots (um por membro) para este mesmo horário */
  slotIds: string[];
  isoDate: string;
  dateLabel: string;
  startTime: string;
  endTime: string;
};
