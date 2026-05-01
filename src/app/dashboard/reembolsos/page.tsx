'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Calendar, DollarSign, FileText } from 'lucide-react';
import { useAuth } from '@/features/auth/components/auth-provider';
import reinbursementService from '@/services/reinbursementService';
import type { Reinbursement } from '@/types/reinbursement/reinbursement';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import PageContainer from '@/components/layout/page-container';
import { ReinbursementFormDialog } from './reinbursement-form-dialog';
import useMetadata from '@/hooks/use-metadata';

const statusColors: Record<
  string,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  Pendente: 'default',
  Aprovado: 'secondary',
  Recusado: 'destructive',
  Excluída: 'outline'
};

const formatCurrency = (cents: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(cents / 100);
};

const formatDate = (timestamp: any): string => {
  if (!timestamp?.toDate) return '-';
  const date = timestamp.toDate();
  return new Intl.DateTimeFormat('pt-BR').format(date);
};

export default function ReembolsosPage() {
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reinbursements, setReinbursements] = useState<Reinbursement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useMetadata({ title: 'Reembolsos' });

  const loadReinbursements = async () => {
    if (!user?.uid) return;

    setIsLoading(true);
    try {
      const data = await reinbursementService.getMemberReinbursements(user.uid);
      setReinbursements(data);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Não foi possível carregar os reembolsos.';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReinbursements();
  }, [user?.uid]);

  return (
    <PageContainer
      scrollable
      pageTitle='Reembolsos'
      pageDescription='Gerencie suas solicitações de reembolso'
      pageHeaderAction={
        <Button
          onClick={() => setIsModalOpen(true)}
          className='h-10 gap-2 sm:h-9'
          size='sm'
        >
          <Plus className='h-4 w-4' />
          <span className='xs:inline hidden'>Novo reembolso</span>
          <span className='xs:hidden'>Novo</span>
        </Button>
      }
    >
      <div className='space-y-4 sm:space-y-6'>
        {reinbursements.length === 0 && !isLoading ? (
          <Card>
            <CardContent className='px-4 pt-6 sm:px-6'>
              <div className='py-6 text-center sm:py-8'>
                <FileText className='text-muted-foreground mx-auto mb-3 h-10 w-10 sm:h-12 sm:w-12' />
                <p className='text-muted-foreground mb-4 text-sm sm:text-base'>
                  Você ainda não tem solicitações de reembolso.
                </p>
                <Button
                  onClick={() => setIsModalOpen(true)}
                  variant='outline'
                  className='h-10 w-full sm:h-9 sm:w-auto'
                >
                  Criar primeira solicitação
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className='overflow-hidden'>
            <CardHeader className='px-3 pt-3 pb-2 sm:px-6 sm:pt-6 sm:pb-3'>
              <CardTitle className='text-sm sm:text-base md:text-lg'>
                Suas solicitações
              </CardTitle>
              <CardDescription className='text-[10px] sm:text-xs md:text-sm'>
                {reinbursements.length} solicitação(ões) encontrada(s)
              </CardDescription>
            </CardHeader>

            {/* Desktop / Tablet: table layout */}
            <CardContent className='hidden p-0 sm:block md:p-6'>
              <div className='overflow-x-auto'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Título</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className='text-right'>Valor</TableHead>
                      <TableHead className='text-center'>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reinbursements.map((reinbursement) => (
                      <TableRow key={reinbursement.id}>
                        <TableCell className='whitespace-nowrap'>
                          {formatDate(reinbursement.createdAt)}
                        </TableCell>
                        <TableCell>{reinbursement.title}</TableCell>
                        <TableCell className='max-w-xs truncate'>
                          {reinbursement.description}
                        </TableCell>
                        <TableCell className='text-right font-medium'>
                          {formatCurrency(reinbursement.amountCents)}
                        </TableCell>
                        <TableCell className='text-center'>
                          <Badge
                            variant={
                              statusColors[reinbursement.status] || 'default'
                            }
                          >
                            {reinbursement.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>

            {/* Mobile: card-based layout */}
            <CardContent className='block p-2 sm:hidden'>
              <div className='space-y-2'>
                {reinbursements.map((reinbursement) => (
                  <div
                    key={reinbursement.id}
                    className='rounded-lg border p-3 transition-colors'
                  >
                    <div className='mb-1.5 flex items-start justify-between gap-2'>
                      <div className='min-w-0 flex-1'>
                        <h3 className='truncate text-sm leading-tight font-semibold'>
                          {reinbursement.title}
                        </h3>
                      </div>
                      <Badge
                        variant={
                          statusColors[reinbursement.status] || 'default'
                        }
                        className='shrink-0 text-[10px]'
                      >
                        {reinbursement.status}
                      </Badge>
                    </div>

                    {reinbursement.description && (
                      <p className='text-muted-foreground mb-2 line-clamp-2 text-xs'>
                        {reinbursement.description}
                      </p>
                    )}

                    <div className='flex items-center justify-between gap-2'>
                      <div className='text-muted-foreground space-y-0.5'>
                        <div className='flex items-center gap-1.5 text-[11px]'>
                          <Calendar className='h-3 w-3 shrink-0' />
                          <span>{formatDate(reinbursement.createdAt)}</span>
                        </div>
                      </div>
                      <div className='flex shrink-0 items-center gap-1'>
                        <DollarSign className='text-muted-foreground h-3.5 w-3.5' />
                        <span className='text-sm font-semibold tabular-nums'>
                          {formatCurrency(reinbursement.amountCents)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <ReinbursementFormDialog
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        memberId={user?.uid || ''}
        onSuccess={loadReinbursements}
      />
    </PageContainer>
  );
}
