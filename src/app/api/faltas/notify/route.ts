import { NextRequest, NextResponse } from 'next/server';
import emailService from '@/services/emailService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      memberEmail,
      memberName,
      ruleCode,
      ruleName,
      ruleType,
      description,
      expiresAt
    } = body;

    if (!memberEmail || !memberName || !ruleCode || !ruleName) {
      return NextResponse.json(
        { error: 'Campos obrigatórios faltando' },
        { status: 400 }
      );
    }

    const ruleTypeLabel: Record<string, string> = {
      leve: 'Leve',
      moderada: 'Moderada',
      grave: 'Grave',
      desligamento: 'Desligamento'
    };

    const expiryDate = new Date(expiresAt);
    const formattedDate = new Intl.DateTimeFormat('pt-BR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(expiryDate);

    const html = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #e74c3c;">Notificação de Falta Registrada</h2>
            
            <p>Prezado, <strong>${memberName}</strong>,</p>
            
            <p>Este e-mail tem como objetivo formalizar o registro de uma ocorrência, referente ao evento detalhado abaixo:
            </p>
            
            <div style="background-color: #f5f5f5; border-left: 4px solid #e74c3c; padding: 15px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #e74c3c;">Detalhes da Falta</h3>
              <p><strong>Código:</strong> ${ruleCode}</p>
              <p><strong>Tipo:</strong> <span style="background-color: #ffe6e6; padding: 5px 10px; border-radius: 3px;">${ruleTypeLabel[ruleType]}</span></p>
              <p><strong>Regra:</strong> ${ruleName}</p>
              ${description ? `<p><strong>Descrição:</strong> ${description}</p>` : ''}
              <p><strong>Expiração:</strong> ${formattedDate}</p>
            </div>
            
            <p>Gostaríamos de entender melhor o que aconteceu. Por gentileza, responda a este e-mail em até 24 horas com a sua justificativa ou, caso possua, o envio de documentos comprobatórios (atestados, prints ou outros registros)s.</p>

            <p>Ressaltamos que este procedimento faz parte da nossa política de transparência e serve para garantir que todos os registros internos estejam devidamente fundamentados.</p>

            <p>Estamos à disposição para conversar caso tenha qualquer dúvida sobre este comunicado.</p>
            
            <p style="color: #999; font-size: 12px; border-top: 1px solid #ddd; padding-top: 15px; margin-top: 30px;">
              Este é um email automático da Watt Consultoria.
            </p>
          </div>
        </body>
      </html>
    `;

    const text = `
Notificação de Falta Registrada

Olá, ${memberName},

Informamos que uma falta foi registrada em seu histórico.

Detalhes da Falta:
- Código: ${ruleCode}
- Tipo: ${ruleTypeLabel[ruleType]}
- Regra: ${ruleName}
${description ? `- Descrição: ${description}` : ''}
- Expiração: ${formattedDate}

Para informações adicionais ou esclarecimentos, entre em contato com o departamento de gestão de pessoas.

---
Este é um email automático da Watt Consultoria. Por favor, não responda este email.
    `;

    await emailService.sendEmail(
      {
        email: memberEmail,
        name: memberName
      },
      `Comunicado Interno: Registro de Ocorrência - ${memberName}`,
      html,
      text
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao enviar notificação de falta:', error);
    return NextResponse.json(
      { error: 'Erro ao enviar email' },
      { status: 500 }
    );
  }
}
