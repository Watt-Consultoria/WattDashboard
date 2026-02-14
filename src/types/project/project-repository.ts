import type { Project } from './project';

export default interface IProjectRepository {
  getProjects(): Promise<Project[]>;

  getProjectById(id: string): Promise<Project | null>;

  createProject(project: Project): Promise<void>;

  updateProject(
    id: string,
    project: Partial<Omit<Project, 'activities' | 'id' | 'createdAt'>>
  ): Promise<void>;

  deleteProject(id: string): Promise<void>;
}
