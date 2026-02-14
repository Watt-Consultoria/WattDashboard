'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
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
import { Plus } from 'lucide-react';

const statusColors: Record<
  string,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  Pendente: 'default',
  Aprovado: 'secondary',
  Recusado: 'destructive'
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
          className='gap-2'
          size='sm'
        >
          <Plus className='h-4 w-4' />
          Novo reembolso
        </Button>
      }
    >
      <div className='space-y-6'>
        {reinbursements.length === 0 && !isLoading ? (
          <Card>
            <CardContent className='pt-6'>
              <div className='py-8 text-center'>
                <p className='text-muted-foreground mb-4'>
                  Você ainda não tem solicitações de reembolso.
                </p>
                <Button onClick={() => setIsModalOpen(true)} variant='outline'>
                  Criar primeira solicitação
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Suas solicitações</CardTitle>
              <CardDescription>
                {reinbursements.length} solicitação(ões) encontrada(s)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className='overflow-x-auto'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Categoria</TableHead>
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
                        <TableCell>{reinbursement.category}</TableCell>
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
