import activityRepository from '@/repositories/activityRepository';
import memberRepository from '@/repositories/memberRepository';
import type { Activity } from '@/types/activity/activity';
import type {
  AgendaTask,
  Member,
  MemberTask,
  WeekShedule
} from '@/types/member/member';
import {
  countAvailableHours,
  MIN_WEEKLY_AVAILABLE_HOURS,
  WEEK_DAYS
} from '@/types/member/member';

class MemberService {
  async getMemberProfile(memberId: string): Promise<Member | null> {
    return await memberRepository.getMemberById(memberId);
  }

  async getMemberTasks(memberId: string): Promise<MemberTask[]> {
    const member = await memberRepository.getMemberById(memberId);
    if (!member) return [];

    const memberProjectActivities =
      await activityRepository.getMemberProjectActivities(memberId);

    return [
      ...member.agendaTasks.map((task) => ({
        ...task,
        type: 'agenda' as const
      })),
      ...memberProjectActivities.map((activity) => ({
        ...activity,
        type: 'project' as const
      }))
    ];
  }

  async getAllMembers(): Promise<Member[]> {
    return await memberRepository.getAllMembers();
  }

  validateWeekSchedule(schedule: WeekShedule): {
    valid: boolean;
    error?: string;
    totalHours: number;
  } {
    for (const day of WEEK_DAYS) {
      const daySlots = schedule[day];
      if (!Array.isArray(daySlots) || daySlots.length !== 14) {
        return {
          valid: false,
          error: `Dia ${day} deve ter exatamente 14 blocos de horário.`,
          totalHours: 0
        };
      }
      for (const slot of daySlots) {
        if (slot !== 'D' && slot !== 'I') {
          return {
            valid: false,
            error: `Valor inválido no horário: use "D" (Disponível) ou "I" (Indisponível).`,
            totalHours: 0
          };
        }
      }
    }

    const totalHours = countAvailableHours(schedule);
    if (totalHours < MIN_WEEKLY_AVAILABLE_HOURS) {
      return {
        valid: false,
        error: `É necessário ter pelo menos ${MIN_WEEKLY_AVAILABLE_HOURS} horas de disponibilidade por semana. Você selecionou ${totalHours}h.`,
        totalHours
      };
    }

    return { valid: true, totalHours };
  }

  async updateWeekSchedule(
    memberId: string,
    schedule: WeekShedule
  ): Promise<{ success: boolean; error?: string; totalHours: number }> {
    const validation = this.validateWeekSchedule(schedule);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
        totalHours: validation.totalHours
      };
    }

    await memberRepository.updateMember(memberId, { weekSchedule: schedule });
    return { success: true, totalHours: validation.totalHours };
  }

  async getWeekSchedule(memberId: string): Promise<WeekShedule | null> {
    const member = await memberRepository.getMemberById(memberId);
    return member?.weekSchedule ?? null;
  }

  async addTagToMember(memberId: string, tag: string): Promise<void> {
    const trimmedTag = tag.trim();
    if (!trimmedTag) {
      throw new Error('Tag não pode ser vazia');
    }

    await memberRepository.addTag(memberId, trimmedTag);
  }

  async removeTagFromMember(memberId: string, tag: string): Promise<void> {
    const trimmedTag = tag.trim();
    if (!trimmedTag) {
      throw new Error('Tag não pode ser vazia');
    }

    await memberRepository.removeTag(memberId, trimmedTag);
  }

  async getMemberTags(memberId: string): Promise<string[]> {
    const member = await memberRepository.getMemberById(memberId);
    return member?.tags ?? [];
  }

  async addTagToMultipleMembers(
    memberIds: string[],
    tag: string
  ): Promise<{ success: boolean; error?: string }> {
    const trimmedTag = tag.trim();
    if (!trimmedTag) {
      return { success: false, error: 'Tag não pode ser vazia' };
    }

    if (!memberIds || memberIds.length === 0) {
      return {
        success: false,
        error: 'Selecione ao menos um membro'
      };
    }

    try {
      await memberRepository.addTagToMultipleMembers(memberIds, trimmedTag);
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error?.message ?? 'Erro ao adicionar tag aos membros'
      };
    }
  }

  async removeTagFromMultipleMembers(
    memberIds: string[],
    tag: string
  ): Promise<{ success: boolean; error?: string }> {
    const trimmedTag = tag.trim();
    if (!trimmedTag) {
      return { success: false, error: 'Tag não pode ser vazia' };
    }

    if (!memberIds || memberIds.length === 0) {
      return {
        success: false,
        error: 'Selecione ao menos um membro'
      };
    }

    try {
      await memberRepository.removeTagFromMultipleMembers(
        memberIds,
        trimmedTag
      );
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error?.message ?? 'Erro ao remover tag dos membros'
      };
    }
  }
}

export default new MemberService();
