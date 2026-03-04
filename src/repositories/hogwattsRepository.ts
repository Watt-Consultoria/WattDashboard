import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  type QueryConstraint,
  type QueryDocumentSnapshot,
  type DocumentData,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where
} from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebase/client';
import {
  FirebaseError,
  MissingParameterError
} from '@/errors/repositoryErrors';
import type {
  HogwattsHouse,
  HogwattsHouseName,
  HogwattsMemberProfile,
  HogwattsSubmission,
  HogwattsSubmissionQuery,
  HogwattsSubmissionStatus,
  HogwattsTask
} from '@/types/hogwatts/hogwatts';
import type {
  MemberSectorEnum,
  MemberSectorEnumSimple
} from '@/types/member/member';
import type IHogwattsRepository from '@/types/hogwatts/hogwatts-repository';

// ── Mappers ────────────────────────────────────────────────────────────────

const mapHouse = (snap: QueryDocumentSnapshot<DocumentData>): HogwattsHouse => {
  const d = snap.data();
  return {
    id: snap.id,
    name: d.name ?? '',
    totalPoints: d.totalPoints ?? 0,
    updatedAt: d.updatedAt ?? Timestamp.now()
  } satisfies HogwattsHouse;
};

const mapTask = (snap: QueryDocumentSnapshot<DocumentData>): HogwattsTask => {
  const d = snap.data();
  return {
    id: snap.id,
    name: d.name ?? '',
    description: d.description ?? '',
    points: d.points ?? 0,
    sector: (d.sector ?? 'Automação') as MemberSectorEnumSimple,
    createdAt: d.createdAt ?? Timestamp.now()
  } satisfies HogwattsTask;
};

const mapSubmission = (
  snap: QueryDocumentSnapshot<DocumentData>
): HogwattsSubmission => {
  const d = snap.data();
  return {
    id: snap.id,
    taskId: d.taskId ?? '',
    taskName: d.taskName ?? '',
    taskPoints: d.taskPoints ?? 0,
    memberId: d.memberId ?? '',
    memberName: d.memberName ?? '',
    houseName: d.houseName ?? '',
    status: d.status ?? 'Pendente',
    note: d.note ?? '',
    proofFileUrl: d.proofFileUrl ?? null,
    reviewedBy: d.reviewedBy ?? '',
    reviewedAt: d.reviewedAt ?? null,
    createdAt: d.createdAt ?? Timestamp.now(),
    updatedAt: d.updatedAt ?? Timestamp.now()
  } satisfies HogwattsSubmission;
};

const mapMemberProfile = (
  snap: QueryDocumentSnapshot<DocumentData>
): HogwattsMemberProfile => {
  const d = snap.data();
  return {
    id: snap.id,
    memberId: d.memberId ?? '',
    memberName: d.memberName ?? '',
    houseName: d.houseName ?? '',
    createdAt: d.createdAt ?? Timestamp.now()
  } satisfies HogwattsMemberProfile;
};

// ── Repository ─────────────────────────────────────────────────────────────

class HogwattsRepository implements IHogwattsRepository {
  // ── Casas ──────────────────────────────────────────────────────────────

  async getAllHouses(): Promise<HogwattsHouse[]> {
    if (!firebaseDb) throw new FirebaseError('Firebase não está configurado');

    const snap = await getDocs(collection(firebaseDb, 'hogwattsHouses'));
    return snap.docs.map(mapHouse);
  }

  async getHouseByName(name: HogwattsHouseName): Promise<HogwattsHouse | null> {
    if (!firebaseDb) throw new FirebaseError('Firebase não está configurado');
    if (!name) throw new MissingParameterError(['name']);

    const q = query(
      collection(firebaseDb, 'hogwattsHouses'),
      where('name', '==', name)
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return mapHouse(snap.docs[0]);
  }

  async updateHousePoints(houseId: string, totalPoints: number): Promise<void> {
    if (!firebaseDb) throw new FirebaseError('Firebase não está configurado');
    if (!houseId) throw new MissingParameterError(['houseId']);

    const ref = doc(firebaseDb, 'hogwattsHouses', houseId);
    await updateDoc(ref, {
      totalPoints,
      updatedAt: serverTimestamp()
    });
  }

  // ── Tarefas ────────────────────────────────────────────────────────────

  async getAllTasks(): Promise<HogwattsTask[]> {
    if (!firebaseDb) throw new FirebaseError('Firebase não está configurado');

    const snap = await getDocs(collection(firebaseDb, 'hogwattsTasks'));
    return snap.docs.map(mapTask);
  }

  async getTaskById(taskId: string): Promise<HogwattsTask | null> {
    if (!firebaseDb) throw new FirebaseError('Firebase não está configurado');
    if (!taskId) throw new MissingParameterError(['taskId']);

    const ref = doc(firebaseDb, 'hogwattsTasks', taskId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;

    const d = snap.data();
    return {
      id: snap.id,
      name: d.name ?? '',
      description: d.description ?? '',
      points: d.points ?? 0,
      sector: (d.sector ?? 'Automação') as MemberSectorEnumSimple,
      createdAt: d.createdAt ?? Timestamp.now()
    };
  }

  async createTask(
    task: Omit<HogwattsTask, 'id' | 'createdAt'>
  ): Promise<void> {
    if (!firebaseDb) throw new FirebaseError('Firebase não está configurado');
    if (!task) throw new MissingParameterError(['task']);

    await addDoc(collection(firebaseDb, 'hogwattsTasks'), {
      ...task,
      createdAt: Timestamp.now()
    });
  }

  // ── Submissões ─────────────────────────────────────────────────────────

  async createSubmission(
    submission: Omit<HogwattsSubmission, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<void> {
    if (!firebaseDb) throw new FirebaseError('Firebase não está configurado');
    if (!submission) throw new MissingParameterError(['submission']);

    await addDoc(collection(firebaseDb, 'hogwattsSubmissions'), {
      ...submission,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
  }

  async getSubmissions(
    filters?: HogwattsSubmissionQuery
  ): Promise<HogwattsSubmission[]> {
    if (!firebaseDb) throw new FirebaseError('Firebase não está configurado');

    const constraints: QueryConstraint[] = [];

    if (filters?.memberId) {
      constraints.push(where('memberId', '==', filters.memberId));
    }
    if (filters?.houseName) {
      constraints.push(where('houseName', '==', filters.houseName));
    }
    if (filters?.status) {
      constraints.push(where('status', '==', filters.status));
    }

    const ref = collection(firebaseDb, 'hogwattsSubmissions');
    const q = constraints.length ? query(ref, ...constraints) : query(ref);
    const snap = await getDocs(q);
    return snap.docs.map(mapSubmission);
  }

  async getSubmissionById(
    submissionId: string
  ): Promise<HogwattsSubmission | null> {
    if (!firebaseDb) throw new FirebaseError('Firebase não está configurado');
    if (!submissionId) throw new MissingParameterError(['submissionId']);

    const ref = doc(firebaseDb, 'hogwattsSubmissions', submissionId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;

    const d = snap.data();
    return {
      id: snap.id,
      taskId: d.taskId ?? '',
      taskName: d.taskName ?? '',
      taskPoints: d.taskPoints ?? 0,
      memberId: d.memberId ?? '',
      memberName: d.memberName ?? '',
      houseName: d.houseName ?? '',
      status: d.status ?? 'Pendente',
      note: d.note ?? '',
      proofFileUrl: d.proofFileUrl ?? null,
      reviewedBy: d.reviewedBy ?? '',
      reviewedAt: d.reviewedAt ?? null,
      createdAt: d.createdAt ?? Timestamp.now(),
      updatedAt: d.updatedAt ?? Timestamp.now()
    };
  }

  async updateSubmissionStatus(
    submissionId: string,
    status: HogwattsSubmissionStatus,
    reviewedBy: string
  ): Promise<void> {
    if (!firebaseDb) throw new FirebaseError('Firebase não está configurado');
    if (!submissionId || !status)
      throw new MissingParameterError(['submissionId', 'status']);

    const ref = doc(firebaseDb, 'hogwattsSubmissions', submissionId);
    await updateDoc(ref, {
      status,
      reviewedBy,
      reviewedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  }

  // ── Perfil membro ↔ casa ──────────────────────────────────────────────

  async getMemberProfile(
    memberId: string
  ): Promise<HogwattsMemberProfile | null> {
    if (!firebaseDb) throw new FirebaseError('Firebase não está configurado');
    if (!memberId) throw new MissingParameterError(['memberId']);

    const q = query(
      collection(firebaseDb, 'hogwattsMembers'),
      where('memberId', '==', memberId)
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return mapMemberProfile(snap.docs[0]);
  }

  async getAllMemberProfiles(): Promise<HogwattsMemberProfile[]> {
    if (!firebaseDb) throw new FirebaseError('Firebase não está configurado');

    const snap = await getDocs(collection(firebaseDb, 'hogwattsMembers'));
    return snap.docs.map(mapMemberProfile);
  }

  async createMemberProfile(
    profile: Omit<HogwattsMemberProfile, 'id' | 'createdAt'>
  ): Promise<void> {
    if (!firebaseDb) throw new FirebaseError('Firebase não está configurado');
    if (!profile) throw new MissingParameterError(['profile']);

    await addDoc(collection(firebaseDb, 'hogwattsMembers'), {
      ...profile,
      createdAt: Timestamp.now()
    });
  }

  async updateMemberHouse(
    profileId: string,
    houseName: HogwattsHouseName
  ): Promise<void> {
    if (!firebaseDb) throw new FirebaseError('Firebase não está configurado');
    if (!profileId || !houseName)
      throw new MissingParameterError(['profileId', 'houseName']);

    const ref = doc(firebaseDb, 'hogwattsMembers', profileId);
    await updateDoc(ref, { houseName });
  }

  async deleteMemberProfile(profileId: string): Promise<void> {
    if (!firebaseDb) throw new FirebaseError('Firebase não está configurado');
    if (!profileId) throw new MissingParameterError(['profileId']);

    const ref = doc(firebaseDb, 'hogwattsMembers', profileId);
    const { deleteDoc } = await import('firebase/firestore');
    await deleteDoc(ref);
  }
}

const hogwattsRepository = new HogwattsRepository();
export default hogwattsRepository;
