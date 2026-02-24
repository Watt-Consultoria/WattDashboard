'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { toast } from 'sonner';
import type {
  EmailTemplate,
  EmailTemplateType,
  RenderedEmail
} from '@/types/candidate/email-template';
import {
  EMAIL_TEMPLATES,
  renderEmailTemplate
} from '@/types/candidate/email-template';

interface NotifyTaggedModalProps {
  isOpen: boolean;
  onClose: () => void;
  formId: string;
  tag: string;
  candidateCount: number;
}

export const NotifyTaggedModal: React.FC<NotifyTaggedModalProps> = ({
  isOpen,
  onClose,
  formId,
  tag,
  candidateCount
}) => {
  const [isMounted, setIsMounted] = useState(false);
  const [selectedTemplate, setSelectedTemplate] =
    useState<EmailTemplateType>('convocacao');
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [preview, setPreview] = useState<RenderedEmail | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setFieldValues({});
      setPreview(null);
      setSelectedTemplate('convocacao');
    }
  }, [isOpen]);

  const template = EMAIL_TEMPLATES.find((t) => t.id === selectedTemplate);

  const updateFieldValue = (fieldId: string, value: string) => {
    setFieldValues((prev) => ({
      ...prev,
      [fieldId]: value
    }));
    setPreview(null);
  };

  const validateForm = (): boolean => {
    if (!template) return false;

    for (const field of template.campos) {
      if (field.required && !fieldValues[field.id]?.trim()) {
        toast.error(`O campo "${field.label}" é obrigatório.`);
        return false;
      }
    }

    return true;
  };

  const handlePreview = () => {
    if (!validateForm() || !template) return;

    const rendered = renderEmailTemplate(template, fieldValues);
    setPreview(rendered);
  };

  const handleSend = async () => {
    if (!validateForm() || !template) return;

    setIsLoading(true);
    try {
      const rendered = renderEmailTemplate(template, fieldValues);

      const response = await fetch('/api/candidate/notify-tagged', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          formId,
          tag,
          subject: rendered.subject,
          html: rendered.html,
          text: rendered.text
        })
      });

      const data = await response.json();

      // if (!response.ok) {
      //   throw new Error(data.error || 'Erro ao enviar emails');
      // }

      toast.success(`Email enviado para ${data.sent} candidato(s)!`, {
        description: `${data.sent} de ${data.total} emails enviados com sucesso${
          data.errors && data.errors.length > 0
            ? `. ${data.errors.length} erro(s) encontrado(s).`
            : '.'
        }`
      });

      onClose();
    } catch (error) {
      console.error('[NotifyTaggedModal] Erro ao enviar emails:', error);
      toast.error(
        error instanceof Error ? error.message : 'Erro ao enviar emails'
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!isMounted || !template) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='max-h-[90vh] max-w-2xl overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>Notificar candidatos com tag "{tag}"</DialogTitle>
          <DialogDescription>
            Você está prestes a enviar um email para {candidateCount}{' '}
            candidato(s)
          </DialogDescription>
        </DialogHeader>

        <div className='grid grid-cols-2 gap-6 py-4'>
          {/* Coluna esquerda - Configuração */}
          <div className='space-y-6'>
            {/* Seleção de template */}
            <div className='space-y-2'>
              <Label htmlFor='template-select' className='text-sm font-medium'>
                Modelo de Email
              </Label>
              <Select
                value={selectedTemplate}
                onValueChange={(value) => {
                  setSelectedTemplate(value as EmailTemplateType);
                  setFieldValues({});
                  setPreview(null);
                }}
              >
                <SelectTrigger id='template-select'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EMAIL_TEMPLATES.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className='text-muted-foreground mt-1 text-xs'>
                {template.descricao}
              </p>
            </div>

            {/* Campos do template */}
            <div className='space-y-4'>
              <p className='text-sm font-medium'>Preencha os campos</p>
              {template.campos.map((field) => (
                <div key={field.id} className='space-y-1.5'>
                  <Label htmlFor={field.id} className='text-xs'>
                    {field.label}
                    {field.required && (
                      <span className='ml-1 text-red-500'>*</span>
                    )}
                  </Label>
                  {field.type === 'textarea' ? (
                    <Textarea
                      id={field.id}
                      placeholder={field.placeholder}
                      value={fieldValues[field.id] ?? ''}
                      onChange={(e) =>
                        updateFieldValue(field.id, e.target.value)
                      }
                      disabled={isLoading}
                      className='min-h-20 text-sm'
                    />
                  ) : (
                    <Input
                      id={field.id}
                      placeholder={field.placeholder}
                      value={fieldValues[field.id] ?? ''}
                      onChange={(e) =>
                        updateFieldValue(field.id, e.target.value)
                      }
                      disabled={isLoading}
                      className='text-sm'
                    />
                  )}
                </div>
              ))}
            </div>

            <Button
              variant='outline'
              onClick={handlePreview}
              disabled={isLoading}
              className='w-full'
            >
              Visualizar
            </Button>
          </div>

          {/* Coluna direita - Preview */}
          <div className='space-y-4'>
            {preview ? (
              <Card className='flex h-full flex-col'>
                <CardHeader className='pb-3'>
                  <CardTitle className='text-sm'>Pré-visualização</CardTitle>
                </CardHeader>
                <CardContent className='flex-1 overflow-y-auto'>
                  <div className='space-y-3 text-sm'>
                    <div>
                      <p className='text-muted-foreground text-xs font-medium'>
                        Assunto:
                      </p>
                      <p className='font-medium'>{preview.subject}</p>
                    </div>
                    <div className='border-t pt-3'>
                      <p className='text-muted-foreground mb-2 text-xs font-medium'>
                        Visualização:
                      </p>
                      <div
                        className='rounded border bg-white p-3 text-xs'
                        dangerouslySetInnerHTML={{ __html: preview.html }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className='bg-muted/50 flex h-full items-center justify-center'>
                <p className='text-muted-foreground text-center text-sm'>
                  Clique em "Visualizar" para ver como o email ficará
                </p>
              </Card>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleSend} disabled={isLoading || !preview}>
            {isLoading
              ? 'Enviando...'
              : `Enviar para ${candidateCount} candidato(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
