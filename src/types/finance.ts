export type FinanceTransactionType = 'income' | 'expense';

export type FinanceTransactionStatus = 'pending' | 'paid' | 'canceled';

export type FinancePaymentMethod =
  | 'pix'
  | 'transfer'
  | 'cash'
  | 'card'
  | 'boleto'
  | 'other';

export type FinanceTransactionCategory =
  | 'project_payment'
  | 'sponsorship'
  | 'event_income'
  | 'refund_received'
  | 'tax'
  | 'software'
  | 'marketing'
  | 'event_expense'
  | 'member_refund'
  | 'transport'
  | 'food'
  | 'materials'
  | 'bank_fee'
  | 'accounting'
  | 'other';

export interface FinanceTransaction {
  id: string;
  type: FinanceTransactionType;
  status: FinanceTransactionStatus;
  title: string;
  description?: string;
  amountCents: number;
  category: FinanceTransactionCategory;
  paymentMethod?: FinancePaymentMethod;
  date: string;
  competenceMonth: string;
  projectId?: string;
  clientId?: string;
  receiptUrl?: string;
  createdBy: string;
  createdAt: Date;
  updatedBy?: string;
  updatedAt?: Date;
  canceledBy?: string;
  canceledAt?: Date;
  cancelReason?: string;
}

export interface CreateFinanceTransactionDTO {
  type: FinanceTransactionType;
  status: FinanceTransactionStatus;
  title: string;
  description?: string;
  amountCents: number;
  category: FinanceTransactionCategory;
  paymentMethod?: FinancePaymentMethod;
  date: string;
  competenceMonth: string;
  projectId?: string;
  clientId?: string;
  receiptUrl?: string;
}

export interface UpdateFinanceTransactionDTO {
  status?: FinanceTransactionStatus;
  title?: string;
  description?: string;
  amountCents?: number;
  category?: FinanceTransactionCategory;
  paymentMethod?: FinancePaymentMethod;
  date?: string;
  competenceMonth?: string;
  projectId?: string;
  clientId?: string;
  receiptUrl?: string;
}

export interface FinanceTransactionFilters {
  competenceMonth?: string;
  type?: FinanceTransactionType;
  status?: FinanceTransactionStatus;
  category?: FinanceTransactionCategory;
}

export interface FinanceCashbookSummary {
  totalIncomeCents: number;
  totalExpenseCents: number;
  netResultCents: number;
  currentBalanceCents: number;
  pendingIncomeCents: number;
  pendingExpenseCents: number;
}

export type FinanceCurrentUser = {
  id?: string | null;
  role?: string | null;
  sector?: string | null;
};

export const FINANCE_TRANSACTION_TYPES: FinanceTransactionType[] = [
  'income',
  'expense'
];

export const FINANCE_TRANSACTION_STATUSES: FinanceTransactionStatus[] = [
  'pending',
  'paid',
  'canceled'
];

export const FINANCE_PAYMENT_METHODS: FinancePaymentMethod[] = [
  'pix',
  'transfer',
  'cash',
  'card',
  'boleto',
  'other'
];

export const FINANCE_TRANSACTION_CATEGORIES: FinanceTransactionCategory[] = [
  'project_payment',
  'sponsorship',
  'event_income',
  'refund_received',
  'tax',
  'software',
  'marketing',
  'event_expense',
  'member_refund',
  'transport',
  'food',
  'materials',
  'bank_fee',
  'accounting',
  'other'
];

export const financeTypeLabels: Record<FinanceTransactionType, string> = {
  income: 'Entrada',
  expense: 'Saida'
};

export const financeStatusLabels: Record<FinanceTransactionStatus, string> = {
  pending: 'Pendente',
  paid: 'Pago',
  canceled: 'Cancelado'
};

export const financePaymentMethodLabels: Record<FinancePaymentMethod, string> =
  {
    pix: 'Pix',
    transfer: 'Transferencia',
    cash: 'Dinheiro',
    card: 'Cartao',
    boleto: 'Boleto',
    other: 'Outro'
  };

export const financeCategoryLabels: Record<
  FinanceTransactionCategory,
  string
> = {
  project_payment: 'Pagamento de projeto',
  sponsorship: 'Patrocinio',
  event_income: 'Entrada de evento',
  refund_received: 'Reembolso recebido',
  tax: 'Imposto',
  software: 'Software/Ferramentas',
  marketing: 'Marketing',
  event_expense: 'Evento',
  member_refund: 'Reembolso a membro',
  transport: 'Transporte',
  food: 'Alimentacao',
  materials: 'Materiais',
  bank_fee: 'Taxa bancaria',
  accounting: 'Contabilidade',
  other: 'Outros'
};
