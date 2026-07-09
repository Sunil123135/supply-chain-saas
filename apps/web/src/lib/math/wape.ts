export function wape(actual: number[], forecast: number[]): number {
  const denom = actual.reduce((s, a) => s + Math.abs(a), 0);
  if (denom === 0) return 0;
  const num = actual.reduce((s, a, i) => s + Math.abs(a - (forecast[i] ?? 0)), 0);
  return Math.round((num / denom) * 1000) / 10;
}

export function mape(actual: number[], forecast: number[]): number {
  let sum = 0;
  let n = 0;
  for (let i = 0; i < actual.length; i++) {
    const a = actual[i]!;
    if (a === 0) continue;
    sum += Math.abs((a - (forecast[i] ?? 0)) / a);
    n++;
  }
  return n > 0 ? Math.round((sum / n) * 1000) / 10 : 0;
}
