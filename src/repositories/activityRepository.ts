import {
  FirebaseError,
  MissingParameterError
} from '@/errors/repositoryErrors';
import { firebaseDb } from '@/lib/firebase/client';
import { Activity, activityDefaultValues } from '@/types/activity/activity';
import IActivityRepository from '@/types/activity/activity-repository';
import {
  addDoc,
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDocs,
  query,
  Timestamp,
  updateDoc,
  where
} from 'firebase/firestore';

class ActivityRepository implements IActivityRepository {
  async getProjectActivities(projectId: string): Promise<Activity[]> {
    if (!firebaseDb) throw new FirebaseError('Firebase não está configurado');
    if (!projectId) throw new MissingParameterError(['projectId']);

    const activitiesRef = collection(
      firebaseDb,
      'projects',
      projectId,
      'activities'
    );
    const activitiesSnap = await getDocs(activitiesRef);

    return activitiesSnap.docs.map((docSnap) => {
      const activityData = docSnap.data();

      return {
        id: docSnap.id,
        description: activityData.description ?? '',
        dueAt: activityData.dueAt ?? Timestamp.now(),
        issuedAt: activityData.issuedAt ?? Timestamp.now(),
        name: activityData.name ?? '',
        owner: activityData.owner ?? '',
        ownerId: activityData.ownerId ?? '',
        priority: activityData.priority ?? activityDefaultValues.PRIORITY,
        status: activityData.status ?? activityDefaultValues.STATUS,
        updates: Array.isArray(activityData.updates)
          ? activityData.updates
          : undefined
      } satisfies Activity;
    });
  }

  async updateProjectActivity(
    projectId: string,
    activityId: string,
    activity: Partial<Omit<Activity, 'id' | 'issuedAt'>>
  ): Promise<void> {
    if (!firebaseDb) throw new FirebaseError('Firebase não está configurado');
    if (!projectId || !activityId || !activity)
      throw new MissingParameterError(['projectId', 'activityId', 'activity']);

    const activityRef = doc(
      firebaseDb,
      'projects',
      projectId,
      'activities',
      activityId
    );
    await updateDoc(activityRef, activity);
  }

  async createProjectActivity(
    projectId: string,
    activity: Omit<Activity, 'id' | 'issuedAt'>
  ): Promise<void> {
    if (!firebaseDb) throw new FirebaseError('Firebase não está configurado');
    if (!projectId || !activity)
      throw new MissingParameterError(['projectId', 'activity']);

    const activitiesRef = collection(
      firebaseDb,
      'projects',
      projectId,
      'activities'
    );

    const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
    await addDoc(activitiesRef, {
      description: activity.description ?? '',
      dueAt: activity.dueAt ?? Timestamp.fromMillis(Date.now() + sevenDaysInMs),
      issuedAt: Timestamp.now(),
      name: activity.name ?? '',
      owner: activity.owner ?? '',
      ownerId: activity.ownerId ?? '',
      priority: activity.priority ?? 'Média',
      status: activity.status ?? 'Sem status definido'
    });
  }

  async deleteProjectActivity(
    projectId: string,
    activityId: string
  ): Promise<void> {
    if (!firebaseDb) throw new FirebaseError('Firebase não está configurado');
    if (!projectId || !activityId)
      throw new MissingParameterError(['projectId', 'activityId']);

    const activityRef = doc(
      firebaseDb,
      'projects',
      projectId,
      'activities',
      activityId
    );

    await deleteDoc(activityRef);
  }

  async getMemberProjectActivities(memberId: string): Promise<Activity[]> {
    if (!firebaseDb) throw new FirebaseError('Firebase não está configurado');
    if (!memberId) throw new MissingParameterError(['memberId']);

    const q = query(
      collectionGroup(firebaseDb, 'activities'),
      where('ownerId', '==', memberId)
    );

    const snap = await getDocs(q);
    return snap.docs.map((docSnap) => {
      const activityData = docSnap.data();
      const projectId =
        activityData.projectId ?? docSnap.ref.parent?.parent?.id ?? '';

      return {
        id: docSnap.id,
        description: activityData.description ?? '',
        dueAt: activityData.dueAt ?? Timestamp.now(),
        issuedAt: activityData.issuedAt ?? Timestamp.now(),
        name: activityData.name ?? '',
        owner: activityData.owner ?? '',
        ownerId: activityData.ownerId ?? '',
        priority: activityData.priority ?? activityDefaultValues.PRIORITY,
        status: activityData.status ?? activityDefaultValues.STATUS,
        projectId: projectId || undefined,
        projectName: activityData.projectName ?? undefined,
        updates: Array.isArray(activityData.updates)
          ? activityData.updates
          : undefined
      } satisfies Activity;
    });
  }
}

const activityRepository = new ActivityRepository();
export default activityRepository;
