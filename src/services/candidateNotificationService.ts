import savedCandidateRepository from '@/repositories/savedCandidateRepository';
import emailService from '@/services/emailService';
import type INotificationService from '@/types/candidate/notification-service';
import type {
  NotificationResult,
  TemplateEmailParams
} from '@/types/candidate/notification-service';
import type { SavedCandidate } from '@/types/candidate/saved-candidate';
import {
  EMAIL_TEMPLATES,
  renderEmailTemplateForCandidate,
  replaceCandidatePlaceholders
} from '@/types/candidate/email-template';
import type { CandidatePlaceholderData } from '@/types/candidate/email-template';

const PSEL_SENDER = {
  email: 'psel@wattconsultoria.com.br',
  name: 'Processo Seletivo - Watt Consultoria'
};

/**
 * Extrai os dados de placeholder a partir de um SavedCandidate.
 */
function buildPlaceholderData(
  candidate: SavedCandidate
): CandidatePlaceholderData {
  return {
    nome: candidate.nome ?? '',
    sobrenome: candidate.sobrenome ?? '',
    nomeCompleto: `${candidate.nome ?? ''} ${candidate.sobrenome ?? ''}`.trim(),
    email: candidate.email ?? '',
    curso: candidate.curso ?? '',
    periodo: candidate.periodo ?? '',
    etapa: candidate.etapa ?? ''
  };
}

class CandidateNotificationService implements INotificationService {
  /**
   * Lógica compartilhada: envia email para uma lista de candidatos.
   * Se templateParams for fornecido, renderiza o template por candidato
   * substituindo placeholders ({{nome}}, {{sobrenome}}, etc.).
   */
  private async sendToList(
    candidates: SavedCandidate[],
    subject: string,
    html: string,
    text: string,
    templateParams?: TemplateEmailParams
  ): Promise<NotificationResult> {
    if (candidates.length === 0) {
      return {
        success: true,
        sent: 0,
        total: 0,
        errors: ['Nenhum candidato encontrado']
      };
    }

    // Resolve o template (se houver) uma vez, fora do loop
    const template = templateParams
      ? EMAIL_TEMPLATES.find((t) => t.id === templateParams.templateId)
      : null;

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
        let finalSubject = subject;
        let finalHtml = html;
        let finalText = text;

        if (template && templateParams) {
          // Renderiza o template personalizado para este candidato
          const placeholderData = buildPlaceholderData(candidate);
          const rendered = renderEmailTemplateForCandidate(
            template,
            templateParams.templateValues,
            placeholderData
          );
          finalSubject = rendered.subject;
          finalHtml = rendered.html;
          finalText = rendered.text;
        } else {
          // Fallback: substitui placeholders no HTML/text pré-renderizado
          const placeholderData = buildPlaceholderData(candidate);
          finalSubject = replaceCandidatePlaceholders(subject, placeholderData);
          finalHtml = replaceCandidatePlaceholders(html, placeholderData);
          finalText = replaceCandidatePlaceholders(text, placeholderData);
        }

        await emailService.sendEmail(
          {
            email: candidate.email.trim(),
            name: `${candidate.nome} ${candidate.sobrenome}`.trim()
          },
          finalSubject,
          finalHtml,
          finalText,
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
    text: string,
    templateParams?: TemplateEmailParams
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

    return this.sendToList(candidates, subject, html, text, templateParams);
  }

  /**
   * Envia um email para candidatos específicos, identificados por seus IDs.
   */
  async notifyCandidatesByIds(
    candidateIds: string[],
    subject: string,
    html: string,
    text: string,
    templateParams?: TemplateEmailParams
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

    return this.sendToList(candidates, subject, html, text, templateParams);
  }
}

export default new CandidateNotificationService();
