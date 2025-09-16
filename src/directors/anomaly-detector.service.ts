import { MemoryStore } from '../stores/memory.store';
import { RawDatum, Anomaly } from '../types';
import { genId, nowIso, safeNumber } from '../utils';

/**
 * Real-time anomaly detector:
 * - Maintains short-window statistics per source+metric (mean, std, count)
 * - Uses z-score detection for spikes
 * - Uses EWMA for drift detection (configurable alpha)
 *
 * This example treats numeric values extracted via a metric extractor function.
 */

type MetricExtractor = (d: RawDatum) => { metric: string; value: number } | null;

export class AnomalyDetectorService {
  private store: MemoryStore;
  private stats: Map<string, { mean: number; m2: number; n: number; ewma?: number }>;
  private alpha: number;
  private zThreshold: number;

  constructor(store: MemoryStore, opts?: { alpha?: number; zThreshold?: number }) {
    this.store = store;
    this.stats = new Map();
    this.alpha = opts?.alpha ?? 0.3; // EWMA smoothing
    this.zThreshold = opts?.zThreshold ?? 4; // conservative default
  }

  private keyFor(source: string, metric: string) {
    return `${source}::${metric}`;
  }

  ingest(datum: RawDatum, extractor: MetricExtractor) {
    const m = extractor(datum);
    if (!m) return;
    const key = this.keyFor(datum.source, m.metric);
    const v = safeNumber(m.value);
    if (v === null) return;

    // update Welford online mean/std
    let s = this.stats.get(key);
    if (!s) {
      s = { mean: v, m2: 0, n: 1, ewma: v };
      this.stats.set(key, s);
      return;
    }
    s.n++;
    const delta = v - s.mean;
    s.mean += delta / s.n;
    s.m2 += delta * (v - s.mean);

    // EWMA
    s.ewma = (s.ewma ?? v) * (1 - this.alpha) + v * this.alpha;

    // check z-score if n>2
    const variance = s.n > 1 ? s.m2 / (s.n - 1) : 0;
    const std = Math.sqrt(variance);
    const z = std === 0 ? 0 : Math.abs((v - s.mean) / std);
    const reasons: string[] = [];

    if (z > this.zThreshold) {
      reasons.push(`z-score=${z.toFixed(2)} > ${this.zThreshold}`);
    }
    // ewma-based relative jump
    if (s.ewma !== undefined && Math.abs(v - s.ewma) / (Math.abs(s.ewma) + 1e-9) > 0.2) {
      reasons.push(`ewma jump ${(Math.abs(v - s.ewma) / (Math.abs(s.ewma) + 1e-9) * 100).toFixed(1)}%`);
    }

    if (reasons.length) {
      const anomaly: Anomaly = {
        id: genId('anom-'),
        source: datum.source,
        timestamp: datum.timestamp,
        metric: m.metric,
        value: v,
        reason: reasons.join('; '),
        severity: z > this.zThreshold ? 'high' : 'medium',
      };
      this.store.pushAnomaly(anomaly);
      this.store.incAnomalyCount(datum.source);
    }
  }
}
