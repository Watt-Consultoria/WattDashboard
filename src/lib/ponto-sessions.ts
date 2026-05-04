import { endOfWeek, startOfWeek, subWeeks } from 'date-fns';
import type { PontoSession } from '@/types/ponto/ponto';

export const PONTO_MAX_SESSION_MINUTES = 12 * 60;

export type PontoSummary = {
  isWorking: boolean;
  activeSession: PontoSession | null;
  lastSession: PontoSession | null;
  currentWeekMinutes: number;
  lastWeekMinutes: number;
};

export const toDateFromTimestamp = (value: unknown): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (
    typeof value === 'object' &&
    value !== null &&
    'toDate' in value &&
    typeof (value as { toDate?: unknown }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate();
  }
  return null;
};

export const getSessionStartDate = (session: PontoSession) =>
  toDateFromTimestamp(session.startedAt);

export const getSessionEndDate = (session: PontoSession) =>
  toDateFromTimestamp(session.endedAt);

export const isPontoSessionOpen = (session: PontoSession) =>
  !getSessionEndDate(session) && session.invalidReason === 'missing_exit';

export const getRunningSessionMinutes = (
  session: PontoSession | null,
  now = new Date()
) => {
  if (!session) return 0;
  const startedAt = getSessionStartDate(session);
  if (!startedAt) return 0;
  return Math.max(0, (now.getTime() - startedAt.getTime()) / (1000 * 60));
};

export const getSessionDurationMinutes = (
  session: PontoSession,
  now = new Date()
) => {
  if (isPontoSessionOpen(session)) {
    return getRunningSessionMinutes(session, now);
  }
  return Math.max(0, Number(session.durationMinutes) || 0);
};

export const formatMinutesAsHours = (minutes: number) => minutes / 60;

export const calculatePontoSummary = (
  sessions: PontoSession[],
  now = new Date()
): PontoSummary => {
  const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 });
  const lastWeekDate = subWeeks(now, 1);
  const lastWeekStart = startOfWeek(lastWeekDate, { weekStartsOn: 1 });
  const lastWeekEnd = endOfWeek(lastWeekDate, { weekStartsOn: 1 });

  const sorted = [...sessions].sort((a, b) => {
    const dateA = getSessionStartDate(a)?.getTime() ?? 0;
    const dateB = getSessionStartDate(b)?.getTime() ?? 0;
    return dateA - dateB;
  });

  const activeSession = sorted.find(isPontoSessionOpen) ?? null;
  const lastSession = sorted.length > 0 ? sorted[sorted.length - 1] : null;

  let currentWeekMinutes = 0;
  let lastWeekMinutes = 0;

  for (const session of sorted) {
    if (session.status !== 'closed') continue;
    if (
      session.durationMinutes <= 0 ||
      session.durationMinutes > PONTO_MAX_SESSION_MINUTES
    ) {
      continue;
    }

    const endedAt = getSessionEndDate(session);
    if (!endedAt) continue;

    if (endedAt >= currentWeekStart) {
      currentWeekMinutes += session.durationMinutes;
    }

    if (endedAt >= lastWeekStart && endedAt <= lastWeekEnd) {
      lastWeekMinutes += session.durationMinutes;
    }
  }

  return {
    isWorking: Boolean(activeSession),
    activeSession,
    lastSession,
    currentWeekMinutes,
    lastWeekMinutes
  };
};
