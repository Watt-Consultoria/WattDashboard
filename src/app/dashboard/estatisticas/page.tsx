'use client';

import * as React from 'react';
import PageContainer from '@/components/layout/page-container';
import { ChartConfig } from '@/components/ui/chart';
import { PieGraph } from '@/features/overview/components/pie-graph';
import { LineGraph } from '@/features/overview/components/line-graph';
import { firebaseDb } from '@/lib/firebase/client';
import { doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { useFirebaseData, type Project } from '@/contexts/firebase-data-context';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { IconSettings, IconCalendar } from '@tabler/icons-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { tiposAutomacao, tiposEletrica } from '@/constants/project-types';

const lineTones = {
  meta: 'rgb(16 185 129)',
  faturamento: 'rgb(59 130 246)'
};

const sectorTone = 'var(--primary)';

type PieChartDefinition = {
  title: string;
  caption: string;
  config: ChartConfig;
  data: { name: string; value: number }[];
  centerLabel: string;
  totalValue: number;
};

const goalConfig = {
  meta: {
    label: 'Meta',
    color: lineTones.meta
  },
  faturamento: {
    label: 'Faturamento',
    color: lineTones.faturamento
  }
};

const isDev = process.env.NODE_ENV === 'development';

const generateGoalData = (metaAnual: number, testDate?: Date) => {
  const currentDate = testDate || new Date();
  const currentMonth = currentDate.getMonth(); // 0 = Janeiro, 1 = Fevereiro
  const startOfYear = new Date(currentDate.getFullYear(), 0, 1);
  
  // Se estamos em janeiro ou fevereiro, usa dados diários
  if (currentMonth <= 1) {
    const daysPassed = Math.floor((currentDate.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const totalDaysInYear = 365;
    
    const dailyData = [];
    for (let i = 0; i < daysPassed; i++) {
      const date = new Date(startOfYear);
      date.setDate(startOfYear.getDate() + i);
      const day = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      dailyData.push({
        month: day,
        meta: (metaAnual / totalDaysInYear) * (i + 1),
        faturamento: 0
      });
    }
    
    return dailyData;
  }
  
  // Após fevereiro, usa dados mensais
  const monthsPassed = currentMonth + 1;
  const monthlyData = [];
  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  
  for (let i = 0; i < monthsPassed; i++) {
    monthlyData.push({
      month: monthNames[i],
      meta: (metaAnual / 12) * (i + 1),
      faturamento: 0
    });
  }
  
  return monthlyData;
};

const calculateDailyRevenue = (projects: Project[], testDate?: Date) => {
  const currentDate = testDate || new Date();
  const currentMonth = currentDate.getMonth();
  const startOfYear = new Date(currentDate.getFullYear(), 0, 1);
  
  // Se estamos em janeiro ou fevereiro, usa dados diários
  if (currentMonth <= 1) {
    const daysPassed = Math.floor((currentDate.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const dailyData: { [key: string]: number } = {};
    
    // Inicializa todos os dias até hoje com 0
    for (let i = 0; i < daysPassed; i++) {
      const date = new Date(startOfYear);
      date.setDate(startOfYear.getDate() + i);
      const day = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
      dailyData[day] = 0;
    }
    
    // Adiciona o faturamento na data específica de cada projeto
    projects.forEach(project => {
      let projectDate: Date | null = null;
      
      // Tenta usar start primeiro, depois createdAt
      if (project.start?.toDate) {
        projectDate = project.start.toDate();
      } else if (project.createdAt?.toDate) {
        projectDate = project.createdAt.toDate();
      } else if (project.start instanceof Date) {
        projectDate = project.start;
      } else if (project.createdAt instanceof Date) {
        projectDate = project.createdAt;
      }
      
      // Se tiver data válida e for do ano atual
      if (projectDate && projectDate.getFullYear() === currentDate.getFullYear()) {
        const projectDayOfYear = Math.floor((projectDate.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
        
        // Adiciona o valor do projeto a partir do dia de criação até o fim
        for (let i = projectDayOfYear; i < daysPassed; i++) {
          const date = new Date(startOfYear);
          date.setDate(startOfYear.getDate() + i);
          const day = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
          
          if (dailyData[day] !== undefined) {
            dailyData[day] += project.value || 0;
          }
        }
      }
    });
    
    return dailyData;
  }
  
  // Após fevereiro, usa dados mensais
  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const monthlyData: { [key: string]: number } = {};
  
  // Inicializa todos os meses até o atual com 0
  for (let i = 0; i <= currentMonth; i++) {
    monthlyData[monthNames[i]] = 0;
  }
  
  // Adiciona o faturamento acumulado por mês
  projects.forEach(project => {
    let projectDate: Date | null = null;
    
    // Tenta usar start primeiro, depois createdAt
    if (project.start?.toDate) {
      projectDate = project.start.toDate();
    } else if (project.createdAt?.toDate) {
      projectDate = project.createdAt.toDate();
    } else if (project.start instanceof Date) {
      projectDate = project.start;
    } else if (project.createdAt instanceof Date) {
      projectDate = project.createdAt;
    }
    
    // Se tiver data válida e for do ano atual
    if (projectDate && projectDate.getFullYear() === currentDate.getFullYear()) {
      const projectMonth = projectDate.getMonth();
      
      // Adiciona o valor do projeto a partir do mês de criação até o mês atual
      for (let i = projectMonth; i <= currentMonth; i++) {
        monthlyData[monthNames[i]] += project.value || 0;
      }
    }
  });
  
  return monthlyData;
};

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

const normalizeText = (value?: string): string =>
  (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

export default function EstatisticasPage() {
  const { projects, isLoading: isLoadingData } = useFirebaseData();
  const [pieCharts, setPieCharts] = React.useState<PieChartDefinition[]>([]);
  const [metaAnual, setMetaAnual] = React.useState(1320000);
  const [metaInput, setMetaInput] = React.useState('');
  const [isMetaDialogOpen, setIsMetaDialogOpen] = React.useState(false);
  const [isSavingMeta, setIsSavingMeta] = React.useState(false);
  const [goalData, setGoalData] = React.useState(generateGoalData(1320000));
  const [testDate, setTestDate] = React.useState<Date | undefined>(undefined);
  const [testDateInput, setTestDateInput] = React.useState('');
  const [isTestDateDialogOpen, setIsTestDateDialogOpen] = React.useState(false);

  // Carregar meta do Firestore com onSnapshot
  React.useEffect(() => {
    if (!firebaseDb) return;
    
    const unsubscribe = onSnapshot(
      doc(firebaseDb, 'config', 'metaAnual'),
      (metaDoc) => {
        if (metaDoc.exists()) {
          const meta = metaDoc.data().value || 1320000;
          setMetaAnual(meta);
          setGoalData(generateGoalData(meta, testDate));
        }
      },
      (error) => {
        console.error('Erro ao escutar meta:', error);
      }
    );

    return () => unsubscribe();
  }, [testDate]);

  const handleSaveMeta = async () => {
    const novoValor = parseFloat(metaInput.replace(/[^\d,]/g, '').replace(',', '.'));
    
    if (isNaN(novoValor) || novoValor <= 0) {
      toast.error('Informe um valor válido para a meta');
      return;
    }

    if (!firebaseDb) {
      toast.error('Firebase não configurado');
      return;
    }

    setIsSavingMeta(true);
    try {
      await setDoc(doc(firebaseDb, 'config', 'metaAnual'), {
        value: novoValor,
        updatedAt: new Date()
      });
      
      setMetaAnual(novoValor);
      setGoalData(generateGoalData(novoValor, testDate));
      setIsMetaDialogOpen(false);
      setMetaInput('');
      toast.success('Meta atualizada com sucesso');
    } catch (error) {
      console.error('Erro ao salvar meta:', error);
      toast.error('Erro ao salvar meta');
    } finally {
      setIsSavingMeta(false);
    }
  };

  React.useEffect(() => {
    if (isLoadingData || !projects) return;

    console.log('Processando projetos:', projects);

    // Calcular faturamento diário
    const dailyRevenue = calculateDailyRevenue(projects, testDate);
    
    // Atualizar goalData com faturamento real
    const updatedGoalData = generateGoalData(metaAnual, testDate).map((item) => ({
      ...item,
      faturamento: dailyRevenue[item.month] || 0
    }));
    
    setGoalData(updatedGoalData);

    // Calcular faturamento por tipo usando as mesmas constantes de acompanhamento
    const areaAutomacao = 'Automação';
    const areaEletrica = 'Elétrica';
    const [tipoDomotica, tipoIndustrial] = tiposAutomacao;
    const [tipoProjetoEletrico, tipoSolar] = tiposEletrica;

    const calcularFaturamentoPorTipo = (area: string, tipo: string) => {
      const areaNormalizada = normalizeText(area);
      const tipoNormalizado = normalizeText(tipo);

      return projects.reduce((sum, project) => {
        if (
          normalizeText(project.area) !== areaNormalizada ||
          normalizeText(project.tipo) !== tipoNormalizado
        ) {
          return sum;
        }

        return sum + (project.value || 0);
      }, 0);
    };

    const faturamentoDomotica = calcularFaturamentoPorTipo(
      areaAutomacao,
      tipoDomotica
    );
    const faturamentoIndustrial = calcularFaturamentoPorTipo(
      areaAutomacao,
      tipoIndustrial
    );
    const faturamentoProjetoEletrico = calcularFaturamentoPorTipo(
      areaEletrica,
      tipoProjetoEletrico
    );
    const faturamentoSolar = calcularFaturamentoPorTipo(areaEletrica, tipoSolar);

    const totalAutomacao = faturamentoDomotica + faturamentoIndustrial;
    const totalEletrica = faturamentoProjetoEletrico + faturamentoSolar;
    const totalGeral = totalAutomacao + totalEletrica;

    // Calcular percentuais e determinar líder
    const percDomotica = totalAutomacao > 0 ? (faturamentoDomotica / totalAutomacao * 100).toFixed(1) : 0;
    const percIndustrial = totalAutomacao > 0 ? (faturamentoIndustrial / totalAutomacao * 100).toFixed(1) : 0;
    const percProjetoEletrico = totalEletrica > 0 ? (faturamentoProjetoEletrico / totalEletrica * 100).toFixed(1) : 0;
    const percSolar = totalEletrica > 0 ? (faturamentoSolar / totalEletrica * 100).toFixed(1) : 0;
    const percAutomacao = totalGeral > 0 ? (totalAutomacao / totalGeral * 100).toFixed(1) : 0;
    const percEletrica = totalGeral > 0 ? (totalEletrica / totalGeral * 100).toFixed(1) : 0;

    // Determinar líderes
    const liderAutomacao =
      faturamentoDomotica >= faturamentoIndustrial ? tipoDomotica : tipoIndustrial;
    const percLiderAutomacao = faturamentoDomotica >= faturamentoIndustrial ? percDomotica : percIndustrial;
    
    const liderEletrica =
      faturamentoProjetoEletrico >= faturamentoSolar
        ? tipoProjetoEletrico
        : tipoSolar;
    const percLiderEletrica = faturamentoProjetoEletrico >= faturamentoSolar ? percProjetoEletrico : percSolar;
    
    const liderGeral = totalAutomacao >= totalEletrica ? 'Automação' : 'Eletrica';
    const percLiderGeral = totalAutomacao >= totalEletrica ? percAutomacao : percEletrica;

    const charts: PieChartDefinition[] = [
      {
        title: 'Automação',
        caption: totalAutomacao === 0 
          ? 'Nenhum projeto de automação cadastrado'
          : `${liderAutomacao} lidera com ${percLiderAutomacao}%`,
        config: {
          domotica: { label: 'Domotica', color: sectorTone },
          industrial: { label: 'Industrial', color: sectorTone },
          empty: { label: 'Sem dados', color: 'hsl(var(--muted))' }
        },
        data: totalAutomacao === 0 
          ? [{ name: 'empty', value: 1 }]
          : [
              { name: 'domotica', value: faturamentoDomotica },
              { name: 'industrial', value: faturamentoIndustrial }
            ],
        centerLabel: totalAutomacao === 0 ? 'R$ 0,00' : formatCurrency(totalAutomacao),
        totalValue: totalAutomacao
      },
      {
        title: 'Eletrica',
        caption: totalEletrica === 0
          ? 'Nenhum projeto elétrico cadastrado'
          : `${liderEletrica} lidera com ${percLiderEletrica}%`,
        config: {
          projetoEletrico: { label: 'Projeto Eletrico', color: sectorTone },
          solar: { label: 'Solar', color: sectorTone },
          empty: { label: 'Sem dados', color: 'hsl(var(--muted))' }
        },
        data: totalEletrica === 0
          ? [{ name: 'empty', value: 1 }]
          : [
              { name: 'projetoEletrico', value: faturamentoProjetoEletrico },
              { name: 'solar', value: faturamentoSolar }
            ],
        centerLabel: totalEletrica === 0 ? 'R$ 0,00' : formatCurrency(totalEletrica),
        totalValue: totalEletrica
      },
      {
        title: 'Geral',
        caption: totalGeral === 0
          ? 'Nenhum projeto cadastrado'
          : `${liderGeral} lidera com ${percLiderGeral}%`,
        config: {
          automacao: { label: 'Automação', color: sectorTone },
          eletrica: { label: 'Eletrica', color: sectorTone },
          empty: { label: 'Sem dados', color: 'hsl(var(--muted))' }
        },
        data: totalGeral === 0
          ? [{ name: 'empty', value: 1 }]
          : [
              { name: 'automacao', value: totalAutomacao },
              { name: 'eletrica', value: totalEletrica }
            ],
        centerLabel: totalGeral === 0 ? 'R$ 0,00' : formatCurrency(totalGeral),
        totalValue: totalGeral
      }
    ];

    setPieCharts(charts);
  }, [projects, isLoadingData, metaAnual, testDate]);

  const handleSetTestDate = () => {
    if (!testDateInput) {
      setTestDate(undefined);
      setIsTestDateDialogOpen(false);
      toast.success('Data de teste removida');
      return;
    }

    const [day, month, year] = testDateInput.split('/');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    
    if (isNaN(date.getTime())) {
      toast.error('Data inválida. Use o formato DD/MM/AAAA');
      return;
    }

    setTestDate(date);
    setIsTestDateDialogOpen(false);
    toast.success(`Data de teste definida para ${testDateInput}`);
  };

  if (isLoadingData) {
    return (
      <PageContainer scrollable={false}>
        <div className='flex flex-1 flex-col space-y-4'>
          <div className='grid grid-cols-1 gap-4 lg:grid-cols-3'>
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className='h-6 w-32' />
                  <Skeleton className='h-4 w-48' />
                </CardHeader>
                <CardContent>
                  <Skeleton className='h-[230px] w-full' />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </PageContainer>
    );
  }
  return (
    <PageContainer scrollable={false}>
      <div className='flex flex-1 flex-col space-y-4'>
        <div className='*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:grid-cols-3'>
          {pieCharts.map((chart) => (
            <PieGraph
              key={chart.title}
              title={chart.title}
              description={chart.caption}
              shortDescription={chart.caption}
              data={chart.data}
              config={chart.config}
              centerLabel={chart.centerLabel}
              className='[&_[data-slot=card-content]]:pt-0 [&_[data-slot=card-content]]:sm:pt-0 [&_[data-slot=chart]]:h-[230px]'
            />
          ))}
        </div>

        <div className='*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs relative'>
          <div className='absolute right-4 top-4 z-10 flex gap-2'>
            {isDev && (
              <Dialog open={isTestDateDialogOpen} onOpenChange={setIsTestDateDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant='outline'
                    size='icon'
                    className='h-8 w-8 border-orange-500/50 bg-orange-500/10 hover:bg-orange-500/20'
                    title='Definir data de teste (DEV)'
                  >
                    <IconCalendar className='h-4 w-4 text-orange-500' />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Data de Teste (DEV)</DialogTitle>
                    <DialogDescription>
                      Simule uma data diferente para testar o gráfico. Use o formato DD/MM/AAAA. Deixe vazio para usar a data atual.
                      {testDate && (
                        <span className='mt-2 block text-orange-500'>
                          Data ativa: {format(testDate, 'dd/MM/yyyy')}
                        </span>
                      )}
                    </DialogDescription>
                  </DialogHeader>
                  <div className='space-y-4 py-4'>
                    <div className='space-y-2'>
                      <Label htmlFor='testDate'>Data de Teste</Label>
                      <Input
                        id='testDate'
                        type='text'
                        placeholder='Ex: 15/06/2024'
                        value={testDateInput}
                        onChange={(e) => setTestDateInput(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant='outline'
                      onClick={() => setIsTestDateDialogOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button onClick={handleSetTestDate}>
                      Definir
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
            <Dialog open={isMetaDialogOpen} onOpenChange={setIsMetaDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant='outline'
                  size='icon'
                  className='h-8 w-8'
                  onClick={() => setMetaInput(metaAnual.toString())}
                >
                  <IconSettings className='h-4 w-4' />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Configurar Meta Anual</DialogTitle>
                  <DialogDescription>
                    Defina o valor da meta de faturamento para o ano. A linha da meta vai de 0 em janeiro até este valor em dezembro.
                  </DialogDescription>
                </DialogHeader>
                <div className='space-y-4 py-4'>
                  <div className='space-y-2'>
                    <Label htmlFor='meta'>Meta Anual (R$)</Label>
                    <Input
                      id='meta'
                      type='text'
                      placeholder='Ex: 1320000'
                      value={metaInput}
                      onChange={(e) => setMetaInput(e.target.value)}
                      disabled={isSavingMeta}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant='outline'
                    onClick={() => setIsMetaDialogOpen(false)}
                    disabled={isSavingMeta}
                  >
                    Cancelar
                  </Button>
                  <Button onClick={handleSaveMeta} disabled={isSavingMeta}>
                    {isSavingMeta ? 'Salvando...' : 'Salvar'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <LineGraph
            data={goalData}
            config={goalConfig}
            className='[&_[data-slot=chart]]:h-[220px]'
          />
        </div>
      </div>
    </PageContainer>
  );
}
