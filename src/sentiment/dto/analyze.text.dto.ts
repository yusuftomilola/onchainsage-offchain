import { ApiProperty } from '@nestjs/swagger';

export class AnalyzeTextDto {
  @ApiProperty()
  text!: string;
}
