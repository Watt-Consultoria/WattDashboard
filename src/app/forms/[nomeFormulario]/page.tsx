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
  getExternalFormByPathName,
  submitExternalFormResponse,
  uploadExternalFormFile,
  type FormQuestion,
  type StoredForm
} from '@/lib/firestore/forms';
import { cn } from '@/lib/utils';
import { useParams } from 'next/navigation';

type FormAnswerValue = string | File | null;
type FormAnswerMap = Record<number, FormAnswerValue>;
type FormStepId = 'basico' | 'perfil' | 'documentos';

type FormStepDefinition = {
  id: FormStepId;
  title: string;
  description: string;
};

type StepQuestion = {
  index: number;
  pergunta: FormQuestion;
};

type FormStepGroup = FormStepDefinition & {
  perguntas: StepQuestion[];
  answeredCount: number;
};

const FORM_STEP_DEFINITIONS: FormStepDefinition[] = [
  {
    id: 'basico',
    title: 'Dados basicos',
    description: 'Informacoes principais para identificacao e contato.'
  },
  {
    id: 'perfil',
    title: 'Perfil e motivacao',
    description: 'Respostas descritivas para conhecermos melhor seu perfil.'
  },
  {
    id: 'documentos',
    title: 'Documentos',
    description: 'Envio de arquivos obrigatorios para a inscricao.'
  }
];

function isFileAnswerType(tipoResposta: FormQuestion['tipoResposta']) {
  return tipoResposta === 'imageFile' || tipoResposta === 'pdfFile';
}

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function getQuestionTypeLabel(tipoResposta: FormQuestion['tipoResposta']) {
  switch (tipoResposta) {
    case 'string':
      return 'Texto';
    case 'number':
      return 'Numero';
    case 'cpf':
      return 'CPF';
    case 'imageFile':
      return 'Imagem';
    case 'pdfFile':
      return 'PDF';
    default:
      return 'Resposta';
  }
}

function isAnswerFilled(
  pergunta: FormQuestion,
  value: FormAnswerValue
) {
  if (isFileAnswerType(pergunta.tipoResposta)) {
    return value instanceof File;
  }
  return typeof value === 'string' && value.trim() !== '';
}

function shouldUseTextarea(pergunta: FormQuestion) {
  return (
    pergunta.tipoResposta === 'string' &&
    normalizeQuestionTitle(pergunta.tituloPergunta).length > 45
  );
}

function normalizeQuestionTitle(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function normalizeComparableText(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getQuestionStepId(pergunta: FormQuestion): FormStepId {
  if (isFileAnswerType(pergunta.tipoResposta)) {
    return 'documentos';
  }

  const normalizedTitle = normalizeComparableText(pergunta.tituloPergunta);
  const basicKeywords = [
    'nome',
    'sobrenome',
    'email',
    'e-mail',
    'telefone',
    'contato',
    'curso',
    'periodo',
    'cpf',
    'instagram',
    'origem',
    'camisa',
    'tamanho da camisa'
  ].map(normalizeComparableText);

  const isBasicQuestion = basicKeywords.some((keyword) =>
    normalizedTitle.includes(keyword)
  );

  return isBasicQuestion ? 'basico' : 'perfil';
}

export default function ExternalFormPage() {
  const params = useParams<{ nomeFormulario: string }>();
  const nomeFormularioParam = Array.isArray(params.nomeFormulario)
    ? params.nomeFormulario[0]
    : params.nomeFormulario;

  const [formData, setFormData] = React.useState<StoredForm | null>(null);
  const [answers, setAnswers] = React.useState<FormAnswerMap>({});
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState('');
  const [submitted, setSubmitted] = React.useState(false);
  const [activeStepIndex, setActiveStepIndex] = React.useState(0);
  const [missingFieldIndexes, setMissingFieldIndexes] = React.useState<number[]>([]);
  const [isShaking, setIsShaking] = React.useState(false);
  const htmlFormId = 'external-form';

  const stepGroups = React.useMemo<FormStepGroup[]>(() => {
    if (!formData) return [];

    const grouped = FORM_STEP_DEFINITIONS.map((definition) => ({
      ...definition,
      perguntas: [] as StepQuestion[],
      answeredCount: 0
    }));

    for (const [index, pergunta] of formData.perguntas.entries()) {
      const targetStepId = getQuestionStepId(pergunta);
      const targetStep = grouped.find((step) => step.id === targetStepId);

      if (!targetStep) continue;
      targetStep.perguntas.push({ index, pergunta });
    }

    for (const step of grouped) {
      step.answeredCount = step.perguntas.reduce((total, stepQuestion) => {
        return (
          total +
          Number(isAnswerFilled(stepQuestion.pergunta, answers[stepQuestion.index]))
        );
      }, 0);
    }

    return grouped.filter((step) => step.perguntas.length > 0);
  }, [answers, formData]);

  const totalQuestions = stepGroups.reduce(
    (total, step) => total + step.perguntas.length,
    0
  );
  const answeredQuestions = stepGroups.reduce(
    (total, step) => total + step.answeredCount,
    0
  );
  const completionPercent =
    totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0;
  const activeStep = stepGroups[activeStepIndex] ?? null;
  const isFirstStep = activeStepIndex === 0;
  const isLastStep = activeStepIndex >= stepGroups.length - 1;

  React.useEffect(() => {
    let isMounted = true;

    async function loadForm() {
      if (!nomeFormularioParam) {
        if (isMounted) {
          setError('Formulario invalido.');
          setIsLoading(false);
        }
        return;
      }

      try {
        setIsLoading(true);
        setError('');
        setSubmitted(false);
        setActiveStepIndex(0);
        setMissingFieldIndexes([]);
        setIsShaking(false);

        const form = await getExternalFormByPathName(nomeFormularioParam);
        if (!isMounted) return;

        if (!form) {
          setFormData(null);
          setError('Formulario externo nao encontrado.');
          return;
        }

        setFormData(form);
        setAnswers(
          form.perguntas.reduce<FormAnswerMap>((acc, pergunta, index) => {
            acc[index] = isFileAnswerType(pergunta.tipoResposta) ? null : '';
            return acc;
          }, {})
        );
      } catch (loadError) {
        if (!isMounted) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Nao foi possivel carregar o formulario.'
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
    if (stepGroups.length === 0) {
      if (activeStepIndex !== 0) {
        setActiveStepIndex(0);
      }
      return;
    }

    if (activeStepIndex > stepGroups.length - 1) {
      setActiveStepIndex(stepGroups.length - 1);
    }
  }, [activeStepIndex, stepGroups]);

  React.useEffect(() => {
    if (!isShaking) return;

    const timeoutId = window.setTimeout(() => {
      setIsShaking(false);
    }, 380);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isShaking]);

  function updateTextAnswer(index: number, value: string) {
    setAnswers((current) => ({
      ...current,
      [index]: value
    }));
    setMissingFieldIndexes((current) => current.filter((missingIndex) => missingIndex !== index));
  }

  function updateFileAnswer(index: number, file: File | null) {
    setAnswers((current) => ({
      ...current,
      [index]: file
    }));
    if (file) {
      setMissingFieldIndexes((current) =>
        current.filter((missingIndex) => missingIndex !== index)
      );
    }
  }

  function triggerValidationFeedback(missingIndexes: number[]) {
    const uniqueMissingIndexes = Array.from(new Set(missingIndexes));
    setMissingFieldIndexes(uniqueMissingIndexes);
    setIsShaking(false);
    window.requestAnimationFrame(() => {
      setIsShaking(true);
    });
  }

  function handlePreviousStep() {
    if (isFirstStep) return;
    setError('');
    setMissingFieldIndexes([]);
    setActiveStepIndex((current) => Math.max(0, current - 1));
  }

  function handleNextStep() {
    if (!activeStep || isLastStep) return;

    const missingCurrentStepIndexes = activeStep.perguntas
      .filter(({ index, pergunta }) => !isAnswerFilled(pergunta, answers[index]))
      .map(({ index }) => index);

    if (missingCurrentStepIndexes.length > 0) {
      triggerValidationFeedback(missingCurrentStepIndexes);
      return;
    }

    setError('');
    setMissingFieldIndexes([]);
    setActiveStepIndex((current) => Math.min(stepGroups.length - 1, current + 1));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!formData) return;

    if (!isLastStep) {
      handleNextStep();
      return;
    }

    const missingRequiredIndexes = formData.perguntas
      .map((pergunta, index) => ({ pergunta, index }))
      .filter(({ pergunta, index }) => !isAnswerFilled(pergunta, answers[index]))
      .map(({ index }) => index);

    if (missingRequiredIndexes.length > 0) {
      const firstMissingIndex = missingRequiredIndexes[0];
      const stepWithFirstMissingQuestion = stepGroups.findIndex((step) =>
        step.perguntas.some(({ index }) => index === firstMissingIndex)
      );

      if (stepWithFirstMissingQuestion >= 0) {
        setActiveStepIndex(stepWithFirstMissingQuestion);
      }

      triggerValidationFeedback(missingRequiredIndexes);
      return;
    }

    setError('');
    setMissingFieldIndexes([]);
    setIsSubmitting(true);
    try {
      const respostasPayload = await Promise.all(
        formData.perguntas.map(async (pergunta, index) => {
          const value = answers[index];

          if (
            (pergunta.tipoResposta === 'imageFile' ||
              pergunta.tipoResposta === 'pdfFile') &&
            value instanceof File
          ) {
            const uploadedFile = await uploadExternalFormFile({
              formId: formData.id,
              perguntaTitulo: pergunta.tituloPergunta,
              tipoResposta: pergunta.tipoResposta,
              file: value
            });

            return {
              tituloPergunta: pergunta.tituloPergunta,
              tipoResposta: pergunta.tipoResposta,
              valor: uploadedFile.downloadUrl
            };
          }

          return {
            tituloPergunta: pergunta.tituloPergunta,
            tipoResposta: pergunta.tipoResposta,
            valor: typeof value === 'string' ? value : ''
          };
        })
      );

      const savedResponse = await submitExternalFormResponse(formData.id, {
        respostas: respostasPayload
      });

      const payload = {
        formId: formData.id,
        responseId: savedResponse.id,
        nomeFormulario: formData.nomeFormulario,
        respostas: respostasPayload
      };

      console.log('Resposta de formulario externo:', payload);
      setSubmitted(true);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Nao foi possivel enviar o formulario.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className='from-background via-muted/20 to-background h-dvh overflow-y-auto bg-gradient-to-b p-4 pb-36 sm:p-8 sm:pb-40'>
      <div
        className='mx-auto w-full max-w-5xl'
        style={
          isShaking
            ? { animation: 'watt-form-shake 380ms cubic-bezier(.36,.07,.19,.97)' }
            : undefined
        }
      >
        <Card>
          <CardHeader>
            <div className='flex flex-wrap items-start justify-between gap-3'>
              <div className='space-y-2'>
                <Badge variant='secondary'>Formulario externo</Badge>
                <CardTitle className='text-balance text-2xl sm:text-3xl'>
                  {formData?.nomeFormulario ?? safeDecode(nomeFormularioParam)}
                </CardTitle>
              </div>
              {!isLoading && formData ? (
                <Badge variant='outline'>{totalQuestions} perguntas</Badge>
              ) : null}
            </div>
            <CardDescription>
              Complete as subetapas abaixo para finalizar sua inscricao no PSEL.
            </CardDescription>
            {!isLoading && stepGroups.length > 0 ? (
              <div className='flex flex-wrap gap-2 pt-2'>
                {stepGroups.map((step, index) => {
                  const isActive = index === activeStepIndex;
                  const isCompleted = step.answeredCount === step.perguntas.length;
                  const hasMissingFields = step.perguntas.some(({ index: questionIndex }) =>
                    missingFieldIndexes.includes(questionIndex)
                  );
                  return (
                    <button
                      key={step.id}
                      type='button'
                      onClick={() => setActiveStepIndex(index)}
                      className={cn(
                        'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                        isActive
                          ? 'border-primary bg-primary text-primary-foreground'
                          : hasMissingFields
                            ? 'border-destructive/60 bg-destructive/10 text-destructive'
                          : isCompleted
                            ? 'border-primary/40 bg-primary/10 text-foreground'
                            : 'border-border/60 bg-muted/30 text-muted-foreground'
                      )}
                    >
                      Etapa {index + 1}: {step.title}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </CardHeader>
          <CardContent className='space-y-6'>
            {isLoading ? (
              <div className='space-y-4'>
                <p className='text-muted-foreground text-sm'>Carregando formulario...</p>
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
              <form id={htmlFormId} className='space-y-8' onSubmit={handleSubmit}>
                {activeStep ? (
                  <section className='space-y-4'>
                    <div className='flex flex-wrap items-end justify-between gap-3'>
                      <div className='space-y-1'>
                        <p className='text-muted-foreground text-xs font-medium tracking-wide uppercase'>
                          Subetapa {activeStepIndex + 1} de {stepGroups.length}
                        </p>
                        <h3 className='text-lg leading-tight font-semibold'>
                          {activeStep.title}
                        </h3>
                        <p className='text-muted-foreground text-sm'>
                          {activeStep.description}
                        </p>
                      </div>
                      <Badge variant='outline'>
                        {activeStep.answeredCount}/{activeStep.perguntas.length} respondidas
                      </Badge>
                    </div>

                    <div className='grid gap-4 sm:grid-cols-2'>
                      {activeStep.perguntas.map(({ pergunta, index }) => {
                        const isWideQuestion =
                          pergunta.tipoResposta === 'imageFile' ||
                          pergunta.tipoResposta === 'pdfFile' ||
                          shouldUseTextarea(pergunta);
                        const isFilled = isAnswerFilled(pergunta, answers[index]);
                        const isMissing = missingFieldIndexes.includes(index);

                        return (
                          <div
                            key={`${pergunta.tituloPergunta}-${index}`}
                            className={cn(
                              'rounded-xl border p-4 shadow-xs transition-colors sm:p-5',
                              isMissing
                                ? 'border-destructive/70 bg-destructive/5'
                                : isFilled
                                ? 'border-primary/40 bg-primary/5'
                                : 'bg-card/70 border-border/60',
                              isWideQuestion ? 'sm:col-span-2' : ''
                            )}
                          >
                            <div className='mb-3 flex items-start justify-between gap-3'>
                              <Label
                                htmlFor={`pergunta-externa-${index}`}
                                className={cn(
                                  'text-sm leading-relaxed font-medium',
                                  isMissing ? 'text-destructive' : ''
                                )}
                              >
                                {normalizeQuestionTitle(pergunta.tituloPergunta)}
                              </Label>
                              <Badge variant='outline'>
                                {getQuestionTypeLabel(pergunta.tipoResposta)}
                              </Badge>
                            </div>

                            {pergunta.tipoResposta === 'string' ? (
                              shouldUseTextarea(pergunta) ? (
                                <Textarea
                                  id={`pergunta-externa-${index}`}
                                  value={
                                    typeof answers[index] === 'string'
                                      ? answers[index]
                                      : ''
                                  }
                                  onChange={(event) =>
                                    updateTextAnswer(index, event.target.value)
                                  }
                                  placeholder='Digite sua resposta'
                                  required
                                  aria-invalid={isMissing}
                                  className={cn(
                                    'min-h-28',
                                    isMissing ? 'border-destructive ring-destructive/25' : ''
                                  )}
                                />
                              ) : (
                                <Input
                                  id={`pergunta-externa-${index}`}
                                  value={
                                    typeof answers[index] === 'string'
                                      ? answers[index]
                                      : ''
                                  }
                                  onChange={(event) =>
                                    updateTextAnswer(index, event.target.value)
                                  }
                                  placeholder='Digite sua resposta'
                                  required
                                  aria-invalid={isMissing}
                                  className={cn(
                                    isMissing ? 'border-destructive ring-destructive/25' : ''
                                  )}
                                />
                              )
                            ) : null}

                            {pergunta.tipoResposta === 'number' ? (
                              <Input
                                id={`pergunta-externa-${index}`}
                                type='number'
                                value={typeof answers[index] === 'string' ? answers[index] : ''}
                                onChange={(event) => updateTextAnswer(index, event.target.value)}
                                placeholder='Digite um numero'
                                required
                                aria-invalid={isMissing}
                                className={cn(
                                  isMissing ? 'border-destructive ring-destructive/25' : ''
                                )}
                              />
                            ) : null}

                            {pergunta.tipoResposta === 'cpf' ? (
                              <Input
                                id={`pergunta-externa-${index}`}
                                value={typeof answers[index] === 'string' ? answers[index] : ''}
                                onChange={(event) =>
                                  updateTextAnswer(
                                    index,
                                    event.target.value.replace(/[^\d]/g, '')
                                  )
                                }
                                inputMode='numeric'
                                placeholder='Somente numeros'
                                maxLength={11}
                                required
                                aria-invalid={isMissing}
                                className={cn(
                                  isMissing ? 'border-destructive ring-destructive/25' : ''
                                )}
                              />
                            ) : null}

                            {pergunta.tipoResposta === 'imageFile' ? (
                              <Input
                                id={`pergunta-externa-${index}`}
                                type='file'
                                accept='image/*'
                                onChange={(event) =>
                                  updateFileAnswer(index, event.target.files?.[0] ?? null)
                                }
                                required
                                aria-invalid={isMissing}
                                className={cn(
                                  'h-auto py-2',
                                  isMissing ? 'border-destructive ring-destructive/25' : ''
                                )}
                              />
                            ) : null}

                            {pergunta.tipoResposta === 'pdfFile' ? (
                              <Input
                                id={`pergunta-externa-${index}`}
                                type='file'
                                accept='application/pdf'
                                onChange={(event) =>
                                  updateFileAnswer(index, event.target.files?.[0] ?? null)
                                }
                                required
                                aria-invalid={isMissing}
                                className={cn(
                                  'h-auto py-2',
                                  isMissing ? 'border-destructive ring-destructive/25' : ''
                                )}
                              />
                            ) : null}

                            {isMissing ? (
                              <p className='text-destructive mt-2 text-xs font-medium'>
                                Campo obrigatorio nao preenchido.
                              </p>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </section>
                ) : null}

                {submitted ? (
                  <div className='border-primary/30 bg-primary/10 rounded-lg border p-3'>
                    <p className='text-sm'>
                      Formulario enviado. Se seu e-mail estiver correto, voce recebera a
                      confirmacao em alguns minutos.
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
          <div className='mx-auto flex w-full max-w-5xl flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-4'>
            <div className='min-w-0 flex-1 space-y-2'>
              <div className='flex items-center justify-between gap-3'>
                <p className='truncate text-sm font-medium'>
                  Progresso geral: {answeredQuestions}/{totalQuestions} perguntas
                </p>
                <p className='text-muted-foreground text-sm'>{completionPercent}%</p>
              </div>
              <Progress
                value={isSubmitting ? 100 : completionPercent}
                className={cn(isSubmitting ? 'animate-pulse' : '')}
              />
            </div>

            <div className='grid w-full gap-2 sm:ml-4 sm:w-auto sm:grid-flow-col'>
              {!isFirstStep ? (
                <Button
                  type='button'
                  variant='outline'
                  onClick={handlePreviousStep}
                  disabled={isSubmitting}
                >
                  Voltar
                </Button>
              ) : null}

              {!isLastStep ? (
                <Button
                  type='button'
                  onClick={handleNextStep}
                  disabled={isSubmitting}
                  aria-label='Proxima etapa'
                  className='px-4'
                >
                  <FontAwesomeIcon icon={faAngleRight} />
                </Button>
              ) : (
                <Button
                  type='submit'
                  form={htmlFormId}
                  disabled={isSubmitting}
                  aria-label='Finalizar envio'
                  className='px-4 sm:min-w-16'
                >
                  {isSubmitting ? 'Enviando...' : <FontAwesomeIcon icon={faCheck} />}
                </Button>
              )}
            </div>
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

