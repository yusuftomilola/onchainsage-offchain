export class StopLossStrategy {
  static shouldTrigger(entryPrice: number, currentPrice: number, stopLossPercent: number): boolean {
    const threshold = entryPrice * (1 - stopLossPercent / 100);
    return currentPrice <= threshold;
  }
}
