import type {
  AcompanhamentoActivityData,
  AcompanhamentoConflictingTask,
  AcompanhamentoMemberFormState,
  AcompanhamentoMemberInfo,
  AcompanhamentoMemberOption,
  AcompanhamentoMemberTask,
  AcompanhamentoProjectData,
  AcompanhamentoRepositoryProjectDetailData
} from './acompanhamento';

export default interface IAcompanhamentoRepository {
  createProject(project: Record<string, unknown>): Promise<void>;

  updateProject(
    projectId: string,
    project: Record<string, unknown>
  ): Promise<void>;

  deleteProject(projectId: string): Promise<void>;

  createMember(member: AcompanhamentoMemberFormState): Promise<string>;

  updateMember(
    memberId: string,
    member: Partial<AcompanhamentoMemberInfo>
  ): Promise<void>;

  getMemberById(memberId: string): Promise<AcompanhamentoMemberInfo | null>;

  getMemberOptions(): Promise<AcompanhamentoMemberOption[]>;

  getMemberProjectTasks(memberId: string): Promise<AcompanhamentoMemberTask[]>;

  getProjectDetail(
    projectId: string
  ): Promise<AcompanhamentoRepositoryProjectDetailData | null>;

  getProjectActivity(
    projectId: string,
    activityId: string
  ): Promise<AcompanhamentoActivityData | null>;

  createProjectActivity(
    projectId: string,
    activity: AcompanhamentoActivityData
  ): Promise<void>;

  updateProjectActivity(
    projectId: string,
    activityId: string,
    activity: Record<string, unknown>
  ): Promise<void>;

  deleteProjectActivity(projectId: string, activityId: string): Promise<void>;

  getMemberConflictTasks(memberId: string): Promise<AcompanhamentoConflictingTask[]>;
}
