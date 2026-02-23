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
}

export default new MemberService();
