import memberRepository from '@/repositories/memberRepository';
import reinbursementRepository from '@/repositories/reinbursementRepository';
import { ValidationError } from '@/errors/repositoryErrors';
import { Timestamp } from 'firebase/firestore';
import type {
  CreateReinbursementInput,
  Reinbursement,
  ReinbursementCategory,
  ReinbursementDashboardData,
  ReinbursementDashboardFilters,
  ReinbursementMemberTotal,
  ReinbursementQuery,
  ReinbursementStatus,
  ReinbursementReceipt
} from '@/types/reinbursement/reinbursement';

const parseAmountToCents = (rawValue: string): number | null => {
  const trimmed = rawValue.trim();
  if (!trimmed) return null;

  const normalized = trimmed
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.');

  const value = Number(normalized);
  if (!Number.isFinite(value)) return null;

  const cents = Math.round(value * 100);
  return cents > 0 ? cents : null;
};

class ReinbursementService {
  async submitReinbursement(input: {
    memberId: string;
    title: string;
    description: string;
    category: ReinbursementCategory;
    amount: string;
    pixKey: string;
    receiptFiles: File[];
  }): Promise<void> {
    const memberId = input.memberId?.trim();
    if (!memberId) throw new ValidationError('Usuário inválido');

    const description = input.description?.trim();
    if (!description)
      throw new ValidationError('Descreva a solicitação de reembolso');

    const title = input.title?.trim();
    if (!title)
      throw new ValidationError('Informe um título para a solicitação');

    if (!input.category)
      throw new ValidationError('Selecione a categoria da solicitação');

    const amountCents = parseAmountToCents(input.amount);
    if (!amountCents)
      throw new ValidationError('Informe um valor válido para reembolso');

    const pixKey = input.pixKey?.trim();
    if (!pixKey) throw new ValidationError('Informe a chave PIX');

    const receiptFiles = (input.receiptFiles ?? []).filter(Boolean);
    if (!receiptFiles.length)
      throw new ValidationError('Anexe pelo menos um comprovante');

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    const maxSizeBytes = 10 * 1024 * 1024;

    for (const receipt of receiptFiles) {
      if (!allowedTypes.includes(receipt.type)) {
        throw new ValidationError(
          `Arquivo "${receipt.name}" deve ser PDF, JPEG ou PNG`
        );
      }

      if (receipt.size > maxSizeBytes) {
        throw new ValidationError(
          `Arquivo "${receipt.name}" deve ter no máximo 10 MB`
        );
      }
    }

    const member = await memberRepository.getMemberById(memberId);
    if (!member) throw new ValidationError('Membro não encontrado no sistema');

    const receiptInfos: ReinbursementReceipt[] =
      await reinbursementRepository.uploadReceipts(memberId, receiptFiles);

    const payload: CreateReinbursementInput = {
      memberId,
      memberName: member.name ?? '',
      memberEmail: member.email ?? '',
      title,
      description,
      category: input.category,
      amountCents,
      pixKey,
      receipts: receiptInfos,
      status: 'Pendente'
    };

    await reinbursementRepository.createReinbursement(payload);
  }

  async getMemberReinbursements(memberId: string): Promise<Reinbursement[]> {
    if (!memberId) throw new ValidationError('Usuário inválido');
    return await reinbursementRepository.getMemberReinbursements(memberId);
  }

  async getDashboardData(
    filters: ReinbursementDashboardFilters
  ): Promise<ReinbursementDashboardData> {
    const searchText = filters.searchText?.trim().toLowerCase();

    let startDate = filters.startDate ?? undefined;
    let endDate = filters.endDate ?? undefined;

    if (startDate && endDate && startDate > endDate) {
      [startDate, endDate] = [endDate, startDate];
    }

    const repoFilters: ReinbursementQuery = {
      memberId: filters.memberId?.trim() || undefined,
      category: filters.category,
      status: filters.status,
      startDate: startDate ? Timestamp.fromDate(startDate) : undefined,
      endDate: endDate ? Timestamp.fromDate(endDate) : undefined
    };

    const reinbursements =
      await reinbursementRepository.getReinbursements(repoFilters);

    const filteredReinbursements = searchText
      ? reinbursements.filter((item) => {
          const title = item.title?.toLowerCase() ?? '';
          const description = item.description?.toLowerCase() ?? '';
          return title.includes(searchText) || description.includes(searchText);
        })
      : reinbursements;

    const sortedReinbursements = [...filteredReinbursements].sort((a, b) => {
      const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return bTime - aTime;
    });

    const summary = sortedReinbursements.reduce(
      (acc, item) => {
        acc.totalRequestedCents += item.amountCents;
        acc.totalCount += 1;

        if (item.status === 'Aprovado') {
          acc.totalApprovedCents += item.amountCents;
        } else if (item.status === 'Recusado') {
          acc.totalRejectedCents += item.amountCents;
        } else {
          acc.totalPendingCents += item.amountCents;
        }

        return acc;
      },
      {
        totalCount: 0,
        totalRequestedCents: 0,
        totalApprovedCents: 0,
        totalPendingCents: 0,
        totalRejectedCents: 0
      }
    );

    const totalRequested = summary.totalRequestedCents || 0;
    const categoryTotals = new Map<ReinbursementCategory, number>();
    const memberTotalsMap = new Map<string, ReinbursementMemberTotal>();

    for (const item of sortedReinbursements) {
      categoryTotals.set(
        item.category,
        (categoryTotals.get(item.category) ?? 0) + item.amountCents
      );

      const existingMember = memberTotalsMap.get(item.memberId);
      const memberName =
        item.memberName?.trim() || item.memberEmail?.trim() || item.memberId;

      if (existingMember) {
        existingMember.amountCents += item.amountCents;
      } else {
        memberTotalsMap.set(item.memberId, {
          memberId: item.memberId,
          memberName,
          amountCents: item.amountCents
        });
      }
    }

    const categoryShares = Array.from(categoryTotals.entries()).map(
      ([category, amountCents]) => ({
        category,
        amountCents,
        percentage: totalRequested
          ? Number(((amountCents / totalRequested) * 100).toFixed(1))
          : 0
      })
    );

    categoryShares.sort((a, b) => b.amountCents - a.amountCents);

    const memberTotals = Array.from(memberTotalsMap.values()).sort(
      (a, b) => b.amountCents - a.amountCents
    );

    return {
      reinbursements: sortedReinbursements,
      summary,
      categoryShares,
      memberTotals
    };
  }

  async updateReinbursementStatus(
    id: string,
    currentStatus: ReinbursementStatus,
    nextStatus: ReinbursementStatus
  ): Promise<void> {
    if (!id) throw new ValidationError('Solicitação inválida');
    if (!nextStatus) throw new ValidationError('Status inválido');

    if (currentStatus !== 'Pendente') {
      throw new ValidationError(
        'Somente solicitações pendentes podem ser atualizadas'
      );
    }

    if (currentStatus === nextStatus) return;

    await reinbursementRepository.updateReinbursementStatus(id, nextStatus);
  }
}

export default new ReinbursementService();
