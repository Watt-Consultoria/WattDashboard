'use client';

import { useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { rules } from '@/config/code_of_conduct';
import type { Member } from '@/types/member/member';
import type { RuleCode } from '@/types/code-of-conduct';
import faltaService from '@/services/faltaService';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const ruleTypeColors: Record<
  string,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  leve: 'default',
  moderada: 'secondary',
  grave: 'destructive',
  desligamento: 'destructive'
};

const ruleTypeLabels: Record<string, string> = {
  leve: 'Leve',
  moderada: 'Moderada',
  grave: 'Grave',
  desligamento: 'Desligamento'
};

const formSchema = z.object({
  memberId: z.string().min(1, 'Selecione um membro'),
  ruleCode: z.string().min(1, 'Selecione uma regra'),
  description: z.string().optional()
});

type FormValues = z.infer<typeof formSchema>;

interface AddFaltaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: Member[];
  onSuccess: () => void;
  currentUserId: string;
}

export function AddFaltaDialog({
  open,
  onOpenChange,
  members,
  onSuccess,
  currentUserId
}: AddFaltaDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedRuleCode, setSelectedRuleCode] = useState<RuleCode | null>(
    null
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      memberId: '',
      ruleCode: '',
      description: ''
    }
  });

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      await faltaService.addFalta(
        values.memberId,
        {
          ruleCode: values.ruleCode as RuleCode,
          description: values.description || ''
        },
        currentUserId
      );

      toast.success('Falta registrada com sucesso!');
      form.reset();
      setSelectedRuleCode(null);
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Não foi possível registrar a falta.';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRuleCodeChange = (value: string) => {
    setSelectedRuleCode(value as RuleCode);
    form.setValue('ruleCode', value);
  };

  const selectedRuleDetails =
    selectedRuleCode && selectedRuleCode in rules
      ? rules[selectedRuleCode as RuleCode]
      : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='w-full max-w-2xl gap-0 p-0 sm:max-w-xl'>
        {/* Header */}
        <DialogHeader className='border-b px-4 py-3 sm:px-6 sm:py-4'>
          <DialogTitle className='text-lg sm:text-xl'>
            Registrar Falta
          </DialogTitle>
          <DialogDescription className='text-xs sm:text-sm'>
            Adicione uma falta para um membro da equipe
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable Content */}
        <ScrollArea className='max-h-[calc(100vh-200px)] sm:max-h-96'>
          <FormProvider {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className='space-y-5 px-4 py-4 sm:space-y-6 sm:px-6 sm:py-5'
            >
              {/* Member Select */}
              <FormField
                control={form.control}
                name='memberId'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='text-xs sm:text-sm'>Membro</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className='h-9 text-xs sm:h-10 sm:text-sm'>
                          <SelectValue placeholder='Selecione um membro' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className='max-h-64 sm:max-h-72'>
                        {members.map((member) => (
                          <SelectItem
                            key={member.id}
                            value={member.id}
                            className='text-xs sm:text-sm'
                          >
                            {member.name} ({member.role})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className='text-xs' />
                  </FormItem>
                )}
              />

              {/* Rule Code Select */}
              <FormField
                control={form.control}
                name='ruleCode'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='text-xs sm:text-sm'>
                      Regra Violada
                    </FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={handleRuleCodeChange}
                    >
                      <FormControl>
                        <SelectTrigger className='h-9 text-xs sm:h-10 sm:text-sm'>
                          <SelectValue placeholder='Selecione uma regra' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className='max-h-64 sm:max-h-72'>
                        {Object.entries(rules).map(([code, rule]) => (
                          <SelectItem
                            key={code}
                            value={code}
                            className='text-xs sm:text-sm'
                          >
                            <div className='flex items-center gap-2'>
                              <span className='font-mono text-xs sm:text-sm'>
                                {code}
                              </span>
                              <span className='text-muted-foreground hidden max-w-xs truncate text-xs sm:inline sm:text-sm'>
                                {rule.rule.substring(0, 50)}...
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className='text-xs' />
                  </FormItem>
                )}
              />

              {/* Rule Details */}
              {selectedRuleDetails && (
                <div className='border-border bg-muted/40 space-y-3 rounded-lg border p-3 sm:p-4'>
                  <div className='space-y-2'>
                    {/* Code and Type Badge */}
                    <div className='flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center'>
                      <div>
                        <p className='text-xs font-medium sm:text-sm'>
                          Código:
                        </p>
                        <p className='text-muted-foreground font-mono text-xs sm:text-sm'>
                          {selectedRuleCode}
                        </p>
                      </div>
                      <Badge
                        variant={ruleTypeColors[selectedRuleDetails.type]}
                        className='text-xs sm:text-sm'
                      >
                        {ruleTypeLabels[selectedRuleDetails.type]}
                      </Badge>
                    </div>

                    {/* Rule Description */}
                    <div>
                      <p className='text-xs font-medium sm:text-sm'>Regra:</p>
                      <p className='text-muted-foreground text-xs leading-relaxed sm:text-sm'>
                        {selectedRuleDetails.rule}
                      </p>
                    </div>

                    {/* Expiration */}
                    <div className='bg-background/50 flex items-center gap-1 rounded-md p-2'>
                      <p className='text-xs font-medium sm:text-sm'>⏰</p>
                      <p className='text-muted-foreground text-xs sm:text-sm'>
                        Expira em 1 ano a partir de agora
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Description */}
              <FormField
                control={form.control}
                name='description'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='text-xs sm:text-sm'>
                      Descrição (opcional)
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder='Adicione detalhes sobre o motivo da falta...'
                        disabled={isSubmitting}
                        className='min-h-20 resize-none text-xs sm:min-h-24 sm:text-sm'
                        {...field}
                      />
                    </FormControl>
                    <FormDescription className='text-xs sm:text-sm'>
                      Descreva a situação que levou a essa falta
                    </FormDescription>
                    <FormMessage className='text-xs' />
                  </FormItem>
                )}
              />
            </form>
          </FormProvider>
        </ScrollArea>

        {/* Footer Actions */}
        <div className='border-t px-4 py-3 sm:px-6 sm:py-4'>
          <div className='flex gap-2 sm:gap-3'>
            <Button
              type='button'
              variant='outline'
              onClick={() => {
                onOpenChange(false);
                form.reset();
                setSelectedRuleCode(null);
              }}
              disabled={isSubmitting}
              className='h-9 flex-1 text-xs sm:h-10 sm:text-sm'
            >
              Cancelar
            </Button>
            <Button
              onClick={form.handleSubmit(onSubmit)}
              disabled={isSubmitting}
              className='h-9 flex-1 text-xs sm:h-10 sm:text-sm'
            >
              {isSubmitting ? 'Registrando...' : 'Registrar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
