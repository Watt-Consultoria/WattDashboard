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
import { QuestionEditModal } from '@/components/modal/question-edit-modal';
import { QuestionAddModal } from '@/components/modal/question-add-modal';
import { InfoSectionAddModal } from '@/components/modal/info-section-add-modal';
import { useDragDrop } from '@/hooks/use-drag-drop';
import formService from '@/services/formService';
import useMetadata from '@/hooks/use-metadata';
import type {
  Form,
  FormQuestion,
  FormQuestionType,
  FormType,
  FormQuestionItem,
  FormQuestionValidation
} from '@/types/forms/form';
import { FORM_QUESTION_TYPE_LABELS } from '@/types/forms/form';
import {
  IconMinus,
  IconPlus,
  IconEdit,
  IconX,
  IconGripVertical,
  IconInfoCircle
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

/**
 * Remove propriedades undefined de um objeto
 */
function limparObjeto(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map((item) => limparObjeto(item));
  }
  if (obj !== null && typeof obj === 'object') {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined && value !== null) {
        cleaned[key] = limparObjeto(value);
      }
    }
    return cleaned;
  }
  return obj;
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
  const [isSaving, setIsSaving] = React.useState(false);

  // Estado para edição de pergunta individual em modal
  const [editingQuestion, setEditingQuestion] =
    React.useState<EditingQuestion | null>(null);
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  // Estado para adição de pergunta em modal
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);

  // Estado para adição de seção informativa em modal
  const [isInfoSectionModalOpen, setIsInfoSectionModalOpen] =
    React.useState(false);

  // Hook para drag and drop
  const {
    draggedIndex,
    dragOverIndex,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd
  } = useDragDrop(perguntas, setPerguntas);

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
    setError('');
    setEditingQuestion(null);
    setIsModalOpen(false);
    setIsAddModalOpen(false);
    setIsInfoSectionModalOpen(false);
  }

  function abrirEdicaoPergunta(pergunta: Pergunta) {
    setEditingQuestion({
      ...pergunta,
      newItems: pergunta.items ? [...pergunta.items] : []
    });
    setIsModalOpen(true);
  }

  function fecharEdicaoPergunta() {
    setEditingQuestion(null);
    setIsModalOpen(false);
  }

  function salvarEdicaoPergunta(pergunta: EditingQuestion) {
    const perguntaId = pergunta.id || pergunta.tempId;
    const itemsParaSalvar = temOpcoes(pergunta.tipo)
      ? pergunta.newItems
      : undefined;

    setPerguntas((current) =>
      current.map((p) => {
        if (p.id === perguntaId || p.tempId === perguntaId) {
          const updated = { ...p, ...pergunta };
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

  function editarFormulario(form: Form) {
    setEditingFormId(form.id);
    setNomeFormulario(form.nome);
    setDescricaoFormulario(form.descricao ?? '');
    setTipoFormulario(form.tipo as FormType);
    setPerguntas(form.perguntas as Pergunta[]);
    setError('');
  }

  function adicionarPergunta(quartaQuestion: {
    titulo: string;
    tipo: FormQuestionType;
    obrigatoria: boolean;
    descricao?: string;
    items?: FormQuestionItem[];
    conteudo?: string;
    validacao?: FormQuestionValidation;
  }) {
    const tempId = generateTempId();
    const novaPergunta: Pergunta = {
      id: typeof tempId === 'string' ? tempId : `temp-${tempId}`,
      titulo: quartaQuestion.titulo,
      tipo: quartaQuestion.tipo,
      obrigatoria:
        quartaQuestion.tipo === 'infoSection'
          ? false
          : quartaQuestion.obrigatoria,
      descricao: quartaQuestion.descricao,
      items: quartaQuestion.items,
      conteudo: quartaQuestion.conteudo,
      validacao: quartaQuestion.validacao,
      tempId
    };

    setPerguntas((current) => [...current, novaPergunta]);
    setIsAddModalOpen(false);
    setIsInfoSectionModalOpen(false);
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
        perguntas: perguntas.map(({ tempId, ...p }) => limparObjeto(p))
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

              {/* Botão para adicionar pergunta */}
              <div className='space-y-2 border-t pt-3'>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={() => setIsAddModalOpen(true)}
                  disabled={!podeEditarPerguntas}
                  className='w-full text-xs'
                >
                  <IconPlus className='mr-1 size-3.5' />
                  Adicionar pergunta
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={() => setIsInfoSectionModalOpen(true)}
                  disabled={!podeEditarPerguntas}
                  className='w-full text-xs'
                >
                  <IconInfoCircle className='mr-1 size-3.5' />
                  Adicionar seção informativa
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
                Itens do formulário ({perguntas.length})
              </CardTitle>
              <CardDescription className='text-xs'>
                {perguntas.length === 0
                  ? 'Nenhum item ainda'
                  : 'Arraste para reordenar ou clique para editar'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className='h-80 sm:h-96'>
                <div className='space-y-2 pr-3'>
                  {perguntas.length === 0 ? (
                    <p className='text-muted-foreground py-6 text-center text-xs'>
                      Adicione uma pergunta ou seção informativa
                    </p>
                  ) : null}
                  {perguntas.map((pergunta, index) => (
                    <div
                      key={pergunta.id || pergunta.tempId}
                      draggable={podeEditarPerguntas}
                      onDragStart={(e) => handleDragStart(index, e as any)}
                      onDragOver={(e) => handleDragOver(index, e as any)}
                      onDragLeave={(e) => handleDragLeave(e as any)}
                      onDrop={(e) => handleDrop(index, e as any)}
                      onDragEnd={(e) => handleDragEnd(e as any)}
                      className={`group rounded-md border p-2.5 transition-all ${
                        draggedIndex === index
                          ? 'bg-muted opacity-50'
                          : dragOverIndex === index
                            ? 'border-primary/50 bg-primary/5'
                            : 'hover:border-primary/50 hover:bg-muted/50'
                      } ${podeEditarPerguntas ? 'cursor-move' : 'cursor-default'}`}
                    >
                      <div className='flex items-start gap-2'>
                        <div className='text-muted-foreground flex shrink-0 items-center pt-0.5 opacity-0 transition-opacity group-hover:opacity-100'>
                          <IconGripVertical className='size-4' />
                        </div>

                        <div className='min-w-0 flex-1 space-y-1'>
                          <p className='truncate text-xs font-medium'>
                            {pergunta.tipo === 'infoSection' && (
                              <IconInfoCircle className='mr-1 inline size-3.5 text-blue-500' />
                            )}
                            {index + 1}. {pergunta.titulo}
                          </p>
                          <div className='flex flex-wrap gap-1.5'>
                            <span
                              className={`rounded px-1.5 py-0.5 text-xs ${
                                pergunta.tipo === 'infoSection'
                                  ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                  : 'bg-secondary text-secondary-foreground'
                              }`}
                            >
                              {FORM_QUESTION_TYPE_LABELS[pergunta.tipo]}
                            </span>
                            {pergunta.tipo !== 'infoSection' &&
                              pergunta.obrigatoria && (
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
                            {pergunta.tipo === 'shortText' &&
                              pergunta.validacao?.pattern && (
                                <span className='rounded bg-violet-500/10 px-1.5 py-0.5 text-xs text-violet-600 dark:text-violet-400'>
                                  Regex
                                </span>
                              )}
                          </div>
                        </div>

                        <div className='flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100'>
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
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Modal de edição de pergunta */}
          <QuestionEditModal
            isOpen={isModalOpen}
            question={editingQuestion}
            onClose={fecharEdicaoPergunta}
            onSave={salvarEdicaoPergunta}
            loading={isSaving}
          />

          {/* Modal de adição de pergunta */}
          <QuestionAddModal
            isOpen={isAddModalOpen}
            onClose={() => setIsAddModalOpen(false)}
            onSave={adicionarPergunta}
            loading={isSaving}
          />

          {/* Modal de adição de seção informativa */}
          <InfoSectionAddModal
            isOpen={isInfoSectionModalOpen}
            onClose={() => setIsInfoSectionModalOpen(false)}
            onSave={(section) => {
              adicionarPergunta({
                titulo: section.titulo,
                tipo: 'infoSection',
                obrigatoria: false,
                descricao: section.descricao,
                conteudo: section.conteudo
              });
            }}
            loading={isSaving}
          />

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
