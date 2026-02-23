'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  type DA,
  type DayShedule,
  type WeekShedule,
  WEEK_DAYS,
  WEEK_DAY_LABELS,
  TIME_SLOTS,
  DEFAULT_WEEK_SCHEDULE,
  countAvailableHours,
  MIN_WEEKLY_AVAILABLE_HOURS
} from '@/types/member/member';
import memberService from '@/services/memberService';

type WeekScheduleEditorProps = {
  memberId: string;
  initialSchedule?: WeekShedule;
  onSaved?: (schedule: WeekShedule) => void;
};

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

/* ─── Time slot short labels (just the start hour) ─── */
const SLOT_SHORT = TIME_SLOTS.map((s) => s.split('-')[0]);

export function WeekScheduleEditor({
  memberId,
  initialSchedule,
  onSaved
}: WeekScheduleEditorProps) {
  const [schedule, setSchedule] = React.useState<WeekShedule>(
    initialSchedule ?? structuredClone(DEFAULT_WEEK_SCHEDULE)
  );
  const [isSaving, setIsSaving] = React.useState(false);
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragValue, setDragValue] = React.useState<DA | null>(null);
  const [expandedDay, setExpandedDay] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (initialSchedule) {
      setSchedule(initialSchedule);
    }
  }, [initialSchedule]);

  const totalHours = countAvailableHours(schedule);
  const isValid = totalHours >= MIN_WEEKLY_AVAILABLE_HOURS;

  const setSlotValue = (
    day: (typeof WEEK_DAYS)[number],
    slotIndex: number,
    value: DA
  ) => {
    setSchedule((prev) => {
      if (prev[day][slotIndex] === value) return prev;
      const next = { ...prev };
      const daySlots = [...prev[day]] as DA[];
      daySlots[slotIndex] = value;
      next[day] = daySlots as unknown as DayShedule;
      return next;
    });
  };

  const handleMouseDown = (
    day: (typeof WEEK_DAYS)[number],
    slotIndex: number
  ) => {
    const current = schedule[day][slotIndex];
    const newValue: DA = current === 'D' ? 'I' : 'D';
    setDragValue(newValue);
    setIsDragging(true);
    setSlotValue(day, slotIndex, newValue);
  };

  const handleMouseEnter = (
    day: (typeof WEEK_DAYS)[number],
    slotIndex: number
  ) => {
    if (isDragging && dragValue !== null) {
      setSlotValue(day, slotIndex, dragValue);
    }
  };

  React.useEffect(() => {
    const onUp = () => {
      setIsDragging(false);
      setDragValue(null);
    };
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchend', onUp);
    };
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const result = await memberService.updateWeekSchedule(memberId, schedule);
      if (result.success) {
        toast.success('Horário de disponibilidade salvo com sucesso!');
        onSaved?.(schedule);
      } else {
        toast.error(result.error ?? 'Erro ao salvar horário.');
      }
    } catch (error) {
      console.error('Erro ao salvar horário:', error);
      toast.error('Não foi possível salvar o horário.');
    } finally {
      setIsSaving(false);
    }
  };

  const fillAllDay = (day: (typeof WEEK_DAYS)[number], value: DA) => {
    setSchedule((prev) => {
      const next = { ...prev };
      next[day] = Array(14).fill(value) as unknown as DayShedule;
      return next;
    });
  };

  const getDayHours = (day: (typeof WEEK_DAYS)[number]) => {
    return schedule[day].filter((s) => s === 'D').length;
  };

  const progressPercent = Math.min(
    (totalHours / MIN_WEEKLY_AVAILABLE_HOURS) * 100,
    100
  );

  /* ─────── Mobile: card-per-day layout ─────── */
  const MobileSchedule = () => (
    <div className='space-y-2 md:hidden'>
      {WEEK_DAYS.map((day) => {
        const dayHours = getDayHours(day);
        const isExpanded = expandedDay === day;
        return (
          <div key={day} className='rounded-lg border'>
            {/* Day header - always visible */}
            <button
              type='button'
              className='flex w-full items-center justify-between px-3 py-2.5'
              onClick={() => setExpandedDay(isExpanded ? null : day)}
            >
              <div className='flex items-center gap-2'>
                <span className='text-sm font-semibold'>
                  {WEEK_DAY_LABELS[day]}
                </span>
                <Badge variant='secondary' className='text-[10px] font-normal'>
                  {dayHours}h disponível
                </Badge>
              </div>
              <svg
                className={`text-muted-foreground h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
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
            </button>

            {/* Mini bar preview - always visible */}
            <div className='flex gap-0.5 px-3 pb-2'>
              {schedule[day].map((value, i) => (
                <div
                  key={`bar-${day}-${i}`}
                  className={`h-1.5 flex-1 rounded-full ${
                    value === 'D' ? 'bg-emerald-500/50' : 'bg-red-500/40'
                  }`}
                />
              ))}
            </div>

            {/* Expanded slot grid */}
            {isExpanded && (
              <div className='border-t px-3 py-3'>
                <div className='grid grid-cols-7 gap-1'>
                  {schedule[day].map((value, slotIndex) => (
                    <button
                      key={`${day}-${slotIndex}`}
                      type='button'
                      className={`flex flex-col items-center justify-center rounded-md border py-2 transition-colors active:scale-95 ${
                        value === 'D'
                          ? 'border-emerald-500/40 bg-emerald-500/15'
                          : 'border-red-500/40 bg-red-500/15'
                      }`}
                      onClick={() =>
                        setSlotValue(day, slotIndex, value === 'D' ? 'I' : 'D')
                      }
                    >
                      <span className='text-[10px] leading-tight font-medium'>
                        {SLOT_SHORT[slotIndex]}h
                      </span>
                      <span
                        className={`mt-0.5 text-[9px] ${
                          value === 'D' ? 'text-emerald-600' : 'text-red-500'
                        }`}
                      >
                        {value === 'D' ? 'Disp' : 'Indisp'}
                      </span>
                    </button>
                  ))}
                </div>
                {/* <div className='mt-2 flex gap-2'>
                  <Button
                    variant='outline'
                    size='sm'
                    className='h-7 flex-1 text-[10px]'
                    onClick={() => fillAllDay(day, 'D')}
                  >
                    Tudo disponível
                  </Button>
                  <Button
                    variant='outline'
                    size='sm'
                    className='h-7 flex-1 text-[10px]'
                    onClick={() => fillAllDay(day, 'I')}
                  >
                    Tudo indisponível
                  </Button>
                </div> */}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  /* ─────── Desktop: full grid layout ─────── */
  const DesktopSchedule = () => (
    <div className='hidden md:block'>
      <ScrollArea className='w-full'>
        <div className='min-w-175'>
          {/* Header with time slots */}
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
              <div className='flex items-center gap-1.5'>
                <span className='truncate text-xs font-medium'>
                  {WEEK_DAY_LABELS[day]}
                </span>
                <span className='text-muted-foreground text-[10px]'>
                  {getDayHours(day)}h
                </span>
              </div>
              {schedule[day].map((value, slotIndex) => (
                <button
                  key={`${day}-${slotIndex}`}
                  type='button'
                  className={`h-9 rounded-sm border transition-colors select-none ${
                    value === 'D'
                      ? 'border-emerald-500/40 bg-emerald-500/20 hover:bg-emerald-500/30'
                      : 'border-red-500/40 bg-red-500/20 hover:bg-red-500/30'
                  }`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleMouseDown(day, slotIndex);
                  }}
                  onMouseEnter={() => handleMouseEnter(day, slotIndex)}
                  aria-label={`${WEEK_DAY_LABELS[day]} ${TIME_SLOTS[slotIndex]} - ${value === 'D' ? 'Disponível' : 'Indisponível'}`}
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
    <Card>
      <CardHeader className='pb-2'>
        <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
          <div>
            <CardTitle className='text-base sm:text-lg'>
              Rotina Semanal
            </CardTitle>
            <CardDescription className='text-xs'>
              Selecione seus horários de disponibilidade
            </CardDescription>
          </div>
          <Badge
            className={`w-fit text-[10px] sm:text-xs ${
              isValid
                ? 'bg-emerald-500/10 text-emerald-700'
                : 'bg-red-500/10 text-red-700'
            }`}
          >
            {totalHours}h / {MIN_WEEKLY_AVAILABLE_HOURS}h mínimo
          </Badge>
        </div>

        {/* Progress bar */}
        <div className='mt-2'>
          <div className='bg-muted h-2 w-full overflow-hidden rounded-full'>
            <div
              className={`h-full rounded-full transition-all ${
                isValid ? 'bg-emerald-500' : 'bg-red-500'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className='text-muted-foreground mt-1 flex justify-between text-[10px]'>
            <span>0h</span>
            <span>{MIN_WEEKLY_AVAILABLE_HOURS}h</span>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className='space-y-3'>
          {/* Legend */}
          <div className='flex flex-wrap items-center gap-3 text-[10px] sm:gap-4 sm:text-xs'>
            <div className='flex items-center gap-1.5'>
              <div className='h-3 w-3 rounded border border-emerald-500/40 bg-emerald-500/20 sm:h-4 sm:w-4' />
              <span>Disponível</span>
            </div>
            <div className='flex items-center gap-1.5'>
              <div className='h-3 w-3 rounded border border-red-500/40 bg-red-500/20 sm:h-4 sm:w-4' />
              <span>Indisponível</span>
            </div>
            <span className='text-muted-foreground ml-auto hidden sm:inline'>
              Clique e arraste para selecionar
            </span>
          </div>

          {/* Mobile layout */}
          <MobileSchedule />

          {/* Desktop layout */}
          <DesktopSchedule />

          {/* Validation message */}
          {!isValid && (
            <div className='rounded-lg border border-red-500/50 bg-red-500/10 p-3 text-center'>
              <div className='text-xs font-medium text-red-600 sm:text-sm'>
                Selecione pelo menos {MIN_WEEKLY_AVAILABLE_HOURS} horas de
                disponibilidade
              </div>
              <div className='text-muted-foreground mt-1 text-[10px] sm:text-xs'>
                Você selecionou {totalHours}h de {MIN_WEEKLY_AVAILABLE_HOURS}h
                necessárias
              </div>
            </div>
          )}

          {/* Save button */}
          <div className='flex justify-end pt-1'>
            <Button
              onClick={handleSave}
              disabled={isSaving || !isValid}
              className='h-10 w-full sm:h-9 sm:w-auto sm:min-w-30'
            >
              {isSaving ? 'Salvando...' : 'Salvar horário'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function WeekScheduleEditorSkeleton() {
  return (
    <Card>
      <CardHeader className='pb-3'>
        <Skeleton className='h-5 w-48' />
        <Skeleton className='mt-1 h-3 w-64' />
        <Skeleton className='mt-2 h-2 w-full rounded-full' />
      </CardHeader>
      <CardContent>
        <div className='space-y-2'>
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className='space-y-1'>
              <div className='flex items-center gap-2'>
                <Skeleton className='h-4 w-16' />
                <Skeleton className='h-4 w-10' />
              </div>
              <Skeleton className='h-1.5 w-full rounded-full' />
            </div>
          ))}
          <Skeleton className='mt-3 h-10 w-full sm:ml-auto sm:h-9 sm:w-32' />
        </div>
      </CardContent>
    </Card>
  );
}
