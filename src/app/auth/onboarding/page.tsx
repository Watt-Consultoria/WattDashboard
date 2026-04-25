'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/components/auth-provider';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { toast } from 'sonner';
import { firebaseDb } from '@/lib/firebase/client';

const sectors = [
  'Automação',
  'Elétrica',
  'Comercial',
  'Institucional',
  'Marketing',
  'Executivo'
];

export default function OnboardingPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    sector: '',
    cpf: ''
  });

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/auth/sign-in');
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!user?.email) {
      return;
    }

    setFormData((prev) => ({
      ...prev,
      email: user.email ?? ''
    }));
  }, [user?.email]);

  if (loading) {
    return (
      <div className='flex min-h-screen items-center justify-center'>
        <p className='text-xs text-muted-foreground'>Carregando...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Informe seu nome completo');
      return;
    }

    if (!formData.sector) {
      toast.error('Selecione seu setor');
      return;
    }

    if (!formData.cpf.trim()) {
      toast.error('Informe seu CPF');
      return;
    }

    // Validação básica de CPF (11 dígitos)
    const cpfNumbers = formData.cpf.replace(/\D/g, '');
    if (cpfNumbers.length !== 11) {
      toast.error('CPF deve ter 11 dígitos');
      return;
    }

    if (!firebaseDb || !user) {
      toast.error('Erro de configuração. Tente novamente.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Criar documento do membro com ID igual ao UID do usuário
      const memberRef = doc(firebaseDb, 'members', user.uid);
      
      await setDoc(memberRef, {
        name: formData.name.trim(),
        email: formData.email.toLowerCase().trim(),
        sector: formData.sector,
        cpf: cpfNumbers,
        role: 'Consultor', // Novo usuario sempre comeca como Consultor
        activity: '',
        status: 'Ativo',
        isLeadership: false,
        agendaTasks: [],
        alerts: [],
        timeRecords: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      toast.success('Cadastro concluído com sucesso!');
      
      // Redirecionar para a tela individual
      router.push('/dashboard/individual');
    } catch (error) {
      console.error('Erro ao criar membro:', error);
      toast.error('Erro ao concluir cadastro. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    }
    return value;
  };

  const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCPF(e.target.value);
    setFormData((prev) => ({ ...prev, cpf: formatted }));
  };

  return (
    <div className='flex min-h-screen items-center justify-center bg-background p-4'>
      <Card className='w-full max-w-lg'>
        <CardHeader className='text-center'>
          <CardTitle className='text-2xl'>Complete seu cadastro</CardTitle>
          <CardDescription>
            Preencha suas informações para acessar a plataforma
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='name'>Nome Completo *</Label>
              <Input
                id='name'
                type='text'
                placeholder='João da Silva'
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                disabled={isSubmitting}
                required
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='email'>Email *</Label>
              <Input
                id='email'
                type='email'
                value={formData.email}
                disabled
                className='bg-muted'
              />
              <p className='text-xs text-muted-foreground'>
                Email vinculado à sua conta
              </p>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='sector'>Setor *</Label>
              <Select
                value={formData.sector || undefined}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, sector: value }))
                }
                disabled={isSubmitting}
              >
                <SelectTrigger id='sector' className='notranslate' translate='no'>
                  <SelectValue placeholder='Selecione seu setor' />
                </SelectTrigger>
                <SelectContent className='notranslate' translate='no'>
                  {sectors.map((sector) => (
                    <SelectItem
                      key={sector}
                      value={sector}
                      className='notranslate'
                      translate='no'
                    >
                      {sector}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='cpf'>CPF *</Label>
              <Input
                id='cpf'
                type='text'
                placeholder='000.000.000-00'
                value={formData.cpf}
                onChange={handleCPFChange}
                disabled={isSubmitting}
                maxLength={14}
                required
              />
            </div>

            <Button
              type='submit'
              className='w-full'
              size='lg'
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Salvando...' : 'Concluir cadastro'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
