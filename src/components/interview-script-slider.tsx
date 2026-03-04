'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import interviewScriptService from '@/services/interviewScriptService';
import type { InterviewSliderState } from '@/types/interview/interview-script';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChevronLeft,
  faChevronRight,
  faLightbulb,
  faMagnifyingGlass,
  faCommentDots
} from '@fortawesome/free-solid-svg-icons';

interface InterviewScriptSliderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Modal com o slider/carrossel de perguntas do roteiro de entrevista.
 *
 * Apresenta uma pergunta por vez com:
 * - Seção/bloco temático
 * - Pergunta principal
 * - Dicas para o entrevistador
 * - O que observar na resposta (quando disponível)
 * - Exemplos de aprofundamento (quando disponíveis)
 * - Navegação anterior/próxima com indicador de progresso
 */
export function InterviewScriptSliderDialog({
  open,
  onOpenChange
}: InterviewScriptSliderDialogProps) {
  const [sliderState, setSliderState] =
    React.useState<InterviewSliderState | null>(null);

  // Inicializa o slider quando o modal abre
  React.useEffect(() => {
    if (open) {
      const initialState = interviewScriptService.buildInitialSliderState();
      setSliderState(initialState);
    }
  }, [open]);

  const handleNext = React.useCallback(() => {
    if (!sliderState) return;
    const next = interviewScriptService.navigateNext(sliderState);
    if (next) setSliderState(next);
  }, [sliderState]);

  const handlePrevious = React.useCallback(() => {
    if (!sliderState) return;
    const prev = interviewScriptService.navigatePrevious(sliderState);
    if (prev) setSliderState(prev);
  }, [sliderState]);

  const handleKeyDown = React.useCallback(
    (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrevious();
    },
    [open, handleNext, handlePrevious]
  );

  React.useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!sliderState) return null;

  const { currentIndex, totalQuestions, currentQuestion } = sliderState;
  const questionNumber =
    interviewScriptService.getCurrentQuestionNumber(currentIndex);
  const progressPercent = interviewScriptService.getProgressPercent(
    currentIndex,
    totalQuestions
  );
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === totalQuestions - 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className='flex max-h-[90vh] w-full max-w-2xl flex-col gap-0 overflow-hidden p-0'
        onInteractOutside={(e) => e.preventDefault()}
      >
        {/* Cabeçalho fixo */}
        <div className='border-b px-6 pt-5 pb-4'>
          <DialogHeader className='mb-3'>
            <div className='flex items-center justify-between gap-3'>
              <DialogTitle className='text-base font-semibold'>
                Roteiro de Entrevista
              </DialogTitle>
              <span className='text-muted-foreground text-xs font-medium tabular-nums'>
                {questionNumber} / {totalQuestions}
              </span>
            </div>
          </DialogHeader>
          <Progress value={progressPercent} className='h-1.5' />
        </div>

        {/* Corpo rolável */}
        <div className='flex-1 overflow-y-auto px-6 py-5'>
          {/* Seção */}
          <div className='mb-4'>
            <Badge
              variant='outline'
              className='border-primary/30 text-primary bg-primary/5 text-xs font-semibold tracking-wide uppercase'
            >
              {currentQuestion.section}
            </Badge>
          </div>

          {/* Pergunta principal */}
          <p className='mb-6 text-lg leading-snug font-medium'>
            {currentQuestion.question}
          </p>

          {/* Dicas para o entrevistador */}
          {currentQuestion.tipsForInterviewer.length > 0 && (
            <div className='mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800/40 dark:bg-amber-950/20'>
              <div className='mb-2 flex items-center gap-2'>
                <FontAwesomeIcon
                  icon={faLightbulb}
                  className='h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400'
                />
                <span className='text-xs font-semibold tracking-wide text-amber-800 uppercase dark:text-amber-300'>
                  Dicas para o entrevistador
                </span>
              </div>
              <ul className='space-y-1.5'>
                {currentQuestion.tipsForInterviewer.map((tip, i) => (
                  <li
                    key={i}
                    className='flex items-start gap-2 text-sm leading-snug text-amber-900 dark:text-amber-200'
                  >
                    <span className='mt-1 shrink-0 text-xs text-amber-500'>
                      •
                    </span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* O que observar */}
          {currentQuestion.whatToObserve && (
            <div className='mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800/40 dark:bg-blue-950/20'>
              <div className='mb-2 flex items-center gap-2'>
                <FontAwesomeIcon
                  icon={faMagnifyingGlass}
                  className='h-3.5 w-3.5 shrink-0 text-blue-600 dark:text-blue-400'
                />
                <span className='text-xs font-semibold tracking-wide text-blue-800 uppercase dark:text-blue-300'>
                  O que observar
                </span>
              </div>
              <p className='text-sm leading-snug text-blue-900 dark:text-blue-200'>
                {currentQuestion.whatToObserve}
              </p>
            </div>
          )}

          {/* Perguntas de aprofundamento */}
          {currentQuestion.exampleFollowUps &&
            currentQuestion.exampleFollowUps.length > 0 && (
              <div className='mb-2 rounded-lg border border-violet-200 bg-violet-50 p-4 dark:border-violet-800/40 dark:bg-violet-950/20'>
                <div className='mb-2 flex items-center gap-2'>
                  <FontAwesomeIcon
                    icon={faCommentDots}
                    className='h-3.5 w-3.5 shrink-0 text-violet-600 dark:text-violet-400'
                  />
                  <span className='text-xs font-semibold tracking-wide text-violet-800 uppercase dark:text-violet-300'>
                    Aprofundamento sugerido
                  </span>
                </div>
                <ul className='space-y-1.5'>
                  {currentQuestion.exampleFollowUps.map((followUp, i) => (
                    <li
                      key={i}
                      className='flex items-start gap-2 text-sm leading-snug text-violet-900 dark:text-violet-200'
                    >
                      <span className='mt-1 shrink-0 text-xs text-violet-500'>
                        →
                      </span>
                      {followUp}
                    </li>
                  ))}
                </ul>
              </div>
            )}
        </div>

        {/* Rodapé fixo — navegação */}
        <div className='border-t px-6 py-4'>
          {/* Indicadores de ponto */}
          <div className='mb-3 flex items-center justify-center gap-1'>
            {Array.from({ length: totalQuestions }).map((_, i) => (
              <button
                key={i}
                type='button'
                aria-label={`Ir para pergunta ${i + 1}`}
                onClick={() => {
                  const state = interviewScriptService.navigateToIndex(i);
                  if (state) setSliderState(state);
                }}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-200',
                  i === currentIndex
                    ? 'bg-primary w-4'
                    : 'bg-muted-foreground/30 hover:bg-muted-foreground/60 w-1.5'
                )}
              />
            ))}
          </div>

          {/* Botões de navegação */}
          <div className='flex items-center justify-between gap-3'>
            <Button
              variant='outline'
              size='sm'
              onClick={handlePrevious}
              disabled={isFirst}
              className='gap-2'
            >
              <FontAwesomeIcon icon={faChevronLeft} className='h-3 w-3' />
              Anterior
            </Button>

            <span className='text-muted-foreground text-xs'>
              Use ← → para navegar
            </span>

            {isLast ? (
              <Button
                size='sm'
                variant='outline'
                onClick={() => onOpenChange(false)}
                className='gap-2'
              >
                Concluir
              </Button>
            ) : (
              <Button size='sm' onClick={handleNext} className='gap-2'>
                Próxima
                <FontAwesomeIcon icon={faChevronRight} className='h-3 w-3' />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
