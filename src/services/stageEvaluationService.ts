import stageEvaluationRepository from '@/repositories/stageEvaluationRepository';
import type { SavedCandidate } from '@/types/candidate/saved-candidate';
import type {
  CandidateStageEvaluation,
  CandidateStageEvaluationSummary,
  CandidateStageEvaluationVote,
  CandidateStageStatus,
  PselStageVoteType,
  PselStageView,
  StageEvaluationActor,
  StageEvaluationCandidateView,
  StageEvaluationResultView
} from '@/types/candidate/stage-evaluation';

const ALLOWED_ABSENCE_ROLES = new Set(['Assessor', 'Asessor', 'Presidente', 'Diretor']);

type TimestampLike = { toDate: () => Date };

function isTimestampLike(value: unknown): value is TimestampLike {
  return Boolean(
    value &&
      typeof value === 'object' &&
      'toDate' in value &&
      typeof (value as TimestampLike).toDate === 'function'
  );
}

class StageEvaluationService {
  canUserEvaluateStage(actor: StageEvaluationActor | null | undefined): boolean {
    if (!actor) return false;

    return (actor.tags ?? []).some((tag) => this.normalizeText(tag) === 'psel');
  }

  canUserRegisterAbsence(
    actor: StageEvaluationActor | null | undefined
  ): boolean {
    if (!actor?.role) return false;
    return ALLOWED_ABSENCE_ROLES.has(actor.role);
  }

  async getAvailableStagesForEvaluation(): Promise<PselStageView[]> {
    const stagesDoc = await stageEvaluationRepository.getPselStages();
    const now = Date.now();

    return Object.entries(stagesDoc)
      .map(([stageKey, stageData]) => {
        const deadline = this.parseStageDeadline(stageData?.data);
        return {
          key: stageKey,
          label: this.formatStageLabel(stageKey),
          deadline,
          isClosed: deadline ? deadline.getTime() < now : false
        } satisfies PselStageView;
      })
      .sort((left, right) => {
        if (!left.deadline && !right.deadline) return left.label.localeCompare(right.label);
        if (!left.deadline) return 1;
        if (!right.deadline) return -1;
        return left.deadline.getTime() - right.deadline.getTime();
      });
  }

  async getCandidatesForStageEvaluation(
    stageKey: string,
    evaluatorId: string
  ): Promise<StageEvaluationCandidateView[]> {
    await this.getStageByKey(stageKey);

    const candidates = await stageEvaluationRepository.getCandidatesForStageEvaluation();
    const mapped = candidates.map((candidate) =>
      this.mapCandidateToStageView(candidate, stageKey, evaluatorId)
    );

    return mapped
      .filter((candidate) => candidate.status !== 'faltou')
      .sort((left, right) => left.nomeCompleto.localeCompare(right.nomeCompleto));
  }

  async getCandidatesForAbsenceManagement(
    stageKey: string
  ): Promise<StageEvaluationCandidateView[]> {
    await this.getStageByKey(stageKey);

    const candidates = await stageEvaluationRepository.getCandidatesForStageEvaluation();
    return candidates
      .map((candidate) => this.mapCandidateToStageView(candidate, stageKey, ''))
      .sort((left, right) => left.nomeCompleto.localeCompare(right.nomeCompleto));
  }

  async evaluateCandidateInStage(input: {
    candidateId: string;
    stageKey: string;
    voteType: PselStageVoteType;
    actor: StageEvaluationActor | null | undefined;
  }): Promise<CandidateStageEvaluation> {
    const { candidateId, stageKey, voteType, actor } = input;
    if (!candidateId || !stageKey) {
      throw new Error('Candidato e etapa sao obrigatorios.');
    }
    if (!actor?.id) {
      throw new Error('Avaliador invalido.');
    }
    if (!this.canUserEvaluateStage(actor)) {
      throw new Error('Somente membros com a tag psel podem votar.');
    }

    const stage = await this.getStageByKey(stageKey);
    this.ensureStageIsOpen(stage);
    this.validateVoteType(voteType);

    const currentEvaluation = await stageEvaluationRepository.getCandidateStageEvaluation(
      candidateId,
      stageKey
    );

    if (currentEvaluation?.status === 'faltou') {
      throw new Error('Candidato marcado como faltou nesta etapa.');
    }

    const votos = {
      ...this.normalizeVotes(currentEvaluation?.votos),
      [actor.id]: {
        tipo: voteType,
        createdAt: new Date(),
        avaliadorId: actor.id,
        avaliadorNome: actor.name || undefined
      } satisfies CandidateStageEvaluationVote
    };

    const nextEvaluation: CandidateStageEvaluation = {
      status: 'ativo',
      votos,
      resumo: this.computeSummary(votos)
    };

    await stageEvaluationRepository.submitCandidateStageEvaluation(
      candidateId,
      stageKey,
      nextEvaluation
    );

    return nextEvaluation;
  }

  async registerCandidateAbsenceInStage(input: {
    candidateId: string;
    stageKey: string;
    actor: StageEvaluationActor | null | undefined;
  }): Promise<CandidateStageEvaluation> {
    const { candidateId, stageKey, actor } = input;
    if (!candidateId || !stageKey) {
      throw new Error('Candidato e etapa sao obrigatorios.');
    }
    if (!actor?.id) {
      throw new Error('Responsavel invalido.');
    }
    if (!this.canUserRegisterAbsence(actor)) {
      throw new Error('Somente Assessor, Presidente ou Diretor podem registrar falta.');
    }

    const stage = await this.getStageByKey(stageKey);
    this.ensureStageIsOpen(stage);

    const currentEvaluation = await stageEvaluationRepository.getCandidateStageEvaluation(
      candidateId,
      stageKey
    );
    const votos = this.normalizeVotes(currentEvaluation?.votos);

    const nextEvaluation: CandidateStageEvaluation = {
      status: 'faltou',
      votos,
      falta: {
        registrada: true,
        registradaPorId: actor.id,
        registradaPorNome: actor.name || undefined,
        createdAt: new Date()
      },
      resumo: this.createEmptySummary()
    };

    await stageEvaluationRepository.markCandidateStageAbsence(
      candidateId,
      stageKey,
      nextEvaluation
    );

    return nextEvaluation;
  }

  async removeCandidateAbsenceInStage(input: {
    candidateId: string;
    stageKey: string;
    actor: StageEvaluationActor | null | undefined;
  }): Promise<CandidateStageEvaluation> {
    const { candidateId, stageKey, actor } = input;
    if (!candidateId || !stageKey) {
      throw new Error('Candidato e etapa sao obrigatorios.');
    }
    if (!actor?.id) {
      throw new Error('Responsavel invalido.');
    }
    if (!this.canUserRegisterAbsence(actor)) {
      throw new Error('Somente Assessor, Presidente ou Diretor podem desfazer falta.');
    }

    const stage = await this.getStageByKey(stageKey);
    this.ensureStageIsOpen(stage);

    const currentEvaluation = await stageEvaluationRepository.getCandidateStageEvaluation(
      candidateId,
      stageKey
    );
    const votos = this.normalizeVotes(currentEvaluation?.votos);

    const nextEvaluation: CandidateStageEvaluation = {
      status: 'ativo',
      votos,
      resumo: this.computeSummary(votos)
    };

    await stageEvaluationRepository.unmarkCandidateStageAbsence(
      candidateId,
      stageKey,
      nextEvaluation
    );

    return nextEvaluation;
  }

  async getStageResults(stageKey: string): Promise<StageEvaluationResultView[]> {
    await this.getStageByKey(stageKey);

    const candidates = await stageEvaluationRepository.getStageEvaluationResults();

    return candidates
      .map((candidate) => {
        const stageEvaluation = candidate.avaliacaoEtapas?.[stageKey];
        const status = this.normalizeStatus(stageEvaluation?.status);
        const votos = this.normalizeVotes(stageEvaluation?.votos);
        const summary =
          status === 'faltou' ? this.createEmptySummary() : this.computeSummary(votos);

        return {
          candidateId: candidate.id,
          nomeCompleto: this.getCandidateFullName(candidate),
          imagemUrl: candidate.imagemUrl ?? '',
          status,
          positivos: summary.positivos,
          negativos: summary.negativos,
          total: summary.total,
          saldo: summary.saldo
        } satisfies StageEvaluationResultView;
      })
      .sort((left, right) => left.nomeCompleto.localeCompare(right.nomeCompleto));
  }

  private mapCandidateToStageView(
    candidate: SavedCandidate,
    stageKey: string,
    evaluatorId: string
  ): StageEvaluationCandidateView {
    const evaluation = candidate.avaliacaoEtapas?.[stageKey];
    const status = this.normalizeStatus(evaluation?.status);
    const votos = this.normalizeVotes(evaluation?.votos);
    const resumo =
      status === 'faltou' ? this.createEmptySummary() : this.computeSummary(votos);
    const currentVote = evaluatorId ? votos[evaluatorId]?.tipo : undefined;

    return {
      candidateId: candidate.id,
      nomeCompleto: this.getCandidateFullName(candidate),
      curso: candidate.curso,
      periodo: candidate.periodo,
      imagemUrl: candidate.imagemUrl ?? '',
      stageKey,
      status,
      resumo,
      hasVoted: Boolean(currentVote),
      currentVote
    };
  }

  private async getStageByKey(stageKey: string): Promise<PselStageView> {
    if (!stageKey) {
      throw new Error('Etapa invalida.');
    }

    const stages = await this.getAvailableStagesForEvaluation();
    const stage = stages.find((item) => item.key === stageKey);

    if (!stage) {
      throw new Error('Etapa nao encontrada.');
    }

    return stage;
  }

  private ensureStageIsOpen(stage: PselStageView) {
    if (stage.isClosed) {
      throw new Error('Prazo da etapa encerrado.');
    }
  }

  private parseStageDeadline(raw: unknown): Date | null {
    if (!raw) return null;

    if (raw instanceof Date) {
      return Number.isNaN(raw.getTime()) ? null : raw;
    }

    if (isTimestampLike(raw)) {
      const parsedDate = raw.toDate();
      return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
    }

    if (typeof raw === 'string' || typeof raw === 'number') {
      const parsedDate = new Date(raw);
      return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
    }

    return null;
  }

  private formatStageLabel(stageKey: string): string {
    if (!stageKey) return '';

    return stageKey
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/[_-]/g, ' ')
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  private getCandidateFullName(candidate: SavedCandidate): string {
    return `${candidate.nome} ${candidate.sobrenome}`.trim();
  }

  private normalizeStatus(rawStatus?: string): CandidateStageStatus {
    return rawStatus === 'faltou' ? 'faltou' : 'ativo';
  }

  private normalizeVotes(
    votos: Record<string, CandidateStageEvaluationVote> | undefined
  ): Record<string, CandidateStageEvaluationVote> {
    if (!votos || typeof votos !== 'object') {
      return {};
    }

    return votos;
  }

  private createEmptySummary(): CandidateStageEvaluationSummary {
    return {
      positivos: 0,
      negativos: 0,
      total: 0,
      saldo: 0
    };
  }

  private computeSummary(
    votos: Record<string, CandidateStageEvaluationVote>
  ): CandidateStageEvaluationSummary {
    let positivos = 0;
    let negativos = 0;

    for (const vote of Object.values(votos)) {
      if (vote.tipo === 'positivo') {
        positivos += 1;
      } else if (vote.tipo === 'negativo') {
        negativos += 1;
      }
    }

    const total = positivos + negativos;
    return {
      positivos,
      negativos,
      total,
      saldo: positivos - negativos
    };
  }

  private validateVoteType(voteType: string): asserts voteType is PselStageVoteType {
    if (voteType !== 'positivo' && voteType !== 'negativo') {
      throw new Error('Tipo de voto invalido.');
    }
  }

  private normalizeText(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }
}

const stageEvaluationService = new StageEvaluationService();
export default stageEvaluationService;
