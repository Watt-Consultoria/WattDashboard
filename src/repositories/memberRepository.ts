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
import { Member } from '@/types/member/member';
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
      agendaTasks: memberData.agendaTasks ?? []
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
        agendaTasks: memberData.agendaTasks ?? []
      };
    });
  }
}

const memberRepository = new MemberRepository();
export default memberRepository;
