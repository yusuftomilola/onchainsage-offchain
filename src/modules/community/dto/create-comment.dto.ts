import { IsString, IsNotEmpty, IsUUID, IsOptional } from 'class-validator';

export class CreateCommentDto {
  @IsString()
  @IsNotEmpty()
  content: string | undefined;

  @IsUUID()
  postId: string | undefined;

  @IsOptional()
  @IsUUID()
  parentId?: string;
}
