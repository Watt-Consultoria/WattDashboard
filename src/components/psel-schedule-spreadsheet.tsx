'use client';
// v4

import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { InterviewSlot } from '@/types/interview/interview';

/* ─── Weekday helpers ─── */
const WEEKDAY_LONG: Record<number, string> = {
  0: 'Domingo',
  1: 'Segunda-feira',
  2: 'Terça-feira',
  3: 'Quarta-feira',
  4: 'Quinta-feira',
  5: 'Sexta-feira',
  6: 'Sábado'
};

const WEEKDAY_SHORT: Record<number, string> = {
  0: 'Dom',
  1: 'Seg',
  2: 'Ter',
  3: 'Qua',
  4: 'Qui',
  5: 'Sex',
  6: 'Sáb'
};

function parseIso(isoDate: string): Date {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** All 14 one-hour columns – always 08 h → 22 h */
const ALL_HOURS = Array.from({ length: 14 }, (_, i) => {
  const h = i + 8;
  return {
    start: `${String(h).padStart(2, '0')}:00`,
    end: `${String(h + 1).padStart(2, '0')}:00`,
    label: `${h}h–${h + 1}h`,
    shortLabel: `${h}h`
  };
});

/* ─── Types ─── */
export type ResponsibleMember = { id: string; name: string };

type Props = {
  slots: InterviewSlot[];
  currentMemberId?: string;
  currentMemberName?: string;
  pselMembers: ResponsibleMember[];
  onAddSlot?: (slot: {
    isoDate: string;
    startTime: string;
    endTime: string;
    responsibleMemberId: string;
    responsibleMemberName: string;
  }) => Promise<void>;
  onRemoveSlot?: (slotId: string) => Promise<void>;
  isLoading?: boolean;
};

/* ═══════════════════════════════════════════════════════════════
   Utilities
   ═══════════════════════════════════════════════════════════════ */

/**
 * Gera um intervalo de datas do início ao fim (inclusivo).
 */
function generateDateRange(startIso: string, endIso: string): string[] {
  const dates: string[] = [];
  const start = parseIso(startIso);
  const end = parseIso(endIso);

  const current = new Date(start);
  while (current <= end) {
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, '0');
    const day = String(current.getDate()).padStart(2, '0');
    dates.push(`${year}-${month}-${day}`);
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

/**
 * Extrai todas as datas dos slots e garante que o intervalo
 * se estenda até pelo menos 13/02/2026.
 */
function extractDates(slots: InterviewSlot[]): string[] {
  const minEndDate = '2026-02-13'; // 13/02/2026

  if (slots.length === 0) {
    // Se não há slots, começa de hoje até a data mínima
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startIso = today.toISOString().split('T')[0];
    return generateDateRange(startIso, minEndDate);
  }

  const slotDates = slots.map((s) => s.isoDate);
  const uniqueDates = Array.from(new Set(slotDates)).sort();

  const firstDate = uniqueDates[0];
  const lastSlotDate = uniqueDates[uniqueDates.length - 1];

  // Garante que mostramos até pelo menos 13/02/2026
  const effectiveEndDate =
    lastSlotDate > minEndDate ? lastSlotDate : minEndDate;

  return generateDateRange(firstDate, effectiveEndDate);
}

function hasSlotAt(
  slots: InterviewSlot[],
  memberId: string,
  isoDate: string,
  hourStart: string,
  hourEnd: string
): InterviewSlot | undefined {
  return slots.find(
    (s) =>
      s.responsibleMemberId === memberId &&
      s.isoDate === isoDate &&
      s.startTime <= hourStart &&
      s.endTime >= hourEnd
  );
}

function formatDateFull(isoDate: string): string {
  const d = parseIso(isoDate);
  return `${WEEKDAY_LONG[d.getDay()]} ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function formatDateMedium(isoDate: string): string {
  const d = parseIso(isoDate);
  return `${WEEKDAY_SHORT[d.getDay()]} ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/* ── inline SVG icons ── */
const ChevronLeft = () => (
  <svg
    className='h-4 w-4'
    fill='none'
    viewBox='0 0 24 24'
    stroke='currentColor'
    strokeWidth={2}
  >
    <path strokeLinecap='round' strokeLinejoin='round' d='M15 19l-7-7 7-7' />
  </svg>
);
const ChevronRight = () => (
  <svg
    className='h-4 w-4'
    fill='none'
    viewBox='0 0 24 24'
    stroke='currentColor'
    strokeWidth={2}
  >
    <path strokeLinecap='round' strokeLinejoin='round' d='M9 5l7 7-7 7' />
  </svg>
);
const ChevronDown = ({ className }: { className?: string }) => (
  <svg
    className={cn('h-4 w-4', className)}
    fill='none'
    viewBox='0 0 24 24'
    stroke='currentColor'
    strokeWidth={2}
  >
    <path strokeLinecap='round' strokeLinejoin='round' d='M19 9l-7 7-7-7' />
  </svg>
);

/* ═══════════════════════════════════════════════════════════════
   Day-selector bar (shared between mobile & tablet)
   ═══════════════════════════════════════════════════════════════ */
function DaySelector({
  dates,
  selectedIdx,
  onChange
}: {
  dates: string[];
  selectedIdx: number;
  onChange: (idx: number) => void;
}) {
  const value = dates[selectedIdx] ?? dates[0];
  return (
    <div className='flex items-center gap-2 sm:gap-3'>
      <Button
        variant='outline'
        size='icon'
        className='border-border/60 h-8 w-8 shrink-0 rounded-full shadow-sm transition-all hover:shadow-md'
        disabled={selectedIdx === 0}
        onClick={() => onChange(Math.max(0, selectedIdx - 1))}
      >
        <ChevronLeft />
      </Button>

      <Select
        value={value}
        onValueChange={(v) => {
          const i = dates.indexOf(v);
          if (i >= 0) onChange(i);
        }}
      >
        <SelectTrigger className='border-border/60 h-8 min-w-0 flex-1 text-xs font-medium shadow-sm sm:text-sm'>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {dates.map((d) => (
            <SelectItem key={d} value={d}>
              {formatDateFull(d)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        variant='outline'
        size='icon'
        className='border-border/60 h-8 w-8 shrink-0 rounded-full shadow-sm transition-all hover:shadow-md'
        disabled={selectedIdx === dates.length - 1}
        onClick={() => onChange(Math.min(dates.length - 1, selectedIdx + 1))}
      >
        <ChevronRight />
      </Button>

      <Badge
        variant='secondary'
        className='bg-muted/80 text-muted-foreground shrink-0 px-2 text-[10px] tabular-nums'
      >
        {selectedIdx + 1}/{dates.length}
      </Badge>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Cell component – avoids re-creating inline handlers
   ═══════════════════════════════════════════════════════════════ */
const SlotCell = React.memo(function SlotCell({
  has,
  editable,
  isPending,
  title,
  onClick,
  compact
}: {
  has: boolean;
  editable: boolean;
  isPending: boolean;
  title: string;
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <td
      className={cn(
        'border-r border-b border-white/10 transition-all select-none dark:border-black/20',
        compact ? 'h-6 min-w-5' : 'h-9 min-w-9',
        has
          ? 'bg-emerald-500/95 dark:bg-emerald-600/90'
          : 'bg-red-500/80 dark:bg-red-600/75',
        editable &&
          !isPending &&
          'cursor-pointer hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.15)] hover:brightness-105 active:brightness-95',
        isPending && 'animate-pulse opacity-50'
      )}
      onClick={editable && !isPending ? onClick : undefined}
      title={title}
    />
  );
});

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export function PselScheduleSpreadsheet({
  slots,
  currentMemberId,
  currentMemberName,
  pselMembers,
  onAddSlot,
  onRemoveSlot,
  isLoading
}: Props) {
  /* ─── Derived data ─── */
  const dates = React.useMemo(() => extractDates(slots), [slots]);

  const allMembers = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const m of pselMembers) map.set(m.id, m.name);
    for (const s of slots) {
      if (!map.has(s.responsibleMemberId))
        map.set(s.responsibleMemberId, s.responsibleMemberName);
    }
    const arr = Array.from(map.entries()).map(([id, name]) => ({ id, name }));
    arr.sort((a, b) => {
      if (a.id === currentMemberId) return -1;
      if (b.id === currentMemberId) return 1;
      return a.name.localeCompare(b.name);
    });
    return arr;
  }, [slots, pselMembers, currentMemberId]);

  /** Desktop column list: every date × all 14 hours */
  const allColumns = React.useMemo(() => {
    const cols: {
      isoDate: string;
      hourIdx: number;
      hour: (typeof ALL_HOURS)[number];
    }[] = [];
    for (const date of dates) {
      for (let i = 0; i < ALL_HOURS.length; i++) {
        cols.push({ isoDate: date, hourIdx: i, hour: ALL_HOURS[i] });
      }
    }
    return cols;
  }, [dates]);

  /* ─── Day selector state (shared mobile + tablet) ─── */
  const [selectedDateIdx, setSelectedDateIdx] = React.useState(0);
  React.useEffect(() => setSelectedDateIdx(0), [dates.length]);
  const selectedDate = dates[selectedDateIdx] ?? dates[0];

  /* ─── Mobile expanded member ─── */
  const [expandedMemberId, setExpandedMemberId] = React.useState<string | null>(
    null
  );

  /* ─── Pending action feedback ─── */
  const [pendingAction, setPendingAction] = React.useState<string | null>(null);

  const isEditable = (mid: string) =>
    mid === currentMemberId && !!onAddSlot && !!onRemoveSlot;

  const toggleSlot = React.useCallback(
    async (
      memberId: string,
      isoDate: string,
      hourStart: string,
      hourEnd: string
    ) => {
      if (memberId !== currentMemberId || !onAddSlot || !onRemoveSlot) return;
      const existing = hasSlotAt(slots, memberId, isoDate, hourStart, hourEnd);
      const key = `${memberId}-${isoDate}-${hourStart}`;
      setPendingAction(key);
      try {
        if (existing) {
          await onRemoveSlot(existing.id);
        } else {
          await onAddSlot({
            isoDate,
            startTime: hourStart,
            endTime: hourEnd,
            responsibleMemberId: memberId,
            responsibleMemberName: currentMemberName ?? ''
          });
        }
      } finally {
        setPendingAction(null);
      }
    },
    [slots, currentMemberId, currentMemberName, onAddSlot, onRemoveSlot]
  );

  /* ═══════ LOADING / EMPTY ═══════ */
  if (isLoading) {
    return (
      <div className='flex h-full flex-col items-center justify-center gap-3'>
        <div className='border-primary/30 border-t-primary h-8 w-8 animate-spin rounded-full border-2' />
        <p className='text-muted-foreground text-sm'>
          Carregando horários de entrevista…
        </p>
      </div>
    );
  }
  if (dates.length === 0) {
    return (
      <div className='flex h-full flex-col items-center justify-center gap-3 px-4'>
        <div className='bg-muted/50 flex h-14 w-14 items-center justify-center rounded-2xl'>
          <svg
            className='text-muted-foreground/60 h-7 w-7'
            fill='none'
            viewBox='0 0 24 24'
            stroke='currentColor'
            strokeWidth={1.5}
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              d='M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5'
            />
          </svg>
        </div>
        <p className='text-muted-foreground text-center text-sm'>
          Nenhum horário de entrevista cadastrado neste formulário.
          <br />
          <span className='text-xs opacity-75'>
            Adicione horários usando o botão &quot;Horários de entrevista&quot;.
          </span>
        </p>
      </div>
    );
  }

  /* ─── Desktop date groups (14 cols each) ─── */
  const dateGroups = dates.map((d) => ({
    isoDate: d,
    label: formatDateFull(d),
    shortLabel: formatDateMedium(d),
    count: ALL_HOURS.length
  }));

  /* ═══════════════════════════════════════════════════════════════
     MOBILE – card per member, one day at a time (<md)
     ═══════════════════════════════════════════════════════════════ */
  const MobileLayout = () => (
    <div className='flex h-full flex-col md:hidden'>
      {/* Day selector */}
      <div className='bg-background/95 sticky top-0 z-10 shrink-0 border-b pb-2.5 backdrop-blur-sm'>
        <DaySelector
          dates={dates}
          selectedIdx={selectedDateIdx}
          onChange={setSelectedDateIdx}
        />
      </div>

      {/* Native scroll container – fills remaining height */}
      <div className='mt-3 min-h-0 flex-1 overflow-y-auto'>
        <div className='space-y-2.5 pb-6'>
          {allMembers.map((member) => {
            const editable = isEditable(member.id);
            const daySlotCount = slots.filter(
              (s) =>
                s.responsibleMemberId === member.id &&
                s.isoDate === selectedDate
            ).length;
            const isOpen = expandedMemberId === member.id;
            const fillRatio = daySlotCount / ALL_HOURS.length;

            return (
              <div
                key={member.id}
                className={cn(
                  'bg-card overflow-hidden rounded-xl border shadow-sm transition-all duration-200',
                  editable
                    ? 'border-primary/40 shadow-primary/10 ring-primary/20 shadow-md ring-1'
                    : 'border-border/60',
                  isOpen && 'shadow-md'
                )}
              >
                {/* header */}
                <button
                  type='button'
                  className={cn(
                    'flex w-full items-center gap-2.5 px-4 py-3 text-left transition-colors',
                    editable
                      ? 'bg-primary/5 hover:bg-primary/10'
                      : 'bg-muted/20 hover:bg-muted/40'
                  )}
                  onClick={() => setExpandedMemberId(isOpen ? null : member.id)}
                >
                  {/* avatar circle */}
                  <span
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold shadow-sm',
                      editable
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {member.name.charAt(0).toUpperCase()}
                  </span>

                  <div className='min-w-0 flex-1'>
                    <div className='flex items-center gap-1.5'>
                      <span className='truncate text-sm leading-tight font-semibold'>
                        {member.name}
                      </span>
                      {editable && (
                        <Badge
                          variant='outline'
                          className='border-primary/40 text-primary shrink-0 px-1.5 py-0 text-[9px]'
                        >
                          Você
                        </Badge>
                      )}
                    </div>
                    {/* mini progress bar */}
                    <div className='bg-muted/60 mt-1.5 h-1 w-full overflow-hidden rounded-full'>
                      <div
                        className={cn(
                          'h-full rounded-full transition-all duration-500',
                          fillRatio > 0.6
                            ? 'bg-emerald-500'
                            : fillRatio > 0.3
                              ? 'bg-amber-400'
                              : 'bg-red-400'
                        )}
                        style={{ width: `${fillRatio * 100}%` }}
                      />
                    </div>
                  </div>

                  <Badge
                    variant='secondary'
                    className='bg-muted/80 text-muted-foreground ml-1 shrink-0 text-[10px] tabular-nums'
                  >
                    {daySlotCount}/{ALL_HOURS.length}
                  </Badge>
                  <ChevronDown
                    className={cn(
                      'text-muted-foreground/60 shrink-0 transition-transform duration-200',
                      isOpen && 'rotate-180'
                    )}
                  />
                </button>

                {/* mini bar – always visible */}
                <div className='flex gap-0.5 px-4 pt-1.5 pb-2.5'>
                  {ALL_HOURS.map((hour) => {
                    const has = !!hasSlotAt(
                      slots,
                      member.id,
                      selectedDate,
                      hour.start,
                      hour.end
                    );
                    return (
                      <div
                        key={hour.start}
                        className={cn(
                          'h-1.5 flex-1 rounded-full transition-colors',
                          has
                            ? 'bg-emerald-500'
                            : 'bg-muted/50 dark:bg-muted/30'
                        )}
                      />
                    );
                  })}
                </div>

                {/* expanded grid */}
                {isOpen && (
                  <div className='bg-muted/10 border-t px-4 py-4'>
                    {/* Horizontal scroll for the hour buttons */}
                    <div className='overflow-x-auto'>
                      <div
                        className='flex gap-1.5'
                        style={{ minWidth: 'max-content' }}
                      >
                        {ALL_HOURS.map((hour) => {
                          const existing = hasSlotAt(
                            slots,
                            member.id,
                            selectedDate,
                            hour.start,
                            hour.end
                          );
                          const has = !!existing;
                          const key = `${member.id}-${selectedDate}-${hour.start}`;
                          const pending = pendingAction === key;

                          return (
                            <button
                              key={hour.start}
                              type='button'
                              disabled={!editable || pending}
                              className={cn(
                                'flex h-12 w-11 shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg border text-xs font-medium transition-all duration-150',
                                has
                                  ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/25 dark:text-emerald-300'
                                  : 'border-border/40 bg-background/80 text-muted-foreground',
                                editable &&
                                  !pending &&
                                  'cursor-pointer hover:-translate-y-px hover:shadow-sm active:translate-y-0',
                                !editable && 'cursor-default opacity-60',
                                pending && 'animate-pulse opacity-40'
                              )}
                              onClick={() =>
                                toggleSlot(
                                  member.id,
                                  selectedDate,
                                  hour.start,
                                  hour.end
                                )
                              }
                            >
                              <span className='font-semibold'>
                                {hour.shortLabel}
                              </span>
                              <span
                                className={cn(
                                  'text-[10px]',
                                  has
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-muted-foreground/60'
                                )}
                              >
                                {has ? '✓' : '–'}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    {editable && (
                      <p className='text-muted-foreground mt-3 text-center text-[10px]'>
                        Deslize para ver todos os horários · Toque para editar
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  /* ═══════════════════════════════════════════════════════════════
     TABLET – table, one day at a time  (md → lg)
     ═══════════════════════════════════════════════════════════════ */
  const TabletLayout = () => (
    <div className='hidden h-full flex-col md:flex lg:hidden'>
      <div className='bg-background/95 border-b pb-2.5 backdrop-blur-sm'>
        <DaySelector
          dates={dates}
          selectedIdx={selectedDateIdx}
          onChange={setSelectedDateIdx}
        />
      </div>

      <ScrollArea className='mt-3 flex-1'>
        {/* NOTE: no overflow-hidden on this wrapper – it would break sticky columns */}
        <div className='border-border/60 min-w-max rounded-xl border shadow-sm'>
          <table className='w-full border-separate border-spacing-0 text-xs'>
            <thead>
              <tr>
                <th className='border-border/60 bg-muted text-muted-foreground relative sticky left-0 isolate z-30 min-w-36 border-r border-b px-3 py-2.5 text-left text-xs font-semibold shadow-[3px_0_8px_-4px_rgba(0,0,0,0.24)]'>
                  Entrevistador
                </th>
                {ALL_HOURS.map((h) => (
                  <th
                    key={h.start}
                    className='border-primary/40 bg-primary text-primary-foreground border-r border-b px-0 py-2 text-center text-[11px] font-semibold last:border-r-0'
                    style={{ minWidth: '2.5rem' }}
                  >
                    {h.shortLabel}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allMembers.map((member, mIdx) => {
                const editable = isEditable(member.id);
                return (
                  <tr
                    key={member.id}
                    className={cn(
                      'transition-colors',
                      mIdx % 2 === 0 ? 'bg-background' : 'bg-muted/20'
                    )}
                  >
                    <td
                      className={cn(
                        'border-border/40 relative sticky left-0 isolate z-20 min-w-36 border-r border-b px-3 py-2 font-medium whitespace-nowrap shadow-[3px_0_8px_-4px_rgba(0,0,0,0.24)]',
                        editable && 'text-primary font-semibold'
                      )}
                      style={{
                        backgroundColor:
                          mIdx % 2 === 0
                            ? 'hsl(var(--background))'
                            : 'hsl(var(--muted))'
                      }}
                    >
                      {editable && (
                        <div
                          aria-hidden
                          className='bg-primary/12 pointer-events-none absolute inset-0'
                        />
                      )}
                      <div className='relative z-[1] flex items-center gap-2'>
                        <span
                          className={cn(
                            'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-bold shadow-sm',
                            editable
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground'
                          )}
                        >
                          {member.name.charAt(0)}
                        </span>
                        <span className='truncate'>{member.name}</span>
                        {editable && (
                          <span className='text-muted-foreground text-[8px]'>
                            (você)
                          </span>
                        )}
                      </div>
                    </td>
                    {ALL_HOURS.map((hour) => {
                      const existing = hasSlotAt(
                        slots,
                        member.id,
                        selectedDate,
                        hour.start,
                        hour.end
                      );
                      const has = !!existing;
                      const actionKey = `${member.id}-${selectedDate}-${hour.start}`;
                      const pending = pendingAction === actionKey;

                      return (
                        <SlotCell
                          key={hour.start}
                          has={has}
                          editable={editable}
                          isPending={pending}
                          onClick={() =>
                            toggleSlot(
                              member.id,
                              selectedDate,
                              hour.start,
                              hour.end
                            )
                          }
                          title={`${member.name} – ${hour.label} – ${has ? 'Tem entrevista' : 'Sem entrevista'}`}
                        />
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <ScrollBar orientation='horizontal' />
      </ScrollArea>
    </div>
  );

  /* ═══════════════════════════════════════════════════════════════
     DESKTOP – full grid, all dates × all hours  (≥lg)
     ═══════════════════════════════════════════════════════════════ */
  const DesktopLayout = () => (
    <div className='hidden h-full lg:block'>
      <ScrollArea className='h-full w-full'>
        {/* NOTE: no overflow-hidden on this wrapper – it would break sticky columns */}
        <div className='border-border/60 min-w-max rounded-xl border shadow-sm'>
          <table className='w-full border-separate border-spacing-0 text-xs'>
            <thead>
              {/* Date header */}
              <tr>
                <th
                  rowSpan={2}
                  className='border-border bg-muted text-muted-foreground relative sticky left-0 isolate z-40 min-w-44 border-r border-b px-3 py-2.5 text-left text-xs font-semibold shadow-[3px_0_8px_-4px_rgba(0,0,0,0.24)]'
                >
                  Entrevistador
                </th>
                {dateGroups.map((g, gi) => (
                  <th
                    key={g.isoDate}
                    colSpan={g.count}
                    className={cn(
                      'border-primary/30 text-primary-foreground border-r border-b px-1 py-1.5 text-center text-[11px] font-semibold last:border-r-0',
                      gi % 2 === 0 ? 'bg-primary' : 'bg-primary/80'
                    )}
                  >
                    {g.label}
                  </th>
                ))}
              </tr>
              {/* Hour sub-header */}
              <tr>
                {allColumns.map((col, ci) => {
                  const isFirstOfDate =
                    ci === 0 || allColumns[ci - 1].isoDate !== col.isoDate;
                  return (
                    <th
                      key={`${col.isoDate}-${col.hourIdx}`}
                      className={cn(
                        'border-primary/20 text-primary-foreground border-r border-b px-0 py-0.5 text-center font-normal whitespace-nowrap last:border-r-0',
                        isFirstOfDate ? 'bg-primary/75' : 'bg-primary/65'
                      )}
                      style={{
                        fontSize: '0.5rem',
                        writingMode: 'vertical-rl',
                        minWidth: '1.25rem'
                      }}
                    >
                      {col.hour.label}
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody>
              {allMembers.map((member, mIdx) => {
                const editable = isEditable(member.id);
                return (
                  <tr
                    key={member.id}
                    className={cn(
                      'transition-colors',
                      mIdx % 2 === 0 ? 'bg-background' : 'bg-muted'
                    )}
                  >
                    <td
                      className={cn(
                        'border-border relative sticky left-0 isolate z-20 min-w-44 border-r border-b px-3 py-1.5 font-medium whitespace-nowrap shadow-[3px_0_8px_-4px_rgba(0,0,0,0.24)]',
                        editable && 'text-primary font-semibold'
                      )}
                      style={{
                        backgroundColor: mIdx % 2 === 0 ? '#0a0a0a' : '#262626'
                      }}
                    >
                      {editable && (
                        <div
                          aria-hidden
                          className='bg-terciary pointer-events-none absolute inset-0'
                        />
                      )}
                      <div className='relative z-[1] flex items-center gap-2'>
                        <span
                          className={cn(
                            'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-bold shadow-sm',
                            editable
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground'
                          )}
                        >
                          {member.name.charAt(0)}
                        </span>
                        <span>{member.name}</span>
                        {editable && (
                          <span className='text-muted-foreground text-[8px]'>
                            (você)
                          </span>
                        )}
                      </div>
                    </td>
                    {allColumns.map((col) => {
                      const existing = hasSlotAt(
                        slots,
                        member.id,
                        col.isoDate,
                        col.hour.start,
                        col.hour.end
                      );
                      const has = !!existing;
                      const actionKey = `${member.id}-${col.isoDate}-${col.hour.start}`;
                      const pending = pendingAction === actionKey;

                      return (
                        <SlotCell
                          key={`${col.isoDate}-${col.hourIdx}`}
                          has={has}
                          editable={editable}
                          isPending={pending}
                          compact
                          onClick={() =>
                            toggleSlot(
                              member.id,
                              col.isoDate,
                              col.hour.start,
                              col.hour.end
                            )
                          }
                          title={`${member.name} – ${formatDateFull(col.isoDate)} ${col.hour.label} – ${has ? (editable ? 'Tem entrevista (clique p/ remover)' : 'Tem entrevista') : editable ? 'Sem entrevista (clique p/ adicionar)' : 'Sem entrevista'}`}
                        />
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <ScrollBar orientation='horizontal' />
      </ScrollArea>
    </div>
  );

  /* ═══════ RENDER ═══════ */
  return (
    <div className='flex h-full flex-col gap-3'>
      {/* Legend bar */}
      <div className='border-border/60 bg-card flex flex-wrap items-center gap-3 rounded-xl border px-4 py-2 shadow-sm sm:gap-5'>
        <div className='flex items-center gap-2'>
          <span className='inline-flex h-3.5 w-3.5 items-center justify-center rounded bg-emerald-500 shadow-sm' />
          <span className='text-foreground/90 text-[11px] font-medium sm:text-xs'>
            Tem entrevista
          </span>
        </div>
        <div className='flex items-center gap-2'>
          <span className='inline-flex h-3.5 w-3.5 items-center justify-center rounded bg-red-500/90 shadow-sm dark:bg-red-600/85' />
          <span className='text-foreground/90 text-[11px] font-medium sm:text-xs'>
            Sem entrevista
          </span>
        </div>
        {currentMemberId && (
          <span className='text-muted-foreground ml-auto flex items-center gap-1 text-[10px]'>
            <svg
              className='h-3 w-3'
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'
              strokeWidth={2}
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                d='M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zM12 2.25V4.5m5.834.166l-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243l-1.59-1.59'
              />
            </svg>
            Clique na sua linha para editar
          </span>
        )}
      </div>

      {/* Layouts */}
      <div className='min-h-0 flex-1'>
        <MobileLayout />
        <TabletLayout />
        <DesktopLayout />
      </div>
    </div>
  );
}
