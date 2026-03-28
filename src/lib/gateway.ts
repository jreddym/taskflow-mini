import type { GatewayStatus, GatewaySession, CronJob, CronRun } from '../types';

const _rawToken = import.meta.env.VITE_GATEWAY_TOKEN as string;

if (!_rawToken) {
  throw new Error(
    'Missing Gateway environment variable. Check VITE_GATEWAY_TOKEN in .env'
  );
}

// Use the Vite proxy path so browser requests route through the dev server.
// The actual gateway target (http://127.0.0.1:18789) is configured in vite.config.ts.
export const GATEWAY_URL = '/api/gateway';
export const GATEWAY_TOKEN = _rawToken;

export function getGatewayHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${GATEWAY_TOKEN}`,
    'Content-Type': 'application/json',
  };
}

// ─── Internal helpers ───────────────────────────────────────────────────────

function authHeaders(): HeadersInit {
  return getGatewayHeaders();
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${GATEWAY_URL}${path}`, {
    method: 'GET',
    headers: authHeaders(),
  });
  if (!res.ok) {
    throw new Error(`Gateway GET ${path} failed: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

async function invokeTool<T>(tool: string, params: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(`${GATEWAY_URL}/tools/invoke`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ tool, params }),
  });
  if (!res.ok) {
    throw new Error(`Gateway tool "${tool}" failed: ${res.status} ${res.statusText}`);
  }
  const json = await res.json();

  // Gateway wraps tool results: { ok: true, result: { content: [...], details: {...} } }
  if (json.ok && json.result) {
    // Prefer details (structured data) over content (text)
    if (json.result.details) return json.result.details as T;
    // Fallback: try parsing content[0].text
    if (json.result.content?.[0]?.text) {
      try { return JSON.parse(json.result.content[0].text) as T; } catch { /* fall through */ }
    }
    return json.result as T;
  }

  // If not wrapped, return as-is
  return json as T;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * GET /health — gateway health check
 */
export async function fetchGatewayStatus(): Promise<GatewayStatus> {
  try {
    const data = await get<Record<string, unknown>>('/health');
    return {
      status: 'online',
      uptime: data.uptime as number | undefined,
      version: data.version as string | undefined,
      sessions: data.sessions as number | undefined,
    };
  } catch {
    return { status: 'offline' };
  }
}

/**
 * List all active sessions via sessions.list tool call
 */
export async function listSessions(): Promise<GatewaySession[]> {
  const result = await invokeTool<{ sessions?: GatewaySession[] }>('sessions.list');
  return result.sessions ?? [];
}

/**
 * List all cron jobs via cron.list tool call
 */
export async function listCronJobs(): Promise<CronJob[]> {
  const result = await invokeTool<{ jobs?: CronJob[] }>('cron.list');
  return result.jobs ?? [];
}

/**
 * List recent cron runs, optionally filtered by job_id
 */
export async function listCronRuns(jobId?: string, limit = 50): Promise<CronRun[]> {
  const params: Record<string, unknown> = { limit };
  if (jobId) params.job_id = jobId;
  const result = await invokeTool<{ runs?: CronRun[] }>('cron.runs', params);
  return result.runs ?? [];
}

export const gateway = {
  fetchStatus: fetchGatewayStatus,
  listSessions,
  listCronJobs,
  listCronRuns,
};

export default gateway;
