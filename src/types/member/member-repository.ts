import type { Member } from './member';

export default interface IMemberRepository {
  getMemberById(id: string): Promise<Member | null>;
  getAllMembers(): Promise<Member[]>;
  updateMember(id: string, member: Partial<Member>): Promise<void>;
  addTag(memberId: string, tag: string): Promise<void>;
  removeTag(memberId: string, tag: string): Promise<void>;
  addTagToMultipleMembers(memberIds: string[], tag: string): Promise<void>;
  removeTagFromMultipleMembers(memberIds: string[], tag: string): Promise<void>;
}
