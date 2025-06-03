import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import * as natural from 'natural';
import compromise from 'compromise';
import winkNLP from 'wink-nlp';
import model from 'wink-eng-lite-web-model';

import { SentimentResult } from './dto/sentiment.result.dto';

const winkNlpInstance = winkNLP(model);

@Processor('sentiment-analysis')
export class SentimentProcessor {
  private readonly logger = new Logger(SentimentProcessor.name);
  private readonly tokenizer = new natural.WordTokenizer();
  private readonly sentimentAnalyzer = new natural.SentimentAnalyzer(
    'English',
    natural.PorterStemmer,
    'afinn',
  );
  private readonly tfidf = new natural.TfIdf();

  @Process('analyze')
  async handleAnalyze(job: Job<{ text: string; timestamp: Date }>): Promise<SentimentResult> {
    const { text, timestamp } = job.data;

    try {
      const sentiment = this.analyzeSentiment(text);
      const keywords = this.extractKeywords(text);
      const relevanceScore = this.calculateRelevanceScore(text, keywords);

      return {
        sentiment: sentiment.sentiment,
        confidence: sentiment.confidence,
        keywords,
        relevanceScore,
        score: sentiment.score,
        magnitude: sentiment.magnitude,
        timestamp,
      };
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error processing sentiment analysis: ${error.message}`);
      } else {
        this.logger.error(`Unknown error: ${JSON.stringify(error)}`);
      }
      throw error;
    }
  }

  private analyzeSentiment(text: string): {
    sentiment: 'positive' | 'negative' | 'neutral';
    confidence: number;
    score: number;
    magnitude: number;
  } {
    const tokens = this.tokenizer.tokenize(text);
    if (!tokens) throw new Error('Failed to tokenize text');
    const score = this.sentimentAnalyzer.getSentiment(tokens);

    let sentiment: 'positive' | 'negative' | 'neutral';
    let confidence: number;

    if (Math.abs(score) < 0.1) {
      sentiment = 'neutral';
      confidence = 0.5;
    } else {
      sentiment = score > 0 ? 'positive' : 'negative';
      confidence = Math.min(Math.abs(score) / 5, 1);
    }

    const magnitude = Math.abs(score);

    return { sentiment, confidence, score, magnitude };
  }

  private extractKeywords(text: string): string[] {
    this.tfidf.addDocument('');
    this.tfidf.addDocument(text);

    const doc = compromise(text);
    const entities = doc.organizations().out('array')
      .concat(doc.people().out('array'))
      .concat(doc.places().out('array'));

    const keywords = this.tfidf.listTerms(1) // Index 1 since empty doc at 0
      .slice(0, 10)
      .map(item => item.term)
      .filter(term => term.length > 2);

    return [...new Set([...entities, ...keywords])];
  }

  private calculateRelevanceScore(text: string, keywords: string[]): number {
  const doc = winkNlpInstance.readDoc(text);

  const financialTerms = ['price', 'market', 'trading', 'stock', 'crypto', 'token', 'coin', 'blockchain'];
  const hasFinancialTerms = financialTerms.some(term => text.toLowerCase().includes(term));

  // Explicitly type sentences as string[]
  const sentences: string[] = doc.sentences().out('array' as any);


  const avgLength =
    sentences.length === 0
      ? 0
      : sentences.reduce((acc, sent) => acc + sent.length, 0) / sentences.length;

  const keywordDensity = keywords.length / (text.split(' ').length || 1);

  const relevanceScore =
    (hasFinancialTerms ? 0.4 : 0) +
    (Math.min(avgLength / 20, 1) * 0.3) +
    (Math.min(keywordDensity * 10, 1) * 0.3);

  return Math.min(Math.max(relevanceScore, 0), 1);
}

}
