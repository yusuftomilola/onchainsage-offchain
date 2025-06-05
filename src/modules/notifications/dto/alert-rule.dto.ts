import { IsString, IsBoolean, IsEnum, IsArray, IsOptional, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { AlertPriority, ComparisonOperator } from '../interfaces/alert.interface';

export class CreateAlertConditionDto {
  @IsString()
  field!: string;

  @IsEnum(ComparisonOperator)
  operator!: ComparisonOperator;

  @IsString()
  value!: string;

  @IsOptional()
  @IsString()
  symbol?: string;

  @IsOptional()
  @IsString()
  timeframe?: string;
}

export class AlertFrequencyDto {
  @IsEnum(['once', 'recurring', 'rate_limited'])
  type!: 'once' | 'recurring' | 'rate_limited';

  @IsOptional()
  @IsNumber()
  cooldownMinutes?: number;

  @IsOptional()
  @IsNumber()
  maxPerHour?: number;

  @IsOptional()
  @IsNumber()
  maxPerDay?: number;
}

export class NotificationChannelDto {
  @IsEnum(['email', 'sms', 'push', 'webhook'])
  type!: 'email' | 'sms' | 'push' | 'webhook';

  @IsBoolean()
  enabled!: boolean;

  @IsOptional()
  config?: any;
}

export class CreateAlertRuleDto {
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAlertConditionDto)
  conditions?: CreateAlertConditionDto[];

  @IsEnum(['AND', 'OR'])
  @IsOptional()
  logicOperator?: 'AND' | 'OR';

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NotificationChannelDto)
  channels?: NotificationChannelDto[];

  @IsEnum(AlertPriority)
  priority?: AlertPriority;

  @ValidateNested()
  @Type(() => AlertFrequencyDto)
  frequency?: AlertFrequencyDto;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}

export class UpdateAlertRuleDto extends CreateAlertRuleDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  conditions?: CreateAlertConditionDto[];

  @IsOptional()
  logicOperator?: 'AND' | 'OR';

  @IsOptional()
  channels?: NotificationChannelDto[];

  @IsOptional()
  priority?: AlertPriority;

  @IsOptional()
  frequency?: AlertFrequencyDto;
}

export class AlertRuleQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(AlertPriority)
  priority?: AlertPriority;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsNumber()
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  limit?: number = 20;
}