import type {
  HogwattsHouse,
  HogwattsTask,
  HogwattsSubmission,
  HogwattsSubmissionStatus,
  HogwattsMemberProfile,
  HogwattsSubmissionQuery,
  HogwattsHouseName
} from './hogwatts';

export default interface IHogwattsRepository {
  // Casas
  getAllHouses(): Promise<HogwattsHouse[]>;
  getHouseByName(name: HogwattsHouseName): Promise<HogwattsHouse | null>;
  updateHousePoints(houseId: string, totalPoints: number): Promise<void>;

  // Tarefas
  getAllTasks(): Promise<HogwattsTask[]>;
  getTaskById(taskId: string): Promise<HogwattsTask | null>;
  createTask(task: Omit<HogwattsTask, 'id' | 'createdAt'>): Promise<void>;

  // Submissões
  createSubmission(
    submission: Omit<HogwattsSubmission, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<void>;
  getSubmissions(
    filters?: HogwattsSubmissionQuery
  ): Promise<HogwattsSubmission[]>;
  getSubmissionById(submissionId: string): Promise<HogwattsSubmission | null>;
  updateSubmissionStatus(
    submissionId: string,
    status: HogwattsSubmissionStatus,
    reviewedBy: string
  ): Promise<void>;

  // Perfil membro ↔ casa
  getMemberProfile(memberId: string): Promise<HogwattsMemberProfile | null>;
  getAllMemberProfiles(): Promise<HogwattsMemberProfile[]>;
  createMemberProfile(
    profile: Omit<HogwattsMemberProfile, 'id' | 'createdAt'>
  ): Promise<void>;
  updateMemberHouse(
    profileId: string,
    houseName: HogwattsHouseName
  ): Promise<void>;
  deleteMemberProfile(profileId: string): Promise<void>;
}
