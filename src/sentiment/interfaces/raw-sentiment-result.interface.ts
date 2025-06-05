
export interface RawSentimentResult {
  sentiment: 'positive' | 'neutral' | 'negative';
  confidence: number;
  keywords: string[];
  relevanceScore: number;
  score: number;
  magnitude: number;
  timestamp: string | Date;
}
