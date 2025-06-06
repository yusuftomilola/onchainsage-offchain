export class KellyStrategy {
  static calculate(probability: number, winLossRatio: number): number {
    return probability - (1 - probability) / winLossRatio;
  }
}
