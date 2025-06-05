import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class TokenPriceQueryDto {
  @ApiProperty({
    description: 'Token address to fetch prices for',
    example: '0x1234567890abcdef1234567890abcdef12345678',
  })
  @IsNotEmpty()
  @IsString()
  tokenAddress: string;

  @ApiProperty({
    description: 'Chain ID to filter results (optional)',
    example: 'solana',
    required: false,
  })
  @IsOptional()
  @IsString()
  chainId?: string;

  @ApiProperty({
    description: 'DEX name to filter results (optional)',
    example: 'jupiter',
    required: false,
  })
  @IsOptional()
  @IsString()
  dexName?: string;
}

export class BestPriceQueryDto extends TokenPriceQueryDto {
  @ApiProperty({
    description: 'Amount in USD to calculate slippage and best execution',
    example: '1000',
    required: false,
  })
  @IsOptional()
  @IsString()
  amountUsd?: string;

  @ApiProperty({
    description: 'Whether to include cross-chain options',
    example: 'true',
    required: false,
  })
  @IsOptional()
  @IsString()
  includeCrossChain?: string;
}
