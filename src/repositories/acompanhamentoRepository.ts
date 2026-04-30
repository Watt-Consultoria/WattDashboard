import {
  FirebaseError,
  MissingParameterError,
  ValidationError
} from '@/errors/repositoryErrors';
import { firebaseDb } from '@/lib/firebase/client';
import { firestoreDateToLabel } from '@/lib/firestore-date';
import type IAcompanhamentoRepository from '@/types/acompanhamento/acompanhamento-repository';
import type {
  AcompanhamentoActivityData,
  AcompanhamentoConflictingTask,
  AcompanhamentoMemberFormState,
  AcompanhamentoMemberInfo,
  AcompanhamentoMemberOption,
  AcompanhamentoMemberTask,
  AcompanhamentoProjectData,
  AcompanhamentoRepositoryProjectDetailData
} from '@/types/acompanhamento/acompanhamento';
import {
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch
} from 'firebase/firestore';

class AcompanhamentoRepository implements IAcompanhamentoRepository {
  private getDb() {
    if (!firebaseDb) {
      throw new FirebaseError('Firebase nao configurado');
    }
    return firebaseDb;
  }

  async createProject(project: Record<string, unknown>): Promise<void> {
    const db = this.getDb();
    if (!project) throw new MissingParameterError(['project']);

    const projectRef = doc(collection(db, 'projects'));
    await setDoc(projectRef, {
      ...project,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  }

  async updateProject(
    projectId: string,
    project: Record<string, unknown>
  ): Promise<void> {
    const db = this.getDb();
    if (!projectId || !project) {
      throw new MissingParameterError(['projectId', 'project']);
    }

    await updateDoc(doc(db, 'projects', projectId), {
      ...project,
      updatedAt: serverTimestamp()
    });
  }

  async deleteProject(projectId: string): Promise<void> {
    const db = this.getDb();
    if (!projectId) throw new MissingParameterError(['projectId']);

    const projectRef = doc(db, 'projects', projectId);
    const activitiesRef = collection(db, 'projects', projectId, 'activities');
    const activitiesSnapshot = await getDocs(activitiesRef);
    const batch = writeBatch(db);

    activitiesSnapshot.docs.forEach((activityDoc) => {
      batch.delete(activityDoc.ref);
    });
    batch.delete(projectRef);
    await batch.commit();
  }

  async createMember(member: AcompanhamentoMemberFormState): Promise<string> {
    const db = this.getDb();
    if (!member) throw new MissingParameterError(['member']);

    const memberRef = doc(collection(db, 'members'));
    await setDoc(memberRef, {
      id: memberRef.id,
      name: member.name,
      email: member.email,
      sector: member.sector,
      cpf: member.cpf,
      role: member.role,
      activity: 'Novo cadastro',
      status: 'online',
      isLeadership: member.role !== 'Consultor',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return memberRef.id;
  }

  async updateMember(
    memberId: string,
    member: Partial<AcompanhamentoMemberInfo>
  ): Promise<void> {
    const db = this.getDb();
    if (!memberId || !member) {
      throw new MissingParameterError(['memberId', 'member']);
    }

    const memberFields: Partial<AcompanhamentoMemberInfo> = { ...member };
    delete memberFields.id;
    delete memberFields.agendaTasks;
    delete memberFields.alerts;
    if (Object.keys(memberFields).length === 0) {
      throw new ValidationError('Nenhum campo para atualizar');
    }

    await updateDoc(doc(db, 'members', memberId), {
      ...memberFields,
      updatedAt: serverTimestamp()
    });
  }

  async getMemberById(
    memberId: string
  ): Promise<AcompanhamentoMemberInfo | null> {
    const db = this.getDb();
    if (!memberId) throw new MissingParameterError(['memberId']);

    const snapshot = await getDoc(doc(db, 'members', memberId));
    if (!snapshot.exists()) return null;

    const data = snapshot.data() as Partial<AcompanhamentoMemberInfo>;
    return {
      id: snapshot.id,
      name: data.name ?? '',
      email: data.email ?? '',
      sector: data.sector ?? '',
      cpf: data.cpf ?? '',
      role: data.role ?? '',
      activity: data.activity ?? '',
      status: data.status ?? '',
      isLeadership: data.isLeadership,
      tags: Array.isArray(data.tags) ? data.tags : [],
      agendaTasks: Array.isArray(data.agendaTasks) ? data.agendaTasks : [],
      alerts: Array.isArray(data.alerts) ? data.alerts : []
    };
  }

  async getMemberOptions(): Promise<AcompanhamentoMemberOption[]> {
    const db = this.getDb();
    const snapshot = await getDocs(
      query(collection(db, 'members'), orderBy('name', 'asc'))
    );

    return snapshot.docs.map((memberDoc) => {
      const data = memberDoc.data() as Partial<AcompanhamentoMemberOption>;
      return {
        id: memberDoc.id,
        name: data.name ?? 'Sem nome',
        role: data.role
      };
    });
  }

  async getMemberProjectTasks(
    memberId: string
  ): Promise<AcompanhamentoMemberTask[]> {
    const db = this.getDb();
    if (!memberId) throw new MissingParameterError(['memberId']);

    const activitiesQuery = query(
      collectionGroup(db, 'activities'),
      where('ownerId', '==', memberId)
    );
    const snapshot = await getDocs(activitiesQuery);

    return snapshot.docs.map((activityDoc) => {
      const data = activityDoc.data() as AcompanhamentoActivityData;
      const parentProjectId = activityDoc.ref.parent?.parent?.id;
      return {
        id: activityDoc.id,
        activityId: data.id ?? activityDoc.id,
        projectId: data.projectId ?? parentProjectId,
        projectName: data.projectName,
        source: 'project' as const,
        title: data.name ?? 'Atividade',
        description: data.description ?? '',
        due: firestoreDateToLabel(data.dueAt ?? ''),
        owner: data.owner ?? '',
        ownerId: data.ownerId,
        status: data.status ?? 'Em andamento',
        priority: data.priority ?? 'Media',
        updates: Array.isArray(data.updates) ? data.updates : []
      };
    });
  }

  async getProjectDetail(
    projectId: string
  ): Promise<AcompanhamentoRepositoryProjectDetailData | null> {
    const db = this.getDb();
    if (!projectId) throw new MissingParameterError(['projectId']);

    const projectRef = doc(db, 'projects', projectId);
    const projectSnapshot = await getDoc(projectRef);
    if (!projectSnapshot.exists()) return null;

    const activitiesSnapshot = await getDocs(
      collection(db, 'projects', projectId, 'activities')
    );

    return {
      project: {
        id: projectSnapshot.id,
        ...(projectSnapshot.data() as Omit<AcompanhamentoProjectData, 'id'>)
      },
      activities: activitiesSnapshot.docs.map((activityDoc) => ({
        id: activityDoc.id,
        ...(activityDoc.data() as Omit<AcompanhamentoActivityData, 'id'>)
      }))
    };
  }

  async getProjectActivity(
    projectId: string,
    activityId: string
  ): Promise<AcompanhamentoActivityData | null> {
    const db = this.getDb();
    if (!projectId || !activityId) {
      throw new MissingParameterError(['projectId', 'activityId']);
    }

    const activitySnapshot = await getDoc(
      doc(db, 'projects', projectId, 'activities', activityId)
    );
    if (!activitySnapshot.exists()) return null;

    return {
      id: activitySnapshot.id,
      ...(activitySnapshot.data() as Omit<AcompanhamentoActivityData, 'id'>)
    };
  }

  async createProjectActivity(
    projectId: string,
    activity: AcompanhamentoActivityData
  ): Promise<void> {
    const db = this.getDb();
    if (!projectId || !activity?.id) {
      throw new MissingParameterError(['projectId', 'activity.id']);
    }

    await setDoc(doc(db, 'projects', projectId, 'activities', activity.id), {
      ...activity,
      updatedAt: serverTimestamp()
    });
  }

  async updateProjectActivity(
    projectId: string,
    activityId: string,
    activity: Record<string, unknown>
  ): Promise<void> {
    const db = this.getDb();
    if (!projectId || !activityId || !activity) {
      throw new MissingParameterError(['projectId', 'activityId', 'activity']);
    }

    await updateDoc(doc(db, 'projects', projectId, 'activities', activityId), {
      ...activity,
      updatedAt: serverTimestamp()
    });
  }

  async deleteProjectActivity(
    projectId: string,
    activityId: string
  ): Promise<void> {
    const db = this.getDb();
    if (!projectId || !activityId) {
      throw new MissingParameterError(['projectId', 'activityId']);
    }

    await deleteDoc(doc(db, 'projects', projectId, 'activities', activityId));
  }

  async getMemberConflictTasks(
    memberId: string
  ): Promise<AcompanhamentoConflictingTask[]> {
    const db = this.getDb();
    if (!memberId) throw new MissingParameterError(['memberId']);

    const tasks: AcompanhamentoConflictingTask[] = [];
    const member = await this.getMemberById(memberId);

    if (Array.isArray(member?.agendaTasks)) {
      tasks.push(
        ...member.agendaTasks.map((task) => ({
          title: task.title,
          due: task.due,
          source: 'Agenda pessoal'
        }))
      );
    }

    const activitiesQuery = query(
      collectionGroup(db, 'activities'),
      where('ownerId', '==', memberId)
    );
    const activitiesSnapshot = await getDocs(activitiesQuery);
    activitiesSnapshot.docs.forEach((activityDoc) => {
      const data = activityDoc.data() as AcompanhamentoActivityData;
      const dueLabel = firestoreDateToLabel(data.dueAt);
      if (!dueLabel) return;

      tasks.push({
        title: data.name ?? 'Tarefa',
        due: dueLabel,
        source: data.projectName
          ? `Projeto: ${data.projectName}`
          : `Projeto: ${activityDoc.ref.parent?.parent?.id ?? 'Sem nome'}`
      });
    });

    const projectsSnapshot = await getDocs(collection(db, 'projects'));
    projectsSnapshot.docs.forEach((projectDoc) => {
      const data = projectDoc.data() as AcompanhamentoProjectData;
      if (!Array.isArray(data.Activities)) return;

      data.Activities.forEach((activity) => {
        const dueLabel = firestoreDateToLabel(activity.dueAt);
        if (activity.ownerId !== memberId || !dueLabel) return;

        tasks.push({
          title: activity.name ?? 'Tarefa',
          due: dueLabel,
          source: `Projeto: ${data.name ?? 'Sem nome'}`
        });
      });
    });

    return tasks;
  }
}

const acompanhamentoRepository = new AcompanhamentoRepository();
export default acompanhamentoRepository;
