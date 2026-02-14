import { Activity } from './activity';

export default interface IActivityRepository {
  getProjectActivities(projectId: string): Promise<Activity[]>;

  updateProjectActivity(
    projectId: string,
    activityId: string,
    activity: Partial<Omit<Activity, 'id' | 'issuedAt'>>
  ): Promise<void>;

  createProjectActivity(
    projectId: string,
    activity: Omit<Activity, 'id' | 'issuedAt'>
  ): Promise<void>;

  getMemberProjectActivities(memberId: string): Promise<Activity[]>;

  deleteProjectActivity(projectId: string, activityId: string): Promise<void>;
}
