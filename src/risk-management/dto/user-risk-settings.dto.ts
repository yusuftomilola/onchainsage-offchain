export class UserRiskSettingsDto {
  userId!: string;
  maxDrawdownPercent!: number;
  stopLossPercent!: number;
  varConfidenceLevel!: number;
}
