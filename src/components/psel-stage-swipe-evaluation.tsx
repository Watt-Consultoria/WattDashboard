'use client';

import * as React from 'react';
import { toast } from 'sonner';
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
import { PselStageCandidateCard } from '@/components/psel-stage-candidate-card';
import stageEvaluationService from '@/services/stageEvaluationService';
import type {
  PselStageVoteType,
  PselStageView,
  StageEvaluationActor,
  StageEvaluationCandidateView
} from '@/types/candidate/stage-evaluation';

interface PselStageSwipeEvaluationProps {
  actor: StageEvaluationActor | null;
}

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

export function PselStageSwipeEvaluation({ actor }: PselStageSwipeEvaluationProps) {
  const [stages, setStages] = React.useState<PselStageView[]>([]);
  const [selectedStageKey, setSelectedStageKey] = React.useState('');
  const [candidates, setCandidates] = React.useState<StageEvaluationCandidateView[]>([]);
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [isLoadingStages, setIsLoadingStages] = React.useState(false);
  const [isLoadingCandidates, setIsLoadingCandidates] = React.useState(false);
  const [isSubmittingVote, setIsSubmittingVote] = React.useState(false);

  const canEvaluate = stageEvaluationService.canUserEvaluateStage(actor);

  const selectedStage = React.useMemo(
    () => stages.find((stage) => stage.key === selectedStageKey) ?? null,
    [selectedStageKey, stages]
  );

  const currentCandidate =
    candidates.length > 0
      ? candidates[Math.min(currentIndex, candidates.length - 1)]
      : null;

  const loadStages = React.useCallback(async () => {
    try {
      setIsLoadingStages(true);
      const loadedStages = await stageEvaluationService.getAvailableStagesForEvaluation();
      setStages(loadedStages);

      setSelectedStageKey((current) => {
        if (current && loadedStages.some((stage) => stage.key === current)) {
          return current;
        }
        return loadedStages[0]?.key ?? '';
      });
    } catch (error) {
      console.error('Erro ao carregar etapas de avaliacao:', error);
      toast.error('Nao foi possivel carregar as etapas.');
      setStages([]);
      setSelectedStageKey('');
    } finally {
      setIsLoadingStages(false);
    }
  }, []);

  const loadCandidates = React.useCallback(async () => {
    if (!selectedStageKey || !actor?.id || !canEvaluate) {
      setCandidates([]);
      setCurrentIndex(0);
      return;
    }

    try {
      setIsLoadingCandidates(true);
      const loadedCandidates =
        await stageEvaluationService.getCandidatesForStageEvaluation(
          selectedStageKey,
          actor.id
        );

      setCandidates(loadedCandidates);
      setCurrentIndex((current) =>
        loadedCandidates.length === 0
          ? 0
          : Math.min(current, loadedCandidates.length - 1)
      );
    } catch (error) {
      console.error('Erro ao carregar candidatos para avaliacao:', error);
      toast.error('Nao foi possivel carregar os candidatos da etapa.');
      setCandidates([]);
      setCurrentIndex(0);
    } finally {
      setIsLoadingCandidates(false);
    }
  }, [actor?.id, canEvaluate, selectedStageKey]);

  React.useEffect(() => {
    void loadStages();
  }, [loadStages]);

  React.useEffect(() => {
    void loadCandidates();
  }, [loadCandidates]);

  const handleVote = React.useCallback(
    async (voteType: PselStageVoteType) => {
      if (!actor || !currentCandidate || !selectedStageKey || isSubmittingVote) {
        return;
      }

      try {
        setIsSubmittingVote(true);
        const nextEvaluation = await stageEvaluationService.evaluateCandidateInStage({
          candidateId: currentCandidate.candidateId,
          stageKey: selectedStageKey,
          voteType,
          actor
        });

        setCandidates((currentList) =>
          currentList.map((candidate) =>
            candidate.candidateId === currentCandidate.candidateId
              ? {
                  ...candidate,
                  hasVoted: true,
                  currentVote: voteType,
                  resumo: nextEvaluation.resumo
                }
              : candidate
          )
        );

        setCurrentIndex((current) =>
          candidates.length === 0 ? 0 : Math.min(current + 1, candidates.length - 1)
        );

        toast.success('Voto registrado com sucesso.');
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Nao foi possivel registrar o voto.';
        toast.error(message);
      } finally {
        setIsSubmittingVote(false);
      }
    },
    [actor, candidates.length, currentCandidate, isSubmittingVote, selectedStageKey]
  );

  if (!canEvaluate) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className='text-base'>Avaliacao por etapa</CardTitle>
        </CardHeader>
        <CardContent>
          <p className='text-muted-foreground text-sm'>
            Somente membros com a tag <b>psel</b> podem votar.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className='space-y-3'>
        <div className='flex flex-wrap items-center justify-between gap-2'>
          <CardTitle className='text-base'>Avaliacao por swipe</CardTitle>
          <Button
            type='button'
            size='sm'
            variant='outline'
            onClick={() => {
              void loadStages();
              void loadCandidates();
            }}
            disabled={isLoadingStages || isLoadingCandidates || isSubmittingVote}
          >
            Atualizar
          </Button>
        </div>

        <div className='grid gap-2 sm:grid-cols-[1fr_auto]'>
          <Select
            value={selectedStageKey}
            onValueChange={(value) => {
              setSelectedStageKey(value);
              setCurrentIndex(0);
            }}
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

          {selectedStage ? (
            <div className='flex flex-wrap items-center gap-2'>
              <Badge variant={selectedStage.isClosed ? 'destructive' : 'secondary'}>
                {selectedStage.isClosed ? 'Encerrada' : 'Aberta'}
              </Badge>
              <span className='text-muted-foreground text-xs'>
                Prazo: {formatDeadline(selectedStage.deadline)}
              </span>
            </div>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className='space-y-4'>
        {isLoadingStages || isLoadingCandidates ? (
          <p className='text-muted-foreground text-sm'>Carregando avaliacao...</p>
        ) : null}

        {!isLoadingStages && stages.length === 0 ? (
          <p className='text-muted-foreground text-sm'>
            Nenhuma etapa configurada em `GlobalInfo/etapasPsel`.
          </p>
        ) : null}

        {selectedStage?.isClosed ? (
          <p className='rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700'>
            Esta etapa esta encerrada. Nao e possivel enviar novos votos.
          </p>
        ) : null}

        {!isLoadingCandidates && selectedStageKey && candidates.length === 0 ? (
          <p className='text-muted-foreground text-sm'>
            Nenhum candidato ativo disponivel para votacao nesta etapa.
          </p>
        ) : null}

        {currentCandidate ? (
          <div className='space-y-3'>
            <div className='flex flex-wrap items-center justify-between gap-2 text-xs'>
              <span className='text-muted-foreground'>
                Candidato {currentIndex + 1} de {candidates.length}
              </span>
              {currentCandidate.hasVoted ? (
                <Badge variant='outline'>
                  Voto atual: {currentCandidate.currentVote ?? '-'}
                </Badge>
              ) : (
                <Badge variant='secondary'>Ainda nao avaliado por voce</Badge>
              )}
            </div>

            <PselStageCandidateCard
              candidate={currentCandidate}
              disabled={selectedStage?.isClosed}
              isSubmitting={isSubmittingVote}
              onVote={handleVote}
            />

            <div className='flex items-center justify-between gap-2'>
              <Button
                type='button'
                variant='ghost'
                size='sm'
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex((current) => Math.max(current - 1, 0))}
              >
                Anterior
              </Button>
              <Button
                type='button'
                variant='ghost'
                size='sm'
                disabled={currentIndex >= candidates.length - 1}
                onClick={() =>
                  setCurrentIndex((current) =>
                    Math.min(current + 1, candidates.length - 1)
                  )
                }
              >
                Proximo
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
