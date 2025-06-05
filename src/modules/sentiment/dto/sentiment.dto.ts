import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsArray, IsOptional, IsDate } from 'class-validator';

export class AnalyzeSentimentDto {
  @ApiProperty({ description: 'Text to analyze' })
  @IsString()
  text!: string;

  @ApiProperty({ description: 'Source of the text', required: false })
  @IsString()
  @IsOptional()
  source?: string;

  @ApiProperty({ description: 'Author of the text', required: false })
  @IsString()
  @IsOptional()
  author?: string;

  @ApiProperty({ description: 'Timestamp of the text', required: false })
  @IsDate()
  @IsOptional()
  timestamp?: Date;
}

export class AnalyzeBatchSentimentDto {
  @ApiProperty({ description: 'Array of texts to analyze' })
  @IsArray()
  @IsString({ each: true })
  texts!: string[];
}

export class SentimentResultDto {
  @ApiProperty({ description: 'Sentiment score (-1 to 1)' })
  score!: number;

  @ApiProperty({ description: 'Magnitude of the sentiment' })
  magnitude!: number;

  @ApiProperty({ description: 'Sentiment category', enum: ['positive', 'negative', 'neutral'] })
  sentiment!: 'positive' | 'negative' | 'neutral';

  @ApiProperty({ description: 'Extracted keywords' })
  keywords!: string[];

  @ApiProperty({ description: 'Context information', required: false })
  context?: {
    source: string;
    author: string;
    timestamp: Date;
  };
} 