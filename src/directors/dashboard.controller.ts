import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { MemoryStore } from '../stores/memory.store';
import { ReportService } from '../reports/report.service';
import { FreshnessService } from '../detectors/freshness.service';

export function createDashboardApp(store: MemoryStore, reportService: ReportService, freshness: FreshnessService) {
  const app = express();
  app.use(cors());
  app.use(bodyParser.json());

  app.get('/health', (req, res) => res.json({ ok: true }));

  app.get('/anomalies', async (req, res) => {
    const source = typeof req.query.source === 'string' ? req.query.source : undefined;
    const list = await store.getAnomalies(source, 1000);
    res.json(list);
  });

  app.get('/sources', async (req, res) => {
    const s = await store.getSourceScores();
    res.json(s);
  });

  app.get('/report', async (req, res) => {
    const r = await reportService.generateReport();
    res.json(r);
  });

  app.get('/freshness/:source', (req, res) => {
    const source = req.params.source;
    const last = freshness.getLastSeen(source);
    res.json({ source, last });
  });

  return app;
}
