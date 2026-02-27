import type { InterviewSlot, CreateInterviewSlotInput } from './interview';

/**
 * Contrato do repositório de horários de entrevista.
 */
export default interface IInterviewRepository {
  /** Lista todos os horários de entrevista de um formulário */
  listSlots(formId: string): Promise<InterviewSlot[]>;

  /** Salva (cria ou atualiza) um horário de entrevista */
  saveSlot(formId: string, slot: CreateInterviewSlotInput): Promise<void>;

  /** Remove um horário de entrevista */
  removeSlot(formId: string, slotId: string): Promise<void>;

  /** Marca um horário como ocupado (booked) por um candidato */
  bookSlot(
    formId: string,
    slotId: string,
    candidateId: string,
    candidateName: string
  ): Promise<void>;

  /**
   * Marca dois horários de entrevista como ocupados simultaneamente
   * (um par de entrevistadores para o mesmo candidato).
   */
  bookSlotPair(
    formId: string,
    slotIdA: string,
    slotIdB: string,
    candidateId: string,
    candidateName: string
  ): Promise<void>;

  /** Atualiza o link do Google Meet de um slot */
  setGoogleMeetLink(
    formId: string,
    slotId: string,
    googleMeetLink: string
  ): Promise<void>;

  /** Busca um único slot por ID */
  getSlotById(formId: string, slotId: string): Promise<InterviewSlot | null>;

  /** Libera um horário reservado, tornando-o disponível novamente */
  releaseSlot(formId: string, slotId: string): Promise<void>;
}
