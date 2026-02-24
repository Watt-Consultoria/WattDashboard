import type ICandidateRepository from '@/types/candidate/candidate-repository';
import type {
  CandidateForm,
  CandidateFormResponse,
  CandidateFormAnswer,
  CandidateFormAnswerType
} from '@/types/candidate/candidate';
import formRepository from '@/repositories/formRepository';
import {
  getExternalFormResponses,
  listExternalPselForms
} from '@/lib/firestore/forms';

class CandidateRepository implements ICandidateRepository {
  async listPselForms(): Promise<CandidateForm[]> {
    // Recupera formulários do tipo 'cadastroPsel' do novo fluxo
    const newForms = await formRepository.listFormsByType('cadastroPsel');

    if (newForms.length > 0) {
      return newForms.map((form) => ({
        id: form.id,
        nomeFormulario: form.nome,
        slug: form.slug
      }));
    }

    // Fallback para formulários antigos (ehFormularioPsel)
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
      respostas: response.respostas
        ? response.respostas.map(
            (r) =>
              ({
                tituloPergunta: r.perguntaTitulo,
                tipoResposta: this.mapFormAnswerType(r.tipo),
                valor: r.valor
              }) satisfies CandidateFormAnswer
          )
        : [],
      createdAt: response.createdAt,
      updatedAt: response.updatedAt
    }));
  }

  private mapFormAnswerType(tipoResposta: string): CandidateFormAnswerType {
    // Mapeador simples para compatibilidade entre tipos antigos e novos
    const mapa: Record<string, CandidateFormAnswerType> = {
      string: 'string',
      number: 'number',
      cpf: 'cpf',
      imageFile: 'imageFile',
      pdfFile: 'pdfFile',
      shortText: 'string',
      paragraph: 'string',
      rating: 'number',
      multipleChoice: 'string',
      checkbox: 'string',
      select: 'string',
      fileUpload: 'imageFile'
    };

    return mapa[tipoResposta] || 'string';
  }
}

const candidateRepository = new CandidateRepository();
export default candidateRepository;
