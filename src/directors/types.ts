export type RawDatum = {
  id?: string;
  source: string;
  timestamp: string; // ISO
  payload: any; // schema depends on feed
  lineage?: DataLineage;
};

export type ValidationResult = {
  ok: boolean;
  errors?: string[];
};

export type Anomaly = {
  id: string;
  source: string;
  timestamp: string;
  metric: string;
  value: number;
  reason: string;
  severity: 'low' | 'medium' | 'high';
};

export type DataLineage = {
  source: string;
  receivedAt: string;
  transformations?: string[]; // descriptions
  originalId?: string;
};

export type SourceScore = {
  source: string;
  score: number; // 0..100
  lastSeen: string;
  staleCount: number;
  anomalyCount: number;
  completenessScore: number;
};
