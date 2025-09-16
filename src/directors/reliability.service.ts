import { MemoryStore } from '../stores/memory.store';

/**
 * Compute a simple reliability score per source:
 * - base 100
 * - subtract points for stale events, anomalies, and completeness gaps
 * - applied smoothing + clamp to 0..100
 */

export class ReliabilityService {
  private store: MemoryStore;

  constructor(store: MemoryStore) {
    this.store = store;
  }

  async recomputeAll() {
    const scores = await this.store.getSourceScores();
    const recomputed = scores.map(s => {
      // simple formula:
      let reduction = s.staleCount * 2 + s.anomalyCount * 3 + Math.max(0, 50 - s.completenessScore) * 0.1;
      let base = 100 - reduction;
      base = Math.max(0, Math.min(100, base));
      s.score = Math.round(base);
      return s;
    });
    // update store
    for (const s of recomputed) {
      await this.store.updateSourceScore(s.source, s.score);
    }
    return recomputed;
  }
}
