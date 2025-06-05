import { IsArray, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BatchAnalyzeDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  texts!: string[];
}
