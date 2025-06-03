
import { ApiProperty } from '@nestjs/swagger';

export class SentimentResult {
  @ApiProperty()
  sentiment!: 'positive' | 'neutral' | 'negative';

  @ApiProperty()
  confidence!: number;

  @ApiProperty({ type: [String] })
  keywords!: string[];

  @ApiProperty()
  relevanceScore!: number;

  @ApiProperty()
  score!: number;

  @ApiProperty()
  magnitude!: number;

  @ApiProperty()
  timestamp!: Date;
}
