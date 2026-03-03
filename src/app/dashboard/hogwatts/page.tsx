'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Plus, UserPlus } from 'lucide-react';
import { useAuth } from '@/features/auth/components/auth-provider';
import hogwattsService from '@/services/hogwattsService';
import type {
  HogwattsHouse,
  HogwattsHouseName,
  HogwattsHouseTopMember,
  HogwattsMemberProfile,
  HogwattsSubmission,
  HogwattsTask
} from '@/types/hogwatts/hogwatts';
import type { MemberRoleEnum } from '@/types/member/member';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PageContainer from '@/components/layout/page-container';
import useMetadata from '@/hooks/use-metadata';

import { HouseRanking } from './house-ranking';
import { TaskList } from './task-list';
import { PendingSubmissions } from './pending-submissions';
import { SubmitTaskDialog } from './submit-task-dialog';
import { AssignMemberDialog } from './assign-member-dialog';
import { CreateTaskDialog } from './create-task-dialog';

const statusColors: Record<
  string,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  Pendente: 'default',
  Aprovado: 'secondary',
  Recusado: 'destructive'
};

const formatDate = (timestamp: any): string => {
  if (!timestamp?.toDate) return '-';
  return new Intl.DateTimeFormat('pt-BR').format(timestamp.toDate());
};

export default function HogwattsPage() {
  const { user } = useAuth();

  const [houses, setHouses] = useState<HogwattsHouse[]>([]);
  const [tasks, setTasks] = useState<HogwattsTask[]>([]);
  const [allSubmissions, setAllSubmissions] = useState<HogwattsSubmission[]>(
    []
  );
  const [pendingSubmissions, setPendingSubmissions] = useState<
    HogwattsSubmission[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitOpen, setIsSubmitOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [memberProfiles, setMemberProfiles] = useState<HogwattsMemberProfile[]>(
    []
  );
  const [memberRole, setMemberRole] = useState<MemberRoleEnum | null>(null);
  const [topMembers, setTopMembers] = useState<
    Record<HogwattsHouseName, HogwattsHouseTopMember[]>
  >({} as Record<HogwattsHouseName, HogwattsHouseTopMember[]>);

  const isCoordinator = memberRole
    ? hogwattsService.isCoordinator(memberRole)
    : false;

  useMetadata({ title: 'Hogwatts' });

  const loadData = useCallback(async () => {
    if (!user?.uid) return;
    setIsLoading(true);
    try {
      // Busca papel do membro primeiro para determinar visibilidade
      const role = await hogwattsService.getMemberRole(user.uid);
      setMemberRole(role);

      const resolvedRole = role ?? 'Consultor';

      const [rankingData, tasksData, historySubs, pendingSubs, profiles] =
        await Promise.all([
          hogwattsService.getRanking(),
          hogwattsService.getTasks(),
          hogwattsService.getHistorySubmissions(user.uid, resolvedRole),
          hogwattsService.isCoordinator(resolvedRole)
            ? hogwattsService.getPendingSubmissions()
            : Promise.resolve([]),
          hogwattsService.getMemberProfiles()
        ]);
      setHouses(rankingData.houses);
      setTopMembers(rankingData.topMembers);
      setTasks(tasksData);
      setAllSubmissions(historySubs);
      setPendingSubmissions(pendingSubs);
      setMemberProfiles(profiles);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Não foi possível carregar os dados do Hogwatts.';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <PageContainer
      scrollable
      isloading={isLoading}
      pageTitle='Hogwatts'
      pageDescription='Gamificação interna — Nexus, Lumina e Voltus'
      pageHeaderAction={
        <Button
          onClick={() => setIsSubmitOpen(true)}
          className='h-10 gap-2 sm:h-9'
          size='sm'
        >
          <Plus className='h-4 w-4' />
          <span className='xs:inline hidden'>Submeter tarefa</span>
          <span className='xs:hidden'>Submeter</span>
        </Button>
      }
    >
      <Tabs defaultValue='ranking' className='space-y-4'>
        <TabsList>
          <TabsTrigger value='ranking'>Ranking</TabsTrigger>
          <TabsTrigger value='tasks'>Tarefas</TabsTrigger>
          {isCoordinator && (
            <TabsTrigger value='pending'>
              Pendentes
              {pendingSubmissions.length > 0 && (
                <Badge
                  variant='destructive'
                  className='ml-2 h-5 px-1.5 text-xs'
                >
                  {pendingSubmissions.length}
                </Badge>
              )}
            </TabsTrigger>
          )}
          <TabsTrigger value='history'>Histórico</TabsTrigger>
          {isCoordinator && <TabsTrigger value='members'>Membros</TabsTrigger>}
        </TabsList>

        {/* ── Ranking ──────────────────────────────────────────────── */}
        <TabsContent value='ranking' className='space-y-4'>
          <HouseRanking houses={houses} topMembers={topMembers} />
        </TabsContent>

        {/* ── Tarefas ──────────────────────────────────────────────── */}
        <TabsContent value='tasks' className='space-y-4'>
          <TaskList
            tasks={tasks}
            isCoordinator={
              memberRole ? hogwattsService.isCoordinator(memberRole) : false
            }
            onCreateTask={() => setIsCreateTaskOpen(true)}
          />
        </TabsContent>

        {/* ── Pendentes (coordenação) ──────────────────────────────── */}
        {isCoordinator && (
          <TabsContent value='pending' className='space-y-4'>
            <PendingSubmissions
              submissions={pendingSubmissions}
              reviewerId={user?.uid || ''}
              onReviewed={loadData}
            />
          </TabsContent>
        )}

        {/* ── Histórico de todas as submissões ─────────────────────── */}
        <TabsContent value='history' className='space-y-4'>
          <Card className='overflow-hidden'>
            <CardHeader className='px-3 pt-3 pb-2 sm:px-6 sm:pt-6 sm:pb-3'>
              <CardTitle className='text-sm sm:text-base'>
                Histórico de Submissões
              </CardTitle>
              <CardDescription className='text-xs'>
                {allSubmissions.length} submissão(ões)
                {isCoordinator ? ' registrada(s)' : ' sua(s)'}
              </CardDescription>
            </CardHeader>

            {allSubmissions.length === 0 ? (
              <CardContent>
                <p className='text-muted-foreground py-6 text-center text-sm'>
                  Nenhuma submissão registrada ainda.
                </p>
              </CardContent>
            ) : (
              <>
                {/* Desktop */}
                <CardContent className='hidden p-0 sm:block md:p-6'>
                  <div className='overflow-x-auto'>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Membro</TableHead>
                          <TableHead>Casa</TableHead>
                          <TableHead>Tarefa</TableHead>
                          <TableHead className='text-right'>Pontos</TableHead>
                          <TableHead className='text-center'>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allSubmissions.map((sub) => (
                          <TableRow key={sub.id}>
                            <TableCell className='whitespace-nowrap'>
                              {formatDate(sub.createdAt)}
                            </TableCell>
                            <TableCell>{sub.memberName}</TableCell>
                            <TableCell>
                              <Badge variant='outline'>{sub.houseName}</Badge>
                            </TableCell>
                            <TableCell>{sub.taskName}</TableCell>
                            <TableCell className='text-right font-medium'>
                              {sub.taskPoints}
                            </TableCell>
                            <TableCell className='text-center'>
                              <Badge
                                variant={statusColors[sub.status] || 'default'}
                              >
                                {sub.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>

                {/* Mobile */}
                <CardContent className='block p-2 sm:hidden'>
                  <div className='space-y-2'>
                    {allSubmissions.map((sub) => (
                      <div
                        key={sub.id}
                        className='rounded-lg border p-3 transition-colors'
                      >
                        <div className='mb-1.5 flex items-start justify-between gap-2'>
                          <div className='min-w-0 flex-1'>
                            <h3 className='truncate text-sm leading-tight font-semibold'>
                              {sub.taskName}
                            </h3>
                            <p className='text-muted-foreground text-xs'>
                              {sub.memberName} • {sub.houseName}
                            </p>
                          </div>
                          <Badge
                            variant={statusColors[sub.status] || 'default'}
                            className='shrink-0 text-[10px]'
                          >
                            {sub.status}
                          </Badge>
                        </div>
                        <div className='flex items-center justify-between'>
                          <span className='text-muted-foreground text-[11px]'>
                            {formatDate(sub.createdAt)}
                          </span>
                          <span className='text-sm font-bold tabular-nums'>
                            {sub.taskPoints} pts
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </>
            )}
          </Card>
        </TabsContent>

        {/* ── Membros e suas casas ─────────────────────────────────── */}
        {isCoordinator && (
          <TabsContent value='members' className='space-y-4'>
            <Card className='overflow-hidden'>
              <CardHeader className='px-3 pt-3 pb-2 sm:px-6 sm:pt-6 sm:pb-3'>
                <div className='flex items-center justify-between'>
                  <div>
                    <CardTitle className='text-sm sm:text-base'>
                      Membros das Casas
                    </CardTitle>
                    <CardDescription className='text-xs'>
                      {memberProfiles.length} membro(s) atribuído(s)
                    </CardDescription>
                  </div>
                  <Button
                    onClick={() => setIsAssignOpen(true)}
                    size='sm'
                    className='h-8 gap-1'
                  >
                    <UserPlus className='h-4 w-4' />
                    <span className='hidden sm:inline'>Atribuir membro</span>
                    <span className='sm:hidden'>Atribuir</span>
                  </Button>
                </div>
              </CardHeader>

              {memberProfiles.length === 0 ? (
                <CardContent>
                  <p className='text-muted-foreground py-6 text-center text-sm'>
                    Nenhum membro atribuído a uma casa ainda.
                  </p>
                </CardContent>
              ) : (
                <>
                  {/* Desktop */}
                  <CardContent className='hidden p-0 sm:block md:p-6'>
                    <div className='overflow-x-auto'>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Membro</TableHead>
                            <TableHead>Casa</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {memberProfiles
                            .sort((a, b) =>
                              a.memberName.localeCompare(b.memberName)
                            )
                            .map((profile) => (
                              <TableRow key={profile.id}>
                                <TableCell>{profile.memberName}</TableCell>
                                <TableCell>
                                  <Badge variant='outline'>
                                    {profile.houseName}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>

                  {/* Mobile */}
                  <CardContent className='block p-2 sm:hidden'>
                    <div className='space-y-2'>
                      {memberProfiles.map((profile) => (
                        <div
                          key={profile.id}
                          className='flex items-center justify-between rounded-lg border p-3'
                        >
                          <span className='text-sm font-medium'>
                            {profile.memberName}
                          </span>
                          <Badge variant='outline'>{profile.houseName}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </>
              )}
            </Card>
          </TabsContent>
        )}
      </Tabs>

      <SubmitTaskDialog
        open={isSubmitOpen}
        onOpenChange={setIsSubmitOpen}
        memberId={user?.uid || ''}
        tasks={tasks}
        onSuccess={loadData}
      />
      <AssignMemberDialog
        open={isAssignOpen}
        onOpenChange={setIsAssignOpen}
        existingProfiles={memberProfiles}
        onSuccess={loadData}
      />
      <CreateTaskDialog
        open={isCreateTaskOpen}
        onOpenChange={setIsCreateTaskOpen}
        onSuccess={loadData}
      />
    </PageContainer>
  );
}
