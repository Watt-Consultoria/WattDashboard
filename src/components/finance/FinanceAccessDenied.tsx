'use client';

import { LockKeyhole } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';

export function FinanceAccessDenied() {
  return (
    <Card>
      <CardHeader>
        <div className='flex items-center gap-2'>
          <LockKeyhole className='text-muted-foreground h-5 w-5' />
          <CardTitle>Acesso negado</CardTitle>
        </div>
        <CardDescription>
          Apenas Presidente Executivo ou Assessor Executivo pode acessar o
          Livro de Caixa.
        </CardDescription>
      </CardHeader>
      <CardContent className='text-muted-foreground text-sm'>
        Entre em contato com a diretoria executiva caso precise consultar ou
        registrar movimentacoes financeiras.
      </CardContent>
    </Card>
  );
}
