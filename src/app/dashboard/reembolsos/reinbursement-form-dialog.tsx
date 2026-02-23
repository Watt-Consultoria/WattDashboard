import { type FormEvent, useState } from 'react';
import { toast } from 'sonner';
import reinbursementService from '@/services/reinbursementService';
import type { ReinbursementCategory } from '@/types/reinbursement/reinbursement';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle
} from '@/components/ui/drawer';
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
import { useIsMobile } from '@/hooks/use-mobile';

const categories: ReinbursementCategory[] = [
  'Transporte',
  'Alimentação',
  'Materiais',
  'Compra de ingressos',
  'Eventos',
  'Outros'
];

type ReinbursementFormState = {
  title: string;
  description: string;
  category: ReinbursementCategory | '';
  amount: string;
  pixKey: string;
  receiptFile: File | null;
};

const initialFormState: ReinbursementFormState = {
  title: '',
  description: '',
  category: '',
  amount: '',
  pixKey: '',
  receiptFile: null
};

const sanitizeAmountInput = (value: string) => value.replace(/[^\d.,]/g, '');

interface ReinbursementFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberId: string;
  onSuccess?: () => void;
}

export function ReinbursementFormDialog({
  open,
  onOpenChange,
  memberId,
  onSuccess
}: ReinbursementFormDialogProps) {
  const [form, setForm] = useState<ReinbursementFormState>(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isMobile = useIsMobile();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!memberId) {
      toast.error('Você precisa estar logado para solicitar reembolso.');
      return;
    }

    setIsSubmitting(true);
    try {
      await reinbursementService.submitReinbursement({
        memberId,
        title: form.title,
        description: form.description,
        category: form.category as ReinbursementCategory,
        amount: form.amount,
        pixKey: form.pixKey,
        receiptFile: form.receiptFile as File
      });

      toast.success('Solicitação de reembolso enviada com sucesso.');
      setForm(initialFormState);
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Não foi possível enviar a solicitação.';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!isSubmitting) {
      onOpenChange(newOpen);
      if (!newOpen) {
        setForm(initialFormState);
      }
    }
  };

  const isFormDisabled = isSubmitting;

  const formContent = (
    <form onSubmit={handleSubmit} className='space-y-4 sm:space-y-5'>
      <div className='space-y-1.5 sm:space-y-2'>
        <Label htmlFor='title' className='text-xs sm:text-sm'>
          Título *
        </Label>
        <Input
          id='title'
          className='h-10 text-sm sm:h-9'
          placeholder='Ex: Reembolso de despesas de transporte'
          value={form.title}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              title: event.target.value
            }))
          }
          disabled={isFormDisabled}
          required
        />
      </div>
      <div className='space-y-1.5 sm:space-y-2'>
        <Label htmlFor='description' className='text-xs sm:text-sm'>
          Descrição detalhada *
        </Label>
        <Textarea
          id='description'
          className='text-sm'
          placeholder='Descreva o motivo do reembolso, datas e contexto.'
          value={form.description}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              description: event.target.value
            }))
          }
          disabled={isFormDisabled}
          rows={isMobile ? 3 : 4}
          required
        />
      </div>

      <div className='space-y-1.5 sm:space-y-2'>
        <Label htmlFor='category' className='text-xs sm:text-sm'>
          Categoria da solicitação *
        </Label>
        <Select
          value={form.category}
          onValueChange={(value) =>
            setForm((current) => ({
              ...current,
              category: value as ReinbursementCategory
            }))
          }
          disabled={isFormDisabled}
        >
          <SelectTrigger id='category' className='h-10 text-sm sm:h-9'>
            <SelectValue placeholder='Selecione a categoria' />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className='grid gap-3 sm:grid-cols-2 sm:gap-5'>
        <div className='space-y-1.5 sm:space-y-2'>
          <Label htmlFor='amount' className='text-xs sm:text-sm'>
            Valor em reais *
          </Label>
          <Input
            id='amount'
            className='h-10 text-sm sm:h-9'
            inputMode='decimal'
            placeholder='0,00'
            value={form.amount}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                amount: sanitizeAmountInput(event.target.value)
              }))
            }
            disabled={isFormDisabled}
            required
          />
        </div>

        <div className='space-y-1.5 sm:space-y-2'>
          <Label htmlFor='pixKey' className='text-xs sm:text-sm'>
            Chave PIX *
          </Label>
          <Input
            id='pixKey'
            className='h-10 text-sm sm:h-9'
            placeholder='CPF, e-mail, telefone ou chave aleatória'
            value={form.pixKey}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                pixKey: event.target.value
              }))
            }
            disabled={isFormDisabled}
            required
          />
        </div>
      </div>

      <div className='space-y-1.5 sm:space-y-2'>
        <Label htmlFor='receipt' className='text-xs sm:text-sm'>
          Comprovante (PDF, JPEG ou PNG) *
        </Label>
        <div className='flex flex-col gap-2 sm:flex-row sm:items-center'>
          <Input
            id='receipt'
            type='file'
            accept='application/pdf,image/jpeg,image/png'
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                receiptFile: event.target.files?.[0] ?? null
              }))
            }
            disabled={isFormDisabled}
            required
            className='sr-only'
          />
          <Button
            asChild
            variant='outline'
            size='sm'
            className={
              isFormDisabled
                ? 'pointer-events-none h-10 w-full opacity-50 sm:h-9 sm:w-auto'
                : 'h-10 w-full sm:h-9 sm:w-auto'
            }
            aria-disabled={isFormDisabled}
            tabIndex={isFormDisabled ? -1 : 0}
          >
            <label htmlFor='receipt'>Escolher arquivo</label>
          </Button>
          <span className='text-muted-foreground text-xs break-all'>
            {form.receiptFile ? form.receiptFile.name : 'Nenhum arquivo'}
          </span>
        </div>
        <p className='text-muted-foreground text-[10px] sm:text-xs'>
          Tamanho máximo: 10 MB.
        </p>
      </div>

      <div className='flex flex-col gap-2 pt-3 sm:flex-row sm:gap-3 sm:pt-4'>
        <Button
          type='button'
          variant='outline'
          onClick={() => handleOpenChange(false)}
          disabled={isFormDisabled}
          className='h-11 flex-1 sm:h-9'
        >
          Cancelar
        </Button>
        <Button
          type='submit'
          disabled={isFormDisabled}
          className='h-11 flex-1 sm:h-9'
        >
          {isSubmitting ? 'Enviando...' : 'Enviar solicitação'}
        </Button>
      </div>
    </form>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={handleOpenChange}>
        <DrawerContent className='max-h-[90dvh]'>
          <DrawerHeader className='px-4 pt-4 pb-2'>
            <DrawerTitle className='text-base'>
              Nova solicitação de reembolso
            </DrawerTitle>
            <DrawerDescription className='text-xs'>
              Preencha os detalhes para enviarmos ao financeiro.
            </DrawerDescription>
          </DrawerHeader>
          <div className='overflow-y-auto px-4 pb-6'>{formContent}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className='max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>Nova solicitação de reembolso</DialogTitle>
          <DialogDescription>
            Preencha os detalhes da sua solicitação para enviarmos ao
            financeiro.
          </DialogDescription>
        </DialogHeader>
        {formContent}
      </DialogContent>
    </Dialog>
  );
}
