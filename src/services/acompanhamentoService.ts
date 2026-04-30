import { ValidationError } from '@/errors/repositoryErrors';
import {
  firestoreDateToDate,
  firestoreDateToLabel,
  inputDateToTimestamp
} from '@/lib/firestore-date';
import acompanhamentoRepository from '@/repositories/acompanhamentoRepository';
import type {
  AcompanhamentoActivity,
  AcompanhamentoActivityData,
  AcompanhamentoActivityFormState,
  AcompanhamentoActor,
  AcompanhamentoConflictResult,
  AcompanhamentoConflictingTask,
  AcompanhamentoMemberCard,
  AcompanhamentoMemberEditFormState,
  AcompanhamentoMemberFormState,
  AcompanhamentoMemberInfo,
  AcompanhamentoMemberOption,
  AcompanhamentoMemberTask,
  AcompanhamentoOccupancyMetrics,
  AcompanhamentoProjectCard,
  AcompanhamentoProjectData,
  AcompanhamentoProjectDetail,
  AcompanhamentoProjectFormState,
  AcompanhamentoProjectInfo,
  AcompanhamentoServiceResult
} from '@/types/acompanhamento/acompanhamento';
import { Timestamp } from 'firebase/firestore';

const MEMBER_MANAGEMENT_DENIED =
  'Apenas Assessor ou Presidente do setor Executivo podem alterar informacoes de outros membros.';

class AcompanhamentoService {
  normalizeValue(value?: string | null): string {
    return (
      value
        ?.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') ?? ''
    );
  }

  canManageOtherMembers(actor?: AcompanhamentoActor): boolean {
    if (!actor?.id) return false;

    const role = this.normalizeValue(actor.role);
    const sector = this.normalizeValue(actor.sector);
    return (
      sector === 'executivo' && (role === 'assessor' || role === 'presidente')
    );
  }

  canManageMemberInformation(
    actor: AcompanhamentoActor | undefined,
    targetMemberId?: string | null
  ): boolean {
    if (!actor?.id || !targetMemberId) return false;
    return actor.id === targetMemberId || this.canManageOtherMembers(actor);
  }

  assertCanManageOtherMembers(actor?: AcompanhamentoActor): void {
    if (!this.canManageOtherMembers(actor)) {
      throw new ValidationError(MEMBER_MANAGEMENT_DENIED);
    }
  }

  assertCanManageMemberInformation(
    actor: AcompanhamentoActor | undefined,
    targetMemberId?: string | null
  ): void {
    if (!this.canManageMemberInformation(actor, targetMemberId)) {
      throw new ValidationError(MEMBER_MANAGEMENT_DENIED);
    }
  }

  mapProjectCard(project: AcompanhamentoProjectData): AcompanhamentoProjectCard {
    return {
      id: project.id,
      name: project.name ?? 'Projeto sem nome',
      status: project.status ?? 'Planejamento',
      updated: firestoreDateToLabel(project.updatedAt) || '---',
      health: project.health ?? 'Ok',
      area: project.area,
      tipo: project.tipo,
      client: project.client,
      manager: project.manager,
      managerId: project.managerId,
      start: firestoreDateToLabel(project.start),
      next: project.next,
      value: project.value?.toString()
    };
  }

  mapMemberCard(
    member: Partial<AcompanhamentoMemberInfo>
  ): AcompanhamentoMemberCard {
    return {
      id: member.id ?? '',
      name: member.name ?? 'Sem nome',
      email: member.email,
      sector: member.sector,
      cpf: member.cpf,
      role: member.role ?? 'Sem cargo',
      activity: member.activity ?? 'Sem atividade',
      status: member.status ?? 'offline',
      isLeadership: member.isLeadership,
      tags: member.tags ?? []
    };
  }

  isLeadershipMember(member: Pick<AcompanhamentoMemberCard, 'role'>): boolean {
    return this.normalizeValue(member.role) !== 'consultor';
  }

  getScopedMembers<T extends { sector?: string }>(
    members: T[],
    areaFilter: string
  ): T[] {
    if (areaFilter === 'Geral') return members;
    const selectedSector = this.normalizeValue(areaFilter);
    return members.filter(
      (member) => this.normalizeValue(member.sector) === selectedSector
    );
  }

  parseAgendaDueDate(value?: string): Date | null {
    return firestoreDateToDate(value);
  }

  calculateOccupancyMetrics(params: {
    areaFilter: string;
    members: Array<Partial<AcompanhamentoMemberInfo> & { id: string }>;
    projects: AcompanhamentoProjectData[];
  }): AcompanhamentoOccupancyMetrics {
    const scopedMembers = this.getScopedMembers(
      params.members,
      params.areaFilter
    );
    const memberIds = new Set(scopedMembers.map((member) => member.id));
    const occupiedIds = new Set<string>();
    const today = new Date();
    const startOfToday = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    const endDate = new Date(startOfToday);
    endDate.setDate(endDate.getDate() + 7);

    params.projects.forEach((project) => {
      const activities = project.Activities;
      if (!Array.isArray(activities)) return;

      activities.forEach((activity) => {
        const status = this.normalizeValue((activity as any)?.status ?? '');
        if (
          activity?.ownerId &&
          memberIds.has(activity.ownerId) &&
          status !== 'bloqueado' &&
          status !== 'concluido'
        ) {
          occupiedIds.add(activity.ownerId);
        }
      });
    });

    scopedMembers.forEach((member) => {
      const agendaTasks = member.agendaTasks;
      if (
        Array.isArray(agendaTasks) &&
        agendaTasks.some((task) => {
          const priority = this.normalizeValue(task?.priority ?? '');
          if (priority !== 'alta') return false;

          const status = this.normalizeValue(task?.status ?? '');
          if (status === 'bloqueado' || status === 'concluido') return false;

          const dueDate = this.parseAgendaDueDate(task?.due);
          return Boolean(
            dueDate && dueDate >= startOfToday && dueDate <= endDate
          );
        })
      ) {
        occupiedIds.add(member.id);
      }
    });

    const totalMembers = scopedMembers.length;
    const occupiedCount = occupiedIds.size;
    const availableCount = Math.max(totalMembers - occupiedCount, 0);
    const occupiedPercent =
      totalMembers === 0 ? 0 : Math.round((occupiedCount / totalMembers) * 100);

    return {
      totalMembers,
      occupiedCount,
      availableCount,
      occupiedPercent
    };
  }

  parseProjectValue(value: string): number {
    if (!value) return 0;
    const cleanValue = value
      .replace(/R\$/g, '')
      .replace(/\s/g, '')
      .replace(/\./g, '')
      .replace(',', '.');
    const parsed = Number.parseFloat(cleanValue);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  async saveProject(params: {
    projectId?: string | null;
    form: AcompanhamentoProjectFormState;
    startDate?: Date;
    managers: AcompanhamentoMemberCard[];
  }): Promise<void> {
    const { projectId, form, startDate, managers } = params;

    if (!form.name.trim()) {
      throw new ValidationError('Informe o nome do projeto.');
    }
    if (!form.managerId) {
      throw new ValidationError('Selecione um responsavel.');
    }

    const selectedManager = managers.find(
      (member) => member.id === form.managerId
    );
    if (!selectedManager) {
      throw new ValidationError('Selecione um responsavel valido.');
    }

    const projectPayload = {
      name: form.name.trim(),
      status: form.status,
      health: form.health,
      area: form.area,
      tipo: form.tipo,
      client: form.client.trim(),
      manager: selectedManager.name,
      managerId: form.managerId,
      start: startDate ? Timestamp.fromDate(startDate) : null,
      next: form.next.trim(),
      value: this.parseProjectValue(form.value.trim()),
      updatedLabel: 'agora'
    };

    if (projectId) {
      await acompanhamentoRepository.updateProject(projectId, projectPayload);
      return;
    }

    await acompanhamentoRepository.createProject(projectPayload);
  }

  async deleteProject(projectId: string): Promise<void> {
    await acompanhamentoRepository.deleteProject(projectId);
  }

  async createMember(
    actor: AcompanhamentoActor | undefined,
    form: AcompanhamentoMemberFormState
  ): Promise<string> {
    this.assertCanManageOtherMembers(actor);
    const member = this.validateMemberForm(form);
    return acompanhamentoRepository.createMember(member);
  }

  async updateMemberInfo(
    actor: AcompanhamentoActor | undefined,
    memberId: string,
    form: AcompanhamentoMemberEditFormState
  ): Promise<AcompanhamentoMemberInfo> {
    this.assertCanManageMemberInformation(actor, memberId);
    const member = this.validateMemberForm(form);
    const tags = Array.isArray(form.tags)
      ? form.tags.map((tag) => tag.trim()).filter(Boolean)
      : [];

    const payload = {
      ...member,
      tags
    };

    await acompanhamentoRepository.updateMember(memberId, payload);
    return {
      id: memberId,
      ...payload
    };
  }

  async addTagToMember(
    actor: AcompanhamentoActor | undefined,
    memberId: string,
    tag: string
  ): Promise<void> {
    this.assertCanManageMemberInformation(actor, memberId);
    const trimmedTag = this.validateTag(tag);
    const member = await acompanhamentoRepository.getMemberById(memberId);
    if (!member) throw new ValidationError('Membro nao encontrado');

    const currentTags = member.tags ?? [];
    if (currentTags.includes(trimmedTag)) {
      throw new ValidationError('Tag ja existe para este membro');
    }

    await acompanhamentoRepository.updateMember(memberId, {
      tags: [...currentTags, trimmedTag]
    });
  }

  async removeTagFromMember(
    actor: AcompanhamentoActor | undefined,
    memberId: string,
    tag: string
  ): Promise<void> {
    this.assertCanManageMemberInformation(actor, memberId);
    const trimmedTag = this.validateTag(tag);
    const member = await acompanhamentoRepository.getMemberById(memberId);
    if (!member) throw new ValidationError('Membro nao encontrado');

    await acompanhamentoRepository.updateMember(memberId, {
      tags: (member.tags ?? []).filter((currentTag) => currentTag !== trimmedTag)
    });
  }

  async addTagToMultipleMembers(
    actor: AcompanhamentoActor | undefined,
    memberIds: string[],
    tag: string
  ): Promise<AcompanhamentoServiceResult> {
    return this.updateTagForMultipleMembers(actor, memberIds, tag, 'add');
  }

  async removeTagFromMultipleMembers(
    actor: AcompanhamentoActor | undefined,
    memberIds: string[],
    tag: string
  ): Promise<AcompanhamentoServiceResult> {
    return this.updateTagForMultipleMembers(actor, memberIds, tag, 'remove');
  }

  async getMemberDetail(memberId: string): Promise<{
    member: AcompanhamentoMemberInfo;
    agendaTasks: AcompanhamentoMemberTask[];
    alerts: AcompanhamentoMemberInfo['alerts'];
  } | null> {
    const member = await acompanhamentoRepository.getMemberById(memberId);
    if (!member) return null;

    return {
      member,
      agendaTasks: (member.agendaTasks ?? []).map((task) => ({
        ...task,
        source: 'agenda' as const
      })),
      alerts: member.alerts ?? []
    };
  }

  async getMemberOptions(): Promise<AcompanhamentoMemberOption[]> {
    return acompanhamentoRepository.getMemberOptions();
  }

  async getMemberProjectTasks(
    memberId: string
  ): Promise<AcompanhamentoMemberTask[]> {
    return acompanhamentoRepository.getMemberProjectTasks(memberId);
  }

  async updateMemberProjectTask(
    activeTask: AcompanhamentoMemberTask,
    form: AcompanhamentoActivityFormState
  ): Promise<AcompanhamentoMemberTask> {
    if (!activeTask?.id) {
      throw new ValidationError('Atividade nao encontrada.');
    }
    if (!form.name.trim()) {
      throw new ValidationError('Informe o nome da atividade.');
    }
    if (!form.owner.trim()) {
      throw new ValidationError('Informe o responsavel.');
    }
    if (!activeTask.projectId) {
      throw new ValidationError('Projeto da atividade nao encontrado.');
    }

    const activityId = activeTask.activityId ?? activeTask.id;
    const existing = await acompanhamentoRepository.getProjectActivity(
      activeTask.projectId,
      activityId
    );
    if (!existing) {
      throw new ValidationError('Atividade nao encontrada.');
    }

    const dueAtValue = form.dueDate ? inputDateToTimestamp(form.dueDate) : null;
    if (form.dueDate && !dueAtValue) {
      throw new ValidationError('Data invalida.');
    }

    const resolvedOwnerId = form.ownerId || activeTask.ownerId || undefined;
    const updatePayload = {
      name: form.name.trim(),
      description: form.description.trim(),
      owner: form.owner.trim(),
      ownerId: resolvedOwnerId,
      status: form.status,
      priority: form.priority,
      dueAt: form.dueDate ? dueAtValue : null
    };

    await acompanhamentoRepository.updateProjectActivity(
      activeTask.projectId,
      activityId,
      updatePayload
    );

    return {
      ...activeTask,
      title: form.name.trim(),
      description: form.description.trim(),
      due: form.dueDate ? firestoreDateToLabel(dueAtValue) : '',
      owner: form.owner.trim(),
      ownerId: resolvedOwnerId,
      status: form.status,
      priority: form.priority,
      projectId: activeTask.projectId,
      activityId
    };
  }

  async getProjectDetail(
    projectId: string
  ): Promise<AcompanhamentoProjectDetail | null> {
    const detail = await acompanhamentoRepository.getProjectDetail(projectId);
    if (!detail) return null;

    return {
      project: this.mapProjectInfo(detail.project),
      activities: detail.activities.map((activity) =>
        this.normalizeActivityForUi(activity)
      )
    };
  }

  createActivityPayload(
    form: AcompanhamentoActivityFormState,
    activityId?: string
  ): AcompanhamentoActivityData {
    if (!form.name.trim()) {
      throw new ValidationError('Informe o nome da atividade.');
    }
    if (!form.owner.trim()) {
      throw new ValidationError('Informe o responsavel.');
    }

    const id =
      activityId ??
      (typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `activity-${Date.now()}`);

    return {
      id,
      name: form.name.trim(),
      issuedAt: Timestamp.now(),
      dueAt: inputDateToTimestamp(form.dueDate),
      owner: form.owner.trim(),
      ownerId: form.ownerId || undefined,
      status: form.status,
      priority: form.priority,
      description: form.description.trim(),
      updates: []
    };
  }

  async saveProjectActivity(
    projectId: string,
    activity: AcompanhamentoActivityData
  ): Promise<AcompanhamentoActivity> {
    if (!projectId) {
      throw new ValidationError('Projeto nao encontrado.');
    }

    await acompanhamentoRepository.createProjectActivity(projectId, activity);
    return this.normalizeActivityForUi(activity);
  }

  async updateProjectActivity(
    projectId: string,
    selectedActivity: AcompanhamentoActivity,
    form: AcompanhamentoActivityFormState
  ): Promise<AcompanhamentoActivity> {
    if (!projectId) {
      throw new ValidationError('Projeto nao encontrado.');
    }
    if (!selectedActivity) {
      throw new ValidationError('Atividade nao encontrada.');
    }
    if (!form.name.trim()) {
      throw new ValidationError('Informe o nome da atividade.');
    }
    if (!form.owner.trim()) {
      throw new ValidationError('Informe o responsavel.');
    }

    const existing = await acompanhamentoRepository.getProjectActivity(
      projectId,
      selectedActivity.id
    );
    if (!existing) {
      throw new ValidationError('Atividade nao encontrada.');
    }

    const dueAt = inputDateToTimestamp(form.dueDate);
    const updatePayload = {
      name: form.name.trim(),
      description: form.description.trim(),
      dueAt,
      owner: form.owner.trim(),
      ownerId: form.ownerId || undefined,
      status: form.status,
      priority: form.priority
    };

    await acompanhamentoRepository.updateProjectActivity(
      projectId,
      selectedActivity.id,
      updatePayload
    );

    return this.normalizeActivityForUi({
      id: selectedActivity.id,
      issuedAt: existing.issuedAt,
      updates: existing.updates,
      ...updatePayload
    });
  }

  async deleteProjectActivity(
    projectId: string,
    activityId: string
  ): Promise<void> {
    await acompanhamentoRepository.deleteProjectActivity(projectId, activityId);
  }

  async checkMemberConflicts(
    ownerId: string,
    dueDate: string
  ): Promise<AcompanhamentoConflictResult> {
    if (!ownerId || !dueDate) {
      return { hasConflict: false, message: '', tasksCount: 0, tasks: [] };
    }

    const dueDateTime = firestoreDateToDate(dueDate);
    if (!dueDateTime) {
      return { hasConflict: false, message: '', tasksCount: 0, tasks: [] };
    }

    const now = new Date();
    const next7Days = new Date(now);
    next7Days.setDate(now.getDate() + 7);

    const dueMinus3 = new Date(dueDateTime);
    dueMinus3.setDate(dueDateTime.getDate() - 3);
    const duePlus3 = new Date(dueDateTime);
    duePlus3.setDate(dueDateTime.getDate() + 3);

    const allTasks =
      await acompanhamentoRepository.getMemberConflictTasks(ownerId);
    const tasksNext7Days: AcompanhamentoConflictingTask[] = [];
    const tasksNearDueDate: AcompanhamentoConflictingTask[] = [];
    const allConflictingTasks: AcompanhamentoConflictingTask[] = [];

    allTasks.forEach((task) => {
      const taskDate = firestoreDateToDate(task.due);
      if (!taskDate) return;

      const isNext7Days = taskDate >= now && taskDate <= next7Days;
      const isNearDueDate = taskDate >= dueMinus3 && taskDate <= duePlus3;
      if (!isNext7Days && !isNearDueDate) return;

      allConflictingTasks.push(task);
      if (isNext7Days) tasksNext7Days.push(task);
      if (isNearDueDate) tasksNearDueDate.push(task);
    });

    const totalConflicts = allConflictingTasks.length;
    if (totalConflicts === 0) {
      return { hasConflict: false, message: '', tasksCount: 0, tasks: [] };
    }

    let message = '';
    if (tasksNext7Days.length > 0 && tasksNearDueDate.length > 0) {
      message = `O responsavel possui ${tasksNext7Days.length} tarefa(s) nos proximos 7 dias e ${tasksNearDueDate.length} tarefa(s) proximas ao prazo desta atividade (+/-3 dias).`;
    } else if (tasksNext7Days.length > 0) {
      message = `O responsavel possui ${tasksNext7Days.length} tarefa(s) nos proximos 7 dias.`;
    } else {
      message = `O responsavel possui ${tasksNearDueDate.length} tarefa(s) proximas ao prazo desta atividade (+/-3 dias).`;
    }

    return {
      hasConflict: true,
      message,
      tasksCount: totalConflicts,
      tasks: allConflictingTasks
    };
  }

  formatProjectValue(value?: string | number): string {
    if (!value) return 'R$ --';

    const stringValue = typeof value === 'number' ? value.toString() : value;
    const trimmed = stringValue.trim();
    if (!trimmed) return 'R$ --';

    const normalized = trimmed.replace(/[^0-9.,]/g, '');
    if (!normalized) return 'R$ --';

    const numericValue = normalized.includes(',')
      ? Number.parseFloat(normalized.replace(/\./g, '').replace(',', '.'))
      : Number.parseFloat(normalized);
    if (Number.isNaN(numericValue)) return 'R$ --';

    return (
      'R$ ' +
      new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(numericValue)
    );
  }

  private validateMemberForm<T extends AcompanhamentoMemberFormState>(
    form: T
  ): T {
    if (!form.name.trim()) {
      throw new ValidationError('Informe o nome do membro.');
    }
    if (
      !form.email.trim() ||
      !form.sector.trim() ||
      !form.cpf.trim() ||
      !form.role.trim()
    ) {
      throw new ValidationError('Preencha nome, email, setor, CPF e cargo.');
    }

    return {
      ...form,
      name: form.name.trim(),
      email: form.email.trim(),
      sector: form.sector.trim(),
      cpf: form.cpf.trim(),
      role: form.role.trim()
    };
  }

  private validateTag(tag: string): string {
    const trimmedTag = tag.trim();
    if (!trimmedTag) {
      throw new ValidationError('Tag nao pode ser vazia');
    }
    return trimmedTag;
  }

  private async updateTagForMultipleMembers(
    actor: AcompanhamentoActor | undefined,
    memberIds: string[],
    tag: string,
    action: 'add' | 'remove'
  ): Promise<AcompanhamentoServiceResult> {
    try {
      this.assertCanManageOtherMembers(actor);
      const trimmedTag = this.validateTag(tag);
      if (!memberIds || memberIds.length === 0) {
        return { success: false, error: 'Selecione ao menos um membro' };
      }

      await Promise.all(
        memberIds.map(async (memberId) => {
          const member = await acompanhamentoRepository.getMemberById(memberId);
          if (!member) return;

          const currentTags = member.tags ?? [];
          const tags =
            action === 'add'
              ? Array.from(new Set([...currentTags, trimmedTag]))
              : currentTags.filter((currentTag) => currentTag !== trimmedTag);
          await acompanhamentoRepository.updateMember(memberId, { tags });
        })
      );

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error?.message ?? 'Erro ao atualizar tags dos membros'
      };
    }
  }

  private mapProjectInfo(
    project: AcompanhamentoProjectData
  ): AcompanhamentoProjectInfo {
    return {
      id: project.id,
      name: project.name ?? 'Projeto',
      client: project.client,
      status: project.status,
      start: firestoreDateToLabel(project.start),
      next: project.next,
      value: project.value,
      manager: project.manager
    };
  }

  private normalizeActivityForUi(
    activity: AcompanhamentoActivityData
  ): AcompanhamentoActivity {
    const priority =
      activity.priority === 'Alta' || activity.priority === 'Baixa'
        ? activity.priority
        : 'Média';

    return {
      id: activity.id ?? '',
      name: activity.name ?? '',
      issuedAt: firestoreDateToLabel(activity.issuedAt),
      dueAt: firestoreDateToLabel(activity.dueAt),
      owner: activity.owner ?? '',
      ownerId: activity.ownerId,
      status: activity.status ?? 'Planejado',
      priority,
      description: activity.description ?? '',
      updates: Array.isArray(activity.updates) ? activity.updates : []
    };
  }
}

export { MEMBER_MANAGEMENT_DENIED };
export default new AcompanhamentoService();
