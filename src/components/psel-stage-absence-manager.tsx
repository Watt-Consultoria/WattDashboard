'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  StageEvaluationActor,
  StageEvaluationCandidateView
} from '@/types/candidate/stage-evaluation';

interface PselStageAbsenceManagerProps {
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

export function PselStageAbsenceManager({ actor }: PselStageAbsenceManagerProps) {
  const [stages, setStages] = React.useState<PselStageView[]>([]);
  const [selectedStageKey, setSelectedStageKey] = React.useState('');
  const [candidates, setCandidates] = React.useState<StageEvaluationCandidateView[]>([]);
  const [isLoadingStages, setIsLoadingStages] = React.useState(false);
  const [isLoadingCandidates, setIsLoadingCandidates] = React.useState(false);
  const [isSavingCandidateId, setIsSavingCandidateId] = React.useState<string | null>(
    null
  );

  const canManageAbsence = stageEvaluationService.canUserRegisterAbsence(actor);

  const selectedStage = React.useMemo(
    () => stages.find((stage) => stage.key === selectedStageKey) ?? null,
    [selectedStageKey, stages]
  );

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
      console.error('Erro ao carregar etapas para faltas:', error);
      toast.error('Nao foi possivel carregar as etapas.');
      setStages([]);
      setSelectedStageKey('');
    } finally {
      setIsLoadingStages(false);
    }
  }, []);

  const loadCandidates = React.useCallback(async () => {
    if (!selectedStageKey) {
      setCandidates([]);
      return;
    }

    try {
      setIsLoadingCandidates(true);
      const loaded =
        await stageEvaluationService.getCandidatesForAbsenceManagement(
          selectedStageKey
        );
      setCandidates(loaded);
    } catch (error) {
      console.error('Erro ao carregar candidatos para faltas:', error);
      toast.error('Nao foi possivel carregar os candidatos.');
      setCandidates([]);
    } finally {
      setIsLoadingCandidates(false);
    }
  }, [selectedStageKey]);

  React.useEffect(() => {
    void loadStages();
  }, [loadStages]);

  React.useEffect(() => {
    void loadCandidates();
  }, [loadCandidates]);

  const handleToggleAbsence = React.useCallback(
    async (candidate: StageEvaluationCandidateView) => {
      if (!actor || !selectedStageKey || isSavingCandidateId) return;

      try {
        setIsSavingCandidateId(candidate.candidateId);
        if (candidate.status === 'faltou') {
          const next = await stageEvaluationService.removeCandidateAbsenceInStage({
            candidateId: candidate.candidateId,
            stageKey: selectedStageKey,
            actor
          });
          setCandidates((current) =>
            current.map((item) =>
              item.candidateId === candidate.candidateId
                ? { ...item, status: 'ativo', resumo: next.resumo }
                : item
            )
          );
          toast.success('Falta desfeita com sucesso.');
        } else {
          await stageEvaluationService.registerCandidateAbsenceInStage({
            candidateId: candidate.candidateId,
            stageKey: selectedStageKey,
            actor
          });
          setCandidates((current) =>
            current.map((item) =>
              item.candidateId === candidate.candidateId
                ? {
                    ...item,
                    status: 'faltou',
                    resumo: { positivos: 0, negativos: 0, total: 0, saldo: 0 }
                  }
                : item
            )
          );
          toast.success('Falta registrada com sucesso.');
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Nao foi possivel salvar a falta.';
        toast.error(message);
      } finally {
        setIsSavingCandidateId(null);
      }
    },
    [actor, isSavingCandidateId, selectedStageKey]
  );

  if (!canManageAbsence) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className='text-base'>Registro de faltas</CardTitle>
        </CardHeader>
        <CardContent>
          <p className='text-muted-foreground text-sm'>
            Apenas Assessor, Presidente ou Diretor podem registrar faltas.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className='space-y-3'>
        <div className='flex flex-wrap items-center justify-between gap-2'>
          <CardTitle className='text-base'>Registro de faltas por etapa</CardTitle>
          <Button
            type='button'
            size='sm'
            variant='outline'
            onClick={() => {
              void loadStages();
              void loadCandidates();
            }}
            disabled={isLoadingStages || isLoadingCandidates || Boolean(isSavingCandidateId)}
          >
            Atualizar
          </Button>
        </div>

        <div className='grid gap-2 sm:grid-cols-[1fr_auto]'>
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

      <CardContent className='space-y-3'>
        {selectedStage?.isClosed ? (
          <p className='rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700'>
            Esta etapa esta encerrada. Nao e possivel marcar/desfazer faltas.
          </p>
        ) : null}

        {isLoadingStages || isLoadingCandidates ? (
          <p className='text-muted-foreground text-sm'>Carregando candidatos...</p>
        ) : null}

        {!isLoadingCandidates && candidates.length === 0 ? (
          <p className='text-muted-foreground text-sm'>
            Nenhum candidato encontrado para esta etapa.
          </p>
        ) : null}

        <ScrollArea className='h-[min(60dvh,24rem)] rounded-md border'>
          <div className='space-y-2 p-3'>
            {candidates.map((candidate) => (
              <div
                key={candidate.candidateId}
                className='flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between'
              >
                <div className='min-w-0 flex-1'>
                  <p className='truncate text-sm font-medium'>{candidate.nomeCompleto}</p>
                  <p className='text-muted-foreground text-xs'>
                    {candidate.curso} | {candidate.periodo} periodo
                  </p>
                  <div className='mt-1 flex flex-wrap items-center gap-1'>
                    <Badge
                      variant={candidate.status === 'faltou' ? 'destructive' : 'secondary'}
                    >
                      {candidate.status === 'faltou' ? 'Faltou' : 'Ativo'}
                    </Badge>
                    <Badge variant='outline' className='text-[11px]'>
                      Saldo {candidate.resumo.saldo >= 0 ? '+' : ''}
                      {candidate.resumo.saldo}
                    </Badge>
                  </div>
                </div>

                <Button
                  type='button'
                  size='sm'
                  variant={candidate.status === 'faltou' ? 'secondary' : 'destructive'}
                  onClick={() => void handleToggleAbsence(candidate)}
                  disabled={Boolean(isSavingCandidateId) || selectedStage?.isClosed}
                  className='w-full shrink-0 sm:w-auto'
                >
                  {isSavingCandidateId === candidate.candidateId
                    ? 'Salvando...'
                    : candidate.status === 'faltou'
                      ? 'Desfazer falta'
                      : 'Marcar falta'}
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
