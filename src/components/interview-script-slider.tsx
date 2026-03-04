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
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import interviewScriptService from '@/services/interviewScriptService';
import type { InterviewSliderState } from '@/types/interview/interview-script';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChevronLeft,
  faChevronRight,
  faLightbulb,
  faMagnifyingGlass,
  faCommentDots,
  faFloppyDisk,
  faSpinner
} from '@fortawesome/free-solid-svg-icons';
import { toast } from 'sonner';

interface InterviewScriptSliderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** ID do candidato para persistir respostas. Se ausente, modo somente leitura. */
  candidateId?: string;
  /** Nome do candidato para exibição no cabeçalho. */
  candidateName?: string;
  /** Callback após salvar com sucesso (ex.: recarregar dados na página). */
  onSaveSuccess?: () => void;
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
 * - Campo de resposta/anotação (quando candidateId é informado)
 * - Navegação anterior/próxima com indicador de progresso
 */
export function InterviewScriptSliderDialog({
  open,
  onOpenChange,
  candidateId,
  candidateName,
  onSaveSuccess
}: InterviewScriptSliderDialogProps) {
  const [sliderState, setSliderState] =
    React.useState<InterviewSliderState | null>(null);

  // Mapa local de respostas em edição (questionId -> texto)
  const [localAnswers, setLocalAnswers] = React.useState<
    Record<string, string>
  >({});
  const [isLoadingAnswers, setIsLoadingAnswers] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = React.useState(false);

  // Ref para acessar localAnswers dentro de callbacks estáveis
  const localAnswersRef = React.useRef(localAnswers);
  localAnswersRef.current = localAnswers;

  const canEditAnswers = Boolean(candidateId);

  // Inicializa o slider e carrega respostas existentes quando o modal abre
  React.useEffect(() => {
    if (!open) return;

    const initialState = interviewScriptService.buildInitialSliderState();
    setSliderState(initialState);
    setHasUnsavedChanges(false);

    if (candidateId) {
      setIsLoadingAnswers(true);
      interviewScriptService
        .getInterviewAnswers(candidateId)
        .then((savedAnswers) => {
          // Converter InterviewAnswersMap para Record<string, string>
          const flat: Record<string, string> = {};
          for (const [qId, entry] of Object.entries(savedAnswers)) {
            flat[qId] = entry.answer;
          }
          setLocalAnswers(flat);
        })
        .catch(() => {
          setLocalAnswers({});
        })
        .finally(() => {
          setIsLoadingAnswers(false);
        });
    } else {
      setLocalAnswers({});
    }
  }, [open, candidateId]);

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
      // Não navegar se o foco está no textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'TEXTAREA') return;

      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrevious();
    },
    [open, handleNext, handlePrevious]
  );

  React.useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Handler de alteração da resposta
  const handleAnswerChange = React.useCallback(
    (questionId: string, value: string) => {
      setLocalAnswers((prev) => ({
        ...prev,
        [questionId]: value
      }));
      setHasUnsavedChanges(true);
    },
    []
  );

  // Salvar respostas
  const handleSave = React.useCallback(async () => {
    if (!candidateId || isSaving) return;

    setIsSaving(true);
    try {
      const answersMap = interviewScriptService.buildAnswersMap(
        localAnswersRef.current
      );
      await interviewScriptService.saveInterviewAnswers({
        candidateId,
        answers: answersMap
      });
      setHasUnsavedChanges(false);
      toast.success('Respostas salvas com sucesso.');
      onSaveSuccess?.();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Erro ao salvar respostas da entrevista.'
      );
    } finally {
      setIsSaving(false);
    }
  }, [candidateId, isSaving, onSaveSuccess]);

  // Salvar ao fechar se houver alterações pendentes
  const handleOpenChange = React.useCallback(
    async (newOpen: boolean) => {
      if (!newOpen && hasUnsavedChanges && candidateId) {
        // Salvar automaticamente ao fechar
        setIsSaving(true);
        try {
          const answersMap = interviewScriptService.buildAnswersMap(
            localAnswersRef.current
          );
          await interviewScriptService.saveInterviewAnswers({
            candidateId,
            answers: answersMap
          });
          setHasUnsavedChanges(false);
          toast.success('Respostas salvas automaticamente.');
          onSaveSuccess?.();
        } catch {
          toast.error('Erro ao salvar respostas automaticamente.');
        } finally {
          setIsSaving(false);
        }
      }
      onOpenChange(newOpen);
    },
    [hasUnsavedChanges, candidateId, onOpenChange, onSaveSuccess]
  );

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

  // Contagem de respostas preenchidas
  const answeredCount = Object.values(localAnswers).filter(
    (v) => v.trim().length > 0
  ).length;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className='flex max-h-[90vh] w-full max-w-2xl flex-col gap-0 overflow-hidden p-0'
        onInteractOutside={(e) => e.preventDefault()}
      >
        {/* Cabeçalho fixo */}
        <div className='border-b px-6 pt-5 pb-4'>
          <DialogHeader className='mb-3'>
            <div className='flex items-center justify-between gap-3'>
              <div className='min-w-0 flex-1'>
                <DialogTitle className='text-base font-semibold'>
                  Roteiro de Entrevista
                </DialogTitle>
                {candidateName && (
                  <p className='text-muted-foreground mt-0.5 truncate text-xs'>
                    {candidateName}
                  </p>
                )}
              </div>
              <div className='flex items-center gap-2'>
                {canEditAnswers && (
                  <span className='text-muted-foreground text-[10px]'>
                    {answeredCount}/{totalQuestions} respondidas
                  </span>
                )}
                <span className='text-muted-foreground text-xs font-medium tabular-nums'>
                  {questionNumber} / {totalQuestions}
                </span>
              </div>
            </div>
          </DialogHeader>
          <Progress value={progressPercent} className='h-1.5' />
        </div>

        {/* Corpo rolável */}
        <div className='flex-1 overflow-y-auto px-6 py-5'>
          {isLoadingAnswers ? (
            <div className='flex items-center justify-center py-8'>
              <FontAwesomeIcon
                icon={faSpinner}
                className='text-muted-foreground h-5 w-5 animate-spin'
              />
              <span className='text-muted-foreground ml-2 text-sm'>
                Carregando respostas...
              </span>
            </div>
          ) : (
            <>
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
                  <div className='mb-4 rounded-lg border border-violet-200 bg-violet-50 p-4 dark:border-violet-800/40 dark:bg-violet-950/20'>
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

              {/* Campo de resposta / anotação */}
              {canEditAnswers && (
                <div className='mt-2 rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800/40 dark:bg-emerald-950/20'>
                  <div className='mb-2 flex items-center gap-2'>
                    <FontAwesomeIcon
                      icon={faCommentDots}
                      className='h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400'
                    />
                    <span className='text-xs font-semibold tracking-wide text-emerald-800 uppercase dark:text-emerald-300'>
                      Resposta do candidato
                    </span>
                  </div>
                  <Textarea
                    placeholder='Registre a resposta ou anotações sobre esta pergunta...'
                    value={localAnswers[currentQuestion.id] ?? ''}
                    onChange={(e) =>
                      handleAnswerChange(currentQuestion.id, e.target.value)
                    }
                    className='min-h-25 resize-y border-emerald-300 bg-white text-sm dark:border-emerald-700 dark:bg-emerald-950/30'
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* Rodapé fixo — navegação */}
        <div className='border-t px-6 py-4'>
          {/* Indicadores de ponto */}
          <div className='mb-3 flex items-center justify-center gap-1'>
            {Array.from({ length: totalQuestions }).map((_, i) => {
              const questions = interviewScriptService.getOrderedQuestions();
              const qId = questions[i]?.id;
              const hasAnswer =
                canEditAnswers && qId && localAnswers[qId]?.trim().length > 0;
              return (
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
                      : hasAnswer
                        ? 'w-1.5 bg-emerald-500'
                        : 'bg-muted-foreground/30 hover:bg-muted-foreground/60 w-1.5'
                  )}
                />
              );
            })}
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

            <div className='flex items-center gap-2'>
              {canEditAnswers && hasUnsavedChanges && (
                <Button
                  size='sm'
                  variant='outline'
                  onClick={handleSave}
                  disabled={isSaving}
                  className='gap-2 text-emerald-600 hover:text-emerald-700'
                >
                  <FontAwesomeIcon
                    icon={isSaving ? faSpinner : faFloppyDisk}
                    className={cn('h-3 w-3', isSaving && 'animate-spin')}
                  />
                  Salvar
                </Button>
              )}
              <span className='text-muted-foreground text-xs'>
                Use ← → para navegar
              </span>
            </div>

            {isLast ? (
              <Button
                size='sm'
                variant={canEditAnswers ? 'default' : 'outline'}
                onClick={() => handleOpenChange(false)}
                className='gap-2'
              >
                {canEditAnswers ? 'Salvar e Concluir' : 'Concluir'}
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
