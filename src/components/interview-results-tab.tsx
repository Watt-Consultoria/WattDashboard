'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import type { Candidate } from '@/types/candidate/candidate';
import type {
  InterviewStatistics,
  InterviewResultView,
  DesiredTraitKey,
  UndesiredTraitKey,
  DesiredTraitRating,
  UndesiredTraitAssessment
} from '@/types/interview/interview';
import interviewService from '@/services/interviewService';

// ── Labels reutilizados ──────────────────────────────────────────────────────

const DESIRED_TRAIT_LABELS: Record<DesiredTraitKey, string> = {
  proatividade: 'Proatividade',
  compromisso: 'Compromisso',
  lideranca: 'Liderança',
  proposito: 'Propósito',
  transparencia: 'Transparência',
  autoresponsabilidade: 'Autoresponsabilidade',
  uniaoDeTime: 'União de time',
  autoconfianca: 'Autoconfiança',
  comunicacao: 'Comunicação',
  responsabilidadeSocial: 'Responsabilidade social',
  seriedade: 'Seriedade',
  criatividade: 'Criatividade'
};

const DESIRED_TRAIT_KEYS: DesiredTraitKey[] = [
  'proatividade',
  'compromisso',
  'lideranca',
  'proposito',
  'transparencia',
  'autoresponsabilidade',
  'uniaoDeTime',
  'autoconfianca',
  'comunicacao',
  'responsabilidadeSocial',
  'seriedade',
  'criatividade'
];

const UNDESIRED_TRAIT_LABELS: Record<UndesiredTraitKey, string> = {
  procrastinacao: 'Procrastinação',
  propositoVago: 'Propósito vago',
  desinteresse: 'Desinteresse',
  vitimizacao: 'Vitimização',
  faltaDeTransparencia: 'Falta de transparência',
  faltaDeConfianca: 'Falta de confiança'
};

const UNDESIRED_TRAIT_KEYS: UndesiredTraitKey[] = [
  'procrastinacao',
  'propositoVago',
  'desinteresse',
  'vitimizacao',
  'faltaDeTransparencia',
  'faltaDeConfianca'
];

const ASSESSMENT_LABELS: Record<UndesiredTraitAssessment, string> = {
  notPresented: 'Não apresentou',
  presented: 'Apresentou',
  unclear: 'Não ficou claro'
};

const ASSESSMENT_COLORS: Record<UndesiredTraitAssessment, string> = {
  notPresented: 'text-green-600 dark:text-green-400',
  presented: 'text-red-600 dark:text-red-400',
  unclear: 'text-amber-600 dark:text-amber-400'
};

/** Cores para a barra de progresso conforme a nota média (1–5). */
function ratingBarColor(avg: number): string {
  if (avg >= 4) return 'bg-green-500';
  if (avg >= 3) return 'bg-amber-500';
  if (avg >= 2) return 'bg-orange-500';
  return 'bg-red-500';
}

function ratingTextColor(val: number): string {
  if (val >= 4) return 'text-green-600 dark:text-green-400';
  if (val >= 3) return 'text-amber-600 dark:text-amber-400';
  if (val >= 2) return 'text-orange-600 dark:text-orange-400';
  return 'text-red-600 dark:text-red-400';
}

/** Formata nota de 1–5 com ★ preenchidas. */
function renderStars(value: DesiredTraitRating): React.ReactNode {
  return (
    <span className='inline-flex gap-0.5'>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className={cn(
            'text-xs',
            n <= value ? 'text-amber-500' : 'text-muted-foreground/30'
          )}
        >
          ★
        </span>
      ))}
    </span>
  );
}

// ── Props ────────────────────────────────────────────────────────────────────

export interface InterviewResultsTabProps {
  /** Lista de candidatos (já filtrada — ativos ou todos). */
  candidates: Candidate[];
}

// ── Componente principal ─────────────────────────────────────────────────────

export function InterviewResultsTab({ candidates }: InterviewResultsTabProps) {
  const stats: InterviewStatistics = React.useMemo(
    () => interviewService.computeInterviewStatistics(candidates),
    [candidates]
  );

  if (stats.totalEvaluated === 0) {
    return (
      <div className='flex h-60 items-center justify-center'>
        <p className='text-muted-foreground text-sm'>
          Nenhuma entrevista avaliada ainda.
        </p>
      </div>
    );
  }

  return (
    <Tabs defaultValue='ranking' className='w-full'>
      <TabsList className='mb-4 grid w-full grid-cols-3'>
        <TabsTrigger value='ranking' className='text-xs sm:text-sm'>
          Ranking
        </TabsTrigger>
        <TabsTrigger value='statistics' className='text-xs sm:text-sm'>
          Estatísticas
        </TabsTrigger>
        <TabsTrigger value='details' className='text-xs sm:text-sm'>
          Detalhes
        </TabsTrigger>
      </TabsList>

      {/* ── Ranking ────────────────────────────────────────────────────── */}
      <TabsContent value='ranking'>
        <RankingSection rankings={stats.rankings} />
      </TabsContent>

      {/* ── Estatísticas agregadas ─────────────────────────────────────── */}
      <TabsContent value='statistics'>
        <AggregateStatisticsSection stats={stats} />
      </TabsContent>

      {/* ── Detalhes individuais ───────────────────────────────────────── */}
      <TabsContent value='details'>
        <IndividualDetailsSection rankings={stats.rankings} />
      </TabsContent>
    </Tabs>
  );
}

// ── Sub-componentes ──────────────────────────────────────────────────────────

function RankingSection({ rankings }: { rankings: InterviewResultView[] }) {
  return (
    <Card>
      <CardHeader className='pb-3'>
        <CardTitle className='text-base'>
          Ranking de candidatos
          <Badge variant='secondary' className='ml-2 text-xs'>
            {rankings.length} avaliado{rankings.length !== 1 ? 's' : ''}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className='p-0'>
        <div className='divide-y'>
          {rankings.map((r, idx) => (
            <div
              key={r.candidateId}
              className='flex items-center gap-3 px-3 py-3 sm:px-4'
            >
              {/* Posição */}
              <span
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                  idx === 0
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                    : idx === 1
                      ? 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                      : idx === 2
                        ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400'
                        : 'bg-muted text-muted-foreground'
                )}
              >
                {idx + 1}
              </span>

              {/* Nome */}
              <div className='min-w-0 flex-1'>
                <p className='truncate text-sm font-medium'>
                  {r.candidateName}
                </p>
                <p className='text-muted-foreground text-xs'>
                  Média desejadas:{' '}
                  <span className={ratingTextColor(r.desiredTraitsAverage)}>
                    {r.desiredTraitsAverage.toFixed(2)}
                  </span>
                  {r.undesiredPresented > 0 && (
                    <span className='ml-2 text-red-500'>
                      {r.undesiredPresented} indesejada
                      {r.undesiredPresented !== 1 ? 's' : ''}
                    </span>
                  )}
                </p>
              </div>

              {/* Score */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      className={cn(
                        'shrink-0 text-lg font-bold tabular-nums',
                        ratingTextColor(r.finalScore)
                      )}
                    >
                      {r.finalScore.toFixed(2)}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side='left'>
                    <p className='text-xs'>
                      Pontuação final = média desejadas − penalidades
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function AggregateStatisticsSection({ stats }: { stats: InterviewStatistics }) {
  return (
    <div className='space-y-4'>
      {/* Resumo geral */}
      <div className='grid grid-cols-2 gap-3 sm:grid-cols-3'>
        <Card>
          <CardContent className='p-4 text-center'>
            <p className='text-muted-foreground text-xs'>Avaliados</p>
            <p className='text-2xl font-bold'>{stats.totalEvaluated}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className='p-4 text-center'>
            <p className='text-muted-foreground text-xs'>Média geral</p>
            <p
              className={cn(
                'text-2xl font-bold',
                ratingTextColor(stats.overallDesiredAverage)
              )}
            >
              {stats.overallDesiredAverage.toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card className='col-span-2 sm:col-span-1'>
          <CardContent className='p-4 text-center'>
            <p className='text-muted-foreground text-xs'>Melhor nota</p>
            <p className='text-2xl font-bold text-green-600 dark:text-green-400'>
              {stats.rankings.length > 0
                ? stats.rankings[0].finalScore.toFixed(2)
                : '—'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Médias por qualidade desejada */}
      <Card>
        <CardHeader className='pb-3'>
          <CardTitle className='text-sm'>
            Média por qualidade desejada
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-3'>
          {DESIRED_TRAIT_KEYS.map((key) => {
            const avg = stats.desiredTraitAverages[key];
            return (
              <div key={key} className='space-y-1'>
                <div className='flex items-center justify-between text-xs'>
                  <span>{DESIRED_TRAIT_LABELS[key]}</span>
                  <span className={cn('font-medium', ratingTextColor(avg))}>
                    {avg.toFixed(2)}
                  </span>
                </div>
                <div className='bg-muted h-2 overflow-hidden rounded-full'>
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      ratingBarColor(avg)
                    )}
                    style={{ width: `${(avg / 5) * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Distribuição de habilidades indesejadas */}
      <Card>
        <CardHeader className='pb-3'>
          <CardTitle className='text-sm'>
            Habilidades indesejadas — distribuição
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className='space-y-3'>
            {UNDESIRED_TRAIT_KEYS.map((key) => {
              const dist = stats.undesiredTraitDistribution[key];
              const total = dist.notPresented + dist.presented + dist.unclear;
              return (
                <div key={key} className='space-y-1'>
                  <p className='text-xs font-medium'>
                    {UNDESIRED_TRAIT_LABELS[key]}
                  </p>
                  <div className='flex flex-wrap gap-x-3 gap-y-0.5 text-xs'>
                    <span className='text-green-600 dark:text-green-400'>
                      Não apresentou: {dist.notPresented}
                      {total > 0 &&
                        ` (${Math.round((dist.notPresented / total) * 100)}%)`}
                    </span>
                    <span className='text-red-600 dark:text-red-400'>
                      Apresentou: {dist.presented}
                      {total > 0 &&
                        ` (${Math.round((dist.presented / total) * 100)}%)`}
                    </span>
                    <span className='text-amber-600 dark:text-amber-400'>
                      Incerto: {dist.unclear}
                      {total > 0 &&
                        ` (${Math.round((dist.unclear / total) * 100)}%)`}
                    </span>
                  </div>
                  {/* Stacked bar */}
                  {total > 0 && (
                    <div className='flex h-2 overflow-hidden rounded-full'>
                      <div
                        className='bg-green-500'
                        style={{
                          width: `${(dist.notPresented / total) * 100}%`
                        }}
                      />
                      <div
                        className='bg-red-500'
                        style={{
                          width: `${(dist.presented / total) * 100}%`
                        }}
                      />
                      <div
                        className='bg-amber-500'
                        style={{
                          width: `${(dist.unclear / total) * 100}%`
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function IndividualDetailsSection({
  rankings
}: {
  rankings: InterviewResultView[];
}) {
  return (
    <Card>
      <CardHeader className='pb-3'>
        <CardTitle className='text-base'>Detalhes por candidato</CardTitle>
      </CardHeader>
      <CardContent className='p-0'>
        <Accordion type='single' collapsible className='px-3 sm:px-4'>
          {rankings.map((r) => (
            <AccordionItem key={r.candidateId} value={r.candidateId}>
              <AccordionTrigger className='py-3 text-sm hover:no-underline'>
                <div className='flex w-full items-center gap-2 pr-2'>
                  <span className='flex-1 truncate text-left font-medium'>
                    {r.candidateName}
                  </span>
                  <Badge
                    variant='outline'
                    className={cn(
                      'shrink-0 text-xs',
                      ratingTextColor(r.finalScore)
                    )}
                  >
                    {r.finalScore.toFixed(2)}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className='space-y-4 pb-2'>
                  {/* Avaliador e data */}
                  <p className='text-muted-foreground text-xs'>
                    Avaliado por{' '}
                    <span className='text-foreground font-medium'>
                      {r.result.reviewer.name}
                    </span>{' '}
                    em{' '}
                    {new Date(r.result.reviewedAt).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>

                  {/* Qualidades desejadas */}
                  <div>
                    <p className='mb-2 text-xs font-semibold'>
                      Qualidades desejadas
                    </p>
                    <div className='grid grid-cols-1 gap-1.5 sm:grid-cols-2'>
                      {DESIRED_TRAIT_KEYS.map((key) => (
                        <div
                          key={key}
                          className='flex items-center justify-between gap-2 text-xs'
                        >
                          <span className='text-muted-foreground'>
                            {DESIRED_TRAIT_LABELS[key]}
                          </span>
                          {renderStars(r.result.desiredTraits[key])}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Habilidades indesejadas */}
                  <div>
                    <p className='mb-2 text-xs font-semibold'>
                      Habilidades indesejadas
                    </p>
                    <div className='grid grid-cols-1 gap-1.5 sm:grid-cols-2'>
                      {UNDESIRED_TRAIT_KEYS.map((key) => {
                        const assessment = r.result.undesiredTraits[key];
                        return (
                          <div
                            key={key}
                            className='flex items-center justify-between gap-2 text-xs'
                          >
                            <span className='text-muted-foreground'>
                              {UNDESIRED_TRAIT_LABELS[key]}
                            </span>
                            <span
                              className={cn(
                                'font-medium',
                                ASSESSMENT_COLORS[assessment]
                              )}
                            >
                              {ASSESSMENT_LABELS[assessment]}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Observações */}
                  {r.result.notes && (
                    <div>
                      <p className='mb-1 text-xs font-semibold'>Observações</p>
                      <p className='bg-muted rounded-md p-2 text-xs whitespace-pre-wrap'>
                        {r.result.notes}
                      </p>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
