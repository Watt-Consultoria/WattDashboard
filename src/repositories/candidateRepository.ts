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
import { firebaseDb } from '@/lib/firebase/client';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import {
  FirebaseError,
  MissingParameterError,
  ValidationError
} from '@/errors/repositoryErrors';

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
      tags: (response as any).tags ?? [],
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

  async addTag(
    formId: string,
    responseId: string,
    tag: string
  ): Promise<void> {
    if (!firebaseDb) throw new FirebaseError('Firebase não está configurado');
    if (!formId || !responseId || !tag) {
      throw new MissingParameterError(['formId', 'responseId', 'tag']);
    }

    const responseRef = doc(
      firebaseDb,
      'externForms',
      formId,
      'respostas',
      responseId
    );
    const responseSnap = await getDoc(responseRef);

    if (!responseSnap.exists()) {
      throw new ValidationError('Resposta não encontrada');
    }

    const currentData = responseSnap.data();
    const currentTags = (currentData.tags as string[]) ?? [];

    if (currentTags.includes(tag)) {
      throw new ValidationError('Tag já existe para este candidato');
    }

    const updatedTags = [...currentTags, tag];
    await updateDoc(responseRef, { tags: updatedTags });
  }

  async removeTag(
    formId: string,
    responseId: string,
    tag: string
  ): Promise<void> {
    if (!firebaseDb) throw new FirebaseError('Firebase não está configurado');
    if (!formId || !responseId || !tag) {
      throw new MissingParameterError(['formId', 'responseId', 'tag']);
    }

    const responseRef = doc(
      firebaseDb,
      'externForms',
      formId,
      'respostas',
      responseId
    );
    const responseSnap = await getDoc(responseRef);

    if (!responseSnap.exists()) {
      throw new ValidationError('Resposta não encontrada');
    }

    const currentData = responseSnap.data();
    const currentTags = (currentData.tags as string[]) ?? [];

    if (!currentTags.includes(tag)) {
      throw new ValidationError('Tag não existe para este candidato');
    }

    const updatedTags = currentTags.filter((t) => t !== tag);
    await updateDoc(responseRef, { tags: updatedTags });
  }

  async addTagToMultipleCandidates(
    formId: string,
    responseIds: string[],
    tag: string
  ): Promise<void> {
    if (!firebaseDb) throw new FirebaseError('Firebase não está configurado');
    if (!formId || !responseIds || responseIds.length === 0 || !tag) {
      throw new MissingParameterError(['formId', 'responseIds', 'tag']);
    }

    const trimmedTag = tag.trim();
    if (!trimmedTag) throw new ValidationError('Tag não pode ser vazia');

    const errors: string[] = [];
    for (const responseId of responseIds) {
      try {
        const responseRef = doc(
          firebaseDb,
          'externForms',
          formId,
          'respostas',
          responseId
        );
        const responseSnap = await getDoc(responseRef);

        if (!responseSnap.exists()) {
          errors.push(`Resposta ${responseId} não encontrada`);
          continue;
        }

        const currentData = responseSnap.data();
        const currentTags = (currentData.tags as string[]) ?? [];

        if (currentTags.includes(trimmedTag)) {
          continue;
        }

        const updatedTags = [...currentTags, trimmedTag];
        await updateDoc(responseRef, { tags: updatedTags });
      } catch (error) {
        errors.push(`Erro ao processar resposta ${responseId}: ${error}`);
      }
    }

    if (errors.length > 0) {
      throw new Error(`Erros ao adicionar tags: ${errors.join('; ')}`);
    }
  }

  async removeTagFromMultipleCandidates(
    formId: string,
    responseIds: string[],
    tag: string
  ): Promise<void> {
    if (!firebaseDb) throw new FirebaseError('Firebase não está configurado');
    if (!formId || !responseIds || responseIds.length === 0 || !tag) {
      throw new MissingParameterError(['formId', 'responseIds', 'tag']);
    }

    const trimmedTag = tag.trim();
    if (!trimmedTag) throw new ValidationError('Tag não pode ser vazia');

    const errors: string[] = [];
    for (const responseId of responseIds) {
      try {
        const responseRef = doc(
          firebaseDb,
          'externForms',
          formId,
          'respostas',
          responseId
        );
        const responseSnap = await getDoc(responseRef);

        if (!responseSnap.exists()) {
          errors.push(`Resposta ${responseId} não encontrada`);
          continue;
        }

        const currentData = responseSnap.data();
        const currentTags = (currentData.tags as string[]) ?? [];

        if (!currentTags.includes(trimmedTag)) {
          continue;
        }

        const updatedTags = currentTags.filter((t) => t !== trimmedTag);
        await updateDoc(responseRef, { tags: updatedTags });
      } catch (error) {
        errors.push(`Erro ao processar resposta ${responseId}: ${error}`);
      }
    }

    if (errors.length > 0) {
      throw new Error(`Erros ao remover tags: ${errors.join('; ')}`);
    }
  }
}

const candidateRepository = new CandidateRepository();
export default candidateRepository;
