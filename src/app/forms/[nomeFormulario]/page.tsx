'use client';

import * as React from 'react';
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
import {
  getExternalFormByPathName,
  type FormQuestion,
  type StoredForm
} from '@/lib/firestore/forms';
import { useParams } from 'next/navigation';

type FormAnswerValue = string | File | null;
type FormAnswerMap = Record<number, FormAnswerValue>;

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

  function updateTextAnswer(index: number, value: string) {
    setAnswers((current) => ({
      ...current,
      [index]: value
    }));
  }

  function updateFileAnswer(index: number, file: File | null) {
    setAnswers((current) => ({
      ...current,
      [index]: file
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!formData) return;

    const hasEmptyRequiredAnswer = formData.perguntas.some((pergunta, index) => {
      const value = answers[index];
      if (isFileAnswerType(pergunta.tipoResposta)) {
        return !(value instanceof File);
      }
      return typeof value !== 'string' || value.trim() === '';
    });

    if (hasEmptyRequiredAnswer) {
      setError('Preencha todas as perguntas antes de enviar.');
      return;
    }

    setError('');
    setIsSubmitting(true);
    try {
      const payload = {
        formId: formData.id,
        nomeFormulario: formData.nomeFormulario,
        respostas: formData.perguntas.map((pergunta, index) => {
          const value = answers[index];
          if (value instanceof File) {
            return {
              tituloPergunta: pergunta.tituloPergunta,
              tipoResposta: pergunta.tipoResposta,
              valor: value.name,
              file: value
            };
          }
          return {
            tituloPergunta: pergunta.tituloPergunta,
            tipoResposta: pergunta.tipoResposta,
            valor: value
          };
        })
      };

      console.log('Resposta de formulario externo:', payload);
      setSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className='bg-background h-dvh overflow-y-auto p-4 sm:p-8'>
      <div className='mx-auto w-full max-w-2xl'>
        <Card>
          <CardHeader>
            <CardTitle>{formData?.nomeFormulario ?? safeDecode(nomeFormularioParam)}</CardTitle>
            <CardDescription>
              Formulario externo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? <p className='text-sm'>Carregando formulario...</p> : null}

            {!isLoading && error ? (
              <p className='text-destructive text-sm'>{error}</p>
            ) : null}

            {!isLoading && !error && formData ? (
              <form className='space-y-4' onSubmit={handleSubmit}>
                {formData.perguntas.map((pergunta, index) => (
                  <div key={`${pergunta.tituloPergunta}-${index}`} className='space-y-1'>
                    <Label htmlFor={`pergunta-externa-${index}`}>
                      {index + 1}. {pergunta.tituloPergunta}
                    </Label>

                    {pergunta.tipoResposta === 'string' ? (
                      <Input
                        id={`pergunta-externa-${index}`}
                        value={typeof answers[index] === 'string' ? answers[index] : ''}
                        onChange={(event) => updateTextAnswer(index, event.target.value)}
                        placeholder='Digite sua resposta'
                        required
                      />
                    ) : null}

                    {pergunta.tipoResposta === 'number' ? (
                      <Input
                        id={`pergunta-externa-${index}`}
                        type='number'
                        value={typeof answers[index] === 'string' ? answers[index] : ''}
                        onChange={(event) => updateTextAnswer(index, event.target.value)}
                        placeholder='Digite um numero'
                        required
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
                      />
                    ) : null}
                  </div>
                ))}

                {submitted ? (
                  <p className='text-sm'>Formulario enviado. Confira no console.</p>
                ) : null}

                <div className='flex justify-end'>
                  <Button type='submit' disabled={isSubmitting}>
                    {isSubmitting ? 'Enviando...' : 'Enviar formulario'}
                  </Button>
                </div>
              </form>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
