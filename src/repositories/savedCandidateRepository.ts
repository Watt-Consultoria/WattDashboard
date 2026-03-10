import type ISavedCandidateRepository from '@/types/candidate/saved-candidate-repository';
import type {
  SavedCandidate,
  SaveCandidateInput
} from '@/types/candidate/saved-candidate';
import type {
  CandidateInterview,
  InterviewState
} from '@/types/candidate/candidate';
import type { InterviewResult } from '@/types/interview/interview';
import type { InterviewAnswersMap } from '@/types/interview/interview-script';
import { firebaseDb } from '@/lib/firebase/client';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where
} from 'firebase/firestore';
import {
  FirebaseError,
  MissingParameterError,
  ValidationError
} from '@/errors/repositoryErrors';

const COLLECTION_NAME = 'candidates';

class SavedCandidateRepository implements ISavedCandidateRepository {
  private getCollectionRef() {
    if (!firebaseDb) throw new FirebaseError('Firebase não está configurado');
    return collection(firebaseDb, COLLECTION_NAME);
  }

  private getDocRef(candidateId: string) {
    if (!firebaseDb) throw new FirebaseError('Firebase não está configurado');
    return doc(firebaseDb, COLLECTION_NAME, candidateId);
  }

  async saveCandidate(data: SaveCandidateInput): Promise<SavedCandidate> {
    if (!data.nome || !data.email) {
      throw new MissingParameterError(['nome', 'email']);
    }

    const colRef = this.getCollectionRef();

    const docData = {
      nome: data.nome,
      sobrenome: data.sobrenome,
      curso: data.curso,
      periodo: data.periodo,
      etapa: data.etapa,
      telefone: data.telefone,
      email: data.email,
      instagram: data.instagram,
      origemPsel: data.origemPsel,
      oQueMove: data.oQueMove,
      porqueWatt: data.porqueWatt,
      tamanhoCamisa: data.tamanhoCamisa,
      curriculumVitaeUrl: data.curriculumVitaeUrl,
      historicoEscolarUrl: data.historicoEscolarUrl,
      imagemUrl: data.imagemUrl,
      tarefas: data.tarefas ?? [],
      informacoesAdicionais: data.informacoesAdicionais ?? [],
      tags: data.tags ?? [],
      formIdOrigem: data.formIdOrigem,
      respostaIdOrigem: data.respostaIdOrigem,
      desclassificado: data.desclassificado ?? false,
      interview: data.interview ?? { state: 'notSentEmail' },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const docRef = await addDoc(colRef, docData);

    return {
      ...data,
      id: docRef.id,
      createdAt: null,
      updatedAt: null
    };
  }

  async listCandidates(): Promise<SavedCandidate[]> {
    const colRef = this.getCollectionRef();
    const snapshot = await getDocs(colRef);

    return snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        nome: data.nome ?? '',
        sobrenome: data.sobrenome ?? '',
        curso: data.curso ?? '',
        periodo: data.periodo ?? '',
        etapa: data.etapa ?? '',
        telefone: data.telefone ?? '',
        email: data.email ?? '',
        instagram: data.instagram ?? '',
        origemPsel: data.origemPsel ?? '',
        oQueMove: data.oQueMove ?? '',
        porqueWatt: data.porqueWatt ?? '',
        tamanhoCamisa: data.tamanhoCamisa ?? '',
        curriculumVitaeUrl: data.curriculumVitaeUrl ?? '',
        historicoEscolarUrl: data.historicoEscolarUrl ?? '',
        imagemUrl: data.imagemUrl ?? '',
        tarefas: data.tarefas ?? [],
        informacoesAdicionais: data.informacoesAdicionais ?? [],
        tags: data.tags ?? [],
        formIdOrigem: data.formIdOrigem ?? '',
        respostaIdOrigem: data.respostaIdOrigem ?? '',
        desclassificado: data.desclassificado ?? false,
        interview: this.normalizeInterview(data.interview),
        createdAt: data.createdAt ?? null,
        updatedAt: data.updatedAt ?? null
      };
    });
  }

  async getCandidateById(candidateId: string): Promise<SavedCandidate | null> {
    if (!candidateId) throw new MissingParameterError(['candidateId']);

    const docRef = this.getDocRef(candidateId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) return null;

    const data = docSnap.data();
    return {
      id: docSnap.id,
      nome: data.nome ?? '',
      sobrenome: data.sobrenome ?? '',
      curso: data.curso ?? '',
      periodo: data.periodo ?? '',
      etapa: data.etapa ?? '',
      telefone: data.telefone ?? '',
      email: data.email ?? '',
      instagram: data.instagram ?? '',
      origemPsel: data.origemPsel ?? '',
      oQueMove: data.oQueMove ?? '',
      porqueWatt: data.porqueWatt ?? '',
      tamanhoCamisa: data.tamanhoCamisa ?? '',
      curriculumVitaeUrl: data.curriculumVitaeUrl ?? '',
      historicoEscolarUrl: data.historicoEscolarUrl ?? '',
      imagemUrl: data.imagemUrl ?? '',
      tarefas: data.tarefas ?? [],
      informacoesAdicionais: data.informacoesAdicionais ?? [],
      tags: data.tags ?? [],
      formIdOrigem: data.formIdOrigem ?? '',
      respostaIdOrigem: data.respostaIdOrigem ?? '',
      desclassificado: data.desclassificado ?? false,
      interview: this.normalizeInterview(data.interview),
      createdAt: data.createdAt ?? null,
      updatedAt: data.updatedAt ?? null
    };
  }

  async listCandidatesByTag(tag: string): Promise<SavedCandidate[]> {
    if (!tag) throw new MissingParameterError(['tag']);

    const colRef = this.getCollectionRef();
    const q = query(colRef, where('tags', 'array-contains', tag.trim()));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        nome: data.nome ?? '',
        sobrenome: data.sobrenome ?? '',
        curso: data.curso ?? '',
        periodo: data.periodo ?? '',
        etapa: data.etapa ?? '',
        telefone: data.telefone ?? '',
        email: data.email ?? '',
        instagram: data.instagram ?? '',
        origemPsel: data.origemPsel ?? '',
        oQueMove: data.oQueMove ?? '',
        porqueWatt: data.porqueWatt ?? '',
        tamanhoCamisa: data.tamanhoCamisa ?? '',
        curriculumVitaeUrl: data.curriculumVitaeUrl ?? '',
        historicoEscolarUrl: data.historicoEscolarUrl ?? '',
        imagemUrl: data.imagemUrl ?? '',
        tarefas: data.tarefas ?? [],
        informacoesAdicionais: data.informacoesAdicionais ?? [],
        tags: data.tags ?? [],
        formIdOrigem: data.formIdOrigem ?? '',
        respostaIdOrigem: data.respostaIdOrigem ?? '',
        desclassificado: data.desclassificado ?? false,
        interview: this.normalizeInterview(data.interview),
        createdAt: data.createdAt ?? null,
        updatedAt: data.updatedAt ?? null
      };
    });
  }

  async existsByRespostaId(respostaId: string): Promise<boolean> {
    if (!respostaId) throw new MissingParameterError(['respostaId']);

    const colRef = this.getCollectionRef();
    const q = query(colRef, where('respostaIdOrigem', '==', respostaId));
    const snapshot = await getDocs(q);

    return !snapshot.empty;
  }

  async getCandidatesByIds(candidateIds: string[]): Promise<SavedCandidate[]> {
    if (!candidateIds || candidateIds.length === 0) return [];

    const results: SavedCandidate[] = [];

    // Firestore 'in' queries support max 30 items per batch
    const batchSize = 30;
    for (let i = 0; i < candidateIds.length; i += batchSize) {
      const batch = candidateIds.slice(i, i + batchSize);
      const colRef = this.getCollectionRef();
      const q = query(colRef, where('__name__', 'in', batch));
      const snapshot = await getDocs(q);

      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        results.push({
          id: docSnap.id,
          nome: data.nome ?? '',
          sobrenome: data.sobrenome ?? '',
          curso: data.curso ?? '',
          periodo: data.periodo ?? '',
          etapa: data.etapa ?? '',
          telefone: data.telefone ?? '',
          email: data.email ?? '',
          instagram: data.instagram ?? '',
          origemPsel: data.origemPsel ?? '',
          oQueMove: data.oQueMove ?? '',
          porqueWatt: data.porqueWatt ?? '',
          tamanhoCamisa: data.tamanhoCamisa ?? '',
          curriculumVitaeUrl: data.curriculumVitaeUrl ?? '',
          historicoEscolarUrl: data.historicoEscolarUrl ?? '',
          imagemUrl: data.imagemUrl ?? '',
          tarefas: data.tarefas ?? [],
          informacoesAdicionais: data.informacoesAdicionais ?? [],
          tags: data.tags ?? [],
          formIdOrigem: data.formIdOrigem ?? '',
          respostaIdOrigem: data.respostaIdOrigem ?? '',
          desclassificado: data.desclassificado ?? false,
          interview: this.normalizeInterview(data.interview),
          createdAt: data.createdAt ?? null,
          updatedAt: data.updatedAt ?? null
        });
      }
    }

    return results;
  }

  async addTag(candidateId: string, tag: string): Promise<void> {
    if (!candidateId || !tag) {
      throw new MissingParameterError(['candidateId', 'tag']);
    }

    const docRef = this.getDocRef(candidateId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      throw new ValidationError('Candidato não encontrado');
    }

    const currentData = docSnap.data();
    const currentTags = (currentData.tags as string[]) ?? [];

    if (currentTags.includes(tag)) {
      throw new ValidationError('Tag já existe para este candidato');
    }

    const updatedTags = [...currentTags, tag];
    await updateDoc(docRef, {
      tags: updatedTags,
      updatedAt: serverTimestamp()
    });
  }

  async removeTag(candidateId: string, tag: string): Promise<void> {
    if (!candidateId || !tag) {
      throw new MissingParameterError(['candidateId', 'tag']);
    }

    const docRef = this.getDocRef(candidateId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      throw new ValidationError('Candidato não encontrado');
    }

    const currentData = docSnap.data();
    const currentTags = (currentData.tags as string[]) ?? [];

    if (!currentTags.includes(tag)) {
      throw new ValidationError('Tag não existe para este candidato');
    }

    const updatedTags = currentTags.filter((t) => t !== tag);
    await updateDoc(docRef, {
      tags: updatedTags,
      updatedAt: serverTimestamp()
    });
  }

  async addTagToMultiple(candidateIds: string[], tag: string): Promise<void> {
    if (!candidateIds || candidateIds.length === 0 || !tag) {
      throw new MissingParameterError(['candidateIds', 'tag']);
    }

    const trimmedTag = tag.trim();
    if (!trimmedTag) throw new ValidationError('Tag não pode ser vazia');

    const errors: string[] = [];
    for (const candidateId of candidateIds) {
      try {
        const docRef = this.getDocRef(candidateId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
          errors.push(`Candidato ${candidateId} não encontrado`);
          continue;
        }

        const currentData = docSnap.data();
        const currentTags = (currentData.tags as string[]) ?? [];

        if (currentTags.includes(trimmedTag)) continue;

        const updatedTags = [...currentTags, trimmedTag];
        await updateDoc(docRef, {
          tags: updatedTags,
          updatedAt: serverTimestamp()
        });
      } catch (error) {
        errors.push(`Erro ao processar candidato ${candidateId}: ${error}`);
      }
    }

    if (errors.length > 0) {
      throw new Error(`Erros ao adicionar tags: ${errors.join('; ')}`);
    }
  }

  async removeTagFromMultiple(
    candidateIds: string[],
    tag: string
  ): Promise<void> {
    if (!candidateIds || candidateIds.length === 0 || !tag) {
      throw new MissingParameterError(['candidateIds', 'tag']);
    }

    const trimmedTag = tag.trim();
    if (!trimmedTag) throw new ValidationError('Tag não pode ser vazia');

    const errors: string[] = [];
    for (const candidateId of candidateIds) {
      try {
        const docRef = this.getDocRef(candidateId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
          errors.push(`Candidato ${candidateId} não encontrado`);
          continue;
        }

        const currentData = docSnap.data();
        const currentTags = (currentData.tags as string[]) ?? [];

        if (!currentTags.includes(trimmedTag)) continue;

        const updatedTags = currentTags.filter((t) => t !== trimmedTag);
        await updateDoc(docRef, {
          tags: updatedTags,
          updatedAt: serverTimestamp()
        });
      } catch (error) {
        errors.push(`Erro ao processar candidato ${candidateId}: ${error}`);
      }
    }

    if (errors.length > 0) {
      throw new Error(`Erros ao remover tags: ${errors.join('; ')}`);
    }
  }

  async setCandidateStage(candidateId: string, stage: string): Promise<void> {
    if (!candidateId || !stage) {
      throw new MissingParameterError(['candidateId', 'stage']);
    }

    const trimmedStage = stage.trim();
    if (!trimmedStage) {
      throw new ValidationError('Etapa não pode ser vazia');
    }

    const docRef = this.getDocRef(candidateId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      throw new ValidationError('Candidato não encontrado');
    }

    await updateDoc(docRef, {
      etapa: trimmedStage,
      updatedAt: serverTimestamp()
    });
  }

  async disqualifyCandidate(candidateId: string): Promise<void> {
    if (!candidateId) {
      throw new MissingParameterError(['candidateId']);
    }

    const docRef = this.getDocRef(candidateId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      throw new ValidationError('Candidato não encontrado');
    }

    await updateDoc(docRef, {
      desclassificado: true,
      updatedAt: serverTimestamp()
    });
  }

  async updateInterviewState(
    candidateId: string,
    interview: CandidateInterview
  ): Promise<void> {
    if (!candidateId) {
      throw new MissingParameterError(['candidateId']);
    }

    const docRef = this.getDocRef(candidateId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      throw new ValidationError('Candidato não encontrado');
    }

    await updateDoc(docRef, {
      interview,
      updatedAt: serverTimestamp()
    });
  }

  async updateInterviewStateForMultiple(
    candidateIds: string[],
    interview: CandidateInterview
  ): Promise<void> {
    if (!candidateIds || candidateIds.length === 0) {
      throw new MissingParameterError(['candidateIds']);
    }

    const errors: string[] = [];
    for (const candidateId of candidateIds) {
      try {
        const docRef = this.getDocRef(candidateId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
          errors.push(`Candidato ${candidateId} não encontrado`);
          continue;
        }

        await updateDoc(docRef, {
          interview,
          updatedAt: serverTimestamp()
        });
      } catch (error) {
        errors.push(`Erro ao atualizar candidato ${candidateId}: ${error}`);
      }
    }

    if (errors.length > 0) {
      throw new Error(
        `Erros ao atualizar estado de entrevista: ${errors.join('; ')}`
      );
    }
  }

  async setInterviewResult(
    candidateId: string,
    result: InterviewResult
  ): Promise<void> {
    if (!candidateId) {
      throw new MissingParameterError(['candidateId']);
    }

    const docRef = this.getDocRef(candidateId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      throw new ValidationError('Candidato não encontrado');
    }

    const currentData = docSnap.data();
    const currentInterview = this.normalizeInterview(currentData.interview);

    await updateDoc(docRef, {
      interview: {
        ...currentInterview,
        state: 'finished',
        result
      },
      updatedAt: serverTimestamp()
    });
  }

  /**
   * Persiste as respostas do roteiro de entrevista dentro de `interview.answers`.
   * Faz merge com os dados existentes do campo `interview`, preservando
   * state, result e demais propriedades.
   */
  async setInterviewAnswers(
    candidateId: string,
    answers: InterviewAnswersMap
  ): Promise<void> {
    if (!candidateId) {
      throw new MissingParameterError(['candidateId']);
    }

    const docRef = this.getDocRef(candidateId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      throw new ValidationError('Candidato não encontrado');
    }

    const currentData = docSnap.data();
    const currentInterview = this.normalizeInterview(currentData.interview);

    await updateDoc(docRef, {
      interview: {
        date: '-',
        dateLabel: '-',
        endTime: '-',
        googleMeetLink: '-',
        startTime: '-',
        ...currentInterview,
        answers
      },
      updatedAt: serverTimestamp()
    });
  }

  /**
   * Normaliza os dados de entrevista vindos do Firestore.
   */
  private normalizeInterview(raw: unknown): CandidateInterview {
    if (!raw || typeof raw !== 'object') {
      return { state: 'notSentEmail' };
    }

    const obj = raw as Record<string, unknown>;
    const validStates: InterviewState[] = [
      'notSentEmail',
      'sentEmail',
      'requested',
      'scheduled',
      'finished',
      'canceled'
    ];
    const state = validStates.includes(obj.state as InterviewState)
      ? (obj.state as InterviewState)
      : 'notSentEmail';

    const interview: CandidateInterview = {
      state,
      date: typeof obj.date === 'string' ? obj.date : '',
      dateLabel: typeof obj.dateLabel === 'string' ? obj.dateLabel : '',
      startTime: typeof obj.startTime === 'string' ? obj.startTime : '',
      endTime: typeof obj.endTime === 'string' ? obj.endTime : '',
      googleMeetLink:
        typeof obj.googleMeetLink === 'string' ? obj.googleMeetLink : ''
    };

    // Normaliza resultado da avaliação, se existir
    if (obj.result && typeof obj.result === 'object') {
      interview.result = obj.result as InterviewResult;
    }

    // Normaliza respostas do roteiro de entrevista, se existirem
    if (obj.answers && typeof obj.answers === 'object') {
      interview.answers = obj.answers as InterviewAnswersMap;
    }

    return interview;
  }
}

const savedCandidateRepository = new SavedCandidateRepository();
export default savedCandidateRepository;
