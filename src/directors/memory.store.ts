import { RawDatum, Anomaly, SourceScore } from '../types';
import { nowIso } from '../utils';

export class MemoryStore {
  private data: RawDatum[] = [];
  private anomalies: Anomaly[] = [];
  private sources: Map<string, SourceScore> = new Map();

  async pushDatum(d: RawDatum) {
    const copy = { ...d, _receivedAt: nowIso() };
    this.data.push(copy);
    this.touchSource(copy.source);
    return copy;
  }

  async getRecentData(source?: string, limit = 100) {
    const list = source ? this.data.filter(d => d.source === source) : this.data;
    return list.slice(-limit);
  }

  async pushAnomaly(a: Anomaly) {
    this.anomalies.push(a);
  }

  async getAnomalies(source?: string, limit = 100) {
    const list = source ? this.anomalies.filter(a => a.source === source) : this.anomalies;
    return list.slice(-limit);
  }

  async touchSource(source: string) {
    const now = nowIso();
    const s = this.sources.get(source) || {
      source,
      score: 100,
      lastSeen: now,
      staleCount: 0,
      anomalyCount: 0,
      completenessScore: 100,
    };
    s.lastSeen = now;
    this.sources.set(source, s);
  }

  async incAnomalyCount(source: string) {
    const s = this.sources.get(source) || {
      source,
      score: 100,
      lastSeen: nowIso(),
      staleCount: 0,
      anomalyCount: 0,
      completenessScore: 100,
    };
    s.anomalyCount++;
    this.sources.set(source, s);
  }

  async incStaleCount(source: string) {
    const s = this.sources.get(source) || {
      source,
      score: 100,
      lastSeen: nowIso(),
      staleCount: 0,
      anomalyCount: 0,
      completenessScore: 100,
    };
    s.staleCount++;
    this.sources.set(source, s);
  }

  async updateSourceScore(source: string, score: number) {
    const s = this.sources.get(source) || {
      source,
      score,
      lastSeen: nowIso(),
      staleCount: 0,
      anomalyCount: 0,
      completenessScore: 100,
    };
    s.score = score;
    this.sources.set(source, s);
  }

  async getSourceScores() {
    return Array.from(this.sources.values());
  }
}
