import { ValidationError } from '@/errors/repositoryErrors';
import feedbackRepository from '@/repositories/feedbackRepository';
import type {
  FeedbackFormState,
  Feedback,
  FeedbackMemberDetails,
  FeedbackMemberSource,
  FeedbackStatus,
  FeedbackType
} from '@/types/feedback/feedback';
import { FEEDBACK_TYPES } from '@/types/feedback/feedback';

const FEEDBACK_MANAGEMENT_DENIED =
  'Apenas Presidente ou Assessor do setor Executivo podem gerenciar issues.';

class FeedbackService {
  async submitFeedback(input: FeedbackFormState & {
    member: FeedbackMemberSource;
  }): Promise<string> {
    const member = this.resolveMemberDetails(input.member);
    const type = this.validateType(input.type);
    const title = input.title?.trim();
    const detail = input.detail?.trim();

    if (!title) {
      throw new ValidationError('Informe um titulo para o feedback.');
    }

    if (!detail) {
      throw new ValidationError('Descreva o feedback ou solicitacao.');
    }

    return feedbackRepository.createFeedback({
      type,
      title,
      detail,
      member
    });
  }

  canManageFeedbacks(actor: FeedbackMemberSource): boolean {
    if (!actor?.id) return false;

    const role = this.normalizeValue(actor.role);
    const sector = this.normalizeValue(actor.sector);
    return (
      sector === 'executivo' &&
      (role === 'presidente' || role === 'assessor' || role === 'acessor')
    );
  }

  async getFeedbacks(actor: FeedbackMemberSource): Promise<Feedback[]> {
    this.assertCanManageFeedbacks(actor);
    return feedbackRepository.getFeedbacks();
  }

  async updateFeedbackStatus(
    actor: FeedbackMemberSource,
    feedbackId: string,
    status: FeedbackStatus
  ): Promise<void> {
    this.assertCanManageFeedbacks(actor);
    if (!feedbackId) {
      throw new ValidationError('Issue invalida.');
    }
    if (status !== 'Em andamento' && status !== 'Resolvida') {
      throw new ValidationError('Status invalido para classificacao.');
    }

    await feedbackRepository.updateFeedbackStatus(feedbackId, status);
  }

  private assertCanManageFeedbacks(actor: FeedbackMemberSource): void {
    if (!this.canManageFeedbacks(actor)) {
      throw new ValidationError(FEEDBACK_MANAGEMENT_DENIED);
    }
  }

  private normalizeValue(value?: string | null): string {
    return (
      value
        ?.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') ?? ''
    );
  }

  private validateType(type: FeedbackType): FeedbackType {
    if (!FEEDBACK_TYPES.includes(type)) {
      throw new ValidationError('Selecione um tipo de feedback valido.');
    }

    return type;
  }

  private resolveMemberDetails(
    member: FeedbackMemberSource
  ): FeedbackMemberDetails {
    const memberId = member?.id?.trim();
    if (!memberId) {
      throw new ValidationError('Membro nao identificado.');
    }

    return {
      id: memberId,
      name: member?.name?.trim() || 'Sem nome'
    };
  }
}

export default new FeedbackService();
