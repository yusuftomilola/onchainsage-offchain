export class VarStrategy {
  static calculate(returns: number[], confidenceLevel: number): number {
    const sorted = [...returns].sort((a, b) => a - b);
    const index = Math.floor((1 - confidenceLevel) * sorted.length);
    return sorted[index];
  }
}
