'use client';

import * as React from 'react';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import stageEvaluationService from '@/services/stageEvaluationService';
import type {
  PselStageView,
  StageEvaluationResultView
} from '@/types/candidate/stage-evaluation';

type StageResultSortField = 'saldo' | 'positivos' | 'negativos' | 'nome';

const SORT_LABELS: Record<StageResultSortField, string> = {
  saldo: 'Saldo',
  positivos: 'Positivos',
  negativos: 'Negativos',
  nome: 'Nome'
};

function formatDeadline(deadline: Date | null): string {
  if (!deadline) return 'Sem prazo definido';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(deadline);
}

function sortRows(
  rows: StageEvaluationResultView[],
  sortBy: StageResultSortField
): StageEvaluationResultView[] {
  return [...rows].sort((left, right) => {
    if (left.status === 'faltou' && right.status !== 'faltou') return 1;
    if (left.status !== 'faltou' && right.status === 'faltou') return -1;

    if (sortBy === 'nome') {
      return left.nomeCompleto.localeCompare(right.nomeCompleto);
    }

    const valueBySort: Record<
      Exclude<StageResultSortField, 'nome'>,
      [number, number]
    > = {
      saldo: [left.saldo, right.saldo],
      positivos: [left.positivos, right.positivos],
      negativos: [left.negativos, right.negativos]
    };

    const [leftValue, rightValue] = valueBySort[sortBy];
    if (rightValue !== leftValue) {
      return rightValue - leftValue;
    }

    return left.nomeCompleto.localeCompare(right.nomeCompleto);
  });
}

export function PselStageResultsTab() {
  const [stages, setStages] = React.useState<PselStageView[]>([]);
  const [selectedStageKey, setSelectedStageKey] = React.useState('');
  const [rows, setRows] = React.useState<StageEvaluationResultView[]>([]);
  const [sortBy, setSortBy] = React.useState<StageResultSortField>('saldo');
  const [isLoadingStages, setIsLoadingStages] = React.useState(false);
  const [isLoadingRows, setIsLoadingRows] = React.useState(false);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = React.useState(false);

  const selectedStage = React.useMemo(
    () => stages.find((stage) => stage.key === selectedStageKey) ?? null,
    [selectedStageKey, stages]
  );

  const orderedRows = React.useMemo(() => sortRows(rows, sortBy), [rows, sortBy]);
  const activeRows = React.useMemo(
    () => orderedRows.filter((row) => row.status !== 'faltou'),
    [orderedRows]
  );
  const absentRows = React.useMemo(
    () => orderedRows.filter((row) => row.status === 'faltou'),
    [orderedRows]
  );

  const activeRankByCandidateId = React.useMemo(() => {
    const rankMap = new Map<string, number>();
    activeRows.forEach((row, index) => {
      rankMap.set(row.candidateId, index + 1);
    });
    return rankMap;
  }, [activeRows]);

  React.useEffect(() => {
    let mounted = true;

    const loadStages = async () => {
      try {
        setIsLoadingStages(true);
        const loadedStages = await stageEvaluationService.getAvailableStagesForEvaluation();
        if (!mounted) return;

        setStages(loadedStages);
        setSelectedStageKey((current) => {
          if (current && loadedStages.some((stage) => stage.key === current)) {
            return current;
          }
          return loadedStages[0]?.key ?? '';
        });
      } catch (error) {
        console.error('Erro ao carregar etapas para resultados:', error);
        if (!mounted) return;
        setStages([]);
        setSelectedStageKey('');
      } finally {
        if (mounted) setIsLoadingStages(false);
      }
    };

    void loadStages();

    return () => {
      mounted = false;
    };
  }, []);

  React.useEffect(() => {
    let mounted = true;

    const loadRows = async () => {
      if (!selectedStageKey) {
        setRows([]);
        return;
      }

      try {
        setIsLoadingRows(true);
        const loadedRows = await stageEvaluationService.getStageResults(
          selectedStageKey
        );
        if (!mounted) return;
        setRows(loadedRows);
      } catch (error) {
        console.error('Erro ao carregar resultados por etapa:', error);
        if (!mounted) return;
        setRows([]);
      } finally {
        if (mounted) setIsLoadingRows(false);
      }
    };

    void loadRows();

    return () => {
      mounted = false;
    };
  }, [selectedStageKey]);

  return (
    <div className='space-y-4'>
      <Card>
        <CardHeader className='pb-3'>
          <CardTitle className='text-base'>Resultados por etapa</CardTitle>
        </CardHeader>
        <CardContent className='space-y-2 md:space-y-3'>
          <div className='flex items-center justify-between gap-2 md:hidden'>
            <p className='text-muted-foreground min-w-0 truncate text-xs'>
              {selectedStage?.label ?? 'Selecione a etapa'} |{' '}
              {SORT_LABELS[sortBy]}
            </p>
            <Button
              type='button'
              variant='outline'
              size='sm'
              className='h-8 shrink-0 px-2 text-xs'
              onClick={() => setIsMobileFiltersOpen((current) => !current)}
            >
              {isMobileFiltersOpen ? 'Ocultar' : 'Filtros'}
            </Button>
          </div>

          <div
            className={`grid gap-2 md:hidden ${isMobileFiltersOpen ? 'grid' : 'hidden'}`}
          >
            <Select
              value={selectedStageKey}
              onValueChange={(value) => {
                setSelectedStageKey(value);
                setIsMobileFiltersOpen(false);
              }}
              disabled={isLoadingStages || stages.length === 0}
            >
              <SelectTrigger className='h-8 text-xs'>
                <SelectValue placeholder='Selecione a etapa' />
              </SelectTrigger>
              <SelectContent>
                {stages.map((stage) => (
                  <SelectItem key={stage.key} value={stage.key}>
                    {stage.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={sortBy}
              onValueChange={(value) => {
                setSortBy(value as StageResultSortField);
                setIsMobileFiltersOpen(false);
              }}
            >
              <SelectTrigger className='h-8 text-xs'>
                <SelectValue placeholder='Ordenar por' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='saldo'>Saldo</SelectItem>
                <SelectItem value='positivos'>Positivos</SelectItem>
                <SelectItem value='negativos'>Negativos</SelectItem>
                <SelectItem value='nome'>Nome</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className='hidden gap-2 md:grid md:grid-cols-2'>
            <Select
              value={selectedStageKey}
              onValueChange={setSelectedStageKey}
              disabled={isLoadingStages || stages.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder='Selecione a etapa' />
              </SelectTrigger>
              <SelectContent>
                {stages.map((stage) => (
                  <SelectItem key={stage.key} value={stage.key}>
                    {stage.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={sortBy}
              onValueChange={(value) => setSortBy(value as StageResultSortField)}
            >
              <SelectTrigger>
                <SelectValue placeholder='Ordenar por' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='saldo'>Saldo</SelectItem>
                <SelectItem value='positivos'>Positivos</SelectItem>
                <SelectItem value='negativos'>Negativos</SelectItem>
                <SelectItem value='nome'>Nome</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selectedStage ? (
            <div className='text-muted-foreground flex flex-wrap items-center gap-2 text-xs'>
              <Badge variant={selectedStage.isClosed ? 'destructive' : 'secondary'}>
                {selectedStage.isClosed ? 'Encerrada' : 'Aberta'}
              </Badge>
              <span className='hidden md:inline'>
                Prazo: {formatDeadline(selectedStage.deadline)}
              </span>
              <span>Ativos: {activeRows.length}</span>
              <span>Faltosos: {absentRows.length}</span>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {isLoadingRows ? (
        <p className='text-muted-foreground text-sm'>Carregando resultados...</p>
      ) : null}

      {!isLoadingRows && selectedStageKey && orderedRows.length === 0 ? (
        <p className='text-muted-foreground text-sm'>
          Nenhum resultado encontrado para esta etapa.
        </p>
      ) : null}

      {!isLoadingRows && orderedRows.length > 0 ? (
        <>
          <div className='hidden overflow-hidden rounded-md border md:block'>
            <table className='w-full text-sm'>
              <thead className='bg-muted/40 text-muted-foreground'>
                <tr>
                  <th className='px-3 py-2 text-left font-medium'>Candidato</th>
                  <th className='px-3 py-2 text-right font-medium'>Positivos</th>
                  <th className='px-3 py-2 text-right font-medium'>Negativos</th>
                  <th className='px-3 py-2 text-right font-medium'>Total</th>
                  <th className='px-3 py-2 text-right font-medium'>Saldo</th>
                  <th className='px-3 py-2 text-right font-medium'>Status</th>
                </tr>
              </thead>
              <tbody>
                {orderedRows.map((row) => (
                  <tr key={row.candidateId} className='border-t'>
                    <td className='px-3 py-2'>
                      <div className='flex items-center gap-2'>
                        <div className='relative h-8 w-8 overflow-hidden rounded-full border'>
                          {row.imagemUrl ? (
                            <Image
                              src={row.imagemUrl}
                              alt={row.nomeCompleto}
                              fill
                              sizes='32px'
                              className='object-cover'
                            />
                          ) : (
                            <div className='bg-muted h-full w-full' />
                          )}
                        </div>
                        <div className='min-w-0'>
                          <p className='truncate font-medium'>{row.nomeCompleto}</p>
                          {row.status !== 'faltou' ? (
                            <p className='text-muted-foreground text-xs'>
                              Ranking #{activeRankByCandidateId.get(row.candidateId) ?? '-'}
                            </p>
                          ) : (
                            <p className='text-xs text-amber-700'>Fora do ranking</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className='px-3 py-2 text-right'>{row.positivos}</td>
                    <td className='px-3 py-2 text-right'>{row.negativos}</td>
                    <td className='px-3 py-2 text-right'>{row.total}</td>
                    <td
                      className={`px-3 py-2 text-right font-semibold ${
                        row.saldo >= 0 ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {row.saldo >= 0 ? '+' : ''}
                      {row.saldo}
                    </td>
                    <td className='px-3 py-2 text-right'>
                      <Badge
                        variant={row.status === 'faltou' ? 'destructive' : 'secondary'}
                      >
                        {row.status === 'faltou' ? 'Faltou' : 'Ativo'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className='grid gap-2 md:hidden'>
            {orderedRows.map((row) => (
              <Card key={row.candidateId}>
                <CardContent className='space-y-2 p-3'>
                  <div className='flex flex-wrap items-start justify-between gap-2'>
                    <div className='flex min-w-0 flex-1 items-center gap-2'>
                      <div className='relative h-9 w-9 shrink-0 overflow-hidden rounded-full border'>
                        {row.imagemUrl ? (
                          <Image
                            src={row.imagemUrl}
                            alt={row.nomeCompleto}
                            fill
                            sizes='36px'
                            className='object-cover'
                          />
                        ) : (
                          <div className='bg-muted h-full w-full' />
                        )}
                      </div>
                      <div className='min-w-0'>
                        <p className='truncate text-sm font-semibold'>
                          {row.nomeCompleto}
                        </p>
                        <p className='text-muted-foreground text-xs'>
                          {row.status === 'faltou'
                            ? 'Fora do ranking'
                            : `Ranking #${activeRankByCandidateId.get(row.candidateId) ?? '-'}`}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={row.status === 'faltou' ? 'destructive' : 'secondary'}
                      className='shrink-0'
                    >
                      {row.status === 'faltou' ? 'Faltou' : 'Ativo'}
                    </Badge>
                  </div>
                  <div className='grid grid-cols-2 gap-2 text-center text-xs sm:grid-cols-4'>
                    <div className='rounded-md border p-2'>
                      <p className='text-muted-foreground'>Pos</p>
                      <p className='font-semibold'>{row.positivos}</p>
                    </div>
                    <div className='rounded-md border p-2'>
                      <p className='text-muted-foreground'>Neg</p>
                      <p className='font-semibold'>{row.negativos}</p>
                    </div>
                    <div className='rounded-md border p-2'>
                      <p className='text-muted-foreground'>Total</p>
                      <p className='font-semibold'>{row.total}</p>
                    </div>
                    <div className='rounded-md border p-2'>
                      <p className='text-muted-foreground'>Saldo</p>
                      <p
                        className={`font-semibold ${
                          row.saldo >= 0 ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {row.saldo >= 0 ? '+' : ''}
                        {row.saldo}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
