'use client';

import * as React from 'react';
import { toast } from 'sonner';
import {
  Pie,
  PieChart,
  Label,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis
} from 'recharts';

import PageContainer from '@/components/layout/page-container';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from '@/components/ui/chart';
import { Input } from '@/components/ui/input';
import { Label as FieldLabel } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import memberService from '@/services/memberService';
import reinbursementService from '@/services/reinbursementService';
import type { Member } from '@/types/member/member';
import {
  REINBURSEMENT_CATEGORIES,
  REINBURSEMENT_STATUSES,
  type Reinbursement,
  type ReinbursementDashboardData,
  type ReinbursementDashboardFilters,
  type ReinbursementStatus
} from '@/types/reinbursement/reinbursement';

type FilterState = {
  memberId: string;
  category: string;
  status: string;
  query: string;
  startDate: string;
  endDate: string;
};

const initialFilters: FilterState = {
  memberId: 'all',
  category: 'all',
  status: 'all',
  query: '',
  startDate: '',
  endDate: ''
};

const statusColors: Record<
  ReinbursementStatus,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  Pendente: 'default',
  Aprovado: 'secondary',
  Recusado: 'destructive'
};

const chartPalette = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)'
];

const formatCurrency = (cents: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(cents / 100);
};

const formatDate = (timestamp: Reinbursement['createdAt']): string => {
  if (!timestamp?.toDate) return '-';
  return new Intl.DateTimeFormat('pt-BR').format(timestamp.toDate());
};

const truncateLabel = (value: string, maxLength: number): string => {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(0, maxLength - 3))}...`;
};

const buildDashboardFilters = (
  state: FilterState
): ReinbursementDashboardFilters => {
  const startDate = state.startDate
    ? new Date(`${state.startDate}T00:00:00`)
    : null;
  const endDate = state.endDate ? new Date(`${state.endDate}T23:59:59`) : null;

  return {
    memberId: state.memberId === 'all' ? undefined : state.memberId,
    category:
      state.category === 'all'
        ? undefined
        : (state.category as ReinbursementDashboardFilters['category']),
    status:
      state.status === 'all'
        ? undefined
        : (state.status as ReinbursementDashboardFilters['status']),
    searchText: state.query,
    startDate,
    endDate
  };
};

export default function ReembolsosGestaoPage() {
  const [filters, setFilters] = React.useState<FilterState>(initialFilters);
  const [members, setMembers] = React.useState<Member[]>([]);
  const [dashboard, setDashboard] =
    React.useState<ReinbursementDashboardData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isFetching, setIsFetching] = React.useState(false);
  const hasLoadedRef = React.useRef(false);
  const [selectedReinbursement, setSelectedReinbursement] =
    React.useState<Reinbursement | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = React.useState(false);

  const appliedFilters = React.useMemo(
    () => buildDashboardFilters(filters),
    [filters]
  );

  const categoryChartData = React.useMemo(() => {
    if (!dashboard?.categoryShares.length) return [];
    return dashboard.categoryShares.map((share, index) => ({
      key: `cat${index + 1}`,
      label: share.category,
      value: share.amountCents,
      fill: `var(--color-cat${index + 1})`
    }));
  }, [dashboard?.categoryShares]);

  const categoryChartConfig = React.useMemo(() => {
    if (!dashboard?.categoryShares.length) return {} as ChartConfig;
    return dashboard.categoryShares.reduce((acc, share, index) => {
      acc[`cat${index + 1}`] = {
        label: share.category,
        color: chartPalette[index % chartPalette.length]
      };
      return acc;
    }, {} as ChartConfig);
  }, [dashboard?.categoryShares]);

  const memberChartData = React.useMemo(() => {
    if (!dashboard?.memberTotals.length) return [];
    return dashboard.memberTotals.slice(0, 8).map((member) => ({
      name: member.memberName,
      value: member.amountCents
    }));
  }, [dashboard?.memberTotals]);

  const memberChartConfig = React.useMemo(() => {
    return {
      value: {
        label: 'Total solicitado',
        color: 'var(--chart-2)'
      }
    } satisfies ChartConfig;
  }, []);

  const loadMembers = React.useCallback(async () => {
    try {
      const data = await memberService.getAllMembers();
      setMembers(data);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Não foi possível carregar os membros.';
      toast.error(message);
    }
  }, []);

  const loadDashboard = React.useCallback(async () => {
    const isInitialLoad = !hasLoadedRef.current;
    setIsLoading(isInitialLoad);
    setIsFetching(!isInitialLoad);
    try {
      const data = await reinbursementService.getDashboardData(appliedFilters);
      setDashboard(data);
      hasLoadedRef.current = true;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Não foi possível carregar os reembolsos.';
      toast.error(message);
    } finally {
      setIsLoading(false);
      setIsFetching(false);
    }
  }, [appliedFilters]);

  React.useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  React.useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const updateFilter = (key: keyof FilterState, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value
    }));
  };

  const resetFilters = () => {
    setFilters(initialFilters);
  };

  const openDetails = (reinbursement: Reinbursement) => {
    setSelectedReinbursement(reinbursement);
  };

  const closeDetails = () => {
    setSelectedReinbursement(null);
  };

  const handleStatusChange = async (nextStatus: ReinbursementStatus) => {
    if (!selectedReinbursement) return;

    setIsUpdatingStatus(true);
    try {
      await reinbursementService.updateReinbursementStatus(
        selectedReinbursement.id,
        selectedReinbursement.status,
        nextStatus
      );
      setSelectedReinbursement((prev) =>
        prev ? { ...prev, status: nextStatus } : prev
      );
      await loadDashboard();
      toast.success('Status atualizado com sucesso.');
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Nao foi possivel atualizar o status.';
      toast.error(message);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return (
    <PageContainer
      scrollable
      pageTitle='Reembolsos'
      pageDescription='Acompanhe as solicitacoes e aprovacoes de reembolso'
      isloading={isLoading}
    >
      <div className='space-y-6'>
        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
            <CardDescription>
              Refine por membro, categoria, período e palavra-chave.
              {isFetching ? ' Atualizando resultados...' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
              <div className='space-y-2'>
                <FieldLabel>Membro</FieldLabel>
                <Select
                  value={filters.memberId}
                  onValueChange={(value) => updateFilter('memberId', value)}
                >
                  <SelectTrigger className='w-full'>
                    <SelectValue placeholder='Todos os membros' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='all'>Todos os membros</SelectItem>
                    {members.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name || member.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className='space-y-2'>
                <FieldLabel>Categoria</FieldLabel>
                <Select
                  value={filters.category}
                  onValueChange={(value) => updateFilter('category', value)}
                >
                  <SelectTrigger className='w-full'>
                    <SelectValue placeholder='Todas as categorias' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='all'>Todas as categorias</SelectItem>
                    {REINBURSEMENT_CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className='space-y-2'>
                <FieldLabel>Status</FieldLabel>
                <Select
                  value={filters.status}
                  onValueChange={(value) => updateFilter('status', value)}
                >
                  <SelectTrigger className='w-full'>
                    <SelectValue placeholder='Todos os status' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='all'>Todos os status</SelectItem>
                    {REINBURSEMENT_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className='space-y-2'>
                <FieldLabel>Buscar</FieldLabel>
                <Input
                  value={filters.query}
                  onChange={(event) =>
                    updateFilter('query', event.target.value)
                  }
                  placeholder='Titulo ou descricao'
                />
              </div>
            </div>
            <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
              <div className='space-y-2'>
                <FieldLabel>Data inicial</FieldLabel>
                <Input
                  type='date'
                  value={filters.startDate}
                  onChange={(event) =>
                    updateFilter('startDate', event.target.value)
                  }
                />
              </div>
              <div className='space-y-2'>
                <FieldLabel>Data final</FieldLabel>
                <Input
                  type='date'
                  value={filters.endDate}
                  onChange={(event) =>
                    updateFilter('endDate', event.target.value)
                  }
                />
              </div>
              <div className='flex items-end'>
                <Button variant='outline' onClick={resetFilters}>
                  Limpar filtros
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
          <Card>
            <CardHeader className='pb-3'>
              <CardDescription className='text-xs'>
                Total solicitado
              </CardDescription>
              <CardTitle className='text-lg md:text-2xl'>
                {formatCurrency(dashboard?.summary.totalRequestedCents ?? 0)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className='pb-3'>
              <CardDescription className='text-xs'>
                Total aprovado
              </CardDescription>
              <CardTitle className='text-lg md:text-2xl'>
                {formatCurrency(dashboard?.summary.totalApprovedCents ?? 0)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className='pb-3'>
              <CardDescription className='text-xs'>
                Total pendente
              </CardDescription>
              <CardTitle className='text-lg md:text-2xl'>
                {formatCurrency(dashboard?.summary.totalPendingCents ?? 0)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className='pb-3'>
              <CardDescription className='text-xs'>
                Total recusado
              </CardDescription>
              <CardTitle className='text-lg md:text-2xl'>
                {formatCurrency(dashboard?.summary.totalRejectedCents ?? 0)}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        <div className='grid gap-4 lg:grid-cols-2'>
          <Card className='w-full'>
            <CardHeader className='pb-3'>
              <CardTitle className='text-base md:text-lg'>
                Participacao por categoria
              </CardTitle>
              <CardDescription className='text-xs md:text-sm'>
                Percentual do total solicitado por tipo de reembolso.
              </CardDescription>
            </CardHeader>
            <CardContent className='pb-4'>
              {categoryChartData.length ? (
                <div className='space-y-4'>
                  <ChartContainer
                    config={categoryChartConfig}
                    className='mx-auto aspect-square h-60 md:h-65'
                  >
                    <PieChart>
                      <ChartTooltip
                        cursor={false}
                        content={
                          <ChartTooltipContent
                            hideLabel
                            nameKey='key'
                            formatter={(value) => formatCurrency(Number(value))}
                          />
                        }
                      />
                      <Pie
                        data={categoryChartData}
                        dataKey='value'
                        nameKey='key'
                        innerRadius={70}
                        strokeWidth={2}
                        stroke='var(--background)'
                      >
                        <Label
                          content={({ viewBox }) => {
                            if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                              return (
                                <text
                                  x={viewBox.cx}
                                  y={viewBox.cy}
                                  textAnchor='middle'
                                  dominantBaseline='middle'
                                >
                                  <tspan
                                    x={viewBox.cx}
                                    y={viewBox.cy}
                                    className='fill-foreground text-2xl font-bold'
                                  >
                                    {formatCurrency(
                                      dashboard?.summary.totalRequestedCents ??
                                        0
                                    )}
                                  </tspan>
                                  <tspan
                                    x={viewBox.cx}
                                    y={(viewBox.cy || 0) + 22}
                                    className='fill-muted-foreground text-xs'
                                  >
                                    Total solicitado
                                  </tspan>
                                </text>
                              );
                            }
                            return null;
                          }}
                        />
                      </Pie>
                    </PieChart>
                  </ChartContainer>
                  <div className='grid gap-2 text-sm'>
                    {dashboard?.categoryShares.map((share, index) => (
                      <div
                        key={share.category}
                        className='flex items-center justify-between'
                      >
                        <div className='flex items-center gap-2'>
                          <span
                            className='h-2 w-2 rounded-sm'
                            style={{
                              backgroundColor:
                                chartPalette[index % chartPalette.length]
                            }}
                          />
                          <span>{share.category}</span>
                        </div>
                        <span className='font-mono'>
                          {share.percentage.toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className='text-muted-foreground text-sm'>
                  Nenhum dado para exibir.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className='w-full'>
            <CardHeader className='pb-3'>
              <CardTitle className='text-base md:text-lg'>
                Montante por membro
              </CardTitle>
              <CardDescription className='text-xs md:text-sm'>
                Top 8 membros com maior volume solicitado.
              </CardDescription>
            </CardHeader>
            <CardContent className='pb-4'>
              {memberChartData.length ? (
                <ChartContainer
                  config={memberChartConfig}
                  className='aspect-auto h-64 w-full md:h-75'
                >
                  <BarChart
                    data={memberChartData}
                    margin={{ left: 12, right: 12 }}
                    maxBarSize={100}
                  >
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey='name'
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      interval={0}
                      angle={-20}
                      textAnchor='end'
                      height={60}
                      tickFormatter={(value) =>
                        truncateLabel(String(value), 12)
                      }
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => formatCurrency(Number(value))}
                    />
                    <ChartTooltip
                      cursor={{ fill: 'var(--primary)', opacity: 0.08 }}
                      content={
                        <ChartTooltipContent
                          indicator='dot'
                          formatter={(value) => formatCurrency(Number(value))}
                        />
                      }
                    />
                    <Bar dataKey='value' fill='var(--color-value)' radius={4} />
                  </BarChart>
                </ChartContainer>
              ) : (
                <div className='text-muted-foreground text-sm'>
                  Nenhum dado para exibir.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className='overflow-hidden'>
          <CardHeader>
            <CardTitle>Solicitacoes</CardTitle>
            <CardDescription>
              {dashboard?.summary.totalCount ?? 0} solicitacao(oes)
              encontrada(s)
            </CardDescription>
          </CardHeader>
          <CardContent className='p-0 md:p-6'>
            <div className='overflow-x-auto'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Membro</TableHead>
                    <TableHead>Titulo</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className='text-right'>Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dashboard?.reinbursements.length ? (
                    dashboard.reinbursements.map((reinbursement) => (
                      <TableRow
                        key={reinbursement.id}
                        className='hover:bg-muted/50 cursor-pointer'
                        onClick={() => openDetails(reinbursement)}
                      >
                        <TableCell>
                          {formatDate(reinbursement.createdAt)}
                        </TableCell>
                        <TableCell>
                          {reinbursement.memberName ||
                            reinbursement.memberEmail}
                        </TableCell>
                        <TableCell className='max-w-xs truncate'>
                          {reinbursement.title}
                        </TableCell>
                        <TableCell>{reinbursement.category}</TableCell>
                        <TableCell>
                          <Badge variant={statusColors[reinbursement.status]}>
                            {reinbursement.status}
                          </Badge>
                        </TableCell>
                        <TableCell className='text-right font-medium'>
                          {formatCurrency(reinbursement.amountCents)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className='text-center'>
                        Nenhuma solicitacao encontrada.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!selectedReinbursement} onOpenChange={closeDetails}>
        <DialogContent className='max-h-[90vh] max-w-2xl overflow-y-auto'>
          <DialogHeader>
            <DialogTitle className='text-base md:text-lg'>
              Detalhes do reembolso
            </DialogTitle>
            <DialogDescription className='text-xs md:text-sm'>
              Informacoes completas da solicitacao selecionada.
            </DialogDescription>
          </DialogHeader>

          {selectedReinbursement && (
            <div className='space-y-4 md:space-y-6'>
              <div className='grid grid-cols-2 gap-3 md:gap-4'>
                <div className='col-span-2 sm:col-span-1'>
                  <p className='text-muted-foreground mb-1 text-[10px] tracking-wide uppercase md:text-xs'>
                    Titulo
                  </p>
                  <p className='text-xs font-semibold wrap-break-word md:text-sm'>
                    {selectedReinbursement.title}
                  </p>
                </div>
                <div className='col-span-2 sm:col-span-1'>
                  <p className='text-muted-foreground mb-1 text-[10px] tracking-wide uppercase md:text-xs'>
                    Categoria
                  </p>
                  <p className='text-xs font-semibold md:text-sm'>
                    {selectedReinbursement.category}
                  </p>
                </div>
                <div>
                  <p className='text-muted-foreground mb-1 text-[10px] tracking-wide uppercase md:text-xs'>
                    Status
                  </p>
                  <Badge
                    variant={statusColors[selectedReinbursement.status]}
                    className='text-xs'
                  >
                    {selectedReinbursement.status}
                  </Badge>
                </div>
                <div>
                  <p className='text-muted-foreground mb-1 text-[10px] tracking-wide uppercase md:text-xs'>
                    Valor
                  </p>
                  <p className='text-xs font-semibold md:text-sm'>
                    {formatCurrency(selectedReinbursement.amountCents)}
                  </p>
                </div>
                <div>
                  <p className='text-muted-foreground mb-1 text-[10px] tracking-wide uppercase md:text-xs'>
                    Data
                  </p>
                  <p className='text-xs font-semibold md:text-sm'>
                    {formatDate(selectedReinbursement.createdAt)}
                  </p>
                </div>
                <div>
                  <p className='text-muted-foreground mb-1 text-[10px] tracking-wide uppercase md:text-xs'>
                    Chave PIX
                  </p>
                  <p className='text-xs font-semibold break-all md:text-sm'>
                    {selectedReinbursement.pixKey}
                  </p>
                </div>
              </div>

              <div className='space-y-1 md:space-y-2'>
                <p className='text-muted-foreground text-[10px] tracking-wide uppercase md:text-xs'>
                  Descricao
                </p>
                <p className='text-xs leading-relaxed md:text-sm'>
                  {selectedReinbursement.description}
                </p>
              </div>

              <div className='space-y-1 rounded-lg border p-3 md:p-4'>
                <p className='text-muted-foreground mb-2 text-[10px] tracking-wide uppercase md:text-xs'>
                  Membro
                </p>
                <p className='text-xs font-semibold md:text-sm'>
                  {selectedReinbursement.memberName}
                </p>
                <p className='text-muted-foreground text-[10px] break-all md:text-xs'>
                  {selectedReinbursement.memberEmail}
                </p>
                <p className='text-muted-foreground text-[10px] md:text-xs'>
                  ID: {selectedReinbursement.memberId}
                </p>
              </div>

              <div className='flex flex-wrap items-center gap-2 md:gap-3'>
                {selectedReinbursement.receipt?.url ? (
                  <Button asChild size='sm' className='w-full sm:w-auto'>
                    <a
                      href={selectedReinbursement.receipt.url}
                      target='_blank'
                      rel='noreferrer'
                      download
                    >
                      Download comprovante
                    </a>
                  </Button>
                ) : (
                  <p className='text-muted-foreground text-xs md:text-sm'>
                    Nenhum comprovante anexado.
                  </p>
                )}
              </div>

              <div className='flex flex-col gap-2 border-t pt-3 sm:flex-row sm:items-center sm:justify-end md:gap-3 md:pt-4'>
                {selectedReinbursement.status === 'Pendente' ? (
                  <>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => handleStatusChange('Recusado')}
                      disabled={isUpdatingStatus}
                      className='w-full sm:w-auto'
                    >
                      Recusar
                    </Button>
                    <Button
                      size='sm'
                      onClick={() => handleStatusChange('Aprovado')}
                      disabled={isUpdatingStatus}
                      className='w-full sm:w-auto'
                    >
                      Aprovar
                    </Button>
                  </>
                ) : (
                  <p className='text-muted-foreground text-center text-xs sm:text-right md:text-sm'>
                    Esta solicitação já foi processada{' ('}
                    {selectedReinbursement.status.toLowerCase()}
                    {')'}.
                  </p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
