import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string | undefined;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  description: string | undefined;

  @IsOptional()
  @IsString()
  color?: string;
}
