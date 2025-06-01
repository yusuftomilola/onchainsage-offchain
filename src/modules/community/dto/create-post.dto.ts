import { IsString, IsNotEmpty, IsUUID, IsOptional, IsArray, MaxLength } from 'class-validator';

export class CreatePostDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string | undefined;

  @IsString()
  @IsNotEmpty()
  content: string | undefined;

  @IsUUID()
  categoryId: string | undefined;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

