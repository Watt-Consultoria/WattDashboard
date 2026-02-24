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
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { VcToggleSwitch } from '@/components/vc-toggle-switch';
import formService from '@/services/formService';
import useMetadata from '@/hooks/use-metadata';
import type {
  Form,
  FormQuestion,
  FormQuestionType,
  FormType,
  FormQuestionItem
} from '@/types/forms/form';
import { FORM_QUESTION_TYPE_LABELS } from '@/types/forms/form';
import {
  IconMinus,
  IconPlus,
  IconArrowUp,
  IconArrowDown,
  IconEdit,
  IconX
} from '@tabler/icons-react';

type Pergunta = FormQuestion & {
  tempId?: number; // ID temporário para novos
};

type EditingQuestion = Pergunta & {
  newItems?: FormQuestionItem[];
};

const TIPOS_RESPOSTA: Array<{ value: FormQuestionType; label: string }> =
  Object.entries(FORM_QUESTION_TYPE_LABELS).map(([key, label]) => ({
    value: key as FormQuestionType,
    label
  }));

const TIPOS_COM_OPCOES: FormQuestionType[] = [
  'multipleChoice',
  'checkbox',
  'select'
];

function generateTempId(): number {
  return Date.now() + Math.random();
}

function temOpcoes(tipo: FormQuestionType): boolean {
  return TIPOS_COM_OPCOES.includes(tipo);
}

export default function FormulariosPage() {
  useMetadata({ title: 'Formulários' });

  // Estado da página
  const [forms, setForms] = React.useState<Form[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  // Estado do formulário em edição/criação
  const [editingFormId, setEditingFormId] = React.useState<string | null>(null);
  const [nomeFormulario, setNomeFormulario] = React.useState('');
  const [descricaoFormulario, setDescricaoFormulario] = React.useState('');
  const [tipoFormulario, setTipoFormulario] =
    React.useState<FormType>('interno');
  const [perguntas, setPerguntas] = React.useState<Pergunta[]>([]);
  const [novaPerguntaTitulo, setNovaPerguntaTitulo] = React.useState('');
  const [novaPerguntaTipo, setNovaPerguntaTipo] =
    React.useState<FormQuestionType>('shortText');
  const [novaPerguntaObrigatoria, setNovaPerguntaObrigatoria] =
    React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);

  // Estado para edição de pergunta individual
  const [editingQuestion, setEditingQuestion] =
    React.useState<EditingQuestion | null>(null);
  const [novaOpcao, setNovaOpcao] = React.useState('');

  const podeEditarPerguntas = !isSaving;

  // Carregar formulários ao montar
  React.useEffect(() => {
    async function loadForms() {
      try {
        setIsLoading(true);
        setError('');
        const formsList = await formService.getAllForms();
        setForms(formsList);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Erro ao carregar formulários'
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadForms();
  }, []);

  // Resetar tipo quando mudar de interno/externo
  React.useEffect(() => {
    if (tipoFormulario !== 'cadastroPsel') {
      setPerguntas([]);
    }
  }, [tipoFormulario]);

  function resetForm() {
    setEditingFormId(null);
    setNomeFormulario('');
    setDescricaoFormulario('');
    setTipoFormulario('interno');
    setPerguntas([]);
    setNovaPerguntaTitulo('');
    setNovaPerguntaTipo('shortText');
    setNovaPerguntaObrigatoria(true);
    setError('');
    setEditingQuestion(null);
    setNovaOpcao('');
  }

  function abrirEdicaoPergunta(pergunta: Pergunta) {
    setEditingQuestion({
      ...pergunta,
      newItems: pergunta.items ? [...pergunta.items] : []
    });
    setNovaOpcao('');
  }

  function fecharEdicaoPergunta() {
    setEditingQuestion(null);
    setNovaOpcao('');
  }

  function salvarEdicaoPergunta() {
    if (!editingQuestion) return;

    const perguntaId = editingQuestion.id || editingQuestion.tempId;
    const itemsParaSalvar = temOpcoes(editingQuestion.tipo)
      ? editingQuestion.newItems
      : undefined;

    setPerguntas((current) =>
      current.map((p) => {
        if (p.id === perguntaId || p.tempId === perguntaId) {
          const updated = { ...p, ...editingQuestion };
          if (itemsParaSalvar) {
            updated.items = itemsParaSalvar;
          }
          return updated;
        }
        return p;
      })
    );

    fecharEdicaoPergunta();
  }

  function adicionarOpcao() {
    if (!editingQuestion || !novaOpcao.trim()) return;

    const novoId = Math.random().toString(36).substr(2, 9);
    const novoItem: FormQuestionItem = {
      id: novoId,
      valor: novaOpcao.trim()
    };

    setEditingQuestion((current) =>
      current
        ? {
            ...current,
            newItems: [...(current.newItems || []), novoItem]
          }
        : null
    );

    setNovaOpcao('');
  }

  function removerOpcao(itemId: string) {
    setEditingQuestion((current) =>
      current
        ? {
            ...current,
            newItems: (current.newItems || []).filter((i) => i.id !== itemId)
          }
        : null
    );
  }

  function editarFormulario(form: Form) {
    setEditingFormId(form.id);
    setNomeFormulario(form.nome);
    setDescricaoFormulario(form.descricao ?? '');
    setTipoFormulario(form.tipo as FormType);
    setPerguntas(form.perguntas as Pergunta[]);
    setError('');
  }

  function adicionarPergunta() {
    const titulo = novaPerguntaTitulo.trim();

    if (!titulo) {
      setError('Digite o título da pergunta antes de adicionar.');
      return;
    }

    const tempId = generateTempId();
    const novaPergunta: Pergunta = {
      id: typeof tempId === 'string' ? tempId : `temp-${tempId}`,
      titulo,
      tipo: novaPerguntaTipo,
      obrigatoria: novaPerguntaObrigatoria,
      tempId
    };

    setPerguntas((current) => [...current, novaPergunta]);
    setNovaPerguntaTitulo('');
    setNovaPerguntaTipo('shortText');
    setNovaPerguntaObrigatoria(true);
    setError('');
  }

  function removerPergunta(perguntaId: string | number) {
    setPerguntas((current) =>
      current.filter((p) => p.id !== perguntaId && p.tempId !== perguntaId)
    );
    if (
      editingQuestion &&
      (editingQuestion.id === perguntaId ||
        editingQuestion.tempId === perguntaId)
    ) {
      fecharEdicaoPergunta();
    }
  }

  function moverPergunta(perguntaId: string | number, direcao: 'up' | 'down') {
    setPerguntas((current) => {
      const index = current.findIndex(
        (p) => p.id === perguntaId || p.tempId === perguntaId
      );
      if (index === -1) return current;

      const newIndex =
        direcao === 'up'
          ? Math.max(0, index - 1)
          : Math.min(current.length - 1, index + 1);
      if (newIndex === index) return current;

      const newPerguntas = [...current];
      [newPerguntas[index], newPerguntas[newIndex]] = [
        newPerguntas[newIndex],
        newPerguntas[index]
      ];
      return newPerguntas;
    });
  }

  async function finalizarCriacao(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (nomeFormulario.trim() === '') {
      setError('Digite o nome do formulário antes de finalizar.');
      return;
    }

    if (perguntas.length === 0) {
      setError('Adicione pelo menos uma pergunta antes de finalizar.');
      return;
    }

    try {
      setIsSaving(true);
      setError('');

      const payload = {
        nome: nomeFormulario.trim(),
        descricao: descricaoFormulario.trim(),
        tipo: tipoFormulario,
        perguntas: perguntas.map(({ tempId, ...p }) => p)
      };

      if (editingFormId) {
        await formService.updateForm(editingFormId, payload);
      } else {
        await formService.createForm(payload);
      }

      // Recarregar lista
      const formsList = await formService.getFormsByType('cadastroPsel');
      setForms(formsList);
      resetForm();
    } catch (saveError) {
      const message =
        saveError instanceof Error
          ? saveError.message
          : 'Erro ao salvar formulário.';
      setError(message);
    } finally {
      setIsSaving(false);
    }
  }

  async function deletarFormulario(formId: string) {
    if (!window.confirm('Tem certeza que deseja deletar este formulário?')) {
      return;
    }

    try {
      setError('');
      await formService.deleteForm(formId);
      const formsList = await formService.getFormsByType('cadastroPsel');
      setForms(formsList);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Erro ao deletar formulário.'
      );
    }
  }

  return (
    <PageContainer
      pageTitle='Formulários'
      pageDescription='Gerencie formulários de cadastro PSEL e internos.'
      scrollable={true}
    >
      <div className='grid auto-rows-max grid-cols-1 gap-4 lg:auto-rows-auto lg:grid-cols-3'>
        {/* Painel de criação/edição - responsivo */}
        <Card className='h-fit lg:sticky lg:top-4 lg:col-span-1'>
          <CardHeader className='pb-3'>
            <CardTitle className='text-lg'>
              {editingFormId ? 'Editar' : 'Criar formulário'}
            </CardTitle>
            <CardDescription className='text-xs'>
              {editingFormId ? 'Configure as opções' : 'Novo formulário'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className='space-y-3' onSubmit={finalizarCriacao}>
              {/* Nome do formulário */}
              <div className='space-y-1.5'>
                <Label htmlFor='nome-formulario' className='text-sm'>
                  Nome
                </Label>
                <Input
                  id='nome-formulario'
                  placeholder='Ex: Cadastro PSEL'
                  value={nomeFormulario}
                  onChange={(event) => setNomeFormulario(event.target.value)}
                  disabled={isSaving}
                  className='text-sm'
                />
              </div>

              {/* Descrição do formulário */}
              <div className='space-y-1.5'>
                <Label htmlFor='descricao-formulario' className='text-sm'>
                  Descrição
                </Label>
                <Input
                  id='descricao-formulario'
                  placeholder='Descrição...'
                  value={descricaoFormulario}
                  onChange={(event) =>
                    setDescricaoFormulario(event.target.value)
                  }
                  disabled={isSaving}
                  className='text-sm'
                />
              </div>

              {/* Tipo do formulário */}
              <div className='space-y-1.5'>
                <Label htmlFor='tipo-formulario' className='text-sm'>
                  Tipo
                </Label>
                <Select
                  value={tipoFormulario}
                  onValueChange={(value) =>
                    setTipoFormulario(value as FormType)
                  }
                  disabled={isSaving || !!editingFormId}
                >
                  <SelectTrigger id='tipo-formulario' className='text-sm'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='interno'>Interno</SelectItem>
                    <SelectItem value='cadastroPsel'>Cadastro PSEL</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Nova pergunta */}
              <div className='space-y-2 border-t pt-3'>
                <Label className='text-xs font-semibold'>
                  Adicionar pergunta
                </Label>

                <div className='space-y-1.5'>
                  <Label htmlFor='nova-pergunta-titulo' className='text-xs'>
                    Título
                  </Label>
                  <Input
                    id='nova-pergunta-titulo'
                    placeholder='Título...'
                    value={novaPerguntaTitulo}
                    onChange={(event) =>
                      setNovaPerguntaTitulo(event.target.value)
                    }
                    disabled={!podeEditarPerguntas}
                    className='text-sm'
                  />
                </div>

                <div className='space-y-1.5'>
                  <Label htmlFor='nova-pergunta-tipo' className='text-xs'>
                    Tipo
                  </Label>
                  <Select
                    value={novaPerguntaTipo}
                    onValueChange={(value) =>
                      setNovaPerguntaTipo(value as FormQuestionType)
                    }
                    disabled={!podeEditarPerguntas}
                  >
                    <SelectTrigger id='nova-pergunta-tipo' className='text-sm'>
                      <SelectValue />
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

                <div className='flex items-center gap-2'>
                  <Checkbox
                    id='nova-pergunta-obrigatoria'
                    checked={novaPerguntaObrigatoria}
                    onCheckedChange={(checked) =>
                      setNovaPerguntaObrigatoria(Boolean(checked))
                    }
                    disabled={!podeEditarPerguntas}
                  />
                  <label
                    htmlFor='nova-pergunta-obrigatoria'
                    className='text-xs leading-none font-medium'
                  >
                    Obrigatória
                  </label>
                </div>

                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={adicionarPergunta}
                  disabled={!podeEditarPerguntas}
                  className='w-full text-xs'
                >
                  <IconPlus className='mr-1 size-3.5' />
                  Adicionar
                </Button>
              </div>

              {error ? (
                <p className='text-destructive text-xs'>{error}</p>
              ) : null}

              <div className='flex gap-2 pt-3'>
                <Button
                  type='submit'
                  disabled={!podeEditarPerguntas}
                  size='sm'
                  className='flex-1 text-sm'
                >
                  {isSaving
                    ? 'Salvando...'
                    : editingFormId
                      ? 'Atualizar'
                      : 'Criar'}
                </Button>
                {editingFormId && (
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={resetForm}
                    disabled={isSaving}
                    className='text-sm'
                  >
                    Cancelar
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Seção principal: Perguntas + Lista de formulários */}
        <div className='space-y-4 lg:col-span-2'>
          {/* Perguntas adicionadas */}
          <Card>
            <CardHeader className='pb-3'>
              <CardTitle className='text-base'>
                Perguntas ({perguntas.length})
              </CardTitle>
              <CardDescription className='text-xs'>
                {perguntas.length === 0
                  ? 'Nenhuma ainda'
                  : 'Clique para editar ou reordenar'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className='h-80 sm:h-96'>
                <div className='space-y-2 pr-3'>
                  {perguntas.length === 0 ? (
                    <p className='text-muted-foreground py-6 text-center text-xs'>
                      Adicione uma pergunta
                    </p>
                  ) : null}
                  {perguntas.map((pergunta, index) => {
                    const isFirst = index === 0;
                    const isLast = index === perguntas.length - 1;

                    return (
                      <div
                        key={pergunta.id || pergunta.tempId}
                        className='group hover:border-primary/50 hover:bg-muted/50 flex items-start gap-2 rounded-md border p-2.5 transition-colors'
                      >
                        <div className='flex flex-col gap-1'>
                          <Button
                            type='button'
                            variant='ghost'
                            size='sm'
                            onClick={() =>
                              moverPergunta(
                                pergunta.id || pergunta.tempId!,
                                'up'
                              )
                            }
                            disabled={isFirst || !podeEditarPerguntas}
                            className='h-5 w-5 opacity-0 transition-opacity group-hover:opacity-100'
                          >
                            <IconArrowUp className='size-2.5' />
                          </Button>
                          <Button
                            type='button'
                            variant='ghost'
                            size='sm'
                            onClick={() =>
                              moverPergunta(
                                pergunta.id || pergunta.tempId!,
                                'down'
                              )
                            }
                            disabled={isLast || !podeEditarPerguntas}
                            className='h-5 w-5 opacity-0 transition-opacity group-hover:opacity-100'
                          >
                            <IconArrowDown className='size-2.5' />
                          </Button>
                        </div>

                        <div className='min-w-0 flex-1 space-y-1'>
                          <p className='truncate text-xs font-medium'>
                            {index + 1}. {pergunta.titulo}
                          </p>
                          <div className='flex flex-wrap gap-1.5'>
                            <span className='bg-secondary text-secondary-foreground rounded px-1.5 py-0.5 text-xs'>
                              {FORM_QUESTION_TYPE_LABELS[pergunta.tipo]}
                            </span>
                            {pergunta.obrigatoria && (
                              <span className='bg-destructive/10 text-destructive rounded px-1.5 py-0.5 text-xs'>
                                Obr.
                              </span>
                            )}
                            {temOpcoes(pergunta.tipo) &&
                              pergunta.items &&
                              pergunta.items.length > 0 && (
                                <span className='bg-primary/10 text-primary rounded px-1.5 py-0.5 text-xs'>
                                  {pergunta.items.length} opção
                                  {pergunta.items.length !== 1 ? 's' : ''}
                                </span>
                              )}
                          </div>
                        </div>

                        <div className='flex gap-1 opacity-0 transition-opacity group-hover:opacity-100'>
                          <Button
                            type='button'
                            variant='ghost'
                            size='sm'
                            onClick={() => abrirEdicaoPergunta(pergunta)}
                            disabled={!podeEditarPerguntas}
                            className='h-6 w-6'
                          >
                            <IconEdit className='size-3' />
                          </Button>
                          <Button
                            type='button'
                            variant='ghost'
                            size='sm'
                            onClick={() =>
                              removerPergunta(pergunta.id || pergunta.tempId!)
                            }
                            disabled={!podeEditarPerguntas}
                            className='h-6 w-6'
                          >
                            <IconX className='size-3' />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Modal de edição de pergunta */}
          {editingQuestion && (
            <Card>
              <CardHeader className='pb-3'>
                <CardTitle className='text-base'>Editar pergunta</CardTitle>
                <CardDescription className='text-xs'>
                  Configure as propriedades da pergunta
                </CardDescription>
              </CardHeader>
              <CardContent className='space-y-3'>
                {/* Título */}
                <div className='space-y-1.5'>
                  <Label htmlFor='edit-titulo' className='text-xs'>
                    Título
                  </Label>
                  <Input
                    id='edit-titulo'
                    placeholder='Título...'
                    value={editingQuestion.titulo}
                    onChange={(e) =>
                      setEditingQuestion((current) =>
                        current ? { ...current, titulo: e.target.value } : null
                      )
                    }
                    className='text-sm'
                  />
                </div>

                {/* Descrição */}
                <div className='space-y-1.5'>
                  <Label htmlFor='edit-descricao' className='text-xs'>
                    Descrição (opcional)
                  </Label>
                  <Textarea
                    id='edit-descricao'
                    placeholder='Descrição...'
                    value={editingQuestion.descricao || ''}
                    onChange={(e) =>
                      setEditingQuestion((current) =>
                        current
                          ? { ...current, descricao: e.target.value }
                          : null
                      )
                    }
                    className='min-h-16 text-sm'
                  />
                </div>

                {/* Tipo */}
                <div className='space-y-1.5'>
                  <Label htmlFor='edit-tipo' className='text-xs'>
                    Tipo
                  </Label>
                  <Select
                    value={editingQuestion.tipo}
                    onValueChange={(value) =>
                      setEditingQuestion((current) =>
                        current
                          ? {
                              ...current,
                              tipo: value as FormQuestionType,
                              newItems: temOpcoes(value as FormQuestionType)
                                ? current.newItems
                                : undefined
                            }
                          : null
                      )
                    }
                  >
                    <SelectTrigger id='edit-tipo' className='text-sm'>
                      <SelectValue />
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

                {/* Obrigatória */}
                <div className='flex items-center gap-2'>
                  <Checkbox
                    id='edit-obrigatoria'
                    checked={editingQuestion.obrigatoria}
                    onCheckedChange={(checked) =>
                      setEditingQuestion((current) =>
                        current
                          ? { ...current, obrigatoria: Boolean(checked) }
                          : null
                      )
                    }
                  />
                  <label
                    htmlFor='edit-obrigatoria'
                    className='text-xs leading-none font-medium'
                  >
                    Pergunta obrigatória
                  </label>
                </div>

                {/* Opções - se aplicável */}
                {temOpcoes(editingQuestion.tipo) && (
                  <div className='space-y-2 border-t pt-3'>
                    <Label className='text-xs font-semibold'>Opções</Label>

                    <div className='max-h-32 space-y-2 overflow-y-auto'>
                      {(editingQuestion.newItems || []).map((item, idx) => (
                        <div
                          key={item.id}
                          className='bg-muted flex items-center gap-2 rounded-md p-2'
                        >
                          <span className='flex-1 truncate text-xs font-medium'>
                            {idx + 1}. {item.valor}
                          </span>
                          <Button
                            type='button'
                            variant='ghost'
                            size='sm'
                            onClick={() => removerOpcao(item.id)}
                            className='h-5 w-5'
                          >
                            <IconX className='size-3' />
                          </Button>
                        </div>
                      ))}
                    </div>

                    <div className='flex gap-1.5'>
                      <Input
                        placeholder='Nova opção...'
                        value={novaOpcao}
                        onChange={(e) => setNovaOpcao(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            adicionarOpcao();
                          }
                        }}
                        className='text-sm'
                      />
                      <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        onClick={adicionarOpcao}
                        className='px-2'
                      >
                        <IconPlus className='size-3.5' />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Botões de ação */}
                <div className='flex gap-2 pt-3'>
                  <Button
                    type='button'
                    size='sm'
                    onClick={salvarEdicaoPergunta}
                    className='flex-1 text-sm'
                  >
                    Salvar
                  </Button>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={fecharEdicaoPergunta}
                    className='flex-1 text-sm'
                  >
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Lista de formulários */}
          <Card>
            <CardHeader className='pb-3'>
              <CardTitle className='text-base'>
                Formulários ({forms.length})
              </CardTitle>
              <CardDescription className='text-xs'>
                {isLoading ? 'Carregando...' : 'Editar ou deletar'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className='text-muted-foreground text-xs'>Carregando...</p>
              ) : forms.length === 0 ? (
                <p className='text-muted-foreground text-xs'>
                  Nenhum cadastrado
                </p>
              ) : (
                <div className='grid grid-cols-1 gap-2 sm:grid-cols-2'>
                  {forms.map((form) => (
                    <div
                      key={form.id}
                      className='hover:border-primary/50 hover:bg-muted/50 space-y-2 rounded-lg border p-2.5 transition-colors'
                    >
                      <div className='space-y-1'>
                        <p className='text-xs leading-tight font-semibold'>
                          {form.nome}
                        </p>
                        {form.descricao && (
                          <p className='text-muted-foreground line-clamp-1 text-xs'>
                            {form.descricao}
                          </p>
                        )}
                        <p className='text-muted-foreground text-xs'>
                          {form.perguntas.length} pergunta
                          {form.perguntas.length !== 1 ? 's' : ''}
                        </p>
                      </div>

                      <div className='flex gap-1.5'>
                        <Button
                          type='button'
                          size='sm'
                          variant='outline'
                          onClick={() => editarFormulario(form)}
                          disabled={isSaving}
                          className='h-7 flex-1 text-xs'
                        >
                          Editar
                        </Button>
                        <Button
                          type='button'
                          size='sm'
                          variant='destructive'
                          onClick={() => deletarFormulario(form.id)}
                          disabled={isSaving}
                          className='h-7 px-2 text-xs'
                        >
                          <IconMinus className='size-3' />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
