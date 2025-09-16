import dayjs from 'dayjs';
import { v4 as uuidv4 } from 'uuid';

export const nowIso = () => dayjs().toISOString();

export const minuteDiff = (aIso: string, bIso: string) => {
  const a = dayjs(aIso);
  const b = dayjs(bIso);
  return a.diff(b, 'minute');
};

export const genId = (prefix = '') => `${prefix}${uuidv4()}`;

export function safeNumber(v: any): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
