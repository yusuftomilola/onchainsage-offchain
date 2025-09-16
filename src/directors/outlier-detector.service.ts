import { RawDatum } from '../types';
import { safeNumber } from '../utils';

/**
 * Statistical outlier detector using rolling quantiles (IQR method).
 * For streaming data, we maintain a sliding buffer per metric and compute IQR.
 */

export class OutlierDetectorService {
  private buffers: Map<string, number[]>;
  private maxBuffer: number;
  private multiplier: number; // IQR multiplier e.g., 1.5

  constructor(opts?: { maxBuffer?: number; multiplier?: number }) {
    this.buffers = new Map();
    this.maxBuffer = opts?.maxBuffer ?? 1000;
    this.multiplier = opts?.multiplier ?? 1.5;
  }

  private bufferKey(source: string, metric: string) {
    return `${source}::${metric}`;
  }

  ingestNumeric(source: string, metric: string, value: number) {
    const key = this.bufferKey(source, metric);
    const b = this.buffers.get(key) || [];
    b.push(value);
    if (b.length > this.maxBuffer) b.shift();
    this.buffers.set(key, b);

    if (b.length < 10) return false; // not enough data
    const sorted = [...b].sort((a, z) => a - z);
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    const iqr = q3 - q1;
    const lower = q1 - this.multiplier * iqr;
    const upper = q3 + this.multiplier * iqr;
    return value < lower || value > upper;
  }

  ingest(datum: RawDatum, extractor: (d: RawDatum) => { metric: string; value: number } | null) {
    const m = extractor(datum);
    if (!m) return false;
    const v = safeNumber(m.value);
    if (v === null) return false;
    return this.ingestNumeric(datum.source, m.metric, v);
  }
}
