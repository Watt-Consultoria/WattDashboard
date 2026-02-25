import type { EmailTemplateType } from './email-template';

/**
 * Parâmetros de template para envio personalizado por candidato.
 * O serviço renderiza o template para cada candidato com seus dados (nome, etc.).
 */
export interface TemplateEmailParams {
  templateId: EmailTemplateType;
  templateValues: Record<string, string>;
}

/**
 * Contrato para o serviço de notificação de candidatos por email.
 */
export default interface INotificationService {
  /**
   * Envia um email para todos os candidatos salvos que possuem a tag informada.
   * Se `templateParams` for fornecido, renderiza o template por candidato
   * com placeholders personalizados (ex.: {{nome}}).
   *
   * @returns Resumo do envio (quantidade enviada, total, erros).
   */
  notifyCandidatesByTag(
    tag: string,
    subject: string,
    html: string,
    text: string,
    templateParams?: TemplateEmailParams
  ): Promise<NotificationResult>;

  /**
   * Envia um email para candidatos específicos, identificados por seus IDs.
   * Se `templateParams` for fornecido, renderiza o template por candidato
   * com placeholders personalizados (ex.: {{nome}}).
   *
   * @returns Resumo do envio (quantidade enviada, total, erros).
   */
  notifyCandidatesByIds(
    candidateIds: string[],
    subject: string,
    html: string,
    text: string,
    templateParams?: TemplateEmailParams
  ): Promise<NotificationResult>;
}

export interface NotificationResult {
  success: boolean;
  sent: number;
  total: number;
  errors?: string[];
}
