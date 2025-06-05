export interface AlertRule {
  id: string;
  userId: string;
  name: string;
  description?: string;
  conditions: AlertCondition[];
  logicOperator: 'AND' | 'OR';
  channels: NotificationChannel[];
  priority: AlertPriority;
  frequency: AlertFrequency;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastTriggered?: Date;
  triggerCount: number;
}

export interface AlertCondition {
  id: string;
  field: string; // e.g., 'price', 'volume', 'rsi'
  operator: ComparisonOperator;
  value: number | string;
  symbol?: string; // crypto symbol if applicable
  timeframe?: string;
}

export enum ComparisonOperator {
  GREATER_THAN = 'gt',
  LESS_THAN = 'lt',
  EQUALS = 'eq',
  GREATER_THAN_EQUAL = 'gte',
  LESS_THAN_EQUAL = 'lte',
  PERCENTAGE_CHANGE = 'pct_change',
  CROSSES_ABOVE = 'crosses_above',
  CROSSES_BELOW = 'crosses_below'
}

export enum AlertPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface AlertFrequency {
  type: 'once' | 'recurring' | 'rate_limited';
  cooldownMinutes?: number;
  maxPerHour?: number;
  maxPerDay?: number;
}

export interface NotificationChannel {
  type: 'email' | 'sms' | 'push' | 'webhook';
  enabled: boolean;
  config: EmailConfig | SmsConfig | PushConfig | WebhookConfig;
}

export interface EmailConfig {
  template: string;
  priority: 'low' | 'normal' | 'high';
}

export interface SmsConfig {
  phoneNumber: string;
  urgentOnly: boolean;
}

export interface PushConfig {
  deviceTokens: string[];
  sound: boolean;
  badge: boolean;
}

export interface WebhookConfig {
  url: string;
  method: 'POST' | 'PUT';
  headers: Record<string, string>;
  payload: Record<string, any>;
  retryConfig: {
    maxRetries: number;
    backoffMs: number;
  };
}

export interface AlertEvent {
  id: string;
  ruleId: string;
  userId: string;
  triggeredAt: Date;
  data: Record<string, any>;
  channels: NotificationChannel[];
  status: 'pending' | 'sent' | 'failed' | 'rate_limited';
  deliveryResults: DeliveryResult[];
}

export interface DeliveryResult {
  channel: string;
  status: 'success' | 'failed' | 'rate_limited';
  sentAt?: Date;
  error?: string;
  deliveryTime?: number; // milliseconds
}
