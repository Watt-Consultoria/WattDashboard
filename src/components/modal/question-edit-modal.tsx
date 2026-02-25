'use client';

import * as React from 'react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { IconPlus, IconX } from '@tabler/icons-react';
import type {
  FormQuestion,
  FormQuestionType,
  FormQuestionItem,
  FormQuestionValidation
} from '@/types/forms/form';
import { FORM_QUESTION_TYPE_LABELS } from '@/types/forms/form';

const TIPOS_COM_OPCOES: FormQuestionType[] = [
  'multipleChoice',
  'checkbox',
  'select'
];

function temOpcoes(tipo: FormQuestionType): boolean {
  return TIPOS_COM_OPCOES.includes(tipo);
}

interface EditingQuestion extends FormQuestion {
  tempId?: number;
  newItems?: FormQuestionItem[];
}

interface QuestionEditModalProps {
  isOpen: boolean;
  question: EditingQuestion | null;
  onClose: () => void;
  onSave: (question: EditingQuestion) => void;
  loading?: boolean;
}

const TIPOS_RESPOSTA: Array<{ value: FormQuestionType; label: string }> =
  Object.entries(FORM_QUESTION_TYPE_LABELS)
    .filter(([key]) => key !== 'infoSection')
    .map(([key, label]) => ({
      value: key as FormQuestionType,
      label
    }));

export const QuestionEditModal: React.FC<QuestionEditModalProps> = ({
  isOpen,
  question,
  onClose,
  onSave,
  loading = false
}) => {
  const [isMounted, setIsMounted] = useState(false);
  const [editingQuestion, setEditingQuestion] =
    React.useState<EditingQuestion | null>(null);
  const [novaOpcao, setNovaOpcao] = React.useState('');
  const [regexEnabled, setRegexEnabled] = React.useState(false);
  const [regexError, setRegexError] = React.useState('');

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (question) {
      setEditingQuestion({
        ...question,
        newItems: question.items ? [...question.items] : []
      });
      setRegexEnabled(Boolean(question.validacao?.pattern));
      setRegexError('');
      setNovaOpcao('');
    } else {
      setEditingQuestion(null);
      setRegexEnabled(false);
      setRegexError('');
      setNovaOpcao('');
    }
  }, [question, isOpen]);

  const adicionarOpcao = () => {
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
  };

  const removerOpcao = (itemId: string) => {
    setEditingQuestion((current) =>
      current
        ? {
            ...current,
            newItems: (current.newItems || []).filter((i) => i.id !== itemId)
          }
        : null
    );
  };

  const handleSave = () => {
    if (!editingQuestion) return;

    // Validar regex se habilitado
    if (
      regexEnabled &&
      editingQuestion.tipo === 'shortText' &&
      editingQuestion.validacao?.pattern
    ) {
      try {
        new RegExp(editingQuestion.validacao.pattern);
      } catch {
        setRegexError('Padrão regex inválido');
        return;
      }
    }

    // Limpar validação se não está habilitada ou não é shortText
    const finalQuestion = { ...editingQuestion };
    if (!regexEnabled || editingQuestion.tipo !== 'shortText') {
      delete finalQuestion.validacao;
    }

    onSave(finalQuestion);
  };

  if (!isMounted) {
    return null;
  }

  return (
    <Modal
      title={
        editingQuestion?.tipo === 'infoSection'
          ? 'Editar seção informativa'
          : 'Editar pergunta'
      }
      description={
        editingQuestion?.tipo === 'infoSection'
          ? 'Configure o bloco de informações'
          : 'Configure as propriedades da pergunta'
      }
      isOpen={isOpen}
      onClose={onClose}
    >
      <div className='space-y-4 py-4'>
        {/* Título */}
        <div className='space-y-1.5'>
          <Label htmlFor='edit-titulo' className='text-xs'>
            Título
          </Label>
          <Input
            id='edit-titulo'
            placeholder='Título...'
            value={editingQuestion?.titulo || ''}
            onChange={(e) =>
              setEditingQuestion((current) =>
                current ? { ...current, titulo: e.target.value } : null
              )
            }
            disabled={loading}
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
            value={editingQuestion?.descricao || ''}
            onChange={(e) =>
              setEditingQuestion((current) =>
                current ? { ...current, descricao: e.target.value } : null
              )
            }
            disabled={loading}
            className='min-h-16 text-sm'
          />
        </div>

        {/* Tipo - oculto para seções informativas */}
        {editingQuestion?.tipo !== 'infoSection' && (
          <div className='space-y-1.5'>
            <Label htmlFor='edit-tipo' className='text-xs'>
              Tipo
            </Label>
            <Select
              value={editingQuestion?.tipo || 'shortText'}
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
              disabled={loading}
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
        )}

        {/* Obrigatória */}
        {editingQuestion?.tipo !== 'infoSection' && (
          <div className='flex items-center gap-2'>
            <Checkbox
              id='edit-obrigatoria'
              checked={editingQuestion?.obrigatoria || false}
              onCheckedChange={(checked) =>
                setEditingQuestion((current) =>
                  current ? { ...current, obrigatoria: Boolean(checked) } : null
                )
              }
              disabled={loading}
            />
            <label
              htmlFor='edit-obrigatoria'
              className='text-xs leading-none font-medium'
            >
              Pergunta obrigatória
            </label>
          </div>
        )}

        {/* Conteúdo - para seção informativa */}
        {editingQuestion?.tipo === 'infoSection' && (
          <div className='space-y-1.5 border-t pt-3'>
            <Label htmlFor='edit-conteudo' className='text-xs'>
              Conteúdo *
            </Label>
            <p className='text-muted-foreground text-xs'>
              Insira o texto informativo. Para adicionar links, use o formato:
              [texto do link](URL)
            </p>
            <Textarea
              id='edit-conteudo'
              placeholder='Ex: Para mais informações, acesse [nosso site](https://exemplo.com)'
              value={editingQuestion.conteudo || ''}
              onChange={(e) =>
                setEditingQuestion((current) =>
                  current ? { ...current, conteudo: e.target.value } : null
                )
              }
              disabled={loading}
              className='min-h-24 text-sm'
            />
          </div>
        )}

        {/* Opções - se aplicável */}
        {editingQuestion && temOpcoes(editingQuestion.tipo) && (
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
                    disabled={loading}
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
                disabled={loading}
                className='text-sm'
              />
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={adicionarOpcao}
                disabled={loading}
                className='px-2'
              >
                <IconPlus className='size-3.5' />
              </Button>
            </div>
          </div>
        )}

        {/* Validação Regex - apenas para shortText */}
        {editingQuestion && editingQuestion.tipo === 'shortText' && (
          <div className='space-y-3 border-t pt-3'>
            <div className='flex items-center gap-2'>
              <Checkbox
                id='edit-regex-enabled'
                checked={regexEnabled}
                onCheckedChange={(checked) => {
                  const enabled = Boolean(checked);
                  setRegexEnabled(enabled);
                  if (!enabled) {
                    setEditingQuestion((current) =>
                      current
                        ? (() => {
                            const { validacao, ...rest } = current;
                            return rest as EditingQuestion;
                          })()
                        : null
                    );
                    setRegexError('');
                  }
                }}
                disabled={loading}
              />
              <label
                htmlFor='edit-regex-enabled'
                className='text-xs leading-none font-medium'
              >
                Validar com expressão regular (regex)
              </label>
            </div>

            {regexEnabled && (
              <div className='space-y-3'>
                <div className='space-y-1.5'>
                  <Label htmlFor='edit-regex-pattern' className='text-xs'>
                    Padrão Regex *
                  </Label>
                  <Input
                    id='edit-regex-pattern'
                    placeholder='Ex: ^[A-Za-z\\s]+$ ou ^\\d{3}\\.\\d{3}\\.\\d{3}-\\d{2}$'
                    value={editingQuestion?.validacao?.pattern || ''}
                    onChange={(e) => {
                      setRegexError('');
                      setEditingQuestion((current) =>
                        current
                          ? {
                              ...current,
                              validacao: {
                                pattern: e.target.value,
                                message: current.validacao?.message || ''
                              }
                            }
                          : null
                      );
                    }}
                    disabled={loading}
                    className='font-mono text-sm'
                  />
                  {regexError && (
                    <p className='text-destructive text-xs'>{regexError}</p>
                  )}
                </div>

                <div className='space-y-1.5'>
                  <Label htmlFor='edit-regex-message' className='text-xs'>
                    Mensagem de erro (opcional)
                  </Label>
                  <Input
                    id='edit-regex-message'
                    placeholder='Ex: Formato inválido. Use apenas letras.'
                    value={editingQuestion?.validacao?.message || ''}
                    onChange={(e) =>
                      setEditingQuestion((current) =>
                        current
                          ? {
                              ...current,
                              validacao: {
                                pattern: current.validacao?.pattern || '',
                                message: e.target.value
                              }
                            }
                          : null
                      )
                    }
                    disabled={loading}
                    className='text-sm'
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Botões de ação */}
      <div className='flex w-full items-center justify-end space-x-2 pt-6'>
        <Button disabled={loading} variant='outline' onClick={onClose}>
          Cancelar
        </Button>
        <Button disabled={loading} onClick={handleSave}>
          Salvar
        </Button>
      </div>
    </Modal>
  );
};
