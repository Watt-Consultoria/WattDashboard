'use client';

import * as React from 'react';
import PageContainer from '@/components/layout/page-container';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { firebaseDb } from '@/lib/firebase/client';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { toast } from 'sonner';
import { format, subWeeks, startOfWeek, endOfWeek } from 'date-fns';
import {
  Search,
  Users,
  CheckCircle2,
  XCircle,
  Save,
  ArrowUpDown
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useFirebaseData } from '@/contexts/firebase-data-context';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import useMetadata from '@/hooks/use-metadata';

type Member = {
  id: string;
  name: string;
  email: string;
  sector: string;
  role: string;
  timeRecords?: {
    id: string;
    type: string;
    timestamp: any;
  }[];
};

type MemberStatus = {
  isWorking: boolean;
  lastRecord: { type: string; timestamp: Date } | null;
  hoursWeek: number;
  hoursLastWeek: number;
};

export default function PontoPage() {
  const {
    members: contextMembers,
    isLoading: isLoadingContext,
    currentMember
  } = useFirebaseData();
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [members, setMembers] = React.useState<Member[]>([]);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('asc');
  const [minWeeklyHours, setMinWeeklyHours] = React.useState<number>(0);
  const [newMinHours, setNewMinHours] = React.useState<string>('');
  const [isSavingHours, setIsSavingHours] = React.useState(false);

  useMetadata({ title: 'Ponto Digital' });

  const isAdmin = React.useMemo(() => {
    return (
      currentMember?.role &&
      ['Diretor', 'Presidente', 'Assessor'].includes(currentMember.role)
    );
  }, [currentMember]);

  // Sync members from context
  React.useEffect(() => {
    if (contextMembers) {
      setMembers(contextMembers as unknown as Member[]);
    }
  }, [contextMembers]);

  // Role based access control
  React.useEffect(() => {
    if (!isLoadingContext && currentMember) {
      const allowedRoles = ['Diretor', 'Presidente', 'Assessor'];
      if (!allowedRoles.includes(currentMember.role || '')) {
        toast.error('Acesso não autorizado', {
          description: 'Você não tem permissão para acessar esta página.'
        });
        router.push('/dashboard/individual');
      }
    }
  }, [currentMember, isLoadingContext]);
  React.useEffect(() => {
    if (!firebaseDb) return;

    const globalRef = doc(firebaseDb, 'GlobalInfo', 'globalInformations');

    const unsubscribe = onSnapshot(
      globalRef,
      (docSnapshot) => {
        if (docSnapshot.exists() && docSnapshot.data().semanalHours) {
          const hours = docSnapshot.data().semanalHours;
          setMinWeeklyHours(hours);
          // Only update input if finding the initial value to avoid overwriting user typing if they are typing while update comes in?
          // Actually, for simplicity, let's just update it. Or maybe check if input is empty?
          // Let's just update strictly on load or external change.
          setNewMinHours(hours.toString());
        }
        setLoading(false);
      },
      (error) => {
        console.error('Erro ao ouvir configurações:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleSaveMinHours = async () => {
    if (!firebaseDb) return;
    const hours = Number(newMinHours);
    if (isNaN(hours) || hours < 0) {
      toast.error('Por favor, insira um número válido.');
      return;
    }

    setIsSavingHours(true);
    try {
      const globalRef = doc(firebaseDb, 'GlobalInfo', 'globalInformations');
      await setDoc(globalRef, { semanalHours: hours }, { merge: true });
      setMinWeeklyHours(hours);
      toast.success('Meta de horas semanais atualizada!');
    } catch (error) {
      console.error('Erro ao salvar meta:', error);
      toast.error('Erro ao salvar meta de horas.');
    } finally {
      setIsSavingHours(false);
    }
  };

  const calculateMemberStatus = (member: Member): MemberStatus => {
    const records = (member.timeRecords || [])
      .filter((r) => r.timestamp)
      .sort((a, b) => {
        const timeA = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : 0;
        const timeB = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : 0;
        return timeA - timeB;
      });

    const lastRecord = records.length > 0 ? records[records.length - 1] : null;
    const isWorking = lastRecord?.type === 'Entrada';

    // Time ranges
    const today = new Date();
    const currentWeekStart = startOfWeek(boxDate(today), { weekStartsOn: 1 }); // Monday
    const lastWeekStart = startOfWeek(boxDate(subWeeks(today, 1)), {
      weekStartsOn: 1
    });
    const lastWeekEnd = endOfWeek(boxDate(subWeeks(today, 1)), {
      weekStartsOn: 1
    });

    let minutesWeek = 0;
    let minutesLastWeek = 0;
    let lastEntrada: Date | null = null;

    for (const record of records) {
      if (!record.timestamp?.toDate) continue;
      const recordDate = record.timestamp.toDate();

      if (record.type === 'Entrada') {
        lastEntrada = recordDate;
      } else if (record.type === 'Saída' && lastEntrada) {
        const duration =
          (recordDate.getTime() - lastEntrada.getTime()) / (1000 * 60);

        // Add to Current Week
        if (recordDate >= currentWeekStart) {
          minutesWeek += duration;
        }

        // Add to Last Week
        if (recordDate >= lastWeekStart && recordDate <= lastWeekEnd) {
          minutesLastWeek += duration;
        }

        lastEntrada = null;
      }
    }

    // Add current running time if working
    if (isWorking && lastRecord?.timestamp?.toDate) {
      const entryTime = lastRecord.timestamp.toDate();
      const now = new Date();
      const currentDuration =
        (now.getTime() - entryTime.getTime()) / (1000 * 60);

      if (entryTime >= currentWeekStart) {
        minutesWeek += currentDuration;
      }
      // Note: Running time never applies to last week unless they've been working for a week straight
    }

    return {
      isWorking,
      lastRecord: lastRecord
        ? {
            type: lastRecord.type,
            timestamp: lastRecord.timestamp.toDate()
          }
        : null,
      hoursWeek: minutesWeek / 60,
      hoursLastWeek: minutesLastWeek / 60
    };
  };

  // Helper to ensure dates are treated consistently
  const boxDate = (d: Date) => {
    const n = new Date(d);
    n.setHours(0, 0, 0, 0);
    return n;
  };

  const filteredMembers = members.filter(
    (member) =>
      member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.sector?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedMembers = React.useMemo(() => {
    const sorted = [...filteredMembers].sort((a, b) =>
      a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })
    );
    return sortOrder === 'asc' ? sorted : sorted.reverse();
  }, [filteredMembers, sortOrder]);

  const stats = React.useMemo(() => {
    let working = 0;
    members.forEach((m) => {
      const status = calculateMemberStatus(m);
      if (status.isWorking) working++;
    });
    return { working, total: members.length };
  }, [members]);

  // Force re-render periodically
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <PageContainer>
      <div className='flex flex-col gap-6'>
        <div>
          <h1 className='text-3xl font-bold tracking-tight'>
            Gerenciamento de Ponto
          </h1>
          <p className='text-muted-foreground'>
            Monitoramento de presença e cumprimento de metas semanais.
          </p>
        </div>

        <div className='grid grid-cols-2 gap-3 md:gap-6'>
          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 px-4 pt-0 pb-2 md:px-6 md:pt-0'>
              <div className='space-y-1'>
                <CardTitle className='text-xs leading-none font-medium md:text-2xl'>
                  <span className='md:hidden'>Em Tempo Real</span>
                  <span className='hidden md:inline'>
                    Presença em Tempo Real
                  </span>
                </CardTitle>
                <p className='text-muted-foreground hidden text-xs md:block'>
                  Membros ativos no momento.
                </p>
              </div>
              <Users className='text-muted-foreground h-3 w-3 md:h-5 md:w-5' />
            </CardHeader>
            <CardContent className='p-4 pt-0 md:p-6'>
              <div className='flex flex-col items-start gap-1 md:flex-row md:items-baseline md:gap-2'>
                <span className='text-2xl font-bold text-green-600 md:text-4xl dark:text-green-400'>
                  {stats.working}
                </span>
                <span className='text-muted-foreground text-xs md:text-sm'>
                  <span className='md:hidden'>de {stats.total} ativos</span>
                  <span className='hidden md:inline'>
                    de {stats.total} membros registrados
                  </span>
                </span>
              </div>
              <div className='bg-secondary mt-2 h-1.5 w-full overflow-hidden rounded-full md:mt-3 md:h-2'>
                <div
                  className='h-full bg-green-500 transition-all duration-500'
                  style={{
                    width: `${stats.total > 0 ? (stats.working / stats.total) * 100 : 0}%`
                  }}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 px-4 pt-0 pb-2 md:px-6 md:pt-0'>
              <div className='space-y-1'>
                <CardTitle className='text-xs leading-none font-medium md:text-2xl'>
                  <span className='md:hidden'>Meta Semanal</span>
                  <span className='hidden md:inline'>
                    Meta de Horas Semanais
                  </span>
                </CardTitle>
                <p className='text-muted-foreground hidden text-xs md:block'>
                  Defina o objetivo para a equipe.
                </p>
              </div>
              <Save className='text-muted-foreground h-3 w-3 md:h-4 md:w-4' />
            </CardHeader>
            <CardContent className='p-4 pt-0 md:p-6'>
              <div className='flex items-center gap-2'>
                <div className='relative flex-1'>
                  <Input
                    type='number'
                    value={newMinHours}
                    onChange={(e) => setNewMinHours(e.target.value)}
                    placeholder='40'
                    className='h-8 pr-8 text-sm md:h-10 md:pr-12'
                    disabled={!isAdmin}
                  />
                  <span className='text-muted-foreground absolute top-2 right-2 text-[10px] md:top-2.5 md:right-3 md:text-xs'>
                    h
                  </span>
                </div>
                <Button
                  onClick={handleSaveMinHours}
                  disabled={isSavingHours || !isAdmin}
                  variant='outline'
                  size='sm'
                  className='h-8 px-2 text-xs md:h-10 md:px-3 md:text-sm'
                >
                  {isSavingHours ? '...' : 'OK'}
                </Button>
              </div>
              <p className='text-muted-foreground mt-2 hidden text-xs md:block'>
                Horas mínimas para status "Cumpriu".
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className='h-full border-none shadow-none md:border md:shadow-sm'>
          <CardHeader className='px-6 md:px-6'>
            <div className='flex flex-col justify-between gap-4 md:flex-row md:items-center'>
              <div>
                <CardTitle className='text-xl md:text-2xl'>
                  Visão Geral de Membros
                </CardTitle>
                <CardDescription>
                  Acompanhamento de metas da semana atual e anterior.
                </CardDescription>
              </div>
              <div className='flex w-full gap-2 md:w-auto'>
                <div className='relative w-full md:w-72'>
                  <Search className='text-muted-foreground absolute top-2.5 left-2 h-4 w-4' />
                  <Input
                    placeholder='Buscar por nome ou setor...'
                    className='pl-8'
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className='py-10 text-center'>Carregando dados...</div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className='relative hidden h-[400px] overflow-y-auto rounded-md border md:block'>
                  <Table>
                    <TableHeader className='bg-background sticky top-0 z-10 shadow-sm'>
                      <TableRow>
                        <TableHead>
                          <button
                            type='button'
                            onClick={() =>
                              setSortOrder((prev) =>
                                prev === 'asc' ? 'desc' : 'asc'
                              )
                            }
                            className='flex items-center gap-2'
                            aria-label='Alternar ordenacao alfabetica'
                          >
                            <span>Membro</span>
                            <span className='text-muted-foreground text-xs'>
                              {sortOrder === 'asc' ? 'A-Z' : 'Z-A'}
                            </span>
                            <ArrowUpDown className='text-muted-foreground h-3.5 w-3.5' />
                          </button>
                        </TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className='text-center'>
                          Semana Passada
                        </TableHead>
                        <TableHead className='text-center'>
                          Semana Atual
                        </TableHead>
                        <TableHead className='text-right'>
                          Último Registro
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedMembers.map((member) => {
                        const status = calculateMemberStatus(member);
                        const metLastWeek =
                          minWeeklyHours > 0 &&
                          status.hoursLastWeek >= minWeeklyHours;
                        const metWeek =
                          minWeeklyHours > 0 &&
                          status.hoursWeek >= minWeeklyHours;

                        return (
                          <TableRow key={member.id}>
                            <TableCell className='font-medium'>
                              <div className='flex items-center gap-2'>
                                <Avatar className='h-8 w-8'>
                                  <AvatarFallback>
                                    {member.name.substring(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className='flex flex-col'>
                                  <span>{member.name}</span>
                                  <div className='text-muted-foreground flex gap-2 text-xs'>
                                    <span>{member.role}</span>
                                    <span>•</span>
                                    <span>{member.sector || 'Geral'}</span>
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {status.isWorking ? (
                                <Badge className='border-green-200 bg-green-100 text-green-700 hover:bg-green-100 dark:border-green-800 dark:bg-green-900/30 dark:text-green-400'>
                                  <div className='mr-1.5 h-1.5 w-1.5 animate-pulse rounded-full bg-green-500' />
                                  Trabalhando
                                </Badge>
                              ) : (
                                <Badge
                                  variant='secondary'
                                  className='text-muted-foreground'
                                >
                                  Ausente
                                </Badge>
                              )}
                            </TableCell>
                            {/* Semana Passada */}
                            <TableCell className='text-center'>
                              <div className='flex flex-col items-center'>
                                <div
                                  className={`flex items-center gap-1.5 font-medium ${
                                    metLastWeek
                                      ? 'text-green-600 dark:text-green-400'
                                      : status.hoursLastWeek > 0
                                        ? 'text-orange-600'
                                        : 'text-muted-foreground'
                                  }`}
                                >
                                  {metLastWeek ? (
                                    <CheckCircle2 className='h-4 w-4' />
                                  ) : (
                                    <div className='h-4 w-4' />
                                  )}
                                  <span>
                                    {status.hoursLastWeek.toFixed(1)}h
                                  </span>
                                </div>
                              </div>
                            </TableCell>

                            {/* Semana Atual */}
                            <TableCell className='text-center'>
                              <div className='flex flex-col items-center'>
                                <div
                                  className={`flex items-center gap-1.5 font-medium ${
                                    metWeek
                                      ? 'text-green-600 dark:text-green-400'
                                      : 'text-foreground'
                                  }`}
                                >
                                  {metWeek ? (
                                    <CheckCircle2 className='h-4 w-4' />
                                  ) : (
                                    <div className='h-4 w-4' />
                                  )}
                                  <span>{status.hoursWeek.toFixed(1)}h</span>
                                </div>

                                {/* Progress bar for current week */}
                                {minWeeklyHours > 0 && (
                                  <div className='bg-secondary mt-1 h-1.5 w-20 overflow-hidden rounded-full'>
                                    <div
                                      className={`h-full rounded-full ${metWeek ? 'bg-green-500' : 'bg-primary'}`}
                                      style={{
                                        width: `${Math.min((status.hoursWeek / minWeeklyHours) * 100, 100)}%`
                                      }}
                                    />
                                  </div>
                                )}
                              </div>
                            </TableCell>

                            <TableCell className='text-right'>
                              {status.lastRecord ? (
                                <div className='text-sm'>
                                  <span className='font-medium'>
                                    {status.lastRecord.type}
                                  </span>
                                  <div className='text-muted-foreground text-xs'>
                                    {format(
                                      status.lastRecord.timestamp,
                                      'dd/MM HH:mm'
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <span className='text-muted-foreground text-xs'>
                                  -
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Cards (ListView) */}
                <div className='space-y-3 md:hidden'>
                  {sortedMembers.map((member) => {
                    const status = calculateMemberStatus(member);
                    const metLastWeek =
                      minWeeklyHours > 0 &&
                      status.hoursLastWeek >= minWeeklyHours;
                    const metWeek =
                      minWeeklyHours > 0 && status.hoursWeek >= minWeeklyHours;

                    return (
                      <div
                        key={member.id}
                        className='bg-card text-card-foreground rounded-lg border p-4 shadow-sm'
                      >
                        <div className='mb-3 flex items-start justify-between'>
                          <div className='flex items-center gap-3'>
                            <Avatar className='h-10 w-10'>
                              <AvatarFallback>
                                {member.name.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className='font-semibold'>{member.name}</div>
                              <div className='text-muted-foreground text-xs'>
                                {member.role} • {member.sector || 'Geral'}
                              </div>
                            </div>
                          </div>
                          {status.isWorking ? (
                            <Badge className='border-green-200 bg-green-100 px-1.5 text-[10px] text-green-700 hover:bg-green-100 dark:border-green-800 dark:bg-green-900/30 dark:text-green-400'>
                              On
                            </Badge>
                          ) : (
                            <Badge
                              variant='secondary'
                              className='text-muted-foreground px-1.5 text-[10px]'
                            >
                              Off
                            </Badge>
                          )}
                        </div>

                        <div className='mt-4 grid grid-cols-2 gap-4 border-t pt-4 text-sm'>
                          <div className='flex flex-col gap-1'>
                            <span className='text-muted-foreground text-xs'>
                              Semana Atual
                            </span>
                            <div
                              className={`flex items-center gap-1.5 font-medium ${metWeek ? 'text-green-600 dark:text-green-400' : ''}`}
                            >
                              <span>{status.hoursWeek.toFixed(1)}h</span>
                              {metWeek && (
                                <CheckCircle2 className='h-3.5 w-3.5' />
                              )}
                            </div>
                            {minWeeklyHours > 0 && (
                              <div className='bg-secondary h-1 w-full overflow-hidden rounded-full'>
                                <div
                                  className={`h-full rounded-full ${metWeek ? 'bg-green-500' : 'bg-primary'}`}
                                  style={{
                                    width: `${Math.min((status.hoursWeek / minWeeklyHours) * 100, 100)}%`
                                  }}
                                />
                              </div>
                            )}
                          </div>
                          <div className='flex flex-col items-end gap-1 text-right'>
                            <span className='text-muted-foreground text-xs'>
                              Semana Passada
                            </span>
                            <div
                              className={`flex items-center gap-1.5 font-medium ${metLastWeek ? 'text-green-600 dark:text-green-400' : status.hoursLastWeek > 0 ? 'text-orange-600' : 'text-muted-foreground'}`}
                            >
                              <span>{status.hoursLastWeek.toFixed(1)}h</span>
                            </div>
                          </div>
                        </div>

                        {status.lastRecord && (
                          <div className='text-muted-foreground mt-3 text-right text-xs'>
                            Último registro: {status.lastRecord.type} em{' '}
                            {format(status.lastRecord.timestamp, 'dd/MM HH:mm')}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
