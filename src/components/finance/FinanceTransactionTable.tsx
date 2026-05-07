'use client';

import { Edit, ExternalLink, Ban } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  financeCategoryLabels,
  financePaymentMethodLabels,
  financeStatusLabels,
  financeTypeLabels,
  type FinanceTransaction,
  type FinanceTransactionStatus
} from '@/types/finance';

const formatCurrency = (cents: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(cents / 100);

const formatDate = (value: string) => {
  if (!value) return '-';
  return new Intl.DateTimeFormat('pt-BR').format(
    new Date(`${value}T00:00:00`)
  );
};

const statusVariant: Record<
  FinanceTransactionStatus,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  pending: 'default',
  paid: 'secondary',
  canceled: 'destructive'
};

type Props = {
  transactions: FinanceTransaction[];
  isLoading: boolean;
  onEdit: (transaction: FinanceTransaction) => void;
  onCancel: (transaction: FinanceTransaction) => void;
};

export function FinanceTransactionTable({
  transactions,
  isLoading,
  onEdit,
  onCancel
}: Props) {
  return (
    <div className='overflow-hidden rounded-md border'>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Titulo</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead className='text-right'>Valor</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Forma de pagamento</TableHead>
            <TableHead className='text-right'>Acoes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell
                colSpan={8}
                className='text-muted-foreground h-28 text-center'
              >
                Carregando movimentacoes...
              </TableCell>
            </TableRow>
          ) : transactions.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={8}
                className='text-muted-foreground h-28 text-center'
              >
                Nenhuma movimentacao encontrada.
              </TableCell>
            </TableRow>
          ) : (
            transactions.map((transaction) => (
              <TableRow key={transaction.id}>
                <TableCell className='whitespace-nowrap'>
                  {formatDate(transaction.date)}
                </TableCell>
                <TableCell>{financeTypeLabels[transaction.type]}</TableCell>
                <TableCell>
                  <div className='font-medium'>{transaction.title}</div>
                  {transaction.description ? (
                    <div className='text-muted-foreground line-clamp-1 text-xs'>
                      {transaction.description}
                    </div>
                  ) : null}
                </TableCell>
                <TableCell>{financeCategoryLabels[transaction.category]}</TableCell>
                <TableCell className='text-right font-medium'>
                  {formatCurrency(transaction.amountCents)}
                </TableCell>
                <TableCell>
                  <Badge variant={statusVariant[transaction.status]}>
                    {financeStatusLabels[transaction.status]}
                  </Badge>
                </TableCell>
                <TableCell>
                  {transaction.paymentMethod
                    ? financePaymentMethodLabels[transaction.paymentMethod]
                    : '-'}
                </TableCell>
                <TableCell>
                  <div className='flex justify-end gap-2'>
                    {transaction.receiptUrl ? (
                      <Button asChild variant='ghost' size='icon'>
                        <a
                          href={transaction.receiptUrl}
                          target='_blank'
                          rel='noreferrer'
                          aria-label='Abrir comprovante'
                        >
                          <ExternalLink className='h-4 w-4' />
                        </a>
                      </Button>
                    ) : null}
                    <Button
                      type='button'
                      variant='ghost'
                      size='icon'
                      onClick={() => onEdit(transaction)}
                      aria-label='Editar movimentacao'
                    >
                      <Edit className='h-4 w-4' />
                    </Button>
                    <Button
                      type='button'
                      variant='ghost'
                      size='icon'
                      disabled={transaction.status === 'canceled'}
                      onClick={() => onCancel(transaction)}
                      aria-label='Cancelar movimentacao'
                    >
                      <Ban className='h-4 w-4' />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
