import { RawDatum } from '../types';
import dayjs from 'dayjs';

/**
 * Completeness / gap detection:
 * - for feeds expected at a cadence (e.g., price ticks per symbol), detect missing windows
 * - For simplicity, track last timestamp per (source, key) and if gap > expectedInterval*2, flag
 */

export class CompletenessService {
  private lastPerKey: Map<string, string>;
  private expectedIntervalSec: number;

  constructor(opts?: { expectedIntervalSec?: number }) {
    this.lastPerKey = new Map();
    this.expectedIntervalSec = opts?.expectedIntervalSec ?? 30; // default expected cadence 30s
  }

  keyFor(source: string, key: string) {
    return `${source}::${key}`;
  }

  mark(datum: RawDatum, key: string) {
    const k = this.keyFor(datum.source, key);
    this.lastPerKey.set(k, datum.timestamp);
  }

  detectGap(source: string, key: string) {
    const k = this.keyFor(source, key);
    const last = this.lastPerKey.get(k);
    if (!last) return null;
    const now = dayjs();
    const diff = now.diff(dayjs(last), 'second');
    if (diff > this.expectedIntervalSec * 2) {
      return {
        source,
        key,
        last,
        gapSec: diff,
      };
    }
    return null;
  }
}
