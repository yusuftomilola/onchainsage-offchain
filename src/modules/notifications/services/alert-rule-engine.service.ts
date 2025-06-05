import { Injectable } from '@nestjs/common';
import { AlertRule, AlertCondition, ComparisonOperator, AlertFrequency } from '../interfaces/alert.interface';

@Injectable()
export class AlertRuleEngineService {
  private marketData: Map<string, any> = new Map();
  private technicalIndicators: Map<string, any> = new Map();

  async evaluateRule(rule: AlertRule, currentData: Record<string, any>): Promise<boolean> {
    if (!rule.isActive) return false;

    // Check frequency limits
    if (!this.checkFrequencyLimits(rule)) return false;

    const conditionResults = await Promise.all(
      rule.conditions.map(condition => this.evaluateCondition(condition, currentData))
    );

    // Apply logic operator
    if (rule.logicOperator === 'AND') {
      return conditionResults.every(result => result);
    } else {
      return conditionResults.some(result => result);
    }
  }

  private async evaluateCondition(
    condition: AlertCondition, 
    currentData: Record<string, any>
  ): Promise<boolean> {
    const fieldValue = this.getFieldValue(condition.field, condition.symbol ?? '', currentData);
    const targetValue = parseFloat(condition.value.toString());

    switch (condition.operator) {
      case ComparisonOperator.GREATER_THAN:
        return fieldValue > targetValue;
      
      case ComparisonOperator.LESS_THAN:
        return fieldValue < targetValue;
      
      case ComparisonOperator.EQUALS:
        return Math.abs(fieldValue - targetValue) < 0.001; // Float comparison
      
      case ComparisonOperator.GREATER_THAN_EQUAL:
        return fieldValue >= targetValue;
      
      case ComparisonOperator.LESS_THAN_EQUAL:
        return fieldValue <= targetValue;
      
      case ComparisonOperator.PERCENTAGE_CHANGE:
        return this.evaluatePercentageChange(condition, fieldValue, targetValue);
      
      case ComparisonOperator.CROSSES_ABOVE:
        return this.evaluateCrossover(condition, fieldValue, targetValue, 'above');
      
      case ComparisonOperator.CROSSES_BELOW:
        return this.evaluateCrossover(condition, fieldValue, targetValue, 'below');
      
      default:
        return false;
    }
  }

  private getFieldValue(field: string, symbol: string, currentData: Record<string, any>): number {
    const key = symbol ? `${symbol}_${field}` : field;
    return currentData[key] || this.marketData.get(key) || 0;
  }

  private evaluatePercentageChange(
    condition: AlertCondition, 
    currentValue: number, 
    targetPercentage: number
  ): boolean {
    const historicalKey = `${condition.symbol}_${condition.field}_24h`;
    const historicalValue = this.marketData.get(historicalKey) || currentValue;
    
    if (historicalValue === 0) return false;
    
    const percentageChange = ((currentValue - historicalValue) / historicalValue) * 100;
    return Math.abs(percentageChange) >= Math.abs(targetPercentage);
  }

  private evaluateCrossover(
    condition: AlertCondition, 
    currentValue: number, 
    targetValue: number, 
    direction: 'above' | 'below'
  ): boolean {
    const previousKey = `${condition.symbol}_${condition.field}_prev`;
    const previousValue = this.marketData.get(previousKey) || currentValue;
    
    if (direction === 'above') {
      return previousValue <= targetValue && currentValue > targetValue;
    } else {
      return previousValue >= targetValue && currentValue < targetValue;
    }
  }

  private checkFrequencyLimits(rule: AlertRule): boolean {
    const now = new Date();
    const frequency = rule.frequency;

    if (frequency.type === 'once' && rule.lastTriggered) {
      return false;
    }

    if (frequency.cooldownMinutes && rule.lastTriggered) {
      const cooldownMs = frequency.cooldownMinutes * 60 * 1000;
      const timeSinceLastTrigger = now.getTime() - rule.lastTriggered.getTime();
      if (timeSinceLastTrigger < cooldownMs) {
        return false;
      }
    }

    // Check hourly and daily limits
    if (frequency.maxPerHour || frequency.maxPerDay) {
      return this.checkRateLimits(rule, now, frequency);
    }

    return true;
  }

  private checkRateLimits(rule: AlertRule, now: Date, frequency: AlertFrequency): boolean {
    // Implementation would check database for recent triggers
    // This is a simplified version
    return true;
  }
}