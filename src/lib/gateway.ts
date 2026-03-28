import type { GatewayStatus, GatewaySession, CronJob, CronRun } from '../types';

const BASE_URL = (import.meta.env.VITE_GATEWAY_URL as string)
  .replace(/^ws/, 'http')
  .replace(/\/$/, '');

const TOKEN = import.meta.env.VITE_GATEWAY_TOKEN as string;

// ─── Internal helpers ───────────────────────────────────────────────────────

function authHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${TOKEN}`,
  };
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'GET',
    headers: authHeaders(),
  });
  if (!res.ok) {
    throw new Error(`Gateway GET ${path} failed: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

async function invokeTool<T>(tool: string, params: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}/api/tools/invoke`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ tool, params }),
  });
  if (!res.ok) {
    throw new Error(`Gateway tool "${tool}" failed: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * GET /api/status — gateway health, uptime, version
 */
export async function fetchGatewayStatus(): Promise<GatewayStatus> {
  try {
    const data = await get<Record<string, unknown>>('/api/status');
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
