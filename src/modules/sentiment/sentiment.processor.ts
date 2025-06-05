import { Injectable, Logger } from '@nestjs/common';
import * as natural from 'natural';
import nlp from 'compromise';
import { SentimentResult } from './sentiment.controller';

@Injectable()
export class SentimentProcessor {
  private readonly logger = new Logger(SentimentProcessor.name);
  private tokenizer: natural.WordTokenizer;
  private analyzer: natural.SentimentAnalyzer;

  constructor() {
    this.tokenizer = new natural.WordTokenizer();
    this.analyzer = new natural.SentimentAnalyzer('English', natural.PorterStemmer, 'afinn');
  }

  async analyzeSentiment(text: string): Promise<SentimentResult> {
    try {
      // Tokenize the text
      const tokens = this.tokenizer.tokenize(text) || [];
      if (!tokens) throw new Error('Failed to tokenize text');
      // Get sentiment score
      const score = this.analyzer.getSentiment(tokens);
      // Extract keywords using compromise
      const doc = nlp(text);
      const keywords = this.extractKeywords(doc);
      // Calculate magnitude based on text length and score
      const magnitude = Math.abs(score) * Math.log(text.length + 1);
      // Determine sentiment category
      const sentiment = this.getSentimentCategory(score);
      return {
        score,
        magnitude,
        sentiment,
        keywords,
      };
    } catch (error) {
      this.logger.error(
        `Error in sentiment analysis: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  private extractKeywords(doc: any): string[] {
    const terms = doc.terms().json();
    return terms
      .map((item: any) => item.term)
      .filter((term: string) => term.length > 2); // Filter out short terms
  }

  private getSentimentCategory(score: number): 'positive' | 'negative' | 'neutral' {
    if (score > 0.2) return 'positive';
    if (score < -0.2) return 'negative';
    return 'neutral';
  }
} 