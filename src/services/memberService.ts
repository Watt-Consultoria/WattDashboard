import activityRepository from '@/repositories/activityRepository';
import memberRepository from '@/repositories/memberRepository';
import type { Activity } from '@/types/activity/activity';
import type { AgendaTask, Member, MemberTask } from '@/types/member/member';

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
}

export default new MemberService();
