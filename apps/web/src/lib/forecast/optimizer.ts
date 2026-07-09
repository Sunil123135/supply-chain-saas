export function getOptimizerUrl(): string {
  return (
    process.env.OPTIMIZER_URL ??
    process.env.NEXT_PUBLIC_OPTIMIZER_URL ??
    "http://localhost:8001"
  );
}

export async function fetchOptimizer(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const url = `${getOptimizerUrl().replace(/\/$/, "")}${path}`;
  return fetch(url, { ...init, next: { revalidate: 0 } });
}
