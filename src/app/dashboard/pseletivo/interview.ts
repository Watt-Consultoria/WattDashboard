'use client';

/**
 * Façade sobre interviewService / interviewRepository.
 * Mantém a API pública que a página já utiliza, delegando para a nova camada.
 *
 * O tipo `InterviewSlot` re-exportado aqui é compatível com o tipo canônico
 * definido em `@/types/interview/interview` — os campos adicionais de booking
 * são opcionais, então o código existente continua funcionando sem alterações.
 */

import interviewService from '@/services/interviewService';
import type {
  InterviewSlot as CanonicalInterviewSlot,
  CreateInterviewSlotInput
} from '@/types/interview/interview';

export type InterviewSlot = CanonicalInterviewSlot;

export function sortInterviewSlots(slots: InterviewSlot[]): InterviewSlot[] {
  return interviewService.sortSlots(slots);
}

export async function listInterviewSlots(
  formId: string
): Promise<InterviewSlot[]> {
  return interviewService.listSlots(formId);
}

export async function saveInterviewSlot(
  formId: string,
  slot: InterviewSlot
): Promise<void> {
  const input: CreateInterviewSlotInput = {
    id: slot.id,
    isoDate: slot.isoDate,
    dateLabel: slot.dateLabel,
    startTime: slot.startTime,
    endTime: slot.endTime,
    startMinutes: slot.startMinutes,
    endMinutes: slot.endMinutes,
    responsibleMemberId: slot.responsibleMemberId,
    responsibleMemberName: slot.responsibleMemberName
  };
  return interviewService.saveSlot(formId, input);
}

export async function removeInterviewSlot(
  formId: string,
  slotId: string
): Promise<void> {
  return interviewService.removeSlot(formId, slotId);
}
