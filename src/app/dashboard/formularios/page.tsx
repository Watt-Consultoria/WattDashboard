'use client';

import * as React from 'react';
import PageContainer from '@/components/layout/page-container';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { VcToggleSwitch } from '@/components/vc-toggle-switch';
import {
  createForm,
  getMissingPselQuestionTitles,
  PSEL_REQUIRED_QUESTIONS,
  type FormAnswerType,
  type FormType
} from '@/lib/firestore/forms';
import { IconMinus, IconPlus } from '@tabler/icons-react';

type TipoFormulario = FormType;
type TipoResposta = FormAnswerType;

type Pergunta = {
  id: number;
  tituloPergunta: string;
  tipoResposta: TipoResposta;
  isPselRequired?: boolean;
};

const TIPOS_RESPOSTA: Array<{ value: TipoResposta; label: string }> = [
  { value: 'string', label: 'string' },
  { value: 'number', label: 'number' },
  { value: 'cpf', label: 'cpf' },
  { value: 'imageFile', label: 'imageFile' },
  { value: 'pdfFile', label: 'pdfFile' }
];

function normalizeComparableText(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

export default function FormulariosPage() {
  const [nomeFormulario, setNomeFormulario] = React.useState('');
  const [tipoFormulario, setTipoFormulario] =
    React.useState<TipoFormulario>('interno');
  const [isPselForm, setIsPselForm] = React.useState(false);
  const [perguntas, setPerguntas] = React.useState<Pergunta[]>([]);
  const [novaPerguntaTitulo, setNovaPerguntaTitulo] = React.useState('');
  const [novaPerguntaTipo, setNovaPerguntaTipo] =
    React.useState<TipoResposta>('string');
  const [nextPerguntaId, setNextPerguntaId] = React.useState(1);
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState('');

  const podeEditarPerguntas = !isSaving;

  React.useEffect(() => {
    if (tipoFormulario !== 'externo') {
      setIsPselForm(false);
    }
  }, [tipoFormulario]);

  function garantirPerguntasObrigatoriasPsel() {
    const perguntasAtualizadas = [...perguntas];
    let nextId = Math.max(0, ...perguntasAtualizadas.map((pergunta) => pergunta.id)) + 1;

    for (const perguntaObrigatoria of PSEL_REQUIRED_QUESTIONS) {
      const requiredAliases = perguntaObrigatoria.aliases.map(normalizeComparableText);
      const perguntaExistenteIndex = perguntasAtualizadas.findIndex((perguntaAtual) => {
        const perguntaNormalizada = normalizeComparableText(perguntaAtual.tituloPergunta);
        return requiredAliases.includes(perguntaNormalizada);
      });

      if (perguntaExistenteIndex >= 0) {
        perguntasAtualizadas[perguntaExistenteIndex] = {
          ...perguntasAtualizadas[perguntaExistenteIndex],
          tituloPergunta: perguntaObrigatoria.titulo,
          isPselRequired: true
        };
        continue;
      }

      perguntasAtualizadas.push({
        id: nextId,
        tituloPergunta: perguntaObrigatoria.titulo,
        tipoResposta: perguntaObrigatoria.tipoResposta,
        isPselRequired: true
      });
      nextId += 1;
    }

    setPerguntas(perguntasAtualizadas);
    setNextPerguntaId(nextId);
  }

  function adicionarPergunta() {
    const titulo = novaPerguntaTitulo.trim();

    if (!titulo) {
      setError('Digite o titulo da pergunta antes de adicionar.');
      return;
    }

    setPerguntas((current) => [
      ...current,
      {
        id: nextPerguntaId,
        tituloPergunta: titulo,
        tipoResposta: novaPerguntaTipo,
        isPselRequired: false
      }
    ]);
    setNextPerguntaId((current) => current + 1);
    setNovaPerguntaTitulo('');
    setNovaPerguntaTipo('string');
    setError('');
  }

  function removerPergunta(perguntaId: number) {
    const pergunta = perguntas.find((item) => item.id === perguntaId);
    if (isPselForm && pergunta?.isPselRequired) {
      setError('Perguntas obrigatorias do PSEL nao podem ser removidas.');
      return;
    }

    setPerguntas((current) => current.filter((pergunta) => pergunta.id !== perguntaId));
  }

  async function finalizarCriacao(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (nomeFormulario.trim() === '') {
      setError('Digite o nome do formulario antes de finalizar.');
      return;
    }

    if (perguntas.length === 0) {
      setError('Adicione pelo menos uma pergunta antes de finalizar.');
      return;
    }

    setError('');

    const payload = {
      nomeFormulario: nomeFormulario.trim(),
      tipoFormulario,
      ehFormularioPsel: tipoFormulario === 'externo' ? isPselForm : false,
      perguntas: perguntas.map((pergunta) => ({
        tituloPergunta: pergunta.tituloPergunta.trim(),
        tipoResposta: pergunta.tipoResposta
      }))
    };

    if (payload.tipoFormulario === 'externo' && payload.ehFormularioPsel) {
      const missingQuestionTitles = getMissingPselQuestionTitles(payload.perguntas);
      if (missingQuestionTitles.length > 0) {
        setError(
          `Formulario PSEL precisa conter no minimo as perguntas: ${missingQuestionTitles.join(', ')}.`
        );
        return;
      }
    }

    try {
      setIsSaving(true);
      const result = await createForm(payload);
      console.log('Formulario criado:', {
        ...payload,
        id: result.id,
        collection: result.collectionName,
        publicPath:
          payload.tipoFormulario === 'externo'
            ? `/forms/${result.slug}`
            : null
      });

      setNomeFormulario('');
      setTipoFormulario('interno');
      setIsPselForm(false);
      setPerguntas([]);
      setNovaPerguntaTitulo('');
      setNovaPerguntaTipo('string');
      setNextPerguntaId(1);
    } catch (saveError) {
      const message =
        saveError instanceof Error
          ? saveError.message
          : 'Nao foi possivel salvar o formulario.';
      setError(message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <PageContainer
      pageTitle='Formularios'
      pageDescription='Crie formularios internos ou externos e defina o tipo de cada resposta.'
    >
      <Card>
        <CardHeader>
          <CardTitle>Criar formularios</CardTitle>
          <CardDescription>
            Primeiro escolha o tipo do formulario. Depois adicione as perguntas
            com o tipo de resposta que deve ser salvo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className='space-y-6' onSubmit={finalizarCriacao}>
            <section className='space-y-3'>
              <Label>1. Dados do formulario</Label>
              <div className='grid gap-3 rounded-md border p-3 sm:grid-cols-[1fr_auto] sm:items-end'>
                <div className='space-y-1'>
                  <Label htmlFor='nome-formulario'>Nome do formulario</Label>
                  <Input
                    id='nome-formulario'
                    placeholder='Ex: Formulario de inscricao'
                    value={nomeFormulario}
                    onChange={(event) => setNomeFormulario(event.target.value)}
                  />
                </div>

                <div className='space-y-1'>
                  <Label htmlFor='tipo-formulario-switch'>Tipo</Label>
                  <VcToggleSwitch
                    id='tipo-formulario-switch'
                    checked={tipoFormulario === 'externo'}
                    onCheckedChange={(checked) =>
                      setTipoFormulario(checked ? 'externo' : 'interno')
                    }
                    onLabel='ext'
                    offLabel='int'
                  />
                </div>
              </div>

              {tipoFormulario === 'externo' ? (
                <div className='space-y-2'>
                  <Button
                    type='button'
                    variant={isPselForm ? 'default' : 'outline'}
                    onClick={() =>
                      setIsPselForm((current) => {
                        const nextValue = !current;
                        if (nextValue) {
                          garantirPerguntasObrigatoriasPsel();
                        }
                        return nextValue;
                      })
                    }
                    disabled={!podeEditarPerguntas}
                  >
                    {isPselForm
                      ? 'Formulario para PSEL ativado'
                      : 'Criar formulario para PSEL'}
                  </Button>
                </div>
              ) : null}

            </section>

            <section className='space-y-3'>
              <Label>2. Nova pergunta</Label>
              <div className='grid gap-3 rounded-md border p-3 sm:grid-cols-[1fr_180px_auto]'>
                <div className='space-y-1'>
                  <Label htmlFor='nova-pergunta-titulo'>Titulo da pergunta</Label>
                  <Input
                    id='nova-pergunta-titulo'
                    placeholder='Digite o titulo da pergunta'
                    value={novaPerguntaTitulo}
                    onChange={(event) => setNovaPerguntaTitulo(event.target.value)}
                    disabled={!podeEditarPerguntas}
                  />
                </div>

                <div className='space-y-1'>
                  <Label>Tipo de resposta</Label>
                  <Select
                    value={novaPerguntaTipo}
                    onValueChange={(value) => setNovaPerguntaTipo(value as TipoResposta)}
                    disabled={!podeEditarPerguntas}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder='Selecione o tipo' />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPOS_RESPOSTA.map((tipo) => (
                        <SelectItem key={tipo.value} value={tipo.value}>
                          {tipo.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className='flex items-end gap-2'>
                  <Button
                    type='button'
                    variant='outline'
                    size='icon'
                    onClick={adicionarPergunta}
                    disabled={!podeEditarPerguntas}
                    aria-label='Adicionar pergunta'
                  >
                    <IconPlus className='size-4' />
                  </Button>
                </div>
              </div>

              <Label>3. Perguntas adicionadas</Label>
              <ScrollArea className='h-80 rounded-md border p-3'>
                <div className='space-y-3 pr-3'>
                  {perguntas.length === 0 ? (
                    <p className='text-muted-foreground text-sm'>
                      Nenhuma pergunta adicionada ainda.
                    </p>
                  ) : null}
                  {perguntas.map((pergunta, index) => (
                    <div
                      key={pergunta.id}
                      className='grid gap-3 rounded-md border p-3 sm:grid-cols-[1fr_180px_auto]'
                    >
                      <div className='space-y-1'>
                        <Label htmlFor={`pergunta-lista-${pergunta.id}`}>
                          Pergunta {index + 1}
                        </Label>
                        <Input
                          id={`pergunta-lista-${pergunta.id}`}
                          value={pergunta.tituloPergunta}
                          readOnly
                        />
                      </div>

                      <div className='space-y-1'>
                        <Label>Tipo de resposta</Label>
                        <Input value={pergunta.tipoResposta} readOnly />
                        {isPselForm && pergunta.isPselRequired ? (
                          <p className='text-muted-foreground text-xs'>
                            Obrigatoria do PSEL
                          </p>
                        ) : null}
                      </div>

                      <div className='flex items-end gap-2'>
                        <Button
                          type='button'
                          variant='outline'
                          size='icon'
                          onClick={() => removerPergunta(pergunta.id)}
                          disabled={
                            !podeEditarPerguntas ||
                            (isPselForm && Boolean(pergunta.isPselRequired))
                          }
                          aria-label='Remover pergunta'
                        >
                          <IconMinus className='size-4' />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </section>

            {error ? <p className='text-destructive text-sm'>{error}</p> : null}

            <div className='flex justify-end'>
              <Button type='submit' disabled={!podeEditarPerguntas}>
                {isSaving ? 'Salvando...' : 'Finalizar criacao'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
