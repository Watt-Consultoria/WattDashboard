// ---------------------------------------------------------------------------
// Tipos e modelos de email para notificação de candidatos do PSEL
// ---------------------------------------------------------------------------

/** Identificadores dos modelos disponíveis */
export type EmailTemplateType =
  | 'convocacao'
  | 'aprovacao'
  | 'reprovacao'
  | 'lembrete'
  | 'informativo';

/** Campo dinâmico que o usuário preenche antes de enviar */
export interface EmailTemplateField {
  id: string;
  label: string;
  placeholder: string;
  type: 'text' | 'textarea' | 'date' | 'time';
  required: boolean;
}

/** Definição de um modelo de email */
export interface EmailTemplate {
  id: EmailTemplateType;
  nome: string;
  descricao: string;
  campos: EmailTemplateField[];
}

/** Resultado da renderização de um modelo */
export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

// ---------------------------------------------------------------------------
// Wrapper HTML reutilizado por todos os modelos
// ---------------------------------------------------------------------------

function wrapHtml(content: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;">
    <tr><td align="center" style="padding:24px 16px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e4e4e7;">
        <!-- Header -->
        <tr>
          <td style="background-color:#1a1a2e;padding:20px 24px;">
            <p style="margin:0;font-size:20px;font-weight:700;color:#f5a623;letter-spacing:1px;">WATT</p>
            <p style="margin:2px 0 0;font-size:12px;color:#a1a1aa;">Consultoria Jr.</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:28px 24px 20px;">
            ${content}
          </td>
        </tr>
        <!-- Footer -->
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

// ---------------------------------------------------------------------------
// Constantes de templates
// ---------------------------------------------------------------------------

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: 'convocacao',
    nome: 'Convocação para Etapa',
    descricao:
      'Convoca os candidatos para a próxima etapa do processo seletivo.',
    campos: [
      {
        id: 'etapa',
        label: 'Nome da etapa',
        placeholder: 'Ex.: Dinâmica de Grupo',
        type: 'text',
        required: true
      },
      {
        id: 'data',
        label: 'Data',
        placeholder: 'Ex.: 15/03/2026',
        type: 'text',
        required: true
      },
      {
        id: 'horario',
        label: 'Horário',
        placeholder: 'Ex.: 14:00',
        type: 'text',
        required: true
      },
      {
        id: 'local',
        label: 'Local / Link',
        placeholder: 'Ex.: Sala 301 - Bloco A ou link do Google Meet',
        type: 'text',
        required: true
      },
      {
        id: 'observacoes',
        label: 'Observações (opcional)',
        placeholder: 'Informações adicionais para os candidatos...',
        type: 'textarea',
        required: false
      }
    ]
  },
  {
    id: 'aprovacao',
    nome: 'Aprovação',
    descricao:
      'Informa os candidatos que foram aprovados no processo seletivo.',
    campos: [
      {
        id: 'mensagem',
        label: 'Mensagem pessoal',
        placeholder:
          'Ex.: Ficamos muito felizes com o seu desempenho ao longo do processo...',
        type: 'textarea',
        required: true
      },
      {
        id: 'proximosPassos',
        label: 'Próximos passos',
        placeholder:
          'Ex.: Você receberá um convite para o nosso grupo no WhatsApp...',
        type: 'textarea',
        required: true
      }
    ]
  },
  {
    id: 'reprovacao',
    nome: 'Reprovação',
    descricao: 'Informa os candidatos que não foram selecionados nesta edição.',
    campos: [
      {
        id: 'mensagem',
        label: 'Mensagem',
        placeholder:
          'Ex.: Agradecemos imensamente sua participação no processo seletivo...',
        type: 'textarea',
        required: true
      },
      {
        id: 'feedback',
        label: 'Feedback (opcional)',
        placeholder:
          'Ex.: Sinta-se à vontade para se inscrever novamente no próximo PSel...',
        type: 'textarea',
        required: false
      }
    ]
  },
  {
    id: 'lembrete',
    nome: 'Lembrete',
    descricao: 'Envia um lembrete sobre atividades ou prazos importantes.',
    campos: [
      {
        id: 'atividade',
        label: 'Atividade',
        placeholder: 'Ex.: Entrega do case de negócios',
        type: 'text',
        required: true
      },
      {
        id: 'dataLimite',
        label: 'Data limite',
        placeholder: 'Ex.: 20/03/2026 às 23:59',
        type: 'text',
        required: true
      },
      {
        id: 'detalhes',
        label: 'Detalhes',
        placeholder: 'Instruções ou detalhes adicionais...',
        type: 'textarea',
        required: true
      }
    ]
  },
  {
    id: 'informativo',
    nome: 'Comunicado Geral',
    descricao: 'Envie um comunicado personalizado para os candidatos.',
    campos: [
      {
        id: 'titulo',
        label: 'Título do comunicado',
        placeholder: 'Ex.: Atualização sobre o cronograma',
        type: 'text',
        required: true
      },
      {
        id: 'mensagem',
        label: 'Mensagem',
        placeholder: 'Escreva o conteúdo do comunicado...',
        type: 'textarea',
        required: true
      }
    ]
  }
];

// ---------------------------------------------------------------------------
// Funções de renderização por modelo
// ---------------------------------------------------------------------------

type RenderFn = (v: Record<string, string>) => RenderedEmail;

const renderers: Record<EmailTemplateType, RenderFn> = {
  convocacao(v) {
    const subject = `Convocação: ${v.etapa} — Processo Seletivo Watt`;
    const obsBlock = v.observacoes?.trim()
      ? `<p style="margin:14px 0 0;font-size:14px;color:#52525b;"><strong>Observações:</strong> ${v.observacoes}</p>`
      : '';
    const obsText = v.observacoes?.trim()
      ? `\nObservações: ${v.observacoes}`
      : '';

    const html = wrapHtml(`
      <h2 style="margin:0 0 12px;font-size:18px;color:#1a1a2e;">Convocação para ${v.etapa}</h2>
      <p style="margin:0 0 8px;font-size:14px;color:#3f3f46;">Olá! Você está sendo convocado(a) para a próxima etapa do nosso processo seletivo.</p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:16px 0;width:100%;">
        <tr>
          <td style="padding:12px 16px;background-color:#f4f4f5;border-radius:6px;">
            <p style="margin:0 0 4px;font-size:13px;color:#71717a;">Etapa</p>
            <p style="margin:0;font-size:15px;font-weight:600;color:#1a1a2e;">${v.etapa}</p>
          </td>
        </tr>
        <tr><td style="height:8px;"></td></tr>
        <tr>
          <td style="padding:12px 16px;background-color:#f4f4f5;border-radius:6px;">
            <p style="margin:0 0 4px;font-size:13px;color:#71717a;">Data e horário</p>
            <p style="margin:0;font-size:15px;font-weight:600;color:#1a1a2e;">${v.data} às ${v.horario}</p>
          </td>
        </tr>
        <tr><td style="height:8px;"></td></tr>
        <tr>
          <td style="padding:12px 16px;background-color:#f4f4f5;border-radius:6px;">
            <p style="margin:0 0 4px;font-size:13px;color:#71717a;">Local / Link</p>
            <p style="margin:0;font-size:15px;font-weight:600;color:#1a1a2e;">${v.local}</p>
          </td>
        </tr>
      </table>
      ${obsBlock}
      <p style="margin:18px 0 0;font-size:14px;color:#3f3f46;">Contamos com a sua presença!</p>
    `);

    const text = [
      `CONVOCAÇÃO: ${v.etapa}`,
      '',
      'Olá! Você está sendo convocado(a) para a próxima etapa do nosso processo seletivo.',
      '',
      `Etapa: ${v.etapa}`,
      `Data: ${v.data}`,
      `Horário: ${v.horario}`,
      `Local: ${v.local}`,
      obsText,
      '',
      'Contamos com a sua presença!',
      '',
      'Atenciosamente,',
      'Gestão de Pessoas — Watt Consultoria Jr.'
    ].join('\n');

    return { subject, html, text };
  },

  aprovacao(v) {
    const subject = 'Parabéns! Você foi aprovado(a) — Processo Seletivo Watt';

    const html = wrapHtml(`
      <h2 style="margin:0 0 12px;font-size:18px;color:#1a1a2e;">🎉 Parabéns!</h2>
      <p style="margin:0 0 12px;font-size:14px;color:#3f3f46;">Temos o prazer de informar que <strong>você foi aprovado(a)</strong> no Processo Seletivo da Watt Consultoria Jr.!</p>
      <p style="margin:0 0 16px;font-size:14px;color:#3f3f46;">${v.mensagem.replace(/\n/g, '<br/>')}</p>
      <div style="padding:14px 16px;background-color:#ecfdf5;border-left:4px solid #10b981;border-radius:4px;margin:0 0 16px;">
        <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#065f46;">Próximos passos</p>
        <p style="margin:0;font-size:14px;color:#065f46;">${v.proximosPassos.replace(/\n/g, '<br/>')}</p>
      </div>
      <p style="margin:0;font-size:14px;color:#3f3f46;">Bem-vindo(a) à família Watt! 💛</p>
    `);

    const text = [
      'PARABÉNS! VOCÊ FOI APROVADO(A)!',
      '',
      'Temos o prazer de informar que você foi aprovado(a) no Processo Seletivo da Watt Consultoria Jr.!',
      '',
      v.mensagem,
      '',
      'PRÓXIMOS PASSOS:',
      v.proximosPassos,
      '',
      'Bem-vindo(a) à família Watt!',
      '',
      'Atenciosamente,',
      'Gestão de Pessoas — Watt Consultoria Jr.'
    ].join('\n');

    return { subject, html, text };
  },

  reprovacao(v) {
    const subject = 'Resultado do Processo Seletivo — Watt Consultoria';

    const feedbackBlock = v.feedback?.trim()
      ? `<div style="padding:14px 16px;background-color:#f4f4f5;border-radius:6px;margin:0 0 16px;">
          <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#3f3f46;">Nosso feedback</p>
          <p style="margin:0;font-size:14px;color:#52525b;">${v.feedback.replace(/\n/g, '<br/>')}</p>
        </div>`
      : '';
    const feedbackText = v.feedback?.trim()
      ? `\nNosso feedback:\n${v.feedback}\n`
      : '';

    const html = wrapHtml(`
      <h2 style="margin:0 0 12px;font-size:18px;color:#1a1a2e;">Resultado do Processo Seletivo</h2>
      <p style="margin:0 0 12px;font-size:14px;color:#3f3f46;">${v.mensagem.replace(/\n/g, '<br/>')}</p>
      ${feedbackBlock}
      <p style="margin:0;font-size:14px;color:#3f3f46;">Agradecemos seu interesse e torcemos pelo seu sucesso!</p>
    `);

    const text = [
      'RESULTADO DO PROCESSO SELETIVO',
      '',
      v.mensagem,
      feedbackText,
      'Agradecemos seu interesse e torcemos pelo seu sucesso!',
      '',
      'Atenciosamente,',
      'Gestão de Pessoas — Watt Consultoria Jr.'
    ].join('\n');

    return { subject, html, text };
  },

  lembrete(v) {
    const subject = `Lembrete: ${v.atividade} — Processo Seletivo Watt`;

    const html = wrapHtml(`
      <h2 style="margin:0 0 12px;font-size:18px;color:#1a1a2e;">⏰ Lembrete</h2>
      <p style="margin:0 0 12px;font-size:14px;color:#3f3f46;">Este é um lembrete sobre uma atividade importante do processo seletivo.</p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:16px 0;width:100%;">
        <tr>
          <td style="padding:12px 16px;background-color:#fefce8;border-left:4px solid #eab308;border-radius:4px;">
            <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#854d0e;">${v.atividade}</p>
            <p style="margin:0;font-size:14px;color:#854d0e;">Prazo: <strong>${v.dataLimite}</strong></p>
          </td>
        </tr>
      </table>
      <p style="margin:0 0 16px;font-size:14px;color:#3f3f46;">${v.detalhes.replace(/\n/g, '<br/>')}</p>
      <p style="margin:0;font-size:14px;color:#3f3f46;">Fique atento(a) ao prazo!</p>
    `);

    const text = [
      `LEMBRETE: ${v.atividade}`,
      '',
      'Este é um lembrete sobre uma atividade importante do processo seletivo.',
      '',
      `Atividade: ${v.atividade}`,
      `Prazo: ${v.dataLimite}`,
      '',
      v.detalhes,
      '',
      'Fique atento(a) ao prazo!',
      '',
      'Atenciosamente,',
      'Gestão de Pessoas — Watt Consultoria Jr.'
    ].join('\n');

    return { subject, html, text };
  },

  informativo(v) {
    const subject = `${v.titulo} — Processo Seletivo Watt`;

    const html = wrapHtml(`
      <h2 style="margin:0 0 12px;font-size:18px;color:#1a1a2e;">${v.titulo}</h2>
      <p style="margin:0;font-size:14px;color:#3f3f46;line-height:1.6;">${v.mensagem.replace(/\n/g, '<br/>')}</p>
    `);

    const text = [
      v.titulo.toUpperCase(),
      '',
      v.mensagem,
      '',
      'Atenciosamente,',
      'Gestão de Pessoas — Watt Consultoria Jr.'
    ].join('\n');

    return { subject, html, text };
  }
};

// ---------------------------------------------------------------------------
// Função pública de renderização
// ---------------------------------------------------------------------------

/**
 * Renderiza um modelo de email a partir dos valores preenchidos pelo usuário.
 */
export function renderEmailTemplate(
  template: EmailTemplate,
  values: Record<string, string>
): RenderedEmail {
  const renderFn = renderers[template.id];
  if (!renderFn) {
    throw new Error(`Modelo de email desconhecido: ${template.id}`);
  }
  return renderFn(values);
}
