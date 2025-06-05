import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class ArbitrageSearchDto {
  @ApiProperty({
    description: 'Minimum profit percentage to filter arbitrage opportunities',
    example: '2',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseFloat(value))
  minProfitPercent?: number;

  @ApiProperty({
    description: 'Whether to include cross-chain arbitrage opportunities',
    example: 'true',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  isCrossChain?: boolean;

  @ApiProperty({
    description: 'Token address to filter arbitrage opportunities',
    example: '0x1234567890abcdef1234567890abcdef12345678',
    required: false,
  })
  @IsOptional()
  @IsString()
  tokenAddress?: string;

  @ApiProperty({
    description: 'Chain ID to filter arbitrage opportunities',
    example: 'solana',
    required: false,
  })
  @IsOptional()
  @IsString()
  chainId?: string;

  @ApiProperty({
    description: 'DEX name to filter arbitrage opportunities',
    example: 'jupiter',
    required: false,
  })
  @IsOptional()
  @IsString()
  dexName?: string;

  @ApiProperty({
    description: 'Maximum number of results to return',
    example: '10',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  limit?: number = 10;
}

export class ArbitrageResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the arbitrage opportunity',
  })
  id: string;

  @ApiProperty({
    description: 'Token address',
  })
  tokenAddress: string;

  @ApiProperty({
    description: 'Source chain ID',
  })
  sourceChainId: string;

  @ApiProperty({
    description: 'Source DEX name',
  })
  sourceDexName: string;

  @ApiProperty({
    description: 'Target chain ID',
  })
  targetChainId: string;

  @ApiProperty({
    description: 'Target DEX name',
  })
  targetDexName: string;

  @ApiProperty({
    description: 'Source price in USD',
  })
  sourcePriceUsd: number;

  @ApiProperty({
    description: 'Target price in USD',
  })
  targetPriceUsd: number;

  @ApiProperty({
    description: 'Profit percentage before fees',
  })
  profitPercent: number;

  @ApiProperty({
    description: 'Estimated fee percentage',
  })
  estimatedFeePercent: number;

  @ApiProperty({
    description: 'Net profit percentage after fees',
  })
  netProfitPercent: number;

  @ApiProperty({
    description: 'Whether the arbitrage is cross-chain',
  })
  isCrossChain: boolean;

  @ApiProperty({
    description: 'Whether the arbitrage opportunity is still active',
  })
  isActive: boolean;

  @ApiProperty({
    description: 'When the arbitrage opportunity was detected',
  })
  detectedAt: Date;
}
