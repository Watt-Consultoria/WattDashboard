'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { toast } from 'sonner';
import {
  Plus,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  X,
  XCircle
} from 'lucide-react';
import { useAuth } from '@/features/auth/components/auth-provider';
import { useFirebaseData } from '@/contexts/firebase-data-context';
import { useRouter } from 'next/navigation';
import memberService from '@/services/memberService';
import faltaService from '@/services/faltaService';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import PageContainer from '@/components/layout/page-container';
import useMetadata from '@/hooks/use-metadata';
import type { Member } from '@/types/member/member';
import type { FaltaWithDetails } from '@/types/member/falta';
import { AddFaltaDialog } from './add-falta-dialog';

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

const formatDate = (timestamp: any): string => {
  if (!timestamp?.toDate) return '-';
  const date = timestamp.toDate();
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
};

type MemberWithStats = Member & {
  totalFaltas: number;
  activeFaltas: number;
  faltasPorTipo: Record<string, number>;
};

export default function FaltasPage() {
  const { user } = useAuth();
  const { currentMember } = useFirebaseData();
  const router = useRouter();
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [memberFaltas, setMemberFaltas] = useState<
    Record<string, FaltaWithDetails[]>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);
  const [cancelingFaltaId, setCancelingFaltaId] = useState<string | null>(null);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [sectorFilter, setSectorFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [faltaTypeFilter, setFaltaTypeFilter] = useState<string>('all');
  const [showOnlyWithFaltas, setShowOnlyWithFaltas] = useState(false);
  const isManager = (currentMember?.role || '').trim().toLowerCase() === 'gerente';

  useMetadata({ title: 'Faltas' });

  useEffect(() => {
    if (!isLoading && currentMember) {
      const allowedRoles = ['Diretor', 'Presidente', 'Assessor', 'Gerente'];
      if (!allowedRoles.includes(currentMember.role || '')) {
        toast.error('Acesso não autorizado', {
          description: 'Você não tem permissão para acessar esta página.'
        });
        router.push('/dashboard/individual');
      }
    }
  }, [currentMember, isLoading, router]);

  const loadData = async () => {
    if (!user?.uid) return;

    setIsLoading(true);
    try {
      const faltasMap: Record<string, FaltaWithDetails[]> = {};

      const members = await memberService.getAllMembers();
      const visibleMembers = members
        .filter((member) => {
          if (!isManager) return true;
          if (!currentMember?.sector) return false;

          return (
            member.sector === currentMember.sector &&
            member.id !== currentMember.id
          );
        })
        .sort((a, b) => a.name.localeCompare(b.name));

      setAllMembers(visibleMembers);

      if (isManager) {
        const faltasByMember = await Promise.all(
          visibleMembers.map(async (member) => [
            member.id,
            await faltaService.getFaltasWithDetails(member.id)
          ] as const)
        );
        faltasByMember.forEach(([memberId, faltas]) => {
          faltasMap[memberId] = faltas;
        });
      } else {
        const allFaltas = await faltaService.getAllFaltasWithDetails();
        for (const member of visibleMembers) {
          const faltas = allFaltas.filter(
            (falta) => falta.memberId === member.id
          );
          faltasMap[member.id] = faltas;
        }
      }

      setMemberFaltas(faltasMap);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Não foi possível carregar as faltas.';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (
      currentMember &&
      ['Diretor', 'Presidente', 'Assessor', 'Gerente'].includes(
        currentMember.role || ''
      )
    ) {
      loadData();
    }
  }, [currentMember]);

  const handleFaltaAdded = async () => {
    setIsAddDialogOpen(false);
    await loadData();
  };

  // Calcular membros com estatísticas
  const membersWithStats = useMemo<MemberWithStats[]>(() => {
    return allMembers.map((member) => {
      const faltas = memberFaltas[member.id] || [];
      const activeFaltas = faltas.filter(
        (f) => f.status === 'ativa' && f.daysUntilExpiry > 0
      );

      const faltasPorTipo: Record<string, number> = {
        leve: 0,
        moderada: 0,
        grave: 0,
        desligamento: 0
      };

      activeFaltas.forEach((falta) => {
        faltasPorTipo[falta.ruleType]++;
      });

      return {
        ...member,
        totalFaltas: faltas.length,
        activeFaltas: activeFaltas.length,
        faltasPorTipo
      };
    });
  }, [allMembers, memberFaltas]);

  // Filtrar membros
  const filteredMembers = useMemo(() => {
    return membersWithStats.filter((member) => {
      // Pesquisa por nome
      if (
        searchTerm &&
        !member.name.toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        return false;
      }

      // Filtro por setor
      if (sectorFilter !== 'all' && member.sector !== sectorFilter) {
        return false;
      }

      // Filtro por cargo
      if (roleFilter !== 'all' && member.role !== roleFilter) {
        return false;
      }

      // Filtro para mostrar apenas membros com faltas
      if (showOnlyWithFaltas && member.totalFaltas === 0) {
        return false;
      }

      // Filtro por tipo de falta
      if (faltaTypeFilter !== 'all') {
        if (member.faltasPorTipo[faltaTypeFilter] === 0) {
          return false;
        }
      }

      return true;
    });
  }, [
    membersWithStats,
    searchTerm,
    sectorFilter,
    roleFilter,
    showOnlyWithFaltas,
    faltaTypeFilter
  ]);

  // Opções únicas de setores e cargos
  const sectors = useMemo(() => {
    const uniqueSectors = Array.from(
      new Set(allMembers.map((m) => m.sector).filter(Boolean))
    );
    return uniqueSectors.sort();
  }, [allMembers]);

  const roles = useMemo(() => {
    const uniqueRoles = Array.from(
      new Set(allMembers.map((m) => m.role).filter(Boolean))
    );
    return uniqueRoles.sort();
  }, [allMembers]);

  const handleExpandRow = (memberId: string) => {
    setExpandedMemberId((prev) => (prev === memberId ? null : memberId));
  };

  const canCancelFalta = (falta: FaltaWithDetails) => {
    if (!isManager) return true;
    return falta.addedBy === user?.uid;
  };

  const handleCancelFalta = async (memberId: string, faltaId: string) => {
    const falta = (memberFaltas[memberId] || []).find((item) => item.id === faltaId);
    if (!falta) {
      toast.error('Falta não encontrada para cancelamento');
      return;
    }

    if (isManager && falta.addedBy !== user?.uid) {
      toast.error(
        'Gerentes só podem cancelar faltas que eles mesmos registraram'
      );
      return;
    }

    setCancelingFaltaId(faltaId);
    try {
      await faltaService.cancelFalta(memberId, faltaId);
      toast.success('Falta cancelada com sucesso!', {
        description: 'Um e-mail de notificação foi enviado ao membro.'
      });
      // Recarregar os dados
      const faltas = await faltaService.getFaltasWithDetails(memberId);
      setMemberFaltas((prev) => ({
        ...prev,
        [memberId]: faltas
      }));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erro ao cancelar falta';
      toast.error(message);
    } finally {
      setCancelingFaltaId(null);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSectorFilter('all');
    setRoleFilter('all');
    setFaltaTypeFilter('all');
    setShowOnlyWithFaltas(false);
  };

  const hasActiveFilters =
    searchTerm ||
    sectorFilter !== 'all' ||
    roleFilter !== 'all' ||
    faltaTypeFilter !== 'all' ||
    showOnlyWithFaltas;

  return (
    <PageContainer
      scrollable
      pageTitle='Gestão de Faltas'
      pageDescription='Visualize e adicione faltas dos membros'
      pageHeaderAction={
        <Button
          onClick={() => setIsAddDialogOpen(true)}
          className='h-9 gap-2'
          size='sm'
        >
          <Plus className='h-4 w-4' />
          <span className='hidden sm:inline'>Registrar Falta</span>
          <span className='sm:hidden'>Nova</span>
        </Button>
      }
    >
      <div className='space-y-4'>
        {/* Filtros e Pesquisa */}
        <Card>
          <CardHeader className='pb-3'>
            <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
              <div className='flex-1'>
                <CardTitle className='text-base sm:text-lg'>Membros</CardTitle>
                <CardDescription className='text-xs sm:text-sm'>
                  {filteredMembers.length} de {allMembers.length} membro(s)
                </CardDescription>
              </div>
              {hasActiveFilters && (
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={clearFilters}
                  className='h-8 text-xs'
                >
                  <X className='mr-1 h-3 w-3' />
                  Limpar filtros
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className='space-y-4'>
            {/* Barra de Pesquisa */}
            <div className='relative'>
              <Search className='text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2' />
              <Input
                placeholder='Pesquisar por nome...'
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className='h-9 pl-9 text-sm'
              />
            </div>

            {/* Filtros */}
            <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
              <Select value={sectorFilter} onValueChange={setSectorFilter}>
                <SelectTrigger className='h-9 text-xs sm:text-sm'>
                  <SelectValue placeholder='Todos os setores' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>Todos os setores</SelectItem>
                  {sectors.map((sector) => (
                    <SelectItem key={sector} value={sector}>
                      {sector}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className='h-9 text-xs sm:text-sm'>
                  <SelectValue placeholder='Todos os cargos' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>Todos os cargos</SelectItem>
                  {roles.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={faltaTypeFilter}
                onValueChange={setFaltaTypeFilter}
              >
                <SelectTrigger className='h-9 text-xs sm:text-sm'>
                  <SelectValue placeholder='Tipo de falta' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>Todos os tipos</SelectItem>
                  <SelectItem value='leve'>Leve</SelectItem>
                  <SelectItem value='moderada'>Moderada</SelectItem>
                  <SelectItem value='grave'>Grave</SelectItem>
                  <SelectItem value='desligamento'>Desligamento</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant={showOnlyWithFaltas ? 'default' : 'outline'}
                size='sm'
                onClick={() => setShowOnlyWithFaltas(!showOnlyWithFaltas)}
                className='h-9 text-xs sm:text-sm'
              >
                <Filter className='mr-2 h-3 w-3' />
                Com faltas
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabela/Lista */}
        {isLoading ? (
          <Card>
            <CardContent className='py-10'>
              <div className='flex flex-col items-center justify-center gap-2'>
                <div className='bg-muted h-8 w-8 animate-pulse rounded-full' />
                <p className='text-muted-foreground text-sm'>
                  Carregando membros...
                </p>
              </div>
            </CardContent>
          </Card>
        ) : filteredMembers.length === 0 ? (
          <Card>
            <CardContent className='py-10'>
              <div className='flex flex-col items-center justify-center gap-2'>
                <AlertCircle className='text-muted-foreground h-10 w-10' />
                <p className='text-muted-foreground text-sm'>
                  {hasActiveFilters
                    ? 'Nenhum membro encontrado com os filtros aplicados.'
                    : 'Nenhum membro encontrado.'}
                </p>
                {hasActiveFilters && (
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={clearFilters}
                    className='mt-2'
                  >
                    Limpar filtros
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Desktop: Table */}
            <div className='hidden md:block'>
              <Card>
                <CardContent className='p-0'>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className='w-10'></TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead className='hidden lg:table-cell'>
                          Cargo
                        </TableHead>
                        <TableHead className='hidden xl:table-cell'>
                          Setor
                        </TableHead>
                        <TableHead className='text-center'>Total</TableHead>
                        <TableHead className='text-center'>Ativas</TableHead>
                        <TableHead className='hidden text-center lg:table-cell'>
                          Leve
                        </TableHead>
                        <TableHead className='hidden text-center lg:table-cell'>
                          Moderada
                        </TableHead>
                        <TableHead className='hidden text-center lg:table-cell'>
                          Grave
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMembers.map((member) => {
                        const faltas = memberFaltas[member.id] || [];
                        const isExpanded = expandedMemberId === member.id;

                        return (
                          <React.Fragment key={member.id}>
                            <TableRow
                              key={member.id}
                              className='hover:bg-muted/50 cursor-pointer'
                              onClick={() => handleExpandRow(member.id)}
                            >
                              <TableCell className='text-center'>
                                {faltas.length > 0 &&
                                  (isExpanded ? (
                                    <ChevronUp className='h-4 w-4' />
                                  ) : (
                                    <ChevronDown className='h-4 w-4' />
                                  ))}
                              </TableCell>
                              <TableCell className='font-medium'>
                                {member.name}
                              </TableCell>
                              <TableCell className='hidden text-sm lg:table-cell'>
                                {member.role}
                              </TableCell>
                              <TableCell className='hidden text-sm xl:table-cell'>
                                {member.sector || '-'}
                              </TableCell>
                              <TableCell className='text-center'>
                                {member.totalFaltas}
                              </TableCell>
                              <TableCell className='text-center'>
                                <Badge
                                  variant={
                                    member.activeFaltas > 0
                                      ? 'destructive'
                                      : 'secondary'
                                  }
                                >
                                  {member.activeFaltas}
                                </Badge>
                              </TableCell>
                              <TableCell className='hidden text-center lg:table-cell'>
                                {member.faltasPorTipo.leve || '-'}
                              </TableCell>
                              <TableCell className='hidden text-center lg:table-cell'>
                                {member.faltasPorTipo.moderada || '-'}
                              </TableCell>
                              <TableCell className='hidden text-center lg:table-cell'>
                                {member.faltasPorTipo.grave || '-'}
                              </TableCell>
                            </TableRow>

                            {/* DetalhesExpandíveisDesktop */}
                            {isExpanded && faltas.length > 0 && (
                              <TableRow>
                                <TableCell
                                  colSpan={9}
                                  className='bg-muted/30 p-0'
                                >
                                  <div className='p-4'>
                                    <h4 className='mb-3 text-sm font-semibold'>
                                      Histórico de Faltas
                                    </h4>
                                    <div className='overflow-x-auto rounded-md border'>
                                      <Table>
                                        <TableHeader>
                                          <TableRow>
                                            <TableHead className='text-xs'>
                                              Data
                                            </TableHead>
                                            <TableHead className='text-xs'>
                                              Código
                                            </TableHead>
                                            <TableHead className='text-xs'>
                                              Regra
                                            </TableHead>
                                            <TableHead className='text-xs'>
                                              Tipo
                                            </TableHead>
                                            <TableHead className='text-xs'>
                                              Descrição
                                            </TableHead>
                                            <TableHead className='text-right text-xs'>
                                              Expira
                                            </TableHead>
                                            <TableHead className='text-center text-xs'>
                                              Status
                                            </TableHead>
                                            <TableHead className='text-center text-xs'>
                                              Ação
                                            </TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {faltas.map((falta) => (
                                            <TableRow key={falta.id}>
                                              <TableCell className='text-xs'>
                                                {formatDate(falta.dateAdded)}
                                              </TableCell>
                                              <TableCell className='font-mono text-xs'>
                                                {falta.ruleCode}
                                              </TableCell>
                                              <TableCell className='max-w-xs truncate text-xs'>
                                                {falta.ruleName}
                                              </TableCell>
                                              <TableCell>
                                                <Badge
                                                  variant={
                                                    ruleTypeColors[
                                                      falta.ruleType
                                                    ]
                                                  }
                                                  className='text-[10px]'
                                                >
                                                  {
                                                    ruleTypeLabels[
                                                      falta.ruleType
                                                    ]
                                                  }
                                                </Badge>
                                              </TableCell>
                                              <TableCell className='max-w-xs truncate text-xs'>
                                                {falta.description || '-'}
                                              </TableCell>
                                              <TableCell className='text-right text-xs'>
                                                {falta.daysUntilExpiry}d
                                              </TableCell>
                                              <TableCell className='text-center'>
                                                <Badge
                                                  variant={
                                                    falta.status === 'ativa' &&
                                                    falta.daysUntilExpiry > 0
                                                      ? 'default'
                                                      : 'secondary'
                                                  }
                                                  className='text-[10px]'
                                                >
                                                  {falta.status === 'ativa' &&
                                                  falta.daysUntilExpiry > 0
                                                    ? 'Ativa'
                                                    : falta.status ===
                                                        'cancelada'
                                                      ? 'Cancelada'
                                                      : 'Expirada'}
                                                </Badge>
                                              </TableCell>
                                              <TableCell className='text-center'>
                                                {falta.status === 'ativa' &&
                                                falta.daysUntilExpiry > 0 &&
                                                canCancelFalta(falta) ? (
                                                  <Button
                                                    variant='ghost'
                                                    size='sm'
                                                    className='h-6 w-6 p-0'
                                                    onClick={() =>
                                                      handleCancelFalta(
                                                        member.id,
                                                        falta.id
                                                      )
                                                    }
                                                    disabled={
                                                      cancelingFaltaId ===
                                                      falta.id
                                                    }
                                                    title='Cancelar falta'
                                                  >
                                                    {cancelingFaltaId ===
                                                    falta.id ? (
                                                      <div className='h-4 w-4 animate-spin rounded-full border-2 border-red-500 border-t-transparent' />
                                                    ) : (
                                                      <XCircle className='h-4 w-4 text-red-500' />
                                                    )}
                                                  </Button>
                                                ) : (
                                                  <span className='text-muted-foreground text-xs'>
                                                    -
                                                  </span>
                                                )}
                                              </TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                    </div>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

            {/* Mobile: Cards */}
            <div className='space-y-3 md:hidden'>
              {filteredMembers.map((member) => {
                const faltas = memberFaltas[member.id] || [];
                const isExpanded = expandedMemberId === member.id;

                return (
                  <Card key={member.id}>
                    <CardContent
                      className='cursor-pointer p-4'
                      onClick={() =>
                        faltas.length > 0 && handleExpandRow(member.id)
                      }
                    >
                      {/* Header do Card Mobile */}
                      <div className='mb-3 flex items-start justify-between'>
                        <div className='flex-1'>
                          <h3 className='font-semibold'>{member.name}</h3>
                          <p className='text-muted-foreground text-xs'>
                            {member.role}
                            {member.sector && ` • ${member.sector}`}
                          </p>
                        </div>
                        {faltas.length > 0 &&
                          (isExpanded ? (
                            <ChevronUp className='text-muted-foreground h-5 w-5' />
                          ) : (
                            <ChevronDown className='text-muted-foreground h-5 w-5' />
                          ))}
                      </div>

                      {/* Estatísticas */}
                      <div className='flex flex-wrap gap-2'>
                        <Badge variant='outline' className='text-xs'>
                          Total: {member.totalFaltas}
                        </Badge>
                        <Badge
                          variant={
                            member.activeFaltas > 0
                              ? 'destructive'
                              : 'secondary'
                          }
                          className='text-xs'
                        >
                          Ativas: {member.activeFaltas}
                        </Badge>
                        {member.faltasPorTipo.leve > 0 && (
                          <Badge variant='default' className='text-xs'>
                            Leve: {member.faltasPorTipo.leve}
                          </Badge>
                        )}
                        {member.faltasPorTipo.moderada > 0 && (
                          <Badge variant='secondary' className='text-xs'>
                            Mod: {member.faltasPorTipo.moderada}
                          </Badge>
                        )}
                        {member.faltasPorTipo.grave > 0 && (
                          <Badge variant='destructive' className='text-xs'>
                            Grave: {member.faltasPorTipo.grave}
                          </Badge>
                        )}
                      </div>

                      {/* Detalhes Expandíveis Mobile */}
                      {isExpanded && faltas.length > 0 && (
                        <div className='mt-4 space-y-3 border-t pt-4'>
                          <h4 className='text-sm font-semibold'>
                            Histórico de Faltas
                          </h4>
                          {faltas.map((falta) => (
                            <div
                              key={falta.id}
                              className='bg-muted/50 space-y-2 rounded-lg border p-3'
                            >
                              <div className='flex items-start justify-between'>
                                <div>
                                  <p className='font-mono text-xs font-semibold'>
                                    {falta.ruleCode}
                                  </p>
                                  <p className='text-muted-foreground text-xs'>
                                    {formatDate(falta.dateAdded)}
                                  </p>
                                </div>
                                <div className='flex flex-col items-end gap-1'>
                                  <Badge
                                    variant={ruleTypeColors[falta.ruleType]}
                                    className='text-[10px]'
                                  >
                                    {ruleTypeLabels[falta.ruleType]}
                                  </Badge>
                                  <Badge
                                    variant={
                                      falta.status === 'ativa' &&
                                      falta.daysUntilExpiry > 0
                                        ? 'default'
                                        : 'secondary'
                                    }
                                    className='text-[10px]'
                                  >
                                    {falta.status === 'ativa' &&
                                    falta.daysUntilExpiry > 0
                                      ? 'Ativa'
                                      : falta.status === 'cancelada'
                                        ? 'Cancelada'
                                        : 'Expirada'}
                                  </Badge>
                                </div>
                              </div>
                              <div className='flex items-center justify-between gap-2'>
                                <div className='flex-1'>
                                  <p className='text-xs'>{falta.ruleName}</p>
                                  {falta.description && (
                                    <p className='text-muted-foreground text-xs'>
                                      {falta.description}
                                    </p>
                                  )}
                                  <p className='text-muted-foreground text-xs'>
                                    Expira em {falta.daysUntilExpiry} dias
                                  </p>
                                </div>
                                {falta.status === 'ativa' &&
                                falta.daysUntilExpiry > 0 &&
                                canCancelFalta(falta) ? (
                                  <Button
                                    variant='ghost'
                                    size='sm'
                                    className='h-8 w-8 shrink-0 p-0'
                                    onClick={() =>
                                      handleCancelFalta(member.id, falta.id)
                                    }
                                    disabled={cancelingFaltaId === falta.id}
                                    title='Cancelar falta'
                                  >
                                    {cancelingFaltaId === falta.id ? (
                                      <div className='h-4 w-4 animate-spin rounded-full border-2 border-red-500 border-t-transparent' />
                                    ) : (
                                      <XCircle className='h-4 w-4 text-red-500' />
                                    )}
                                  </Button>
                                ) : null}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </div>

      <AddFaltaDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        members={allMembers}
        onSuccess={handleFaltaAdded}
        currentUserId={user?.uid || ''}
      />
    </PageContainer>
  );
}
