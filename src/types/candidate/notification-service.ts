/**
 * Contrato para o serviço de notificação de candidatos por email.
 */
export default interface INotificationService {
  /**
   * Envia um email para todos os candidatos salvos que possuem a tag informada.
   *
   * @returns Resumo do envio (quantidade enviada, total, erros).
   */
  notifyCandidatesByTag(
    tag: string,
    subject: string,
    html: string,
    text: string
  ): Promise<NotificationResult>;

  /**
   * Envia um email para candidatos específicos, identificados por seus IDs.
   *
   * @returns Resumo do envio (quantidade enviada, total, erros).
   */
  notifyCandidatesByIds(
    candidateIds: string[],
    subject: string,
    html: string,
    text: string
  ): Promise<NotificationResult>;
}

export interface NotificationResult {
  success: boolean;
  sent: number;
  total: number;
  errors?: string[];
}
