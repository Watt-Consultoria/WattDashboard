import faltaRepository from '@/repositories/faltaRepository';
import memberRepository from '@/repositories/memberRepository';
import { rules } from '@/config/code_of_conduct';
import type {
  Falta,
  FaltaWithDetails,
  CreateFaltaRequest
} from '@/types/member/falta';
import type { RuleCode } from '@/types/code-of-conduct';
import { Timestamp } from 'firebase/firestore';

class FaltaService {
  async getFaltasWithDetails(memberId: string): Promise<FaltaWithDetails[]> {
    const faltas = await faltaRepository.getFaltasByMemberId(memberId);

    return faltas.map((falta) => {
      const ruleDetails = rules[falta.ruleCode as RuleCode];
      const now = new Date();
      const expiryDate = falta.expiresAt.toDate();
      const daysUntilExpiry = Math.ceil(
        (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        ...falta,
        ruleName: ruleDetails.rule,
        ruleType: ruleDetails.type,
        daysUntilExpiry: Math.max(0, daysUntilExpiry)
      };
    });
  }

  async getActiveFaltasWithDetails(
    memberId: string
  ): Promise<FaltaWithDetails[]> {
    const faltas = await faltaRepository.getActiveFaltasByMemberId(memberId);

    return faltas.map((falta) => {
      const ruleDetails = rules[falta.ruleCode as RuleCode];
      const now = new Date();
      const expiryDate = falta.expiresAt.toDate();
      const daysUntilExpiry = Math.ceil(
        (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        ...falta,
        ruleName: ruleDetails.rule,
        ruleType: ruleDetails.type,
        daysUntilExpiry: Math.max(0, daysUntilExpiry)
      };
    });
  }

  async addFalta(
    memberId: string,
    faltaData: CreateFaltaRequest,
    addedByUserId: string
  ): Promise<FaltaWithDetails> {
    // Validar se o membro existe
    const member = await memberRepository.getMemberById(memberId);
    if (!member) {
      throw new Error('Membro não encontrado');
    }

    // Validar se o código de regra é válido
    if (!(faltaData.ruleCode in rules)) {
      throw new Error('Código de regra inválido');
    }

    // Criar a falta no repositório
    const novaFalta = await faltaRepository.createFalta(
      memberId,
      faltaData,
      addedByUserId
    );

    // Retornar com detalhes
    const ruleDetails = rules[novaFalta.ruleCode as RuleCode];
    const now = new Date();
    const expiryDate = novaFalta.expiresAt.toDate();
    const daysUntilExpiry = Math.ceil(
      (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    const faltaWithDetails = {
      ...novaFalta,
      ruleName: ruleDetails.rule,
      ruleType: ruleDetails.type,
      daysUntilExpiry: Math.max(0, daysUntilExpiry)
    };

    // Enviar email de notificação
    try {
      await this.sendFaltaNotificationEmail(member, faltaWithDetails);
    } catch (error) {
      console.error('Erro ao enviar email de notificação:', error);
      // Não lançar erro para não impedir o cadastro da falta
    }

    return faltaWithDetails;
  }

  private async sendFaltaNotificationEmail(
    member: Awaited<ReturnType<typeof memberRepository.getMemberById>>,
    falta: FaltaWithDetails
  ): Promise<void> {
    if (!member || !member.email) {
      return;
    }

    try {
      await fetch('/api/faltas/notify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          memberEmail: member.email,
          memberName: member.name,
          ruleCode: falta.ruleCode,
          ruleName: falta.ruleName,
          ruleType: falta.ruleType,
          description: falta.description,
          expiresAt: falta.expiresAt.toDate().toISOString()
        })
      });
    } catch (error) {
      console.error('Erro ao chamar API de notificação:', error);
      // Não lançar erro para não impedir o salvamento
    }
  }

  async cancelFalta(memberId: string, faltaId: string): Promise<void> {
    const falta = await faltaRepository.getFaltaById(memberId, faltaId);
    if (!falta) {
      throw new Error('Falta não encontrada');
    }

    const member = await memberRepository.getMemberById(memberId);
    if (!member) {
      throw new Error('Membro não encontrado');
    }

    await faltaRepository.updateFalta(memberId, faltaId, {
      status: 'cancelada'
    });

    // Enviar email de notificação de cancelamento
    try {
      const ruleDetails = rules[falta.ruleCode as RuleCode];
      await this.sendCancelFaltaNotificationEmail(
        member,
        falta,
        ruleDetails.type
      );
    } catch (error) {
      console.error('Erro ao enviar email de cancelamento:', error);
      // Não lançar erro para não impedir o cancelamento da falta
    }
  }

  private async sendCancelFaltaNotificationEmail(
    member: Awaited<ReturnType<typeof memberRepository.getMemberById>>,
    falta: Falta,
    ruleType: string
  ): Promise<void> {
    if (!member || !member.email) {
      return;
    }

    try {
      const ruleDetails = rules[falta.ruleCode as RuleCode];
      await fetch('/api/faltas/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          memberEmail: member.email,
          memberName: member.name,
          ruleCode: falta.ruleCode,
          ruleName: ruleDetails.rule,
          ruleType: ruleType
        })
      });
    } catch (error) {
      console.error('Erro ao chamar API de cancelamento:', error);
      // Não lançar erro para não impedir o cancelamento
    }
  }

  async getFaltaSummary(memberId: string): Promise<{
    total: number;
    active: number;
    byType: Record<string, number>;
  }> {
    const faltas = await this.getFaltasWithDetails(memberId);

    const byType: Record<string, number> = {
      leve: 0,
      moderada: 0,
      grave: 0,
      desligamento: 0
    };

    let active = 0;

    faltas.forEach((falta) => {
      byType[falta.ruleType]++;

      if (falta.status === 'ativa' && falta.daysUntilExpiry > 0) {
        active++;
      }
    });

    return {
      total: faltas.length,
      active,
      byType
    };
  }
}

export default new FaltaService();
