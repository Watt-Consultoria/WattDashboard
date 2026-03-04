'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Check, X, FileText } from 'lucide-react';
import hogwattsService from '@/services/hogwattsService';
import type { HogwattsSubmission } from '@/types/hogwatts/hogwatts';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';

interface PendingSubmissionsProps {
  submissions: HogwattsSubmission[];
  reviewerId: string;
  onReviewed: () => void;
}

const formatDate = (timestamp: any): string => {
  if (!timestamp?.toDate) return '-';
  return new Intl.DateTimeFormat('pt-BR').format(timestamp.toDate());
};

export function PendingSubmissions({
  submissions,
  reviewerId,
  onReviewed
}: PendingSubmissionsProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleReview = async (
    submissionId: string,
    status: 'Aprovado' | 'Recusado'
  ) => {
    setLoadingId(submissionId);
    try {
      await hogwattsService.reviewSubmission({
        submissionId,
        status,
        reviewerId
      });
      toast.success(
        status === 'Aprovado'
          ? 'Submissão aprovada! Pontos contabilizados.'
          : 'Submissão recusada.'
      );
      onReviewed();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erro ao avaliar submissão.';
      toast.error(message);
    } finally {
      setLoadingId(null);
    }
  };

  if (submissions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className='text-sm sm:text-base'>
            Submissões Pendentes
          </CardTitle>
          <CardDescription>
            Nenhuma submissão pendente no momento.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className='overflow-hidden'>
      <CardHeader className='px-3 pt-3 pb-2 sm:px-6 sm:pt-6 sm:pb-3'>
        <CardTitle className='text-sm sm:text-base'>
          Submissões Pendentes
        </CardTitle>
        <CardDescription className='text-xs'>
          {submissions.length} submissão(ões) aguardando análise
        </CardDescription>
      </CardHeader>

      {/* Desktop */}
      <CardContent className='hidden p-0 sm:block md:p-6'>
        <div className='overflow-x-auto'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Membro</TableHead>
                <TableHead>Casa</TableHead>
                <TableHead>Tarefa</TableHead>
                <TableHead className='text-right'>Pontos</TableHead>
                <TableHead>Observação</TableHead>
                <TableHead className='text-center'>Comprovação</TableHead>
                <TableHead className='text-center'>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {submissions.map((sub) => (
                <TableRow key={sub.id}>
                  <TableCell className='whitespace-nowrap'>
                    {formatDate(sub.createdAt)}
                  </TableCell>
                  <TableCell>{sub.memberName}</TableCell>
                  <TableCell>
                    <Badge variant='outline'>{sub.houseName}</Badge>
                  </TableCell>
                  <TableCell>{sub.taskName}</TableCell>
                  <TableCell className='text-right font-medium'>
                    {sub.taskPoints}
                  </TableCell>
                  <TableCell className='max-w-xs truncate'>
                    {sub.note || '-'}
                  </TableCell>
                  <TableCell className='text-center'>
                    {sub.proofFileUrl ? (
                      <Button
                        variant='ghost'
                        size='sm'
                        className='h-8 gap-1'
                        onClick={() => window.open(sub.proofFileUrl!, '_blank')}
                        title='Ver arquivo de comprovação'
                      >
                        <FileText className='h-4 w-4' />
                        Ver arquivo
                      </Button>
                    ) : (
                      <span className='text-muted-foreground text-xs'>-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className='flex items-center justify-center gap-2'>
                      <Button
                        variant='outline'
                        size='sm'
                        className='h-8 gap-1 text-green-600 hover:bg-green-50 hover:text-green-700'
                        disabled={loadingId === sub.id}
                        onClick={() => handleReview(sub.id, 'Aprovado')}
                      >
                        <Check className='h-4 w-4' />
                        Aprovar
                      </Button>
                      <Button
                        variant='outline'
                        size='sm'
                        className='h-8 gap-1 text-red-600 hover:bg-red-50 hover:text-red-700'
                        disabled={loadingId === sub.id}
                        onClick={() => handleReview(sub.id, 'Recusado')}
                      >
                        <X className='h-4 w-4' />
                        Recusar
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Mobile */}
      <CardContent className='block p-2 sm:hidden'>
        <div className='space-y-2'>
          {submissions.map((sub) => (
            <div
              key={sub.id}
              className='rounded-lg border p-3 transition-colors'
            >
              <div className='mb-1.5 flex items-start justify-between gap-2'>
                <div className='min-w-0 flex-1'>
                  <h3 className='truncate text-sm leading-tight font-semibold'>
                    {sub.taskName}
                  </h3>
                  <p className='text-muted-foreground text-xs'>
                    {sub.memberName} • {sub.houseName}
                  </p>
                </div>
                <span className='shrink-0 text-sm font-bold'>
                  {sub.taskPoints} pts
                </span>
              </div>

              {sub.note && (
                <p className='text-muted-foreground mb-2 line-clamp-2 text-xs'>
                  {sub.note}
                </p>
              )}

              {sub.proofFileUrl && (
                <Button
                  variant='ghost'
                  size='sm'
                  className='mb-2 h-8 w-full gap-1 text-xs'
                  onClick={() => window.open(sub.proofFileUrl!, '_blank')}
                >
                  <FileText className='h-3.5 w-3.5' />
                  Ver arquivo de comprovação
                </Button>
              )}

              <div className='flex items-center gap-2'>
                <Button
                  variant='outline'
                  size='sm'
                  className='h-8 flex-1 gap-1 text-green-600'
                  disabled={loadingId === sub.id}
                  onClick={() => handleReview(sub.id, 'Aprovado')}
                >
                  <Check className='h-4 w-4' />
                  Aprovar
                </Button>
                <Button
                  variant='outline'
                  size='sm'
                  className='h-8 flex-1 gap-1 text-red-600'
                  disabled={loadingId === sub.id}
                  onClick={() => handleReview(sub.id, 'Recusado')}
                >
                  <X className='h-4 w-4' />
                  Recusar
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
