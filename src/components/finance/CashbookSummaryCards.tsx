'use client';

import { ArrowDownCircle, ArrowUpCircle, Clock, Scale } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import type { FinanceCashbookSummary } from '@/types/finance';

const formatCurrency = (cents: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(cents / 100);

type SummaryItem = {
  title: string;
  value: number;
  tone: string;
  Icon: typeof ArrowUpCircle;
};

export function CashbookSummaryCards({
  summary
}: {
  summary: FinanceCashbookSummary;
}) {
  const items: SummaryItem[] = [
    {
      title: 'Entradas do periodo',
      value: summary.totalIncomeCents,
      tone: 'text-emerald-600',
      Icon: ArrowUpCircle
    },
    {
      title: 'Saidas do periodo',
      value: summary.totalExpenseCents,
      tone: 'text-red-600',
      Icon: ArrowDownCircle
    },
    {
      title: 'Resultado liquido',
      value: summary.netResultCents,
      tone: summary.netResultCents >= 0 ? 'text-emerald-600' : 'text-red-600',
      Icon: Scale
    },
    {
      title: 'Saldo atual',
      value: summary.currentBalanceCents,
      tone:
        summary.currentBalanceCents >= 0 ? 'text-emerald-600' : 'text-red-600',
      Icon: Scale
    },
    {
      title: 'Entradas pendentes',
      value: summary.pendingIncomeCents,
      tone: 'text-amber-600',
      Icon: Clock
    },
    {
      title: 'Saidas pendentes',
      value: summary.pendingExpenseCents,
      tone: 'text-amber-600',
      Icon: Clock
    }
  ];

  return (
    <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-3'>
      {items.map(({ title, value, tone, Icon }) => (
        <Card key={title}>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>{title}</CardTitle>
            <Icon className={`h-4 w-4 ${tone}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${tone}`}>
              {formatCurrency(value)}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
