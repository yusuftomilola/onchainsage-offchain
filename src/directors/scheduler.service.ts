import { MemoryStore } from '../stores/memory.store';
import { FreshnessService } from '../detectors/freshness.service';
import { ReliabilityService } from '../scoring/reliability.service';
import { ReportService } from '../reports/report.service';

export class SchedulerService {
  private store: MemoryStore;
  private freshness: FreshnessService;
  private reliability: ReliabilityService;
  private report: ReportService;
  private timers: NodeJS.Timeout[] = [];

  constructor(store: MemoryStore, freshness: FreshnessService, reliability: ReliabilityService, report: ReportService) {
    this.store = store;
    this.freshness = freshness;
    this.reliability = reliability;
    this.report = report;
  }

  start() {
    // freshness check every minute
    this.timers.push(setInterval(() => this.freshness.checkFreshness(), 60 * 1000));
    // recompute reliability every 5 minutes
    this.timers.push(setInterval(() => this.reliability.recomputeAll(), 5 * 60 * 1000));
    // generate report every 15 minutes
    this.timers.push(setInterval(async () => {
      const r = await this.report.generateReport();
      // in production: push to S3/email/DB
      console.log('[DQ Report]', r.generatedAt, 'anomalies=', r.totalAnomalies);
    }, 15 * 60 * 1000));
  }

  stop() {
    for (const t of this.timers) clearInterval(t);
  }
}
