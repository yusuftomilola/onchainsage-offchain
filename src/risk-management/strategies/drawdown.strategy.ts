export class DrawdownStrategy {
  static calculateMaxDrawdown(values: number[]): number {
    let max = values[0], maxDrawdown = 0;
    for (const val of values) {
      if (val > max) max = val;
      const drawdown = (max - val) / max;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }
    return maxDrawdown;
  }
}
