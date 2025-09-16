import { MemoryStore } from '../stores/memory.store';
import { nowIso } from '../utils';

/**
 * Automated data quality reports:
 * - periodic snapshot of anomalies, stale counts, top 5 sources by score
 */

export class ReportService {
  private store: MemoryStore;

  constructor(store: MemoryStore) {
    this.store = store;
  }

  async generateReport() {
    const anomalies = await this.store.getAnomalies(undefined, 1000);
    const sources = await this.store.getSourceScores();
    const top = [...sources].sort((a, b) => b.score - a.score).slice(0, 10);
    return {
      generatedAt: nowIso(),
      totalAnomalies: anomalies.length,
      anomaliesRecent: anomalies.slice(-50),
      topSources: top,
      summary: {
        totalSources: sources.length,
        avgScore: sources.length ? Math.round(sources.reduce((s, x) => s + x.score, 0) / sources.length) : 100,
      },
    };
  }
}
