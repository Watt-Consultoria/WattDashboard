import type { CandidateForm, CandidateFormResponse } from './candidate';

export default interface ICandidateRepository {
  listPselForms(): Promise<CandidateForm[]>;
  getFormResponses(formId: string): Promise<CandidateFormResponse[]>;
}
