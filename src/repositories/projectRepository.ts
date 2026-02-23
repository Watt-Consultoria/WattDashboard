import { MissingParameterError } from '@/errors/repositoryErrors';
import { firebaseDb } from '@/lib/firebase/client';
import type { Project } from '@/types/project/project';
import type IProjectRepository from '@/types/project/project-repository';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  Timestamp,
  updateDoc,
  writeBatch
} from 'firebase/firestore';
import activityRepository from './activityRepository';

class ProjectRepository implements IProjectRepository {
  async getProjects(): Promise<Project[]> {
    if (!firebaseDb) throw new Error('Firebase não está configurado');

    const projectsRef = collection(firebaseDb, 'projects');
    const projectsSnap = await getDocs(projectsRef);

    const projects = await Promise.all(
      projectsSnap.docs.map(async (docSnap) => {
        const projectData = docSnap.data();

        const activities = await activityRepository.getProjectActivities(
          docSnap.id
        );

        return {
          id: docSnap.id,
          area: projectData.area ?? 'Indefinido',
          client: projectData.client ?? '',
          createdAt: projectData.createdAt ?? Timestamp.now(),
          health: projectData.health ?? 'Indefinido',
          managerId: projectData.managerId ?? '',
          manager: projectData.manager ?? '',
          name: projectData.name ?? '',
          next: projectData.next ?? '',
          start: projectData.start ?? Timestamp.now(),
          status: projectData.status ?? 'Indefinido',
          tipo: projectData.tipo ?? '',
          updatedAt: projectData.updatedAt ?? Timestamp.now(),
          updatedLabel: projectData.updatedLabel ?? '',
          value: projectData.value ?? 0,
          activities
        } satisfies Project;
      })
    );

    return projects;
  }

  async getProjectById(id: string): Promise<Project | null> {
    if (!firebaseDb) throw new Error('Firebase não está configurado');
    if (!id) throw new MissingParameterError(['id']);

    const projectRef = doc(firebaseDb, 'projects', id);
    const projectSnap = await getDoc(projectRef);

    if (!projectSnap.exists()) return null;

    const projectData = projectSnap.data();
    const activities = await activityRepository.getProjectActivities(id);

    return {
      id: projectSnap.id,
      area: projectData.area ?? 'Sem área definida',
      client: projectData.client ?? '',
      createdAt: projectData.createdAt ?? Timestamp.now(),
      health: projectData.health ?? 'Sem saúde definida',
      managerId: projectData.managerId ?? '',
      manager: projectData.manager ?? '',
      name: projectData.name ?? '',
      next: projectData.next ?? '',
      start: projectData.start ?? Timestamp.now(),
      status: projectData.status ?? 'Sem status definido',
      tipo: projectData.tipo ?? '',
      updatedAt: projectData.updatedAt ?? Timestamp.now(),
      updatedLabel: projectData.updatedLabel ?? '',
      value: projectData.value ?? 0,
      activities
    } satisfies Project;
  }

  async createProject(project: Project): Promise<void> {
    if (!firebaseDb) throw new Error('Firebase não está configurado');
    if (!project) throw new MissingParameterError(['project']);

    const projectsRef = collection(firebaseDb, 'projects');
    await addDoc(projectsRef, {
      area: project.area ?? 'Indefinido',
      client: project.client ?? '',
      createdAt: project.createdAt ?? Timestamp.now(),
      health: project.health ?? 'Indefinido',
      managerId: project.managerId ?? '',
      manager: project.manager ?? '',
      name: project.name ?? '',
      next: project.next ?? '',
      start: project.start ?? Timestamp.now(),
      status: project.status ?? 'Indefinido',
      tipo: project.tipo ?? '',
      updatedAt: Timestamp.now(),
      updatedLabel: project.updatedLabel ?? '',
      value: project.value ?? 0
    } satisfies Omit<Project, 'id' | 'activities'>);
  }

  async updateProject(
    id: string,
    project: Partial<Omit<Project, 'activities' | 'id' | 'createdAt'>>
  ): Promise<void> {
    // Note: activities are managed separately, so they are not included in the update payload
    if (!firebaseDb) throw new Error('Firebase não está configurado');
    if (!id || !project) throw new MissingParameterError(['id', 'project']);

    const projectRef = doc(firebaseDb, 'projects', id);
    await updateDoc(projectRef, project);
  }

  async deleteProject(id: string): Promise<void> {
    if (!firebaseDb) throw new Error('Firebase não está configurado');
    if (!id) throw new MissingParameterError(['id']);

    const projectRef = doc(firebaseDb, 'projects', id);

    const activitiesCol = collection(firebaseDb, 'projects', id, 'activities');
    const activitiesSnap = await getDocs(activitiesCol);

    const batch = writeBatch(firebaseDb);

    activitiesSnap.docs.forEach((d) => batch.delete(d.ref));

    batch.delete(projectRef);

    await batch.commit();
  }
}

const projectRepository = new ProjectRepository();
export default projectRepository;
