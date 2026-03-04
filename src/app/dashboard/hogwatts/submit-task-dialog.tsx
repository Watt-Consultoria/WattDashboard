'use client';

import { useState } from 'react';
import { toast } from 'sonner';
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedTask = tasks.find((t) => t.id === selectedTaskId);

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

    setIsSubmitting(true);
    try {
      const input: CreateSubmissionInput = {
        taskId: selectedTaskId,
        memberId,
        note
      };
      await hogwattsService.submitTask(input);
      toast.success('Tarefa enviada para análise!');
      setSelectedTaskId('');
      setNote('');
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
