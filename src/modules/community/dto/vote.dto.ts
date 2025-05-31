import { IsEnum, IsUUID, IsOptional } from 'class-validator';

export class VoteDto {
  @IsEnum(['up', 'down'])
  type: 'up' | 'down' | undefined;

  @IsOptional()
  @IsUUID()
  postId?: string;

  @IsOptional()
  @IsUUID()
  commentId?: string;
}
