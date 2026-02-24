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
import type { FormQuestionType, FormQuestionItem } from '@/types/forms/form';
import { FORM_QUESTION_TYPE_LABELS } from '@/types/forms/form';

const TIPOS_COM_OPCOES: FormQuestionType[] = [
  'multipleChoice',
  'checkbox',
  'select'
];

function temOpcoes(tipo: FormQuestionType): boolean {
  return TIPOS_COM_OPCOES.includes(tipo);
}

interface NewQuestion {
  titulo: string;
  tipo: FormQuestionType;
  obrigatoria: boolean;
  descricao?: string;
  items?: FormQuestionItem[];
}

interface QuestionAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (question: NewQuestion) => void;
  loading?: boolean;
}

const TIPOS_RESPOSTA: Array<{ value: FormQuestionType; label: string }> =
  Object.entries(FORM_QUESTION_TYPE_LABELS).map(([key, label]) => ({
    value: key as FormQuestionType,
    label
  }));

export const QuestionAddModal: React.FC<QuestionAddModalProps> = ({
  isOpen,
  onClose,
  onSave,
  loading = false
}) => {
  const [isMounted, setIsMounted] = useState(false);
  const [question, setQuestion] = React.useState<NewQuestion>({
    titulo: '',
    tipo: 'shortText',
    obrigatoria: true,
    items: []
  });
  const [novaOpcao, setNovaOpcao] = React.useState('');

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setQuestion({
        titulo: '',
        tipo: 'shortText',
        obrigatoria: true,
        items: []
      });
      setNovaOpcao('');
    }
  }, [isOpen]);

  const adicionarOpcao = () => {
    if (!novaOpcao.trim()) return;

    const novoId = Math.random().toString(36).substr(2, 9);
    const novoItem: FormQuestionItem = {
      id: novoId,
      valor: novaOpcao.trim()
    };

    setQuestion((current) => ({
      ...current,
      items: [...(current.items || []), novoItem]
    }));

    setNovaOpcao('');
  };

  const removerOpcao = (itemId: string) => {
    setQuestion((current) => ({
      ...current,
      items: (current.items || []).filter((i) => i.id !== itemId)
    }));
  };

  const handleSave = () => {
    if (!question.titulo.trim()) return;
    onSave(question);
    setQuestion({
      titulo: '',
      tipo: 'shortText',
      obrigatoria: true,
      items: []
    });
    setNovaOpcao('');
  };

  if (!isMounted) {
    return null;
  }

  return (
    <Modal
      title='Adicionar pergunta'
      description='Configure as propriedades da pergunta'
      isOpen={isOpen}
      onClose={onClose}
    >
      <div className='space-y-4 py-4'>
        {/* Título */}
        <div className='space-y-1.5'>
          <Label htmlFor='add-titulo' className='text-xs'>
            Título *
          </Label>
          <Input
            id='add-titulo'
            placeholder='Título da pergunta...'
            value={question.titulo}
            onChange={(e) =>
              setQuestion((current) => ({
                ...current,
                titulo: e.target.value
              }))
            }
            disabled={loading}
            className='text-sm'
          />
        </div>

        {/* Descrição */}
        <div className='space-y-1.5'>
          <Label htmlFor='add-descricao' className='text-xs'>
            Descrição (opcional)
          </Label>
          <Textarea
            id='add-descricao'
            placeholder='Descrição...'
            value={question.descricao || ''}
            onChange={(e) =>
              setQuestion((current) => ({
                ...current,
                descricao: e.target.value
              }))
            }
            disabled={loading}
            className='min-h-16 text-sm'
          />
        </div>

        {/* Tipo */}
        <div className='space-y-1.5'>
          <Label htmlFor='add-tipo' className='text-xs'>
            Tipo *
          </Label>
          <Select
            value={question.tipo}
            onValueChange={(value) =>
              setQuestion((current) => ({
                ...current,
                tipo: value as FormQuestionType,
                items: temOpcoes(value as FormQuestionType)
                  ? current.items
                  : undefined
              }))
            }
            disabled={loading}
          >
            <SelectTrigger id='add-tipo' className='text-sm'>
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
            id='add-obrigatoria'
            checked={question.obrigatoria}
            onCheckedChange={(checked) =>
              setQuestion((current) => ({
                ...current,
                obrigatoria: Boolean(checked)
              }))
            }
            disabled={loading}
          />
          <label
            htmlFor='add-obrigatoria'
            className='text-xs leading-none font-medium'
          >
            Pergunta obrigatória
          </label>
        </div>

        {/* Opções - se aplicável */}
        {temOpcoes(question.tipo) && (
          <div className='space-y-2 border-t pt-3'>
            <Label className='text-xs font-semibold'>Opções *</Label>

            <div className='max-h-32 space-y-2 overflow-y-auto'>
              {(question.items || []).map((item, idx) => (
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
      </div>

      {/* Botões de ação */}
      <div className='flex w-full items-center justify-end space-x-2 pt-6'>
        <Button disabled={loading} variant='outline' onClick={onClose}>
          Cancelar
        </Button>
        <Button
          disabled={loading || !question.titulo.trim()}
          onClick={handleSave}
        >
          Adicionar
        </Button>
      </div>
    </Modal>
  );
};
