import type IMemberRepository from '@/types/member/member-repository';
import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
  collection,
  getDocs
} from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebase/client';
import { Member, WeekShedule } from '@/types/member/member';
import {
  FirebaseError,
  MissingParameterError,
  ValidationError
} from '@/errors/repositoryErrors';

class MemberRepository implements IMemberRepository {
  async getMemberById(id: string): Promise<Member | null> {
    if (!firebaseDb) {
      throw new FirebaseError('Firebase não está configurado');
    }

    if (!id) {
      throw new MissingParameterError(['id']);
    }

    const memberRef = doc(firebaseDb, 'members', id);
    const memberSnap = await getDoc(memberRef);

    if (!memberSnap.exists()) {
      return null;
    }

    const memberData = memberSnap.data();

    return {
      id: memberSnap.id,
      cpf: memberData.cpf ?? '',
      createdAt: memberData.createdAt ?? Timestamp.now(),
      email: memberData.email ?? '',
      name: memberData.name ?? '',
      role: memberData.role ?? '',
      sector: memberData.sector ?? '',
      status: memberData.status ?? '',
      timeRecords: memberData.timeRecords ?? [],
      updatedAt: memberData.updatedAt ?? Timestamp.now(),
      alerts: memberData.alerts ?? [],
      agendaTasks: memberData.agendaTasks ?? [],
      weekSchedule: memberData.weekSchedule ?? undefined,
      tags: Array.isArray(memberData.tags) ? memberData.tags : []
    };
  }

  async updateMember(
    id: string,
    member: Partial<Omit<Member, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<void> {
    if (!firebaseDb) throw new FirebaseError('Firebase não está configurado');
    if (!id || !member) throw new MissingParameterError(['id', 'member']);

    if (Object.keys(member).length === 0)
      throw new ValidationError('Nenhum campo para atualizar');

    const memberRef = doc(firebaseDb, 'members', id);

    try {
      await updateDoc(memberRef, {
        ...member,
        updatedAt: serverTimestamp()
      });
    } catch (err: any) {
      throw err;
    }
  }

  async getAllMembers(): Promise<Member[]> {
    if (!firebaseDb) throw new FirebaseError('Firebase não está configurado');

    const membersRef = collection(firebaseDb, 'members');
    const membersSnap = await getDocs(membersRef);
    return membersSnap.docs.map((docSnap) => {
      const memberData = docSnap.data();
      return {
        id: docSnap.id,
        cpf: memberData.cpf ?? '',
        createdAt: memberData.createdAt ?? Timestamp.now(),
        email: memberData.email ?? '',
        name: memberData.name ?? '',
        role: memberData.role ?? '',
        sector: memberData.sector ?? '',
        status: memberData.status ?? '',
        timeRecords: memberData.timeRecords ?? [],
        updatedAt: memberData.updatedAt ?? Timestamp.now(),
        alerts: memberData.alerts ?? [],
        agendaTasks: memberData.agendaTasks ?? [],
        weekSchedule: memberData.weekSchedule ?? undefined,
        tags: Array.isArray(memberData.tags) ? memberData.tags : []
      };
    });
  }

  async addTag(memberId: string, tag: string): Promise<void> {
    if (!firebaseDb) throw new FirebaseError('Firebase não está configurado');
    if (!memberId || !tag) throw new MissingParameterError(['memberId', 'tag']);

    const member = await this.getMemberById(memberId);
    if (!member) throw new ValidationError('Membro não encontrado');

    const currentTags = member.tags ?? [];
    if (currentTags.includes(tag)) {
      throw new ValidationError('Tag já existe para este membro');
    }

    const updatedTags = [...currentTags, tag];
    await this.updateMember(memberId, { tags: updatedTags });
  }

  async removeTag(memberId: string, tag: string): Promise<void> {
    if (!firebaseDb) throw new FirebaseError('Firebase não está configurado');
    if (!memberId || !tag) throw new MissingParameterError(['memberId', 'tag']);

    const member = await this.getMemberById(memberId);
    if (!member) throw new ValidationError('Membro não encontrado');

    const currentTags = member.tags ?? [];
    if (!currentTags.includes(tag)) {
      throw new ValidationError('Tag não existe para este membro');
    }

    const updatedTags = currentTags.filter((t) => t !== tag);
    await this.updateMember(memberId, { tags: updatedTags });
  }

  async addTagToMultipleMembers(
    memberIds: string[],
    tag: string
  ): Promise<void> {
    if (!firebaseDb) throw new FirebaseError('Firebase não está configurado');
    if (!memberIds || memberIds.length === 0 || !tag) {
      throw new MissingParameterError(['memberIds', 'tag']);
    }

    const trimmedTag = tag.trim();
    if (!trimmedTag) throw new ValidationError('Tag não pode ser vazia');

    // Processar cada membro
    const errors: string[] = [];
    for (const memberId of memberIds) {
      try {
        const member = await this.getMemberById(memberId);
        if (!member) {
          errors.push(`Membro ${memberId} não encontrado`);
          continue;
        }

        const currentTags = member.tags ?? [];
        if (currentTags.includes(trimmedTag)) {
          // Silenciosamente pular se a tag já existe
          continue;
        }

        const updatedTags = [...currentTags, trimmedTag];
        await this.updateMember(memberId, { tags: updatedTags });
      } catch (error) {
        errors.push(`Erro ao processar membro ${memberId}: ${error}`);
      }
    }

    if (errors.length > 0) {
      throw new ValidationError(
        `Alguns membros não puderam ser atualizados: ${errors.join(', ')}`
      );
    }
  }

  async removeTagFromMultipleMembers(
    memberIds: string[],
    tag: string
  ): Promise<void> {
    if (!firebaseDb) throw new FirebaseError('Firebase não está configurado');
    if (!memberIds || memberIds.length === 0 || !tag) {
      throw new MissingParameterError(['memberIds', 'tag']);
    }

    const trimmedTag = tag.trim();
    if (!trimmedTag) throw new ValidationError('Tag não pode ser vazia');

    const errors: string[] = [];
    for (const memberId of memberIds) {
      try {
        const member = await this.getMemberById(memberId);
        if (!member) {
          errors.push(`Membro ${memberId} não encontrado`);
          continue;
        }

        const currentTags = member.tags ?? [];
        if (!currentTags.includes(trimmedTag)) {
          continue;
        }

        const updatedTags = currentTags.filter((t) => t !== trimmedTag);
        await this.updateMember(memberId, { tags: updatedTags });
      } catch (error) {
        errors.push(`Erro ao processar membro ${memberId}: ${error}`);
      }
    }

    if (errors.length > 0) {
      throw new ValidationError(
        `Alguns membros não puderam ser atualizados: ${errors.join(', ')}`
      );
    }
  }
}

const memberRepository = new MemberRepository();
export default memberRepository;
