export function whiteEvaluationPercent(cp: number, mate?: number) {
  if (mate !== undefined) return mate > 0 || (mate === 0 && cp >= 0) ? 100 : 0;
  return Math.max(2, Math.min(98, 50 + 48 * Math.tanh(cp / 450)));
}
