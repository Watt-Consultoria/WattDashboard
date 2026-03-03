import hogwattsRepository from '@/repositories/hogwattsRepository';
import memberRepository from '@/repositories/memberRepository';
import { ValidationError } from '@/errors/serviceErrors';
import type {
  AssignMemberInput,
  CreateSubmissionInput,
  CreateTaskInput,
  HogwattsHouse,
  HogwattsMemberProfile,
  HogwattsRanking,
  HogwattsSubmission,
  HogwattsSubmissionQuery,
  HogwattsTask,
  ReviewSubmissionInput
} from '@/types/hogwatts/hogwatts';

class HogwattsService {
  // ── Ranking / Casas ────────────────────────────────────────────────────

  async getRanking(): Promise<HogwattsRanking> {
    const houses = await hogwattsRepository.getAllHouses();
    const sorted = [...houses].sort((a, b) => b.totalPoints - a.totalPoints);
    return { houses: sorted };
  }

  async getHouses(): Promise<HogwattsHouse[]> {
    return await hogwattsRepository.getAllHouses();
  }

  // ── Tarefas ────────────────────────────────────────────────────────────

  async getTasks(): Promise<HogwattsTask[]> {
    return await hogwattsRepository.getAllTasks();
  }

  async createTask(input: CreateTaskInput): Promise<void> {
    const name = input.name?.trim();
    if (!name) throw new ValidationError('Informe o nome da tarefa');

    const description = input.description?.trim();
    if (!description)
      throw new ValidationError('Informe a descrição da tarefa');

    const points = input.points;
    if (!points || points <= 0 || !Number.isFinite(points))
      throw new ValidationError('Informe uma pontuação válida (maior que 0)');

    // Verificar duplicatas por nome
    const existingTasks = await hogwattsRepository.getAllTasks();
    const duplicate = existingTasks.find(
      (t) => t.name.toLowerCase() === name.toLowerCase()
    );
    if (duplicate) {
      throw new ValidationError(
        `Já existe uma tarefa com o nome "${duplicate.name}"`
      );
    }

    await hogwattsRepository.createTask({
      name,
      description,
      points: Math.round(points)
    });
  }

  // ── Submissão de tarefa ────────────────────────────────────────────────

  async submitTask(input: CreateSubmissionInput): Promise<void> {
    const memberId = input.memberId?.trim();
    if (!memberId) throw new ValidationError('Membro inválido');

    const taskId = input.taskId?.trim();
    if (!taskId) throw new ValidationError('Tarefa inválida');

    // Valida existência do membro no sistema
    const member = await memberRepository.getMemberById(memberId);
    if (!member) throw new ValidationError('Membro não encontrado no sistema');

    // Valida vínculo do membro com uma casa
    const profile = await hogwattsRepository.getMemberProfile(memberId);
    if (!profile)
      throw new ValidationError(
        'Membro não está vinculado a nenhuma casa do Hogwatts'
      );

    // Valida existência da tarefa
    const task = await hogwattsRepository.getTaskById(taskId);
    if (!task) throw new ValidationError('Tarefa não encontrada');

    // Prevenir submissão duplicada pendente (mesma tarefa + mesmo membro + status Pendente)
    const existing = await hogwattsRepository.getSubmissions({
      memberId,
      status: 'Pendente'
    });
    const duplicatePending = existing.find((s) => s.taskId === taskId);
    if (duplicatePending) {
      throw new ValidationError(
        'Já existe uma submissão pendente para esta tarefa'
      );
    }

    await hogwattsRepository.createSubmission({
      taskId,
      taskName: task.name,
      taskPoints: task.points,
      memberId,
      memberName: member.name ?? '',
      houseName: profile.houseName,
      status: 'Pendente',
      note: input.note?.trim() ?? '',
      reviewedBy: '',
      reviewedAt: null
    });
  }

  // ── Listagem de submissões ─────────────────────────────────────────────

  async getSubmissions(
    filters?: HogwattsSubmissionQuery
  ): Promise<HogwattsSubmission[]> {
    const submissions = await hogwattsRepository.getSubmissions(filters);
    return [...submissions].sort((a, b) => {
      const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return bTime - aTime;
    });
  }

  async getPendingSubmissions(): Promise<HogwattsSubmission[]> {
    return this.getSubmissions({ status: 'Pendente' });
  }

  // ── Aprovação / Rejeição ───────────────────────────────────────────────

  async reviewSubmission(input: ReviewSubmissionInput): Promise<void> {
    const { submissionId, status, reviewerId } = input;

    if (!submissionId) throw new ValidationError('Submissão inválida');
    if (!reviewerId) throw new ValidationError('Revisor inválido');
    if (status !== 'Aprovado' && status !== 'Recusado') {
      throw new ValidationError('Status de revisão inválido');
    }

    const submission = await hogwattsRepository.getSubmissionById(submissionId);
    if (!submission) throw new ValidationError('Submissão não encontrada');

    // Impedir re-avaliação de submissões já revisadas
    if (submission.status !== 'Pendente') {
      throw new ValidationError('Essa submissão já foi avaliada');
    }

    // Atualiza status da submissão
    await hogwattsRepository.updateSubmissionStatus(
      submissionId,
      status,
      reviewerId
    );

    // Se aprovada, somar pontos à casa correspondente
    if (status === 'Aprovado') {
      await this.addPointsToHouse(submission.houseName, submission.taskPoints);
    }
  }

  // ── Pontuação interna ──────────────────────────────────────────────────

  private async addPointsToHouse(
    houseName: string,
    points: number
  ): Promise<void> {
    const house = await hogwattsRepository.getHouseByName(
      houseName as HogwattsHouse['name']
    );
    if (!house) {
      throw new ValidationError(`Casa "${houseName}" não encontrada`);
    }

    const newTotal = house.totalPoints + points;
    await hogwattsRepository.updateHousePoints(house.id, newTotal);
  }

  // ── Recalcular pontuação (utilitário de consistência) ──────────────────

  async recalculateHousePoints(): Promise<void> {
    const houses = await hogwattsRepository.getAllHouses();
    const approvedSubmissions = await hogwattsRepository.getSubmissions({
      status: 'Aprovado'
    });

    const pointsMap = new Map<string, number>();
    for (const house of houses) {
      pointsMap.set(house.name, 0);
    }

    for (const sub of approvedSubmissions) {
      const current = pointsMap.get(sub.houseName) ?? 0;
      pointsMap.set(sub.houseName, current + sub.taskPoints);
    }

    for (const house of houses) {
      const newTotal = pointsMap.get(house.name) ?? 0;
      if (house.totalPoints !== newTotal) {
        await hogwattsRepository.updateHousePoints(house.id, newTotal);
      }
    }
  }

  // ── Atribuição de membros a casas ──────────────────────────────────────

  async getMemberProfiles(): Promise<HogwattsMemberProfile[]> {
    return await hogwattsRepository.getAllMemberProfiles();
  }

  async assignMemberToHouse(input: AssignMemberInput): Promise<void> {
    const memberId = input.memberId?.trim();
    if (!memberId) throw new ValidationError('Membro inválido');

    const houseName = input.houseName;
    if (!houseName) throw new ValidationError('Casa inválida');

    const validHouses = ['Nexus', 'Lumina', 'Voltus'];
    if (!validHouses.includes(houseName)) {
      throw new ValidationError(
        `Casa "${houseName}" não existe. Casas válidas: ${validHouses.join(', ')}`
      );
    }

    // Valida existência do membro no sistema
    const member = await memberRepository.getMemberById(memberId);
    if (!member) throw new ValidationError('Membro não encontrado no sistema');

    // Verifica se o membro já está vinculado a uma casa
    const existingProfile = await hogwattsRepository.getMemberProfile(memberId);

    if (existingProfile) {
      if (existingProfile.houseName === houseName) {
        throw new ValidationError(`Membro já pertence à casa ${houseName}`);
      }
      // Atualiza a casa do membro
      await hogwattsRepository.updateMemberHouse(existingProfile.id, houseName);
    } else {
      // Cria novo perfil
      await hogwattsRepository.createMemberProfile({
        memberId,
        memberName: member.name ?? '',
        houseName
      });
    }
  }

  async removeMemberFromHouse(memberId: string): Promise<void> {
    if (!memberId?.trim()) throw new ValidationError('Membro inválido');

    const profile = await hogwattsRepository.getMemberProfile(memberId);
    if (!profile) {
      throw new ValidationError(
        'Membro não está vinculado a nenhuma casa do Hogwatts'
      );
    }

    await hogwattsRepository.deleteMemberProfile(profile.id);
  }
}

export default new HogwattsService();
