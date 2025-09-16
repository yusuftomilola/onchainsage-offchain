import { MemoryStore } from '../stores/memory.store';
import { RawDatum } from '../types';
import dayjs from 'dayjs';

/**
 * Freshness monitoring:
 * - track last timestamp per source
 * - if last received timestamp is older than threshold, raise stale event
 * - acceptance criteria: alerts on delays >15 minutes (configurable)
 */

export class FreshnessService {
  private store: MemoryStore;
  private lastSeenMap: Map<string, string>;
  private thresholdMin: number;

  constructor(store: MemoryStore, opts?: { thresholdMin?: number }) {
    this.store = store;
    this.lastSeenMap = new Map();
    this.thresholdMin = opts?.thresholdMin ?? 15; // acceptance criteria default
  }

  markReceived(datum: RawDatum) {
    // datum.timestamp is the data's own timestamp; we store it as last seen
    this.lastSeenMap.set(datum.source, datum.timestamp);
  }

  async checkFreshness() {
    const now = dayjs();
    for (const [source, lastTs] of this.lastSeenMap) {
      const diff = now.diff(dayjs(lastTs), 'minute');
      if (diff > this.thresholdMin) {
        // stale
        await this.store.incStaleCount(source);
        // write an anomaly-like record
        await this.store.pushAnomaly({
          id: `stale-${source}-${now.toISOString()}`,
          source,
          timestamp: now.toISOString(),
          metric: 'freshness',
          value: diff,
          reason: `stale by ${diff} minutes (> ${this.thresholdMin}m)`,
          severity: 'high',
        });
      }
    }
  }

  getLastSeen(source: string) {
    return this.lastSeenMap.get(source) ?? null;
  }
}
