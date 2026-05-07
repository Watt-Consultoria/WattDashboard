'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  FINANCE_PAYMENT_METHODS,
  FINANCE_TRANSACTION_CATEGORIES,
  FINANCE_TRANSACTION_STATUSES,
  FINANCE_TRANSACTION_TYPES,
  financeCategoryLabels,
  financePaymentMethodLabels,
  financeStatusLabels,
  financeTypeLabels,
  type CreateFinanceTransactionDTO,
  type FinanceTransaction,
  type FinancePaymentMethod,
  type FinanceTransactionCategory,
  type FinanceTransactionStatus,
  type FinanceTransactionType
} from '@/types/finance';

type FormState = {
  type: FinanceTransactionType;
  status: FinanceTransactionStatus;
  title: string;
  description: string;
  amount: string;
  category: FinanceTransactionCategory;
  paymentMethod: string;
  date: string;
  competenceMonth: string;
  projectId: string;
  clientId: string;
  receiptUrl: string;
};

type Props = {
  transaction?: FinanceTransaction | null;
  defaultCompetenceMonth: string;
  isSubmitting: boolean;
  onSubmit: (data: CreateFinanceTransactionDTO) => Promise<void>;
  onCancel: () => void;
};

const formatCentsToInput = (cents: number) =>
  new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(cents / 100);

const parseCurrencyToCents = (rawValue: string): number | null => {
  const normalized = rawValue
    .trim()
    .replace(/[R$\s]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');

  const value = Number(normalized);
  if (!Number.isFinite(value)) return null;

  const cents = Math.round(value * 100);
  return cents > 0 ? cents : null;
};

const getToday = () => new Date().toISOString().slice(0, 10);

const getCurrentMonth = () => new Date().toISOString().slice(0, 7);

const buildInitialState = (
  transaction: FinanceTransaction | null | undefined,
  defaultCompetenceMonth: string
): FormState => {
  if (transaction) {
    return {
      type: transaction.type,
      status: transaction.status,
      title: transaction.title,
      description: transaction.description ?? '',
      amount: formatCentsToInput(transaction.amountCents),
      category: transaction.category,
      paymentMethod: transaction.paymentMethod ?? 'none',
      date: transaction.date,
      competenceMonth: transaction.competenceMonth,
      projectId: transaction.projectId ?? '',
      clientId: transaction.clientId ?? '',
      receiptUrl: transaction.receiptUrl ?? ''
    };
  }

  return {
    type: 'income',
    status: 'pending',
    title: '',
    description: '',
    amount: '',
    category: 'project_payment',
    paymentMethod: 'pix',
    date: getToday(),
    competenceMonth: defaultCompetenceMonth || getCurrentMonth(),
    projectId: '',
    clientId: '',
    receiptUrl: ''
  };
};

export function FinanceTransactionForm({
  transaction,
  defaultCompetenceMonth,
  isSubmitting,
  onSubmit,
  onCancel
}: Props) {
  const [form, setForm] = React.useState<FormState>(() =>
    buildInitialState(transaction, defaultCompetenceMonth)
  );
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setForm(buildInitialState(transaction, defaultCompetenceMonth));
    setError(null);
  }, [defaultCompetenceMonth, transaction]);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const amountCents = parseCurrencyToCents(form.amount);
    if (!amountCents) {
      setError('Informe um valor maior que zero.');
      return;
    }

    if (!form.title.trim()) {
      setError('Informe um titulo.');
      return;
    }

    try {
      await onSubmit({
        type: form.type,
        status: form.status,
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        amountCents,
        category: form.category,
        paymentMethod:
          form.paymentMethod === 'none'
            ? undefined
            : (form.paymentMethod as FinancePaymentMethod),
        date: form.date,
        competenceMonth: form.competenceMonth,
        projectId: form.projectId.trim() || undefined,
        clientId: form.clientId.trim() || undefined,
        receiptUrl: form.receiptUrl.trim() || undefined
      });
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Nao foi possivel salvar a movimentacao.'
      );
    }
  };

  return (
    <form className='space-y-4' onSubmit={handleSubmit}>
      <div className='grid gap-4 md:grid-cols-2'>
        <div className='space-y-2'>
          <Label>Tipo</Label>
          <Select
            value={form.type}
            onValueChange={(value) =>
              setField('type', value as FinanceTransactionType)
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FINANCE_TRANSACTION_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {financeTypeLabels[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className='space-y-2'>
          <Label>Status</Label>
          <Select
            value={form.status}
            onValueChange={(value) =>
              setField('status', value as FinanceTransactionStatus)
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FINANCE_TRANSACTION_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {financeStatusLabels[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className='space-y-2'>
        <Label htmlFor='finance-title'>Titulo</Label>
        <Input
          id='finance-title'
          value={form.title}
          onChange={(event) => setField('title', event.target.value)}
          placeholder='Ex.: Pagamento do projeto X'
        />
      </div>

      <div className='space-y-2'>
        <Label htmlFor='finance-description'>Descricao</Label>
        <Textarea
          id='finance-description'
          value={form.description}
          onChange={(event) => setField('description', event.target.value)}
          placeholder='Detalhes opcionais da movimentacao'
        />
      </div>

      <div className='grid gap-4 md:grid-cols-2'>
        <div className='space-y-2'>
          <Label htmlFor='finance-amount'>Valor em reais</Label>
          <Input
            id='finance-amount'
            value={form.amount}
            onChange={(event) => setField('amount', event.target.value)}
            inputMode='decimal'
            placeholder='250,75'
          />
        </div>

        <div className='space-y-2'>
          <Label>Categoria</Label>
          <Select
            value={form.category}
            onValueChange={(value) =>
              setField('category', value as FinanceTransactionCategory)
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FINANCE_TRANSACTION_CATEGORIES.map((category) => (
                <SelectItem key={category} value={category}>
                  {financeCategoryLabels[category]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className='grid gap-4 md:grid-cols-3'>
        <div className='space-y-2'>
          <Label>Forma de pagamento</Label>
          <Select
            value={form.paymentMethod}
            onValueChange={(value) => setField('paymentMethod', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='none'>Nao informado</SelectItem>
              {FINANCE_PAYMENT_METHODS.map((method) => (
                <SelectItem key={method} value={method}>
                  {financePaymentMethodLabels[method]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className='space-y-2'>
          <Label htmlFor='finance-date'>Data</Label>
          <Input
            id='finance-date'
            type='date'
            value={form.date}
            onChange={(event) => setField('date', event.target.value)}
          />
        </div>

        <div className='space-y-2'>
          <Label htmlFor='finance-competence'>Competencia</Label>
          <Input
            id='finance-competence'
            type='month'
            value={form.competenceMonth}
            onChange={(event) =>
              setField('competenceMonth', event.target.value)
            }
          />
        </div>
      </div>

      <div className='grid gap-4 md:grid-cols-3'>
        <div className='space-y-2'>
          <Label htmlFor='finance-project'>Projeto vinculado</Label>
          <Input
            id='finance-project'
            value={form.projectId}
            onChange={(event) => setField('projectId', event.target.value)}
          />
        </div>

        <div className='space-y-2'>
          <Label htmlFor='finance-client'>Cliente vinculado</Label>
          <Input
            id='finance-client'
            value={form.clientId}
            onChange={(event) => setField('clientId', event.target.value)}
          />
        </div>

        <div className='space-y-2'>
          <Label htmlFor='finance-receipt'>URL do comprovante</Label>
          <Input
            id='finance-receipt'
            value={form.receiptUrl}
            onChange={(event) => setField('receiptUrl', event.target.value)}
            placeholder='https://'
          />
        </div>
      </div>

      {error ? <p className='text-destructive text-sm'>{error}</p> : null}

      <div className='flex justify-end gap-2'>
        <Button type='button' variant='outline' onClick={onCancel}>
          Cancelar
        </Button>
        <Button type='submit' disabled={isSubmitting}>
          {isSubmitting ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
    </form>
  );
}
