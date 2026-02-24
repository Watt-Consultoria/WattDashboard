import savedCandidateRepository from '@/repositories/savedCandidateRepository';
import emailService from '@/services/emailService';
import type INotificationService from '@/types/candidate/notification-service';
import type { NotificationResult } from '@/types/candidate/notification-service';
import type { SavedCandidate } from '@/types/candidate/saved-candidate';

const PSEL_SENDER = {
  email: 'psel@wattconsultoria.com.br',
  name: 'Processo Seletivo - Watt Consultoria'
};

class CandidateNotificationService implements INotificationService {
  /**
   * Lógica compartilhada: envia email para uma lista de candidatos.
   */
  private async sendToList(
    candidates: SavedCandidate[],
    subject: string,
    html: string,
    text: string
  ): Promise<NotificationResult> {
    if (candidates.length === 0) {
      return {
        success: true,
        sent: 0,
        total: 0,
        errors: ['Nenhum candidato encontrado']
      };
    }

    let sent = 0;
    const errors: string[] = [];

    for (const candidate of candidates) {
      if (!candidate.email?.trim()) {
        errors.push(
          `Candidato ${candidate.nome} ${candidate.sobrenome} não possui email`
        );
        continue;
      }

      try {
        await emailService.sendEmail(
          {
            email: candidate.email.trim(),
            name: `${candidate.nome} ${candidate.sobrenome}`.trim()
          },
          subject,
          html,
          text,
          { from: PSEL_SENDER }
        );
        sent++;
      } catch (error: any) {
        errors.push(
          `Erro ao enviar para ${candidate.email}: ${error?.message ?? 'Erro desconhecido'}`
        );
      }
    }

    return {
      success: errors.length === 0,
      sent,
      total: candidates.length,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Envia um email para todos os candidatos salvos que possuem a tag informada.
   */
  async notifyCandidatesByTag(
    tag: string,
    subject: string,
    html: string,
    text: string
  ): Promise<NotificationResult> {
    if (!tag?.trim()) {
      return {
        success: false,
        sent: 0,
        total: 0,
        errors: ['Tag é obrigatória']
      };
    }
    if (!subject?.trim()) {
      return {
        success: false,
        sent: 0,
        total: 0,
        errors: ['Assunto é obrigatório']
      };
    }

    const candidates = await savedCandidateRepository.listCandidatesByTag(
      tag.trim()
    );

    return this.sendToList(candidates, subject, html, text);
  }

  /**
   * Envia um email para candidatos específicos, identificados por seus IDs.
   */
  async notifyCandidatesByIds(
    candidateIds: string[],
    subject: string,
    html: string,
    text: string
  ): Promise<NotificationResult> {
    if (!candidateIds || candidateIds.length === 0) {
      return {
        success: false,
        sent: 0,
        total: 0,
        errors: ['Nenhum candidato selecionado']
      };
    }
    if (!subject?.trim()) {
      return {
        success: false,
        sent: 0,
        total: 0,
        errors: ['Assunto é obrigatório']
      };
    }

    const candidates =
      await savedCandidateRepository.getCandidatesByIds(candidateIds);

    return this.sendToList(candidates, subject, html, text);
  }
}

export default new CandidateNotificationService();
