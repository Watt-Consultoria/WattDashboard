'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  type WeekShedule,
  WEEK_DAYS,
  WEEK_DAY_LABELS,
  TIME_SLOTS,
  countAvailableHours,
  MIN_WEEKLY_AVAILABLE_HOURS
} from '@/types/member/member';

/* ─── Short day labels for compact mobile view ─── */
const WEEK_DAY_SHORT: Record<string, string> = {
  monday: 'Seg',
  tuesday: 'Ter',
  wednesday: 'Qua',
  thursday: 'Qui',
  friday: 'Sex',
  saturday: 'Sáb',
  sunday: 'Dom'
};

const SLOT_SHORT = TIME_SLOTS.map((s) => s.split('-')[0]);

type MemberAvailability = {
  id: string;
  name: string;
  sector?: string;
  weekSchedule?: WeekShedule;
};

type TeamAvailabilityViewProps = {
  members: MemberAvailability[];
  isLoading?: boolean;
};

export function TeamAvailabilityView({
  members,
  isLoading
}: TeamAvailabilityViewProps) {
  const [sectorFilter, setSectorFilter] = React.useState<string>('all');
  const [nameSearch, setNameSearch] = React.useState('');

  // Derive unique sector list
  const sectorOptions = React.useMemo(() => {
    const set = new Set<string>();
    members.forEach((m) => {
      if (m.sector) set.add(m.sector);
    });
    return Array.from(set).sort((a, b) =>
      a.localeCompare(b, 'pt-BR', { sensitivity: 'base' })
    );
  }, [members]);

  // Apply filters
  const filteredMembers = React.useMemo(() => {
    let result = members;
    if (sectorFilter !== 'all') {
      result = result.filter((m) => m.sector === sectorFilter);
    }
    if (nameSearch.trim()) {
      const term = nameSearch.trim().toLowerCase();
      result = result.filter((m) => m.name.toLowerCase().includes(term));
    }
    return result;
  }, [members, sectorFilter, nameSearch]);

  const membersWithSchedule = filteredMembers.filter((m) => m.weekSchedule);
  const membersWithoutSchedule = filteredMembers.filter((m) => !m.weekSchedule);

  // Compute slot availability heatmap: how many members available at each slot
  const heatmap = React.useMemo(() => {
    const map: Record<string, number[]> = {};
    for (const day of WEEK_DAYS) {
      map[day] = Array(14).fill(0);
      for (const member of membersWithSchedule) {
        if (!member.weekSchedule) continue;
        member.weekSchedule[day].forEach((slot, i) => {
          if (slot === 'D') map[day][i]++;
        });
      }
    }
    return map;
  }, [membersWithSchedule]);

  const totalMembers = membersWithSchedule.length;

  // Find best overlap time (most members available)
  const bestSlots = React.useMemo(() => {
    let max = 0;
    const slots: { day: string; slotIndex: number; count: number }[] = [];

    for (const day of WEEK_DAYS) {
      for (let i = 0; i < 14; i++) {
        const count = heatmap[day]?.[i] ?? 0;
        if (count > max) {
          max = count;
          slots.length = 0;
          slots.push({ day, slotIndex: i, count });
        } else if (count === max && max > 0) {
          slots.push({ day, slotIndex: i, count });
        }
      }
    }
    return { max, slots: slots.slice(0, 5) };
  }, [heatmap]);

  // Stats per member
  const memberStats = React.useMemo(() => {
    return membersWithSchedule.map((m) => ({
      ...m,
      totalHours: m.weekSchedule ? countAvailableHours(m.weekSchedule) : 0,
      meetsMinimum: m.weekSchedule
        ? countAvailableHours(m.weekSchedule) >= MIN_WEEKLY_AVAILABLE_HOURS
        : false
    }));
  }, [membersWithSchedule]);

  if (isLoading) {
    return (
      <div className='space-y-4'>
        <Card>
          <CardHeader className='pb-3'>
            <Skeleton className='h-5 w-48' />
            <Skeleton className='mt-1 h-3 w-72' />
          </CardHeader>
          <CardContent>
            <div className='space-y-3'>
              <div className='flex gap-3'>
                <Skeleton className='h-9 flex-1' />
                <Skeleton className='h-9 flex-1' />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='pb-3'>
            <Skeleton className='h-5 w-48' />
            <Skeleton className='mt-1 h-3 w-64' />
          </CardHeader>
          <CardContent>
            <div className='space-y-2'>
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className='space-y-1'>
                  <Skeleton className='h-3 w-16' />
                  <Skeleton className='h-1.5 w-full rounded-full' />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='pb-3'>
            <Skeleton className='h-5 w-48' />
          </CardHeader>
          <CardContent>
            <div className='space-y-2'>
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className='h-12 w-full rounded-lg' />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getHeatColor = (count: number) => {
    if (totalMembers === 0 || count === 0) return 'bg-muted';
    const ratio = count / totalMembers;
    if (ratio >= 0.75) return 'bg-emerald-500/40';
    if (ratio >= 0.5) return 'bg-emerald-500/25';
    if (ratio >= 0.25) return 'bg-amber-500/25';
    return 'bg-red-500/15';
  };

  const getHeatBorderColor = (count: number) => {
    if (totalMembers === 0 || count === 0) return 'border-border';
    const ratio = count / totalMembers;
    if (ratio >= 0.75) return 'border-emerald-500/30';
    if (ratio >= 0.5) return 'border-emerald-500/20';
    if (ratio >= 0.25) return 'border-amber-500/20';
    return 'border-red-500/20';
  };

  /* ─────── Mobile heatmap: card per day ─────── */
  const MobileHeatmap = () => (
    <div className='space-y-1.5 md:hidden'>
      {WEEK_DAYS.map((day) => {
        const dayTotal = (heatmap[day] ?? []).reduce((s, c) => s + c, 0);
        const maxPossible = 14 * totalMembers;
        const dayRatio = maxPossible > 0 ? dayTotal / maxPossible : 0;
        return (
          <div key={day} className='rounded-lg border p-2.5'>
            <div className='mb-1.5 flex items-center justify-between'>
              <span className='text-xs font-semibold'>
                {WEEK_DAY_LABELS[day]}
              </span>
              <span className='text-muted-foreground text-[10px]'>
                {Math.round(dayRatio * 100)}% média
              </span>
            </div>
            <div className='flex gap-0.5'>
              {(heatmap[day] ?? []).map((count, i) => (
                <div
                  key={`m-${day}-${i}`}
                  className={`h-5 flex-1 rounded-sm ${getHeatColor(count)}`}
                  title={`${SLOT_SHORT[i]}h: ${count}/${totalMembers}`}
                />
              ))}
            </div>
            <div className='mt-0.5 flex justify-between'>
              <span className='text-muted-foreground text-[8px]'>08h</span>
              <span className='text-muted-foreground text-[8px]'>15h</span>
              <span className='text-muted-foreground text-[8px]'>22h</span>
            </div>
          </div>
        );
      })}
    </div>
  );

  /* ─────── Desktop heatmap: full grid ─────── */
  const DesktopHeatmap = () => (
    <div className='hidden md:block'>
      <ScrollArea className='w-full'>
        <div className='min-w-175'>
          {/* Header */}
          <div className='mb-1 grid grid-cols-[90px_repeat(14,1fr)] gap-0.5'>
            <div />
            {TIME_SLOTS.map((slot) => (
              <div
                key={slot}
                className='text-muted-foreground px-0.5 text-center text-[10px] font-medium'
              >
                {slot}
              </div>
            ))}
          </div>

          {/* Day rows */}
          {WEEK_DAYS.map((day) => (
            <div
              key={day}
              className='mb-0.5 grid grid-cols-[90px_repeat(14,1fr)] gap-0.5'
            >
              <div className='flex items-center'>
                <span className='text-xs font-medium'>
                  {WEEK_DAY_LABELS[day]}
                </span>
              </div>
              {(heatmap[day] ?? []).map((count, slotIndex) => (
                <div
                  key={`${day}-${slotIndex}`}
                  className={`flex h-8 items-center justify-center rounded-sm border ${getHeatColor(count)} ${getHeatBorderColor(count)}`}
                  title={`${WEEK_DAY_LABELS[day]} ${TIME_SLOTS[slotIndex]}: ${count}/${totalMembers} disponíveis`}
                >
                  <span className='text-muted-foreground text-[9px] font-medium'>
                    {count > 0 ? count : ''}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
        <ScrollBar orientation='horizontal' />
      </ScrollArea>
    </div>
  );

  /* ─────── Mobile individual schedule: mini bars ─────── */
  const MobileMemberSchedule = ({
    weekSchedule
  }: {
    weekSchedule: WeekShedule;
  }) => (
    <div className='space-y-1 md:hidden'>
      {WEEK_DAYS.map((day) => (
        <div key={day} className='flex items-center gap-2'>
          <span className='text-muted-foreground w-7 shrink-0 text-[10px] font-medium'>
            {WEEK_DAY_SHORT[day]}
          </span>
          <div className='flex flex-1 gap-0.5'>
            {weekSchedule[day].map((value, i) => (
              <div
                key={`${day}-${i}`}
                className={`h-3 flex-1 rounded-sm ${
                  value === 'D' ? 'bg-emerald-500/30' : 'bg-muted'
                }`}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  /* ─────── Desktop individual schedule: full grid ─────── */
  const DesktopMemberSchedule = ({
    weekSchedule
  }: {
    weekSchedule: WeekShedule;
  }) => (
    <div className='hidden md:block'>
      <ScrollArea className='w-full'>
        <div className='min-w-150'>
          <div className='mb-1 grid grid-cols-[80px_repeat(14,1fr)] gap-0.5'>
            <div />
            {TIME_SLOTS.map((slot) => (
              <div
                key={slot}
                className='text-muted-foreground text-center text-[9px] font-medium'
              >
                {slot}
              </div>
            ))}
          </div>
          {WEEK_DAYS.map((day) => (
            <div
              key={day}
              className='mb-0.5 grid grid-cols-[80px_repeat(14,1fr)] gap-0.5'
            >
              <div className='flex items-center'>
                <span className='text-[10px] font-medium'>
                  {WEEK_DAY_LABELS[day]}
                </span>
              </div>
              {weekSchedule[day].map((value, idx) => (
                <div
                  key={`${day}-${idx}`}
                  className={`h-6 rounded-sm border ${
                    value === 'D'
                      ? 'border-emerald-500/40 bg-emerald-500/20'
                      : 'bg-muted border-border'
                  }`}
                />
              ))}
            </div>
          ))}
        </div>
        <ScrollBar orientation='horizontal' />
      </ScrollArea>
    </div>
  );

  return (
    <div className='space-y-4'>
      {/* Filters */}
      <Card>
        <CardHeader className='pb-2'>
          <div className='flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between'>
            <CardTitle className='text-base sm:text-lg'>Filtros</CardTitle>
            <Badge variant='secondary' className='w-fit text-[10px]'>
              {filteredMembers.length} de {members.length} membros
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className='flex flex-col gap-2.5 sm:flex-row'>
            <div className='flex-1'>
              <Select value={sectorFilter} onValueChange={setSectorFilter}>
                <SelectTrigger className='h-10 sm:h-9'>
                  <SelectValue placeholder='Todos os setores' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>Todos os setores</SelectItem>
                  {sectorOptions.map((sector) => (
                    <SelectItem key={sector} value={sector}>
                      {sector}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className='flex-1'>
              <Input
                placeholder='Buscar por nome...'
                value={nameSearch}
                onChange={(e) => setNameSearch(e.target.value)}
                className='h-10 sm:h-9'
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Heatmap */}
      <Card>
        <CardHeader className='pb-2'>
          <div className='flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between'>
            <div>
              <CardTitle className='text-base sm:text-lg'>
                Disponibilidade da Equipe
              </CardTitle>
              <CardDescription className='text-[10px] sm:text-xs'>
                {membersWithSchedule.length} membros com horário configurado
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className='space-y-3'>
            {/* Legend */}
            <div className='flex flex-wrap items-center gap-2 text-[10px] sm:gap-3 sm:text-xs'>
              <div className='flex items-center gap-1'>
                <div className='h-2.5 w-2.5 rounded bg-emerald-500/40 sm:h-3 sm:w-3' />
                <span>75%+</span>
              </div>
              <div className='flex items-center gap-1'>
                <div className='h-2.5 w-2.5 rounded bg-emerald-500/25 sm:h-3 sm:w-3' />
                <span>50%+</span>
              </div>
              <div className='flex items-center gap-1'>
                <div className='h-2.5 w-2.5 rounded bg-amber-500/25 sm:h-3 sm:w-3' />
                <span>25%+</span>
              </div>
              <div className='flex items-center gap-1'>
                <div className='h-2.5 w-2.5 rounded bg-red-500/15 sm:h-3 sm:w-3' />
                <span>&lt;25%</span>
              </div>
              <div className='flex items-center gap-1'>
                <div className='bg-muted h-2.5 w-2.5 rounded border sm:h-3 sm:w-3' />
                <span>0</span>
              </div>
            </div>

            {/* Mobile heatmap */}
            <MobileHeatmap />

            {/* Desktop heatmap */}
            <DesktopHeatmap />

            {/* Best overlap */}
            {bestSlots.max > 0 && (
              <div className='rounded-lg border bg-emerald-500/5 p-2.5 sm:p-3'>
                <div className='mb-1.5 text-[10px] font-medium sm:text-xs'>
                  Melhores horários ({bestSlots.max}/{totalMembers} membros):
                </div>
                <div className='flex flex-wrap gap-1'>
                  {bestSlots.slots.map((s) => (
                    <Badge
                      key={`${s.day}-${s.slotIndex}`}
                      variant='secondary'
                      className='text-[9px] sm:text-[10px]'
                    >
                      {WEEK_DAY_SHORT[s.day]} {TIME_SLOTS[s.slotIndex]}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Per-member stats */}
      <Card>
        <CardHeader className='pb-2'>
          <CardTitle className='text-base sm:text-lg'>
            Disponibilidade por Membro
          </CardTitle>
          <CardDescription className='text-[10px] sm:text-xs'>
            Mínimo requerido: {MIN_WEEKLY_AVAILABLE_HOURS}h semanais
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='space-y-2'>
            {memberStats.length === 0 &&
              membersWithoutSchedule.length === 0 && (
                <div className='text-muted-foreground py-6 text-center text-sm'>
                  Nenhum membro encontrado.
                </div>
              )}

            {memberStats.map((member) => {
              const progressPct = Math.min(
                (member.totalHours / MIN_WEEKLY_AVAILABLE_HOURS) * 100,
                100
              );
              return (
                <div key={member.id} className='rounded-lg border p-2.5 sm:p-3'>
                  <div className='flex items-center justify-between'>
                    <div className='flex min-w-0 flex-col'>
                      <span className='truncate text-xs font-medium sm:text-sm'>
                        {member.name}
                      </span>
                      {member.sector && (
                        <span className='text-muted-foreground text-[10px]'>
                          {member.sector}
                        </span>
                      )}
                    </div>
                    <div className='flex shrink-0 items-center gap-1.5'>
                      <span className='text-xs font-semibold sm:text-sm'>
                        {member.totalHours}h
                      </span>
                      <Badge
                        className={`text-[9px] sm:text-[10px] ${
                          member.meetsMinimum
                            ? 'bg-emerald-500/10 text-emerald-700'
                            : 'bg-red-500/10 text-red-700'
                        }`}
                      >
                        {member.meetsMinimum
                          ? 'OK'
                          : `-${MIN_WEEKLY_AVAILABLE_HOURS - member.totalHours}h`}
                      </Badge>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className='mt-1.5'>
                    <div className='bg-muted h-1.5 w-full overflow-hidden rounded-full'>
                      <div
                        className={`h-full rounded-full transition-all ${
                          member.meetsMinimum ? 'bg-emerald-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}

            {membersWithoutSchedule.length > 0 && (
              <div className='mt-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5 sm:p-3'>
                <div className='mb-1.5 text-[10px] font-medium text-amber-700 sm:text-xs'>
                  Sem horário configurado ({membersWithoutSchedule.length}):
                </div>
                <div className='flex flex-wrap gap-1'>
                  {membersWithoutSchedule.map((m) => (
                    <Badge
                      key={m.id}
                      variant='outline'
                      className='text-[9px] sm:text-[10px]'
                    >
                      {m.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Individual member schedules */}
      {memberStats.length > 0 && (
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-base sm:text-lg'>
              Rotina Individual
            </CardTitle>
            <CardDescription className='text-[10px] sm:text-xs'>
              Disponibilidade semanal de cada membro
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className='space-y-2'>
              {memberStats.map((member) => (
                <details key={member.id} className='group rounded-lg border'>
                  <summary className='flex cursor-pointer items-center justify-between px-3 py-2.5'>
                    <div className='flex min-w-0 items-center gap-2'>
                      <span className='truncate text-xs font-medium sm:text-sm'>
                        {member.name}
                      </span>
                      {member.sector && (
                        <Badge
                          variant='secondary'
                          className='hidden text-[9px] sm:inline-flex sm:text-[10px]'
                        >
                          {member.sector}
                        </Badge>
                      )}
                    </div>
                    <div className='flex shrink-0 items-center gap-1.5'>
                      <Badge
                        className={`text-[9px] sm:text-[10px] ${
                          member.meetsMinimum
                            ? 'bg-emerald-500/10 text-emerald-700'
                            : 'bg-red-500/10 text-red-700'
                        }`}
                      >
                        {member.totalHours}h/sem
                      </Badge>
                      <svg
                        className='text-muted-foreground h-3.5 w-3.5 transition-transform group-open:rotate-180'
                        fill='none'
                        viewBox='0 0 24 24'
                        stroke='currentColor'
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          d='M19 9l-7 7-7-7'
                        />
                      </svg>
                    </div>
                  </summary>
                  <div className='border-t px-3 py-2.5'>
                    {member.weekSchedule && (
                      <>
                        <MobileMemberSchedule
                          weekSchedule={member.weekSchedule}
                        />
                        <DesktopMemberSchedule
                          weekSchedule={member.weekSchedule}
                        />
                      </>
                    )}
                  </div>
                </details>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
