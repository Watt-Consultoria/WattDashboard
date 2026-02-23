import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';

export type FirestoreDateValue =
  | Timestamp
  | Date
  | string
  | null
  | undefined
  | { toDate?: () => Date };

const isValidDate = (value: Date) => !Number.isNaN(value.getTime());

const parseBrDate = (value: string): Date | null => {
  const parts = value.split('/');
  if (parts.length !== 3) {
    return null;
  }

  const [day, month, year] = parts;
  const parsed = new Date(
    Number.parseInt(year, 10),
    Number.parseInt(month, 10) - 1,
    Number.parseInt(day, 10)
  );

  return isValidDate(parsed) ? parsed : null;
};

const parseIsoLikeDate = (value: string): Date | null => {
  const normalized = value.includes('T') ? value : `${value}T00:00:00`;
  const parsed = new Date(normalized);
  return isValidDate(parsed) ? parsed : null;
};

export const firestoreDateToDate = (value: FirestoreDateValue): Date | null => {
  if (!value) {
    return null;
  }

  if (value instanceof Timestamp) {
    return value.toDate();
  }

  if (value instanceof Date) {
    return isValidDate(value) ? value : null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    if (trimmed.includes('/')) {
      return parseBrDate(trimmed);
    }

    return parseIsoLikeDate(trimmed);
  }

  if (typeof value === 'object' && typeof value.toDate === 'function') {
    const parsed = value.toDate();
    return parsed instanceof Date && isValidDate(parsed) ? parsed : null;
  }

  return null;
};

export const firestoreDateToLabel = (value: FirestoreDateValue): string => {
  const parsed = firestoreDateToDate(value);
  return parsed ? format(parsed, 'dd/MM/yyyy') : '';
};

export const firestoreDateToInput = (value: FirestoreDateValue): string => {
  const parsed = firestoreDateToDate(value);
  return parsed ? format(parsed, 'yyyy-MM-dd') : '';
};

export const inputDateToTimestamp = (value: string): Timestamp | null => {
  if (!value) {
    return null;
  }

  const parsed = parseIsoLikeDate(value);
  return parsed ? Timestamp.fromDate(parsed) : null;
};

export const firestoreDateToTimestamp = (
  value: FirestoreDateValue
): Timestamp | null => {
  const parsed = firestoreDateToDate(value);
  return parsed ? Timestamp.fromDate(parsed) : null;
};
