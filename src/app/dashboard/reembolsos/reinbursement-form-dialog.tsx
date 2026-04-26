import { type ChangeEvent, type FormEvent, useState } from 'react';
import { toast } from 'sonner';
import reinbursementService from '@/services/reinbursementService';
import {
  REINBURSEMENT_CATEGORIES,
  type ReinbursementCategory
} from '@/types/reinbursement/reinbursement';
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

const categories: ReinbursementCategory[] = REINBURSEMENT_CATEGORIES;

type ReinbursementFormState = {
  title: string;
  description: string;
  category: ReinbursementCategory | '';
  amount: string;
  pixKey: string;
  receiptFiles: File[];
};

const initialFormState: ReinbursementFormState = {
  title: '',
  description: '',
  category: '',
  amount: '',
  pixKey: '',
  receiptFiles: []
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
      toast.error('Voce precisa estar logado para solicitar reembolso.');
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
        receiptFiles: form.receiptFiles
      });

      toast.success('Solicitacao de reembolso enviada com sucesso.');
      setForm(initialFormState);
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Nao foi possivel enviar a solicitacao.';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReceiptsChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []);

    if (!selectedFiles.length) {
      return;
    }

    setForm((current) => ({
      ...current,
      receiptFiles: [...current.receiptFiles, ...selectedFiles]
    }));

    event.target.value = '';
  };

  const handleRemoveReceipt = (indexToRemove: number) => {
    setForm((current) => ({
      ...current,
      receiptFiles: current.receiptFiles.filter(
        (_, index) => index !== indexToRemove
      )
    }));
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
          Titulo *
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
          Descricao detalhada *
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
          Categoria da solicitacao *
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
            placeholder='CPF, e-mail, telefone ou chave aleatoria'
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
          Comprovantes (PDF, JPEG ou PNG) *
        </Label>
        <div className='flex flex-col gap-2'>
          <Input
            id='receipt'
            type='file'
            accept='application/pdf,image/jpeg,image/png'
            multiple
            onChange={handleReceiptsChange}
            disabled={isFormDisabled}
            className='sr-only'
          />

          <div className='flex flex-col gap-2 sm:flex-row sm:items-center'>
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
              <label htmlFor='receipt'>Escolher arquivos</label>
            </Button>
            <span className='text-muted-foreground text-xs'>
              {form.receiptFiles.length
                ? `${form.receiptFiles.length} arquivo(s) selecionado(s)`
                : 'Nenhum arquivo'}
            </span>
          </div>

          {form.receiptFiles.length > 0 && (
            <div className='space-y-1 rounded-md border p-2'>
              {form.receiptFiles.map((file, index) => (
                <div
                  key={`${file.name}-${file.size}-${index}`}
                  className='flex items-center justify-between gap-2'
                >
                  <span className='text-muted-foreground text-xs break-all'>
                    {file.name}
                  </span>
                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    onClick={() => handleRemoveReceipt(index)}
                    disabled={isFormDisabled}
                    className='h-7 px-2 text-xs'
                  >
                    Remover
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
        <p className='text-muted-foreground text-[10px] sm:text-xs'>
          Tamanho maximo por arquivo: 10 MB.
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
          {isSubmitting ? 'Enviando...' : 'Enviar solicitacao'}
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
              Nova solicitacao de reembolso
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
          <DialogTitle>Nova solicitacao de reembolso</DialogTitle>
          <DialogDescription>
            Preencha os detalhes da sua solicitacao para enviarmos ao
            financeiro.
          </DialogDescription>
        </DialogHeader>
        {formContent}
      </DialogContent>
    </Dialog>
  );
}
