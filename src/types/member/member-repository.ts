import type { Member } from './member';

export default interface IMemberRepository {
  getMemberById(id: string): Promise<Member | null>;
  getAllMembers(): Promise<Member[]>;
  updateMember(id: string, member: Partial<Member>): Promise<void>;
}
