import { EmailServiceError } from '@/errors/serviceErrors';
import { MailerSend, EmailParams, Sender, Recipient } from 'mailersend';

class EmailService {
  sentFrom: Sender;
  mailsender: MailerSend;

  constructor() {
    this.mailsender = new MailerSend({
      apiKey: process.env.MAILSENDER_API_KEY!
    });
    this.sentFrom = new Sender(
      'pessoas@wattconsultoria.com.br',
      'Gestão de Pessoas - Watt Consultoria'
    );
  }

  async sendEmail(
    to: { email: string; name?: string },
    subject: string,
    html: string,
    text: string
  ) {
    try {
      const recipients = [new Recipient(to.email, to.name || 'Membro')];
      const emailParams = new EmailParams()
        .setFrom(this.sentFrom)
        .setTo(recipients)
        .setReplyTo(this.sentFrom)
        .setSubject(subject)
        .setHtml(html)
        .setText(text);

      await this.mailsender.email.send(emailParams);
    } catch (error) {
      console.error('Error creating email parameters:', error);
      throw new EmailServiceError('Failed to send email');
    }
  }
}

export default new EmailService();
