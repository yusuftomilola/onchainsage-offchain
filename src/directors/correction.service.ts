import { MemoryStore } from '../stores/memory.store';
import { RawDatum } from '../types';
import { safeNumber, nowIso } from '../utils';

/**
 * Automated correction:
 * - type coercion, missing value imputation (last-known, mean), clipping to valid ranges
 * - For safety, apply only for common, low-risk patterns; otherwise flag for manual review.
 *
 * Returns { correctedDatum, actionTaken: string | null }
 */

export class CorrectionService {
  private store: MemoryStore;
  private lastValues: Map<string, any>;

  constructor(store: MemoryStore) {
    this.store = store;
    this.lastValues = new Map();
  }

  registerLast(source: string, metric: string, value: any) {
    this.lastValues.set(`${source}::${metric}`, value);
  }

  getLast(source: string, metric: string) {
    return this.lastValues.get(`${source}::${metric}`);
  }

  async attemptCorrection(datum: RawDatum): Promise<{ corrected: RawDatum; action: string | null }> {
    // Basic example: if payload.price is string, cast; if missing price, impute last known
    const corrected = { ...datum, payload: { ...datum.payload } };
    let action: string | null = null;

    if (corrected.payload && 'price' in corrected.payload) {
      let p = corrected.payload.price;
      const n = safeNumber(p);
      if (n === null) {
        // try to impute from last value
        const last = this.getLast(corrected.source, 'price');
        if (last !== undefined) {
          corrected.payload.price = last;
          action = 'imputed_price_from_last';
        } else {
          action = 'could_not_impute_price';
        }
      } else {
        // valid number -> store as last known
        corrected.payload.price = n;
        this.registerLast(corrected.source, 'price', n);
        action = 'type_cast_price';
      }
    }

    // timestamp sanity: if timestamp in future or missing, replace with now
    try {
      const ts = new Date(corrected.timestamp);
      if (!ts || isNaN(ts.getTime()) || ts.getTime() - Date.now() > 1000 * 60 * 5) {
        corrected.timestamp = nowIso();
        action = action ? `${action}; fixed_timestamp` : 'fixed_timestamp';
      }
    } catch (e) {
      corrected.timestamp = nowIso();
      action = action ? `${action}; fixed_timestamp` : 'fixed_timestamp';
    }

    // push to store as corrected
    await this.store.pushDatum(corrected);
    return { corrected, action };
  }
}
