'use client';

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
import {
  FINANCE_TRANSACTION_CATEGORIES,
  FINANCE_TRANSACTION_STATUSES,
  FINANCE_TRANSACTION_TYPES,
  financeCategoryLabels,
  financeStatusLabels,
  financeTypeLabels,
  type FinanceTransactionFilters
} from '@/types/finance';

type FilterState = {
  competenceMonth: string;
  type: string;
  category: string;
  status: string;
};

type Props = {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  onClear: () => void;
};

export const buildFinanceFilters = (
  filters: FilterState
): FinanceTransactionFilters => ({
  competenceMonth: filters.competenceMonth || undefined,
  type:
    filters.type === 'all'
      ? undefined
      : (filters.type as FinanceTransactionFilters['type']),
  status:
    filters.status === 'all'
      ? undefined
      : (filters.status as FinanceTransactionFilters['status']),
  category:
    filters.category === 'all'
      ? undefined
      : (filters.category as FinanceTransactionFilters['category'])
});

export function FinanceTransactionFilters({
  filters,
  onChange,
  onClear
}: Props) {
  const setFilter = (key: keyof FilterState, value: string) => {
    onChange({ ...filters, [key]: value });
  };

  return (
    <div className='grid gap-3 md:grid-cols-[160px_1fr_1fr_1fr_auto] md:items-end'>
      <div className='space-y-2'>
        <Label htmlFor='finance-month'>Competencia</Label>
        <Input
          id='finance-month'
          type='month'
          value={filters.competenceMonth}
          onChange={(event) =>
            setFilter('competenceMonth', event.target.value)
          }
        />
      </div>

      <div className='space-y-2'>
        <Label>Tipo</Label>
        <Select
          value={filters.type}
          onValueChange={(value) => setFilter('type', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder='Todos' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>Todos</SelectItem>
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
          value={filters.status}
          onValueChange={(value) => setFilter('status', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder='Todos' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>Todos</SelectItem>
            {FINANCE_TRANSACTION_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {financeStatusLabels[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className='space-y-2'>
        <Label>Categoria</Label>
        <Select
          value={filters.category}
          onValueChange={(value) => setFilter('category', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder='Todas' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>Todas</SelectItem>
            {FINANCE_TRANSACTION_CATEGORIES.map((category) => (
              <SelectItem key={category} value={category}>
                {financeCategoryLabels[category]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button type='button' variant='outline' onClick={onClear}>
        Limpar
      </Button>
    </div>
  );
}

export type FinanceFilterState = FilterState;
