'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import hogwattsService from '@/services/hogwattsService';
import type {
  MemberSectorEnum,
  MemberSectorEnumSimple
} from '@/types/member/member';
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

const SECTORS: MemberSectorEnumSimple[] = [
  'Comercial',
  'Projetos',
  'Marketing'
];

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateTaskDialog({
  open,
  onOpenChange,
  onSuccess
}: CreateTaskDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [points, setPoints] = useState('');
  const [sector, setSector] = useState<MemberSectorEnum | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setName('');
    setDescription('');
    setPoints('');
    setSector('');
  };

  const handleSubmit = async () => {
    const parsedPoints = Number(points);

    setIsSubmitting(true);
    try {
      await hogwattsService.createTask({
        name,
        description,
        points: parsedPoints,
        sector: sector as MemberSectorEnumSimple
      });
      toast.success('Tarefa criada com sucesso!');
      resetForm();
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erro ao criar tarefa.';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) resetForm();
        onOpenChange(value);
      }}
    >
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Nova Tarefa</DialogTitle>
          <DialogDescription>
            Crie uma nova tarefa com pontuação fixa para o Hogwatts.
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4 py-2'>
          <div className='space-y-2'>
            <Label htmlFor='task-name'>Nome</Label>
            <Input
              id='task-name'
              placeholder='Ex: Participar da reunião semanal'
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className='space-y-2'>
            <Label htmlFor='task-description'>Descrição</Label>
            <Textarea
              id='task-description'
              placeholder='Descreva o que o membro deve fazer para completar esta tarefa...'
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className='space-y-2'>
            <Label htmlFor='task-points'>Pontuação</Label>
            <Input
              id='task-points'
              type='number'
              min={1}
              placeholder='Ex: 10'
              value={points}
              onChange={(e) => setPoints(e.target.value)}
            />
            <p className='text-muted-foreground text-xs'>
              Quantidade de pontos que a casa receberá quando uma submissão
              desta tarefa for aprovada.
            </p>
          </div>

          <div className='space-y-2'>
            <Label htmlFor='task-sector'>Setor</Label>
            <Select
              value={sector}
              onValueChange={(v) => setSector(v as MemberSectorEnum)}
            >
              <SelectTrigger id='task-sector'>
                <SelectValue placeholder='Selecione o setor' />
              </SelectTrigger>
              <SelectContent>
                {SECTORS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !name.trim() || !points || !sector}
          >
            {isSubmitting ? 'Criando...' : 'Criar tarefa'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
