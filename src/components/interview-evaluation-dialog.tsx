'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import interviewService from '@/services/interviewService';
import type {
  DesiredTraitKey,
  DesiredTraitRating,
  UndesiredTraitKey,
  UndesiredTraitAssessment,
  InterviewDesiredTraits,
  InterviewUndesiredTraits
} from '@/types/interview/interview';

// ---------------------------------------------------------------------------
// Constantes de configuração
// ---------------------------------------------------------------------------

/** Labels em português para cada qualidade desejada */
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

/** Ordem de exibição das qualidades desejadas */
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

/** Descrições da escala numérica (1–5) */
const RATING_DESCRIPTIONS: Record<DesiredTraitRating, string> = {
  1: 'Não apresentou desempenho correspondente com as expectativas',
  2: 'Apresentou um desempenho abaixo do correspondente com as expectativas',
  3: 'Apresentou um desempenho razoável correspondente com as expectativas',
  4: 'Apresentou um bom desempenho correspondente com as expectativas',
  5: 'Apresentou um ótimo desempenho correspondente com as expectativas'
};

/** Labels em português para cada habilidade indesejada */
const UNDESIRED_TRAIT_LABELS: Record<UndesiredTraitKey, string> = {
  procrastinacao: 'Procrastinação',
  propositoVago: 'Propósito vago',
  desinteresse: 'Desinteresse',
  vitimizacao: 'Vitimização',
  faltaDeTransparencia: 'Falta de transparência',
  faltaDeConfianca: 'Falta de confiança'
};

/** Ordem de exibição das habilidades indesejadas */
const UNDESIRED_TRAIT_KEYS: UndesiredTraitKey[] = [
  'procrastinacao',
  'propositoVago',
  'desinteresse',
  'vitimizacao',
  'faltaDeTransparencia',
  'faltaDeConfianca'
];

/** Labels e cores para cada classificação qualitativa */
const ASSESSMENT_OPTIONS: {
  value: UndesiredTraitAssessment;
  label: string;
  shortLabel: string;
  color: string;
  bgColor: string;
  borderColor: string;
}[] = [
  {
    value: 'notPresented',
    label: 'Não apresentou',
    shortLabel: 'Não',
    color: 'text-emerald-700 dark:text-emerald-400',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
    borderColor: 'border-emerald-300 dark:border-emerald-700'
  },
  {
    value: 'unclear',
    label: 'Pareceu apresentar, mas não ficou claro',
    shortLabel: 'Incerto',
    color: 'text-amber-700 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-950/30',
    borderColor: 'border-amber-300 dark:border-amber-700'
  },
  {
    value: 'presented',
    label: 'Apresentou',
    shortLabel: 'Sim',
    color: 'text-red-700 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-950/30',
    borderColor: 'border-red-300 dark:border-red-700'
  }
];

/** Cores para cada nota (1–5) */
const RATING_COLORS: Record<
  DesiredTraitRating,
  { bg: string; border: string; text: string }
> = {
  1: {
    bg: 'bg-red-100 dark:bg-red-950/40',
    border: 'border-red-300 dark:border-red-700',
    text: 'text-red-700 dark:text-red-400'
  },
  2: {
    bg: 'bg-orange-100 dark:bg-orange-950/40',
    border: 'border-orange-300 dark:border-orange-700',
    text: 'text-orange-700 dark:text-orange-400'
  },
  3: {
    bg: 'bg-amber-100 dark:bg-amber-950/40',
    border: 'border-amber-300 dark:border-amber-700',
    text: 'text-amber-700 dark:text-amber-400'
  },
  4: {
    bg: 'bg-emerald-100 dark:bg-emerald-950/40',
    border: 'border-emerald-300 dark:border-emerald-700',
    text: 'text-emerald-700 dark:text-emerald-400'
  },
  5: {
    bg: 'bg-green-100 dark:bg-green-950/40',
    border: 'border-green-300 dark:border-green-700',
    text: 'text-green-700 dark:text-green-400'
  }
};

// ---------------------------------------------------------------------------
// Tipos do componente
// ---------------------------------------------------------------------------

export type InterviewEvaluationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidateId: string;
  candidateName: string;
  reviewerId: string;
  reviewerName: string;
  /** Callback executado após submissão bem-sucedida */
  onSuccess?: () => void;
};

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export function InterviewEvaluationDialog({
  open,
  onOpenChange,
  candidateId,
  candidateName,
  reviewerId,
  reviewerName,
  onSuccess
}: InterviewEvaluationDialogProps) {
  const [desiredTraits, setDesiredTraits] = React.useState<
    Partial<InterviewDesiredTraits>
  >({});
  const [undesiredTraits, setUndesiredTraits] = React.useState<
    Partial<InterviewUndesiredTraits>
  >({});
  const [notes, setNotes] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [activeSection, setActiveSection] = React.useState<
    'desired' | 'undesired'
  >('desired');

  // Reset ao abrir o dialog
  React.useEffect(() => {
    if (open) {
      setDesiredTraits({});
      setUndesiredTraits({});
      setNotes('');
      setActiveSection('desired');
    }
  }, [open]);

  const desiredCount = Object.keys(desiredTraits).length;
  const undesiredCount = Object.keys(undesiredTraits).length;
  const totalDesired = DESIRED_TRAIT_KEYS.length;
  const totalUndesired = UNDESIRED_TRAIT_KEYS.length;
  const isComplete =
    desiredCount === totalDesired && undesiredCount === totalUndesired;

  function handleDesiredRating(
    key: DesiredTraitKey,
    value: DesiredTraitRating
  ) {
    setDesiredTraits((prev) => ({ ...prev, [key]: value }));
  }

  function handleUndesiredAssessment(
    key: UndesiredTraitKey,
    value: UndesiredTraitAssessment
  ) {
    setUndesiredTraits((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    if (!isComplete) {
      toast.error('Preencha todas as avaliações antes de enviar.');
      return;
    }

    setIsSubmitting(true);
    try {
      await interviewService.submitInterviewResult({
        candidateId,
        reviewerId,
        reviewerName,
        desiredTraits: desiredTraits as InterviewDesiredTraits,
        undesiredTraits: undesiredTraits as InterviewUndesiredTraits,
        notes: notes.trim() || ''
      });
      toast.success('Avaliação registrada com sucesso!');
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast.error(error?.message ?? 'Erro ao registrar avaliação.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='flex max-h-[95dvh] w-[95vw] max-w-2xl flex-col gap-0 overflow-hidden p-0'>
        <DialogHeader className='space-y-1 px-6 pt-6 pb-4'>
          <DialogTitle className='text-lg'>Avaliação de Entrevista</DialogTitle>
          <DialogDescription>
            Avaliando: <span className='font-semibold'>{candidateName}</span>
          </DialogDescription>
        </DialogHeader>

        {/* Abas de seção */}
        <div className='flex items-center gap-1 border-b px-6'>
          <button
            type='button'
            className={cn(
              'relative px-3 py-2 text-sm font-medium transition-colors',
              activeSection === 'desired'
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground/80'
            )}
            onClick={() => setActiveSection('desired')}
          >
            Qualidades desejadas
            <Badge
              variant={desiredCount === totalDesired ? 'default' : 'secondary'}
              className='ml-1.5 h-5 px-1.5 text-[10px]'
            >
              {desiredCount}/{totalDesired}
            </Badge>
            {activeSection === 'desired' && (
              <span className='bg-primary absolute right-0 bottom-0 left-0 h-0.5 rounded-t-full' />
            )}
          </button>
          <button
            type='button'
            className={cn(
              'relative px-3 py-2 text-sm font-medium transition-colors',
              activeSection === 'undesired'
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground/80'
            )}
            onClick={() => setActiveSection('undesired')}
          >
            Habilidades indesejadas
            <Badge
              variant={
                undesiredCount === totalUndesired ? 'default' : 'secondary'
              }
              className='ml-1.5 h-5 px-1.5 text-[10px]'
            >
              {undesiredCount}/{totalUndesired}
            </Badge>
            {activeSection === 'undesired' && (
              <span className='bg-primary absolute right-0 bottom-0 left-0 h-0.5 rounded-t-full' />
            )}
          </button>
        </div>

        {/* Conteúdo scrollável */}
        <ScrollArea className='flex-1 overflow-y-auto'>
          <div className='space-y-6 px-6 py-4'>
            {/* ── Qualidades desejadas ── */}
            {activeSection === 'desired' && (
              <>
                <p className='text-muted-foreground text-xs'>
                  Avalie cada qualidade com nota de <strong>1</strong> (não
                  apresentou) a <strong>5</strong> (ótimo desempenho). Passe o
                  mouse sobre cada nota para ver a descrição.
                </p>

                <div className='space-y-3'>
                  {DESIRED_TRAIT_KEYS.map((key) => {
                    const currentValue = desiredTraits[key];
                    return (
                      <div key={key} className='rounded-lg border p-3'>
                        <Label className='mb-2 block text-sm font-medium'>
                          {DESIRED_TRAIT_LABELS[key]}
                        </Label>
                        <div className='flex flex-wrap gap-1.5'>
                          {([1, 2, 3, 4, 5] as DesiredTraitRating[]).map(
                            (rating) => {
                              const isSelected = currentValue === rating;
                              const colors = RATING_COLORS[rating];
                              return (
                                <Tooltip key={rating}>
                                  <TooltipTrigger asChild>
                                    <button
                                      type='button'
                                      className={cn(
                                        'flex h-9 w-9 items-center justify-center rounded-md border text-sm font-semibold transition-all',
                                        isSelected
                                          ? cn(
                                              colors.bg,
                                              colors.border,
                                              colors.text,
                                              'ring-2 ring-offset-1',
                                              'ring-current'
                                            )
                                          : 'border-muted-foreground/20 hover:border-muted-foreground/40 text-muted-foreground hover:bg-muted/50'
                                      )}
                                      onClick={() =>
                                        handleDesiredRating(key, rating)
                                      }
                                    >
                                      {rating}
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent
                                    side='top'
                                    className='max-w-60 text-center'
                                  >
                                    {RATING_DESCRIPTIONS[rating]}
                                  </TooltipContent>
                                </Tooltip>
                              );
                            }
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* ── Habilidades indesejadas ── */}
            {activeSection === 'undesired' && (
              <>
                <p className='text-muted-foreground text-xs'>
                  Classifique cada habilidade/comportamento indesejado observado
                  durante a entrevista.
                </p>

                <div className='space-y-3'>
                  {UNDESIRED_TRAIT_KEYS.map((key) => {
                    const currentValue = undesiredTraits[key];
                    return (
                      <div key={key} className='rounded-lg border p-3'>
                        <Label className='mb-2 block text-sm font-medium'>
                          {UNDESIRED_TRAIT_LABELS[key]}
                        </Label>
                        <div className='flex flex-wrap gap-1.5'>
                          {ASSESSMENT_OPTIONS.map((option) => {
                            const isSelected = currentValue === option.value;
                            return (
                              <Tooltip key={option.value}>
                                <TooltipTrigger asChild>
                                  <button
                                    type='button'
                                    className={cn(
                                      'rounded-md border px-3 py-1.5 text-xs font-medium transition-all',
                                      isSelected
                                        ? cn(
                                            option.bgColor,
                                            option.borderColor,
                                            option.color,
                                            'ring-2 ring-offset-1',
                                            'ring-current'
                                          )
                                        : 'border-muted-foreground/20 hover:border-muted-foreground/40 text-muted-foreground hover:bg-muted/50'
                                    )}
                                    onClick={() =>
                                      handleUndesiredAssessment(
                                        key,
                                        option.value
                                      )
                                    }
                                  >
                                    {option.shortLabel}
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent
                                  side='top'
                                  className='max-w-60 text-center'
                                >
                                  {option.label}
                                </TooltipContent>
                              </Tooltip>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Observações gerais */}
                <div className='space-y-2'>
                  <Label htmlFor='eval-notes' className='text-sm font-medium'>
                    Observações gerais{' '}
                    <span className='text-muted-foreground font-normal'>
                      (opcional)
                    </span>
                  </Label>
                  <Textarea
                    id='eval-notes'
                    placeholder='Observações adicionais sobre a entrevista...'
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className='resize-none'
                  />
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <DialogFooter className='border-t px-6 py-4'>
          <div className='flex w-full items-center justify-between gap-3'>
            <p className='text-muted-foreground text-xs'>
              {desiredCount + undesiredCount}/{totalDesired + totalUndesired}{' '}
              preenchidos
            </p>
            <div className='flex gap-2'>
              {activeSection === 'desired' && (
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={() => setActiveSection('undesired')}
                >
                  Próximo
                </Button>
              )}
              {activeSection === 'undesired' && (
                <>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={() => setActiveSection('desired')}
                  >
                    Voltar
                  </Button>
                  <Button
                    type='button'
                    size='sm'
                    onClick={handleSubmit}
                    disabled={!isComplete || isSubmitting}
                  >
                    {isSubmitting ? 'Enviando...' : 'Enviar avaliação'}
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
