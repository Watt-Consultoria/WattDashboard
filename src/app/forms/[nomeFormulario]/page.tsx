'use client';

import * as React from 'react';
import { faAngleRight, faCheck } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import publicFormService from '@/services/publicFormService';
import formUploadService from '@/services/formUploadService';
import { submitFormResponse } from '@/lib/firestore/formResponses';
import { cn } from '@/lib/utils';
import { useParams } from 'next/navigation';
import type { Form, FormQuestion } from '@/types/forms/form';

type FormAnswerValue = string | File | string[] | null;
type FormAnswerMap = Record<string, FormAnswerValue>;

export default function PublicFormPage() {
  const params = useParams<{ nomeFormulario: string }>();
  const nomeFormularioParam = Array.isArray(params.nomeFormulario)
    ? params.nomeFormulario[0]
    : params.nomeFormulario;

  const [formData, setFormData] = React.useState<Form | null>(null);
  const [answers, setAnswers] = React.useState<FormAnswerMap>({});
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState('');
  const [submitted, setSubmitted] = React.useState(false);
  const [missingFieldIds, setMissingFieldIds] = React.useState<string[]>([]);
  const [isShaking, setIsShaking] = React.useState(false);

  const htmlFormId = 'public-form';

  // Calcular progresso
  const progress = React.useMemo(() => {
    if (!formData) return { answered: 0, total: 0, percent: 0 };
    return publicFormService.calculateProgress(formData, answers);
  }, [answers, formData]);

  // Carregar formulário
  React.useEffect(() => {
    let isMounted = true;

    async function loadForm() {
      if (!nomeFormularioParam) {
        if (isMounted) {
          setError('Formulário inválido.');
          setIsLoading(false);
        }
        return;
      }

      try {
        setIsLoading(true);
        setError('');
        setSubmitted(false);
        setMissingFieldIds([]);
        setIsShaking(false);

        const decodedName =
          publicFormService.decodePathName(nomeFormularioParam);
        const slug = publicFormService.formatSlugFromName(decodedName);

        const form = await publicFormService.getFormBySlug(slug);
        if (!isMounted) return;

        if (!form) {
          setFormData(null);
          setError('Formulário não encontrado ou está inativo.');
          return;
        }

        setFormData(form);
        // Inicializar respostas
        const initialAnswers: FormAnswerMap = {};
        for (const pergunta of form.perguntas) {
          if (publicFormService.isFileQuestion(pergunta.tipo)) {
            initialAnswers[pergunta.id] = null;
          } else if (
            pergunta.tipo === 'checkbox' ||
            pergunta.tipo === 'multipleChoice'
          ) {
            initialAnswers[pergunta.id] = [];
          } else {
            initialAnswers[pergunta.id] = '';
          }
        }
        setAnswers(initialAnswers);
      } catch (loadError) {
        if (!isMounted) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Erro ao carregar o formulário.'
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadForm();

    return () => {
      isMounted = false;
    };
  }, [nomeFormularioParam]);

  React.useEffect(() => {
    if (!isShaking) return;

    const timeoutId = window.setTimeout(() => {
      setIsShaking(false);
    }, 380);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isShaking]);

  function updateAnswer(id: string, value: FormAnswerValue) {
    setAnswers((current) => ({
      ...current,
      [id]: value
    }));
    setMissingFieldIds((current) => current.filter((fId) => fId !== id));
  }

  function triggerValidationFeedback(missingIds: string[]) {
    const uniqueMissingIds = Array.from(new Set(missingIds));
    setMissingFieldIds(uniqueMissingIds);
    setIsShaking(false);
    window.requestAnimationFrame(() => {
      setIsShaking(true);
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!formData) return;

    // Validar
    const validation = publicFormService.validateFormSubmission(
      formData,
      answers
    );

    if (!validation.valid) {
      const missingIds = formData.perguntas
        .filter((p) => validation.missingFields.includes(p.titulo))
        .map((p) => p.id);

      triggerValidationFeedback(missingIds);
      return;
    }

    setError('');
    setMissingFieldIds([]);
    setIsSubmitting(true);

    try {
      // Gerar ID único para esta resposta
      const timestamp = Date.now();
      const randomId =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : Math.random().toString(36).slice(2);
      const responseId = `${timestamp}-${randomId}`;

      // Preparar respostas para envio
      let respostasPayload = publicFormService.prepareAnswersForSubmission(
        formData,
        answers
      );

      // Se houver arquivos, fazer upload
      if (formUploadService.hasFileUploads(formData, answers)) {
        const uploadedFileMap = await formUploadService.uploadFiles(
          formData.id,
          responseId,
          formData,
          answers
        );

        // Substituir File references pelas URLs de download
        respostasPayload = respostasPayload.map((resposta) => ({
          ...resposta,
          valor: uploadedFileMap[resposta.perguntaId] ?? resposta.valor
        }));
      }

      // Submeter respostas para Firestore
      const response = await submitFormResponse(formData.id, {
        respostas: respostasPayload
      });

      console.log('Formulário enviado com sucesso:', {
        formId: formData.id,
        responseId: response.id,
        respostas: respostasPayload
      });

      setSubmitted(true);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Erro ao enviar o formulário.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className='from-background via-muted/20 to-background h-dvh overflow-y-auto bg-gradient-to-b p-4 pb-36 sm:p-8 sm:pb-40'>
      <div
        className='mx-auto w-full max-w-4xl'
        style={
          isShaking
            ? {
                animation: 'watt-form-shake 380ms cubic-bezier(.36,.07,.19,.97)'
              }
            : undefined
        }
      >
        <Card>
          <CardHeader>
            <div className='flex flex-wrap items-start justify-between gap-3'>
              <div className='space-y-2'>
                <Badge variant='secondary'>Formulário</Badge>
                <CardTitle className='text-2xl text-balance sm:text-3xl'>
                  {formData?.nome ??
                    publicFormService.decodePathName(nomeFormularioParam)}
                </CardTitle>
                {formData?.descricao && (
                  <CardDescription className='text-sm'>
                    {formData.descricao}
                  </CardDescription>
                )}
              </div>
              {!isLoading && formData ? (
                <Badge variant='outline'>
                  {formData.perguntas.length} perguntas
                </Badge>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className='space-y-6'>
            {isLoading ? (
              <div className='space-y-4'>
                <p className='text-muted-foreground text-sm'>
                  Carregando formulário...
                </p>
                <div className='grid gap-4 sm:grid-cols-2'>
                  {[0, 1, 2, 3].map((item) => (
                    <div
                      key={`skeleton-${item}`}
                      className='bg-muted/50 h-28 animate-pulse rounded-lg border'
                    />
                  ))}
                </div>
              </div>
            ) : null}

            {!isLoading && error ? (
              <div className='border-destructive/30 bg-destructive/10 rounded-lg border p-3'>
                <p className='text-destructive text-sm'>{error}</p>
              </div>
            ) : null}

            {!isLoading && formData ? (
              <form
                id={htmlFormId}
                className='space-y-6'
                onSubmit={handleSubmit}
              >
                <div className='grid gap-4 sm:grid-cols-2'>
                  {formData.perguntas.map((pergunta) => {
                    const value = answers[pergunta.id];
                    const isMissing = missingFieldIds.includes(pergunta.id);
                    const isFilled = !publicFormService.isAnswerEmpty(
                      pergunta.tipo,
                      value
                    );
                    const isWide = [
                      'paragraph',
                      'fileUpload',
                      'multipleChoice',
                      'checkbox',
                      'select'
                    ].includes(pergunta.tipo);

                    return (
                      <div
                        key={pergunta.id}
                        className={cn(
                          'rounded-xl border p-4 shadow-xs transition-colors sm:p-5',
                          isMissing
                            ? 'border-destructive/70 bg-destructive/5'
                            : isFilled
                              ? 'border-primary/40 bg-primary/5'
                              : 'bg-card/70 border-border/60',
                          isWide ? 'sm:col-span-2' : ''
                        )}
                      >
                        <div className='mb-3 flex items-start justify-between gap-3'>
                          <Label
                            htmlFor={`pergunta-${pergunta.id}`}
                            className={cn(
                              'text-sm leading-relaxed font-medium',
                              isMissing ? 'text-destructive' : ''
                            )}
                          >
                            {pergunta.titulo}
                            {pergunta.obrigatoria && (
                              <span className='text-destructive ml-1'>*</span>
                            )}
                          </Label>
                          <Badge variant='outline' className='text-xs'>
                            {publicFormService.getQuestionTypeLabel(
                              pergunta.tipo
                            )}
                          </Badge>
                        </div>

                        {pergunta.descricao && (
                          <p className='text-muted-foreground mb-3 text-xs'>
                            {pergunta.descricao}
                          </p>
                        )}

                        {/* Input de texto curto */}
                        {pergunta.tipo === 'shortText' && (
                          <Input
                            id={`pergunta-${pergunta.id}`}
                            value={typeof value === 'string' ? value : ''}
                            onChange={(e) =>
                              updateAnswer(pergunta.id, e.target.value)
                            }
                            placeholder='Digite sua resposta'
                            aria-invalid={isMissing}
                            className={cn(
                              isMissing
                                ? 'border-destructive ring-destructive/25'
                                : ''
                            )}
                          />
                        )}

                        {/* Textarea para parágrafo */}
                        {pergunta.tipo === 'paragraph' && (
                          <Textarea
                            id={`pergunta-${pergunta.id}`}
                            value={typeof value === 'string' ? value : ''}
                            onChange={(e) =>
                              updateAnswer(pergunta.id, e.target.value)
                            }
                            placeholder='Digite sua resposta'
                            className={cn(
                              'min-h-28',
                              isMissing
                                ? 'border-destructive ring-destructive/25'
                                : ''
                            )}
                          />
                        )}

                        {/* Rating */}
                        {pergunta.tipo === 'rating' && (
                          <div className='flex gap-2'>
                            {[1, 2, 3, 4, 5].map((rating) => (
                              <Button
                                key={rating}
                                type='button'
                                variant={
                                  value === String(rating)
                                    ? 'default'
                                    : 'outline'
                                }
                                size='sm'
                                onClick={() =>
                                  updateAnswer(pergunta.id, String(rating))
                                }
                                className='flex-1'
                              >
                                {rating}
                              </Button>
                            ))}
                          </div>
                        )}

                        {/* Multiple Choice */}
                        {pergunta.tipo === 'multipleChoice' && (
                          <Select
                            value={typeof value === 'string' ? value : ''}
                            onValueChange={(val) =>
                              updateAnswer(pergunta.id, val)
                            }
                          >
                            <SelectTrigger
                              id={`pergunta-${pergunta.id}`}
                              className={cn(
                                isMissing
                                  ? 'border-destructive ring-destructive/25'
                                  : ''
                              )}
                            >
                              <SelectValue placeholder='Selecione uma opção' />
                            </SelectTrigger>
                            <SelectContent>
                              {pergunta.items?.map((item) => (
                                <SelectItem key={item.id} value={item.valor}>
                                  {item.valor}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}

                        {/* Checkboxes */}
                        {pergunta.tipo === 'checkbox' && (
                          <div className='space-y-2'>
                            {pergunta.items?.map((item) => (
                              <div
                                key={item.id}
                                className='flex items-center gap-2'
                              >
                                <Checkbox
                                  id={`${pergunta.id}-${item.id}`}
                                  checked={
                                    Array.isArray(value) &&
                                    value.includes(item.valor)
                                  }
                                  onCheckedChange={(checked) => {
                                    const currentArray = Array.isArray(value)
                                      ? value
                                      : [];
                                    const newArray = checked
                                      ? [...currentArray, item.valor]
                                      : currentArray.filter(
                                          (v) => v !== item.valor
                                        );
                                    updateAnswer(pergunta.id, newArray);
                                  }}
                                />
                                <Label
                                  htmlFor={`${pergunta.id}-${item.id}`}
                                  className='cursor-pointer text-sm'
                                >
                                  {item.valor}
                                </Label>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Select */}
                        {pergunta.tipo === 'select' && (
                          <Select
                            value={typeof value === 'string' ? value : ''}
                            onValueChange={(val) =>
                              updateAnswer(pergunta.id, val)
                            }
                          >
                            <SelectTrigger
                              id={`pergunta-${pergunta.id}`}
                              className={cn(
                                isMissing
                                  ? 'border-destructive ring-destructive/25'
                                  : ''
                              )}
                            >
                              <SelectValue placeholder='Selecione uma opção' />
                            </SelectTrigger>
                            <SelectContent>
                              {pergunta.items?.map((item) => (
                                <SelectItem key={item.id} value={item.valor}>
                                  {item.valor}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}

                        {/* File upload */}
                        {pergunta.tipo === 'fileUpload' && (
                          <Input
                            id={`pergunta-${pergunta.id}`}
                            type='file'
                            onChange={(e) =>
                              updateAnswer(
                                pergunta.id,
                                e.target.files?.[0] ?? null
                              )
                            }
                            className={cn(
                              'h-auto py-2',
                              isMissing
                                ? 'border-destructive ring-destructive/25'
                                : ''
                            )}
                          />
                        )}

                        {isMissing && (
                          <p className='text-destructive mt-2 text-xs font-medium'>
                            Campo obrigatório não preenchido.
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>

                {submitted ? (
                  <div className='border-primary/30 bg-primary/10 rounded-lg border p-4'>
                    <p className='text-sm font-medium'>
                      ✓ Formulário enviado com sucesso!
                    </p>
                  </div>
                ) : null}
              </form>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {!isLoading && formData ? (
        <div className='bg-background/95 supports-[backdrop-filter]:bg-background/80 fixed inset-x-0 bottom-0 z-50 border-t backdrop-blur'>
          <div className='mx-auto flex w-full max-w-4xl flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-4'>
            <div className='min-w-0 flex-1 space-y-2'>
              <div className='flex items-center justify-between gap-3'>
                <p className='truncate text-sm font-medium'>
                  Progresso: {progress.answered}/{progress.total} perguntas
                </p>
                <p className='text-muted-foreground text-sm'>
                  {progress.percent}%
                </p>
              </div>
              <Progress
                value={isSubmitting ? 100 : progress.percent}
                className={cn(isSubmitting ? 'animate-pulse' : '')}
              />
            </div>

            <Button
              type='submit'
              form={htmlFormId}
              disabled={isSubmitting}
              className='w-full px-4 sm:w-auto'
            >
              {isSubmitting ? (
                'Enviando...'
              ) : (
                <>
                  <FontAwesomeIcon icon={faCheck} className='mr-2' />
                  Enviar
                </>
              )}
            </Button>
          </div>
        </div>
      ) : null}

      <style jsx>{`
        @keyframes watt-form-shake {
          10%,
          90% {
            transform: translate3d(-1px, 0, 0);
          }
          20%,
          80% {
            transform: translate3d(2px, 0, 0);
          }
          30%,
          50%,
          70% {
            transform: translate3d(-4px, 0, 0);
          }
          40%,
          60% {
            transform: translate3d(4px, 0, 0);
          }
        }
      `}</style>
    </main>
  );
}
