/** Resolved backend API base URL (Railway public domain, not the Railway dashboard). */
export function getApiUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
}

export function isMisconfiguredApiUrl(url: string): boolean {
  if (!url || url.includes("localhost")) return false;
  if (url.includes("railway.com/project")) return true;
  if (!url.includes(".up.railway.app") && url.startsWith("https://railway.com")) return true;
  return false;
}

export function apiUrlSetupHint(): string {
  return (
    "Set NEXT_PUBLIC_API_URL on Netlify to your Railway public domain " +
    "(e.g. https://your-service.up.railway.app/health must return {\"status\":\"ok\"}). " +
    "Do not use a railway.com/project/... dashboard URL. Redeploy Netlify after changing env vars."
  );
}
