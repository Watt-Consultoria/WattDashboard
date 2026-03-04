import interviewRepository from '@/repositories/interviewRepository';
import savedCandidateRepository from '@/repositories/savedCandidateRepository';
import type {
  InterviewSlot,
  CreateInterviewSlotInput,
  AvailableInterviewSlotView,
  DesiredTraitRating,
  DesiredTraitKey,
  UndesiredTraitAssessment,
  UndesiredTraitKey,
  InterviewResult,
  SubmitInterviewResultInput,
  InterviewResultView,
  InterviewStatistics,
  DesiredTraitAverages,
  UndesiredTraitDistribution
} from '@/types/interview/interview';
import type { Candidate } from '@/types/candidate/candidate';
import { ValidationError } from '@/errors/serviceErrors';

class InterviewService {
  /**
   * Lista todos os horários de entrevista de um formulário, ordenados.
   */
  async listSlots(formId: string): Promise<InterviewSlot[]> {
    const slots = await interviewRepository.listSlots(formId);
    return this.sortSlots(slots);
  }

  /**
   * Busca um slot específico.
   */
  async getSlotById(
    formId: string,
    slotId: string
  ): Promise<InterviewSlot | null> {
    return interviewRepository.getSlotById(formId, slotId);
  }

  /**
   * Salva um novo horário de entrevista (sempre com status 'available').
   */
  async saveSlot(
    formId: string,
    slot: CreateInterviewSlotInput
  ): Promise<void> {
    if (!formId?.trim()) {
      throw new Error('ID do formulário é obrigatório');
    }
    if (!slot.id?.trim()) {
      throw new Error('ID do horário é obrigatório');
    }
    await interviewRepository.saveSlot(formId, slot);
  }

  /**
   * Remove um horário de entrevista.
   */
  async removeSlot(formId: string, slotId: string): Promise<void> {
    if (!formId?.trim() || !slotId?.trim()) {
      throw new Error('Formulário e horário são obrigatórios');
    }
    await interviewRepository.removeSlot(formId, slotId);
  }

  /**
   * Reserva um par de horários de entrevista (dois entrevistadores)
   * para um candidato.
   */
  async bookSlotPair(
    formId: string,
    slotIdA: string,
    slotIdB: string,
    candidateId: string,
    candidateName: string
  ): Promise<void> {
    if (
      !formId?.trim() ||
      !slotIdA?.trim() ||
      !slotIdB?.trim() ||
      !candidateId?.trim()
    ) {
      throw new Error(
        'Formulário, par de horários e candidato são obrigatórios'
      );
    }
    await interviewRepository.bookSlotPair(
      formId,
      slotIdA,
      slotIdB,
      candidateId,
      candidateName
    );
  }

  /**
   * Reserva um horário de entrevista para um candidato.
   * @deprecated Prefer bookSlotPair for the new 2-interviewer model.
   */
  async bookSlot(
    formId: string,
    slotId: string,
    candidateId: string,
    candidateName: string
  ): Promise<void> {
    if (!formId?.trim() || !slotId?.trim() || !candidateId?.trim()) {
      throw new Error('Formulário, horário e candidato são obrigatórios');
    }
    await interviewRepository.bookSlot(
      formId,
      slotId,
      candidateId,
      candidateName
    );
  }

  /**
   * Libera um horário reservado.
   */
  async releaseSlot(formId: string, slotId: string): Promise<void> {
    if (!formId?.trim() || !slotId?.trim()) {
      throw new Error('Formulário e horário são obrigatórios');
    }
    await interviewRepository.releaseSlot(formId, slotId);
  }

  /**
   * Define o link do Google Meet para um slot de entrevista.
   */
  async setGoogleMeetLink(
    formId: string,
    slotId: string,
    googleMeetLink: string
  ): Promise<void> {
    if (!formId?.trim() || !slotId?.trim()) {
      throw new Error('Formulário e horário são obrigatórios');
    }
    await interviewRepository.setGoogleMeetLink(formId, slotId, googleMeetLink);
  }

  /**
   * Retorna apenas os horários disponíveis (não ocupados) e que ainda não
   * venceram (data >= hoje). Usado para enviar opções ao candidato por email.
   *
   * Apenas horários que possuem pelo menos 2 membros disponíveis no mesmo
   * dia/horário são considerados válidos (modelo de 2 entrevistadores).
   *
   * Para cada par de membros encontrado no mesmo horário, é gerada uma
   * entrada com exatamente 2 slotIds e 2 interviewerNames. Se houver 3+
   * membros no mesmo horário, cada combinação de 2 gera uma entrada
   * distinta, mas na prática exibimos apenas uma (a primeira) para
   * simplicidade — o campo slotIds contém os 2 primeiros encontrados.
   */
  async getAvailableSlots(
    formId: string
  ): Promise<AvailableInterviewSlotView[]> {
    const allSlots = await interviewRepository.listSlots(formId);
    const todayIso = this.todayIsoDate();

    const available = this.sortSlots(
      allSlots.filter(
        (slot) => slot.status === 'available' && slot.isoDate >= todayIso
      )
    );

    // Agrupar slots com mesmo dia + horário
    const grouped = new Map<string, { slot: (typeof available)[number] }[]>();

    for (const slot of available) {
      const key = `${slot.isoDate}_${slot.startTime}_${slot.endTime}`;
      const arr = grouped.get(key) ?? [];
      arr.push({ slot });
      grouped.set(key, arr);
    }

    // Apenas horários com 2+ membros são válidos
    const result: AvailableInterviewSlotView[] = [];

    for (const [key, entries] of grouped) {
      if (entries.length < 2) continue;

      // Pegar os dois primeiros membros disponíveis como par
      result.push({
        id: key,
        slotIds: [entries[0].slot.id, entries[1].slot.id],
        interviewerNames: [
          entries[0].slot.responsibleMemberName,
          entries[1].slot.responsibleMemberName
        ],
        isoDate: entries[0].slot.isoDate,
        dateLabel: entries[0].slot.dateLabel,
        startTime: entries[0].slot.startTime,
        endTime: entries[0].slot.endTime
      });
    }

    return result;
  }

  /**
   * Gera o HTML do email contendo a lista de horários disponíveis
   * COM o link para o candidato escolher o horário de entrevista.
   */
  buildInterviewSlotsEmailHtml(
    candidateName: string,
    selectionLink: string
  ): { subject: string; html: string; text: string } {
    const subject =
      'Horários disponíveis para entrevista — Processo Seletivo Watt';

    const html = this.wrapHtml(`
      <h2 style="margin:0 0 12px;font-size:18px;color:#1a1a2e;">Horários disponíveis para entrevista</h2>
      <p style="margin:0 0 12px;font-size:14px;color:#3f3f46;">Olá, <strong>${this.escapeHtml(candidateName)}</strong>!</p>
      <p style="margin:0 0 16px;font-size:14px;color:#3f3f46;">
        Sua candidatura foi aceita! A próxima etapa do Processo Seletivo da Watt Consultoria Jr. é a entrevista, onde teremos a oportunidade de conhecer você melhor e falar mais sobre a vaga e a empresa. Para isso, pedimos que escolha um horário disponível para a sua entrevista clicando no link abaixo:
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
        <tr>
          <td style="background-color:#1a1a2e;border-radius:6px;padding:12px 28px;">
            <a href="${this.escapeHtml(selectionLink)}" style="color:#f5a623;font-size:14px;font-weight:600;text-decoration:none;">
              Escolher horário de entrevista →
            </a>
          </td>
        </tr>
      </table>
      <p style="margin:0;font-size:14px;color:#3f3f46;">Contamos com a sua participação! 💛</p>
    `);

    const text = [
      'HORÁRIOS DISPONÍVEIS PARA ENTREVISTA — PROCESSO SELETIVO WATT',
      '',
      `Olá, ${candidateName}!`,
      '',
      'Sua candidatura foi aceita! A próxima etapa do Processo Seletivo da Watt Consultoria Jr. é a entrevista, onde teremos a oportunidade de conhecer você melhor e falar mais sobre a vaga e a empresa. Para isso, pedimos que escolha um horário disponível para a sua entrevista clicando no link abaixo:',
      'Acesse o link abaixo para escolher o melhor horário para você:',
      selectionLink,
      '',
      '',
      'Contamos com a sua participação!',
      '',
      'Atenciosamente,',
      'Gestão de Pessoas — Watt Consultoria Jr.'
    ].join('\n');

    return { subject, html, text };
  }

  /**
   * Gera o HTML do email de confirmação da entrevista com Google Meet link.
   * Mostra os nomes de ambos os entrevistadores.
   */
  buildInterviewConfirmationEmailHtml(
    candidateName: string,
    dateLabel: string,
    startTime: string,
    endTime: string,
    interviewerNames: string[],
    googleMeetLink: string
  ): { subject: string; html: string; text: string } {
    const subject = 'Confirmação de entrevista — Processo Seletivo Watt';
    const interviewersLabel = interviewerNames.join(' e ');

    const html = this.wrapHtml(`
      <h2 style="margin:0 0 12px;font-size:18px;color:#1a1a2e;">✅ Entrevista confirmada!</h2>
      <p style="margin:0 0 12px;font-size:14px;color:#3f3f46;">Olá, <strong>${this.escapeHtml(candidateName)}</strong>!</p>
      <p style="margin:0 0 16px;font-size:14px;color:#3f3f46;">
        Sua entrevista no Processo Seletivo da Watt Consultoria Jr. está confirmada. Confira os detalhes abaixo:
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 16px;width:100%;">
        <tr>
          <td style="padding:12px 16px;background-color:#f4f4f5;border-radius:6px;">
            <p style="margin:0 0 4px;font-size:13px;color:#71717a;">Data</p>
            <p style="margin:0;font-size:15px;font-weight:600;color:#1a1a2e;">${this.escapeHtml(dateLabel)}</p>
          </td>
        </tr>
        <tr><td style="height:8px;"></td></tr>
        <tr>
          <td style="padding:12px 16px;background-color:#f4f4f5;border-radius:6px;">
            <p style="margin:0 0 4px;font-size:13px;color:#71717a;">Horário</p>
            <p style="margin:0;font-size:15px;font-weight:600;color:#1a1a2e;">${this.escapeHtml(startTime)} – ${this.escapeHtml(endTime)}</p>
          </td>
        </tr>
        <tr><td style="height:8px;"></td></tr>
        <tr>
          <td style="padding:12px 16px;background-color:#f4f4f5;border-radius:6px;">
            <p style="margin:0 0 4px;font-size:13px;color:#71717a;">Entrevistadores</p>
            <p style="margin:0;font-size:15px;font-weight:600;color:#1a1a2e;">${this.escapeHtml(interviewersLabel)}</p>
          </td>
        </tr>
      </table>
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
        <tr>
          <td style="background-color:#1a1a2e;border-radius:6px;padding:12px 28px;">
            <a href="${this.escapeHtml(googleMeetLink)}" style="color:#f5a623;font-size:14px;font-weight:600;text-decoration:none;">
              Acessar Google Meet →
            </a>
          </td>
        </tr>
      </table>
      <p style="margin:0;font-size:14px;color:#3f3f46;">Boa sorte e até lá! 💛</p>
    `);

    const text = [
      'CONFIRMAÇÃO DE ENTREVISTA — PROCESSO SELETIVO WATT',
      '',
      `Olá, ${candidateName}!`,
      '',
      'Sua entrevista está confirmada. Confira os detalhes:',
      '',
      `Data: ${dateLabel}`,
      `Horário: ${startTime} – ${endTime}`,
      `Entrevistadores: ${interviewersLabel}`,
      `Google Meet: ${googleMeetLink}`,
      '',
      'Boa sorte e até lá!',
      '',
      'Atenciosamente,',
      'Gestão de Pessoas — Watt Consultoria Jr.'
    ].join('\n');

    return { subject, html, text };
  }

  /**
   * Ordena horários por data, horário de início e nome do responsável.
   */
  sortSlots<
    T extends Pick<
      InterviewSlot,
      'isoDate' | 'startMinutes' | 'responsibleMemberName'
    >
  >(slots: T[]): T[] {
    return [...slots].sort((left, right) =>
      `${left.isoDate}-${String(left.startMinutes).padStart(4, '0')}-${left.responsibleMemberName}`.localeCompare(
        `${right.isoDate}-${String(right.startMinutes).padStart(4, '0')}-${right.responsibleMemberName}`
      )
    );
  }

  // ── Helpers privados ──

  private todayIsoDate(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private wrapHtml(content: string): string {
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;">
    <tr><td align="center" style="padding:24px 16px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e4e4e7;">
        <tr>
          <td style="background-color:#1a1a2e;padding:20px 24px;">
            <p style="margin:0;font-size:20px;font-weight:700;color:#f5a623;letter-spacing:1px;">WATT</p>
            <p style="margin:2px 0 0;font-size:12px;color:#a1a1aa;">Consultoria Jr.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 24px 20px;">
            ${content}
          </td>
        </tr>
        <tr>
          <td style="padding:16px 24px;border-top:1px solid #e4e4e7;background-color:#fafafa;">
            <p style="margin:0;font-size:11px;color:#71717a;text-align:center;">
              Gestão de Pessoas — Watt Consultoria Jr.<br/>
              Este e-mail foi enviado automaticamente. Em caso de dúvidas, responda este e-mail.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  }

  // ── Avaliação de entrevista ──────────────────────────────────────────────

  /** Chaves válidas para qualidades desejadas */
  private readonly DESIRED_TRAIT_KEYS: readonly DesiredTraitKey[] = [
    'proatividade',
    'compromisso',
    'lideranca',
    'proposito',
    'transparencia',
    'autoresponsabilidade',
    'uniaoDeTime',
    'autoconfianca',
    'comunicacao',
    'responsabilidadeSocial',
    'seriedade',
    'criatividade'
  ] as const;

  /** Chaves válidas para habilidades indesejadas */
  private readonly UNDESIRED_TRAIT_KEYS: readonly UndesiredTraitKey[] = [
    'procrastinacao',
    'propositoVago',
    'desinteresse',
    'vitimizacao',
    'faltaDeTransparencia',
    'faltaDeConfianca'
  ] as const;

  /** Valores válidos para a escala numérica (1–5) */
  private readonly VALID_RATINGS: readonly DesiredTraitRating[] = [
    1, 2, 3, 4, 5
  ] as const;

  /** Valores válidos para a escala qualitativa */
  private readonly VALID_ASSESSMENTS: readonly UndesiredTraitAssessment[] = [
    'notPresented',
    'presented',
    'unclear'
  ] as const;

  /**
   * Submete a avaliação de entrevista de um candidato.
   *
   * Valida:
   * - existência do candidato
   * - identificação do avaliador
   * - todas as qualidades desejadas com notas de 1 a 5
   * - todas as habilidades indesejadas com classificação válida
   *
   * Monta a estrutura final de `InterviewResult` e persiste em
   * `interview.result` via repository.
   */
  async submitInterviewResult(
    input: SubmitInterviewResultInput
  ): Promise<void> {
    // ── Validação dos parâmetros obrigatórios ──
    if (!input.candidateId?.trim()) {
      throw new ValidationError('ID do candidato é obrigatório');
    }
    if (!input.reviewerId?.trim()) {
      throw new ValidationError('ID do avaliador é obrigatório');
    }
    if (!input.reviewerName?.trim()) {
      throw new ValidationError('Nome do avaliador é obrigatório');
    }

    // ── Validação da existência do candidato ──
    const candidate = await savedCandidateRepository.getCandidateById(
      input.candidateId
    );
    if (!candidate) {
      throw new ValidationError('Candidato não encontrado');
    }

    // ── Validação das qualidades desejadas ──
    this.validateDesiredTraits(input.desiredTraits);

    // ── Validação das habilidades indesejadas ──
    this.validateUndesiredTraits(input.undesiredTraits);

    // ── Montagem da estrutura final ──
    const result: InterviewResult = {
      desiredTraits: input.desiredTraits,
      undesiredTraits: input.undesiredTraits,
      reviewer: {
        id: input.reviewerId.trim(),
        name: input.reviewerName.trim()
      },
      reviewedAt: new Date().toISOString(),
      notes: input.notes?.trim() || undefined
    };

    // ── Persistência via repository ──
    await savedCandidateRepository.setInterviewResult(
      input.candidateId,
      result
    );
  }

  /**
   * Valida que todas as qualidades desejadas estão presentes e possuem
   * notas válidas (1–5).
   */
  private validateDesiredTraits(
    traits: SubmitInterviewResultInput['desiredTraits']
  ): void {
    if (!traits || typeof traits !== 'object') {
      throw new ValidationError('Qualidades desejadas são obrigatórias');
    }

    for (const key of this.DESIRED_TRAIT_KEYS) {
      const value = traits[key];
      if (value === undefined || value === null) {
        throw new ValidationError(`Qualidade desejada "${key}" é obrigatória`);
      }
      if (!this.VALID_RATINGS.includes(value as DesiredTraitRating)) {
        throw new ValidationError(
          `Qualidade desejada "${key}" deve ter nota de 1 a 5, recebeu: ${value}`
        );
      }
    }

    // Verificar se não há chaves extra
    const extraKeys = Object.keys(traits).filter(
      (k) => !this.DESIRED_TRAIT_KEYS.includes(k as DesiredTraitKey)
    );
    if (extraKeys.length > 0) {
      throw new ValidationError(
        `Qualidades desejadas inválidas: ${extraKeys.join(', ')}`
      );
    }
  }

  /**
   * Valida que todas as habilidades indesejadas estão presentes e possuem
   * classificações válidas.
   */
  private validateUndesiredTraits(
    traits: SubmitInterviewResultInput['undesiredTraits']
  ): void {
    if (!traits || typeof traits !== 'object') {
      throw new ValidationError('Habilidades indesejadas são obrigatórias');
    }

    for (const key of this.UNDESIRED_TRAIT_KEYS) {
      const value = traits[key];
      if (value === undefined || value === null) {
        throw new ValidationError(
          `Habilidade indesejada "${key}" é obrigatória`
        );
      }
      if (!this.VALID_ASSESSMENTS.includes(value as UndesiredTraitAssessment)) {
        throw new ValidationError(
          `Habilidade indesejada "${key}" deve ser "notPresented", "presented" ou "unclear", recebeu: "${value}"`
        );
      }
    }

    // Verificar se não há chaves extra
    const extraKeys = Object.keys(traits).filter(
      (k) => !this.UNDESIRED_TRAIT_KEYS.includes(k as UndesiredTraitKey)
    );
    if (extraKeys.length > 0) {
      throw new ValidationError(
        `Habilidades indesejadas inválidas: ${extraKeys.join(', ')}`
      );
    }
  }

  // ── Estatísticas de entrevista ────────────────────────────────────────────

  /**
   * Computa estatísticas agregadas a partir de uma lista de candidatos.
   * Filtra apenas os que possuem `interview.result` preenchido.
   *
   * Penalidade por habilidade indesejada marcada como "presented": −0.5 por ocorrência.
   * "unclear" penaliza com −0.25.
   */
  computeInterviewStatistics(candidates: Candidate[]): InterviewStatistics {
    const evaluated = candidates.filter((c) => c.interview?.result);

    if (evaluated.length === 0) {
      return {
        totalEvaluated: 0,
        overallDesiredAverage: 0,
        desiredTraitAverages: this.emptyDesiredAverages(),
        undesiredTraitDistribution: this.emptyUndesiredDistribution(),
        rankings: []
      };
    }

    // Somas para médias de qualidades desejadas
    const desiredSums: Record<string, number> = {};
    for (const key of this.DESIRED_TRAIT_KEYS) {
      desiredSums[key] = 0;
    }

    // Distribuição de indesejadas
    const undesiredDist = this.emptyUndesiredDistribution();

    const rankings: InterviewResultView[] = [];

    for (const candidate of evaluated) {
      const result = candidate.interview!.result!;

      // Soma qualidades desejadas
      let desiredSum = 0;
      for (const key of this.DESIRED_TRAIT_KEYS) {
        const val = result.desiredTraits[key];
        desiredSums[key] += val;
        desiredSum += val;
      }
      const desiredAvg = desiredSum / this.DESIRED_TRAIT_KEYS.length;

      // Contagem de indesejadas
      let undesiredPenalty = 0;
      let undesiredPresentedCount = 0;
      for (const key of this.UNDESIRED_TRAIT_KEYS) {
        const assessment = result.undesiredTraits[key];
        undesiredDist[key][assessment]++;
        if (assessment === 'presented') {
          undesiredPenalty += 0.5;
          undesiredPresentedCount++;
        } else if (assessment === 'unclear') {
          undesiredPenalty += 0.25;
        }
      }

      const finalScore = Math.max(0, desiredAvg - undesiredPenalty);

      rankings.push({
        candidateId: candidate.id,
        candidateName: `${candidate.nome} ${candidate.sobrenome}`,
        desiredTraitsAverage: Math.round(desiredAvg * 100) / 100,
        undesiredPresented: undesiredPresentedCount,
        finalScore: Math.round(finalScore * 100) / 100,
        result
      });
    }

    // Ordenar por pontuação final decrescente
    rankings.sort((a, b) => b.finalScore - a.finalScore);

    // Médias por qualidade desejada
    const desiredTraitAverages = {} as DesiredTraitAverages;
    for (const key of this.DESIRED_TRAIT_KEYS) {
      desiredTraitAverages[key] =
        Math.round((desiredSums[key] / evaluated.length) * 100) / 100;
    }

    const overallDesiredAverage =
      Math.round(
        (Object.values(desiredTraitAverages).reduce((s, v) => s + v, 0) /
          this.DESIRED_TRAIT_KEYS.length) *
          100
      ) / 100;

    return {
      totalEvaluated: evaluated.length,
      overallDesiredAverage,
      desiredTraitAverages,
      undesiredTraitDistribution: undesiredDist,
      rankings
    };
  }

  private emptyDesiredAverages(): DesiredTraitAverages {
    const avgs = {} as DesiredTraitAverages;
    for (const key of this.DESIRED_TRAIT_KEYS) {
      avgs[key] = 0;
    }
    return avgs;
  }

  private emptyUndesiredDistribution(): UndesiredTraitDistribution {
    const dist = {} as UndesiredTraitDistribution;
    for (const key of this.UNDESIRED_TRAIT_KEYS) {
      dist[key] = { notPresented: 0, presented: 0, unclear: 0 };
    }
    return dist;
  }
}

const interviewService = new InterviewService();
export default interviewService;
