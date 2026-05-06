import { ValidationError } from '@/errors/repositoryErrors';
import { canAccessFinanceCashbook } from '@/lib/executive-permissions';
import {
  cancelFinanceTransaction,
  createFinanceTransaction,
  getFinanceTransactionById,
  listFinanceTransactions,
  updateFinanceTransaction
} from '@/repositories/financeRepository';
import type {
  CreateFinanceTransactionDTO,
  FinanceCashbookSummary,
  FinanceCurrentUser,
  FinanceTransaction,
  FinanceTransactionFilters,
  UpdateFinanceTransactionDTO
} from '@/types/finance';

const COMPETENCE_MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

const getCurrentUserId = (currentUser?: FinanceCurrentUser | null): string => {
  const userId = currentUser?.id?.trim();
  if (!userId) {
    throw new ValidationError('Usuario nao autenticado');
  }
  return userId;
};

const assertCanAccessFinance = (
  currentUser?: FinanceCurrentUser | null
): string => {
  const userId = getCurrentUserId(currentUser);
  if (!canAccessFinanceCashbook(currentUser)) {
    throw new ValidationError(
      'Apenas Presidente Executivo ou Assessor Executivo pode acessar o financeiro'
    );
  }
  return userId;
};

const validateCompetenceMonth = (competenceMonth?: string): void => {
  if (!competenceMonth || !COMPETENCE_MONTH_PATTERN.test(competenceMonth)) {
    throw new ValidationError('Mes de competencia deve estar no formato YYYY-MM');
  }
};

const validateRequiredTransactionFields = (
  input: CreateFinanceTransactionDTO
): void => {
  if (!input.title?.trim()) throw new ValidationError('Titulo e obrigatorio');
  if (!input.type) throw new ValidationError('Tipo e obrigatorio');
  if (!input.status) throw new ValidationError('Status e obrigatorio');
  if (!input.category) throw new ValidationError('Categoria e obrigatoria');
  if (!input.date) throw new ValidationError('Data e obrigatoria');
  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
    throw new ValidationError('Valor deve ser maior que zero');
  }
  validateCompetenceMonth(input.competenceMonth);
};

const cleanText = (value?: string): string | undefined => {
  const trimmed = value?.trim();
  return trimmed || undefined;
};

const normalizeCreateInput = (
  input: CreateFinanceTransactionDTO
): CreateFinanceTransactionDTO => ({
  ...input,
  title: input.title.trim(),
  description: cleanText(input.description),
  projectId: cleanText(input.projectId),
  clientId: cleanText(input.clientId),
  receiptUrl: cleanText(input.receiptUrl)
});

const normalizeUpdateInput = (
  input: UpdateFinanceTransactionDTO
): UpdateFinanceTransactionDTO => ({
  ...input,
  title: input.title === undefined ? undefined : input.title.trim(),
  description: cleanText(input.description),
  projectId: cleanText(input.projectId),
  clientId: cleanText(input.clientId),
  receiptUrl: cleanText(input.receiptUrl)
});

const matchesFilters = (
  transaction: FinanceTransaction,
  filters?: FinanceTransactionFilters
) => {
  return (
    (!filters?.competenceMonth ||
      transaction.competenceMonth === filters.competenceMonth) &&
    (!filters?.type || transaction.type === filters.type) &&
    (!filters?.status || transaction.status === filters.status) &&
    (!filters?.category || transaction.category === filters.category)
  );
};

class FinanceService {
  async createTransaction(
    input: CreateFinanceTransactionDTO,
    currentUser?: FinanceCurrentUser | null
  ): Promise<string> {
    const userId = assertCanAccessFinance(currentUser);
    const normalizedInput = normalizeCreateInput(input);
    validateRequiredTransactionFields(normalizedInput);

    return createFinanceTransaction({
      ...normalizedInput,
      createdBy: userId
    });
  }

  async updateTransaction(
    id: string,
    input: UpdateFinanceTransactionDTO,
    currentUser?: FinanceCurrentUser | null
  ): Promise<void> {
    const userId = assertCanAccessFinance(currentUser);
    if (!id) throw new ValidationError('Movimentacao invalida');

    const existing = await getFinanceTransactionById(id);
    if (!existing) throw new ValidationError('Movimentacao nao encontrada');

    if (input.amountCents !== undefined) {
      if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
        throw new ValidationError('Valor deve ser maior que zero');
      }
    }

    if (input.title !== undefined && !input.title.trim()) {
      throw new ValidationError('Titulo e obrigatorio');
    }

    if (input.date !== undefined && !input.date) {
      throw new ValidationError('Data e obrigatoria');
    }

    if (input.competenceMonth !== undefined) {
      validateCompetenceMonth(input.competenceMonth);
    }

    await updateFinanceTransaction(id, {
      ...normalizeUpdateInput(input),
      updatedBy: userId
    });
  }

  async cancelTransaction(
    id: string,
    reason: string,
    currentUser?: FinanceCurrentUser | null
  ): Promise<void> {
    const userId = assertCanAccessFinance(currentUser);
    if (!id) throw new ValidationError('Movimentacao invalida');

    const existing = await getFinanceTransactionById(id);
    if (!existing) throw new ValidationError('Movimentacao nao encontrada');

    await cancelFinanceTransaction(id, reason.trim(), userId);
  }

  async getTransactions(
    filters?: FinanceTransactionFilters,
    currentUser?: FinanceCurrentUser | null
  ): Promise<FinanceTransaction[]> {
    assertCanAccessFinance(currentUser);
    if (filters?.competenceMonth) {
      validateCompetenceMonth(filters.competenceMonth);
    }
    return listFinanceTransactions(filters);
  }

  async getCashbookSummary(
    filters?: FinanceTransactionFilters,
    currentUser?: FinanceCurrentUser | null
  ): Promise<FinanceCashbookSummary> {
    assertCanAccessFinance(currentUser);
    if (filters?.competenceMonth) {
      validateCompetenceMonth(filters.competenceMonth);
    }

    const [filteredTransactions, allTransactions] = await Promise.all([
      listFinanceTransactions(filters),
      listFinanceTransactions()
    ]);

    const summary = filteredTransactions.reduce(
      (acc, transaction) => {
        if (transaction.status === 'canceled') return acc;
        if (!matchesFilters(transaction, filters)) return acc;

        if (transaction.status === 'paid') {
          if (transaction.type === 'income') {
            acc.totalIncomeCents += transaction.amountCents;
          } else {
            acc.totalExpenseCents += transaction.amountCents;
          }
        }

        if (transaction.status === 'pending') {
          if (transaction.type === 'income') {
            acc.pendingIncomeCents += transaction.amountCents;
          } else {
            acc.pendingExpenseCents += transaction.amountCents;
          }
        }

        return acc;
      },
      {
        totalIncomeCents: 0,
        totalExpenseCents: 0,
        netResultCents: 0,
        currentBalanceCents: 0,
        pendingIncomeCents: 0,
        pendingExpenseCents: 0
      } satisfies FinanceCashbookSummary
    );

    summary.netResultCents =
      summary.totalIncomeCents - summary.totalExpenseCents;

    summary.currentBalanceCents = allTransactions.reduce((acc, transaction) => {
      if (transaction.status !== 'paid') return acc;
      return transaction.type === 'income'
        ? acc + transaction.amountCents
        : acc - transaction.amountCents;
    }, 0);

    return summary;
  }
}

export default new FinanceService();
