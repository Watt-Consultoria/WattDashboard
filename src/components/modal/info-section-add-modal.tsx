'use client';

import * as React from 'react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface NewInfoSection {
  titulo: string;
  descricao?: string;
  conteudo: string;
}

interface InfoSectionAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (section: NewInfoSection) => void;
  loading?: boolean;
}

export const InfoSectionAddModal: React.FC<InfoSectionAddModalProps> = ({
  isOpen,
  onClose,
  onSave,
  loading = false
}) => {
  const [isMounted, setIsMounted] = useState(false);
  const [section, setSection] = React.useState<NewInfoSection>({
    titulo: '',
    descricao: '',
    conteudo: ''
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setSection({
        titulo: '',
        descricao: '',
        conteudo: ''
      });
    }
  }, [isOpen]);

  const handleSave = () => {
    if (!section.titulo.trim() || !section.conteudo.trim()) return;
    onSave(section);
    setSection({ titulo: '', descricao: '', conteudo: '' });
  };

  if (!isMounted) {
    return null;
  }

  return (
    <Modal
      title='Adicionar seção informativa'
      description='Crie um bloco de informações para o formulário'
      isOpen={isOpen}
      onClose={onClose}
    >
      <div className='space-y-4 py-4'>
        {/* Título */}
        <div className='space-y-1.5'>
          <Label htmlFor='info-titulo' className='text-xs'>
            Título *
          </Label>
          <Input
            id='info-titulo'
            placeholder='Título da seção...'
            value={section.titulo}
            onChange={(e) =>
              setSection((current) => ({
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
          <Label htmlFor='info-descricao' className='text-xs'>
            Descrição (opcional)
          </Label>
          <Textarea
            id='info-descricao'
            placeholder='Descrição breve da seção...'
            value={section.descricao || ''}
            onChange={(e) =>
              setSection((current) => ({
                ...current,
                descricao: e.target.value
              }))
            }
            disabled={loading}
            className='min-h-16 text-sm'
          />
        </div>

        {/* Conteúdo */}
        <div className='space-y-1.5 border-t pt-3'>
          <Label htmlFor='info-conteudo' className='text-xs'>
            Conteúdo *
          </Label>
          <p className='text-muted-foreground text-xs'>
            Insira o texto informativo. Para adicionar links, use o formato:
            [texto do link](URL)
          </p>
          <Textarea
            id='info-conteudo'
            placeholder='Ex: Para mais informações, acesse [nosso site](https://exemplo.com)'
            value={section.conteudo}
            onChange={(e) =>
              setSection((current) => ({
                ...current,
                conteudo: e.target.value
              }))
            }
            disabled={loading}
            className='min-h-24 text-sm'
          />
        </div>
      </div>

      {/* Botões de ação */}
      <div className='flex w-full items-center justify-end space-x-2 pt-6'>
        <Button disabled={loading} variant='outline' onClick={onClose}>
          Cancelar
        </Button>
        <Button
          disabled={
            loading || !section.titulo.trim() || !section.conteudo.trim()
          }
          onClick={handleSave}
        >
          Adicionar
        </Button>
      </div>
    </Modal>
  );
};
