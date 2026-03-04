'use client';

import { useState, useRef } from 'react';
import { toast } from 'sonner';
import { IconUpload, IconX } from '@tabler/icons-react';
import hogwattsService from '@/services/hogwattsService';
import type {
  HogwattsTask,
  CreateSubmissionInput
} from '@/types/hogwatts/hogwatts';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { formatBytes } from '@/lib/utils';
import { file } from 'zod';

interface SubmitTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberId: string;
  tasks: HogwattsTask[];
  onSuccess: () => void;
}

export function SubmitTaskDialog({
  open,
  onOpenChange,
  memberId,
  tasks,
  onSuccess
}: SubmitTaskDialogProps) {
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [note, setNote] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedTask = tasks.find((t) => t.id === selectedTaskId);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        toast.error('Arquivo muito grande. Máximo 10MB.');
        return;
      }
      setProofFile(file);
    }
  };

  const handleRemoveFile = () => {
    setProofFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!selectedTaskId) {
      toast.error('Selecione uma tarefa');
      return;
    }

    if (!note) {
      toast.error(
        'Adicione uma descrição ou observação sobre a tarefa concluída'
      );
      return;
    }

    if (!proofFile) {
      toast.error(
        'Anexe um arquivo de comprovação para a tarefa concluída (imagem ou PDF)'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const input: CreateSubmissionInput = {
        taskId: selectedTaskId,
        memberId,
        note,
        proofFile: proofFile || undefined
      };
      await hogwattsService.submitTask(input);
      toast.success('Tarefa enviada para análise!');
      setSelectedTaskId('');
      setNote('');
      setProofFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erro ao enviar a submissão.';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Submeter Tarefa</DialogTitle>
          <DialogDescription>
            Selecione a tarefa concluída e envie para aprovação da coordenação.
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4 py-2'>
          <div className='space-y-2'>
            <Label htmlFor='task'>Tarefa</Label>
            <Select value={selectedTaskId} onValueChange={setSelectedTaskId}>
              <SelectTrigger id='task'>
                <SelectValue placeholder='Selecione uma tarefa' />
              </SelectTrigger>
              <SelectContent>
                {tasks.map((task) => (
                  <SelectItem key={task.id} value={task.id}>
                    {task.name} ({task.points} pts)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedTask && (
              <p className='text-muted-foreground text-xs'>
                {selectedTask.description} —{' '}
                <strong>{selectedTask.points} pontos</strong>
              </p>
            )}
          </div>

          <div className='space-y-2'>
            <Label htmlFor='note'>Descrição</Label>
            <Textarea
              id='note'
              placeholder='Descreva a conclusão da tarefa...'
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
            />
          </div>

          <div className='space-y-2'>
            <Label htmlFor='proof-file'>Arquivo para Comprovação</Label>
            <div className='space-y-2'>
              {!proofFile ? (
                <div className='relative'>
                  <input
                    ref={fileInputRef}
                    id='proof-file'
                    type='file'
                    onChange={handleFileChange}
                    disabled={isSubmitting}
                    className='hidden'
                    accept='image/*,.pdf'
                  />
                  <Button
                    type='button'
                    variant='outline'
                    className='w-full justify-start'
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSubmitting}
                  >
                    <IconUpload className='mr-2 h-4 w-4' />
                    Selecionar arquivo
                  </Button>
                </div>
              ) : (
                <div className='border-input bg-background flex items-center justify-between rounded-md border p-3'>
                  <div className='flex-1 truncate'>
                    <p className='truncate text-sm font-medium'>
                      {proofFile.name}
                    </p>
                    <p className='text-muted-foreground text-xs'>
                      {formatBytes(proofFile.size)}
                    </p>
                  </div>
                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    onClick={handleRemoveFile}
                    disabled={isSubmitting}
                    className='ml-2 h-8 w-8 p-0'
                  >
                    <IconX className='h-4 w-4' />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant='outline'
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Enviando...' : 'Enviar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
