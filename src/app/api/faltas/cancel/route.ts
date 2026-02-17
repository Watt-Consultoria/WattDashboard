import { NextRequest, NextResponse } from 'next/server';
import emailService from '@/services/emailService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { memberEmail, memberName, ruleCode, ruleName, ruleType } = body;

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

    const html = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #27ae60;">Notificação de Cancelamento de Falta</h2>
            
            <p>Prezado, <strong>${memberName}</strong>,</p>
            
            <p>Informamos que a falta registrada em seu histórico foi <strong>cancelada</strong> conforme detalhado abaixo:
            </p>
            
            <div style="background-color: #f5f5f5; border-left: 4px solid #27ae60; padding: 15px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #27ae60;">Detalhes da Falta Cancelada</h3>
              <p><strong>Código:</strong> ${ruleCode}</p>
              <p><strong>Tipo:</strong> <span style="background-color: #e6ffe6; padding: 5px 10px; border-radius: 3px;">${ruleTypeLabel[ruleType]}</span></p>
              <p><strong>Regra:</strong> ${ruleName}</p>
              <p style="background-color: #d4edda; border-left: 4px solid #27ae60; padding: 10px; border-radius: 3px; margin-top: 15px;">
                <strong style="color: #27ae60;">✓ Status: CANCELADA</strong>
              </p>
            </div>
            
            <p>Esta falta foi removida de seu histórico e não será mais considerada em avaliações de desempenho.</p>

            <p>Caso tenha dúvidas sobre este cancelamento, entre em contato com o departamento responsável.</p>
            
            <p style="color: #999; font-size: 12px; border-top: 1px solid #ddd; padding-top: 15px; margin-top: 30px;">
              Este é um email automático da Watt Consultoria.
            </p>
          </div>
        </body>
      </html>
    `;

    const text = `
Notificação de Cancelamento de Falta

Olá, ${memberName},

Informamos que a falta registrada em seu histórico foi cancelada.

Detalhes da Falta Cancelada:
- Código: ${ruleCode}
- Tipo: ${ruleTypeLabel[ruleType]}
- Regra: ${ruleName}
- Status: ✓ CANCELADA

Esta falta foi removida de seu histórico e não será mais considerada em avaliações de desempenho.

Para informações adicionais ou esclarecimentos, entre em contato com o departamento de gestão de pessoas.

---
Este é um email automático da Watt Consultoria. Por favor, não responda este email.
    `;

    await emailService.sendEmail(
      {
        email: memberEmail,
        name: memberName
      },
      `Comunicado Interno: Cancelamento de Falta - ${memberName}`,
      html,
      text
    );

    return NextResponse.json(
      { success: true, message: 'Email de cancelamento enviado com sucesso' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Erro ao enviar email de cancelamento:', error);
    return NextResponse.json(
      { error: 'Erro ao enviar email de cancelamento' },
      { status: 500 }
    );
  }
}
