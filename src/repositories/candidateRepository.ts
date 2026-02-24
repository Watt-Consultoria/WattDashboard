import type ICandidateRepository from '@/types/candidate/candidate-repository';
import type {
  CandidateForm,
  CandidateFormResponse
} from '@/types/candidate/candidate';
import {
  getExternalFormResponses,
  listExternalPselForms
} from '@/lib/firestore/forms';

class CandidateRepository implements ICandidateRepository {
  async listPselForms(): Promise<CandidateForm[]> {
    const forms = await listExternalPselForms();
    return forms.map((form) => ({
      id: form.id,
      nomeFormulario: form.nomeFormulario ?? '',
      slug: form.slug
    }));
  }

  async getFormResponses(formId: string): Promise<CandidateFormResponse[]> {
    const responses = await getExternalFormResponses(formId);
    return responses.map((response) => ({
      id: response.id,
      respostas: response.respostas ?? [],
      createdAt: response.createdAt,
      updatedAt: response.updatedAt
    }));
  }
}

const candidateRepository = new CandidateRepository();
export default candidateRepository;
