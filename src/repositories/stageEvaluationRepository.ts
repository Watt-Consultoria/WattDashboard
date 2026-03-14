import { firebaseDb } from '@/lib/firebase/client';
import savedCandidateRepository from '@/repositories/savedCandidateRepository';
import type IStageEvaluationRepository from '@/types/candidate/stage-evaluation-repository';
import type {
  CandidateStageEvaluation,
  PselStageInfo,
  PselStagesDocument
} from '@/types/candidate/stage-evaluation';
import { doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import {
  FirebaseError,
  MissingParameterError,
  ValidationError
} from '@/errors/repositoryErrors';

const GLOBAL_INFO_COLLECTION = 'GlobalInfo';
const PSEL_STAGES_DOC = 'pselStages';
const CANDIDATES_COLLECTION = 'candidates';

class StageEvaluationRepository implements IStageEvaluationRepository {
  private getPselStagesDocRef() {
    if (!firebaseDb) {
      throw new FirebaseError('Firebase nao esta configurado');
    }

    return doc(firebaseDb, GLOBAL_INFO_COLLECTION, PSEL_STAGES_DOC);
  }

  private getCandidateDocRef(candidateId: string) {
    if (!firebaseDb) {
      throw new FirebaseError('Firebase nao esta configurado');
    }

    return doc(firebaseDb, CANDIDATES_COLLECTION, candidateId);
  }

  async getPselStages(): Promise<PselStagesDocument> {
    const stagesDocRef = this.getPselStagesDocRef();
    const stagesDocSnap = await getDoc(stagesDocRef);

    if (!stagesDocSnap.exists()) {
      return {};
    }

    const raw = stagesDocSnap.data();
    if (!raw || typeof raw !== 'object') {
      return {};
    }

    const parsed: PselStagesDocument = {};

    for (const [stageKey, stageValue] of Object.entries(raw)) {
      if (!stageValue || typeof stageValue !== 'object') {
        continue;
      }

      const dataValue =
        'data' in stageValue
          ? (stageValue as { data?: PselStageInfo['data'] }).data
          : null;

      parsed[stageKey] = { data: dataValue ?? null };
    }

    return parsed;
  }

  async getCandidatesForStageEvaluation() {
    const allCandidates = await savedCandidateRepository.listCandidates();
    return allCandidates.filter((candidate) => !candidate.desclassificado);
  }

  async getCandidateStageEvaluation(
    candidateId: string,
    stageKey: string
  ): Promise<CandidateStageEvaluation | null> {
    if (!candidateId || !stageKey) {
      throw new MissingParameterError(['candidateId', 'stageKey']);
    }

    const candidate =
      await savedCandidateRepository.getCandidateById(candidateId);
    if (!candidate) {
      throw new ValidationError('Candidato nao encontrado');
    }

    return candidate.avaliacaoEtapas?.[stageKey] ?? null;
  }

  async submitCandidateStageEvaluation(
    candidateId: string,
    stageKey: string,
    evaluation: CandidateStageEvaluation
  ): Promise<void> {
    await this.persistStageEvaluation(candidateId, stageKey, evaluation);
  }

  async markCandidateStageAbsence(
    candidateId: string,
    stageKey: string,
    evaluation: CandidateStageEvaluation
  ): Promise<void> {
    await this.persistStageEvaluation(candidateId, stageKey, evaluation);
  }

  async unmarkCandidateStageAbsence(
    candidateId: string,
    stageKey: string,
    evaluation: CandidateStageEvaluation
  ): Promise<void> {
    await this.persistStageEvaluation(candidateId, stageKey, evaluation);
  }

  async getStageEvaluationResults() {
    return await this.getCandidatesForStageEvaluation();
  }

  private async persistStageEvaluation(
    candidateId: string,
    stageKey: string,
    evaluation: CandidateStageEvaluation
  ): Promise<void> {
    if (!candidateId || !stageKey) {
      throw new MissingParameterError(['candidateId', 'stageKey']);
    }

    const candidateDocRef = this.getCandidateDocRef(candidateId);
    const candidateDocSnap = await getDoc(candidateDocRef);

    if (!candidateDocSnap.exists()) {
      throw new ValidationError('Candidato nao encontrado');
    }

    await updateDoc(candidateDocRef, {
      [`avaliacaoEtapas.${stageKey}`]: evaluation,
      updatedAt: serverTimestamp()
    });
  }
}

const stageEvaluationRepository = new StageEvaluationRepository();
export default stageEvaluationRepository;
