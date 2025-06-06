export class SharpeStrategy {
  static calculate(returns: number[], riskFreeRate = 0): number {
    const avg = returns.reduce((a, b) => a + b, 0) / returns.length;
    const stdDev = Math.sqrt(returns.reduce((sum, r) => sum + (r - avg) ** 2, 0) / returns.length);
    return (avg - riskFreeRate) / stdDev;
  }
}
