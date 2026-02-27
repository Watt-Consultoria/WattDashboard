import type { CandidateForm, CandidateFormResponse } from './candidate';

export default interface ICandidateRepository {
  listPselForms(): Promise<CandidateForm[]>;
  getFormResponses(formId: string): Promise<CandidateFormResponse[]>;
  addTag(formId: string, responseId: string, tag: string): Promise<void>;
  removeTag(formId: string, responseId: string, tag: string): Promise<void>;
  setCandidateStage(
    formId: string,
    responseId: string,
    stage: string
  ): Promise<void>;
  /** Define a flag desclassificado=true sem alterar a etapa */
  disqualifyCandidate(formId: string, responseId: string): Promise<void>;
  addTagToMultipleCandidates(
    formId: string,
    responseIds: string[],
    tag: string
  ): Promise<void>;
  removeTagFromMultipleCandidates(
    formId: string,
    responseIds: string[],
    tag: string
  ): Promise<void>;
}
