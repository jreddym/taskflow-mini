// ─── Sprint / Kanban ───────────────────────────────────────────────────────

export type SprintTaskStatus = 'backlog' | 'in_progress' | 'review' | 'done';
export type SprintTaskPriority = 'low' | 'medium' | 'high' | 'critical';

export interface SprintTask {
  id: string;
  title: string;
  description?: string;
  status: SprintTaskStatus;
  priority: SprintTaskPriority;
  assignee?: string; // agent name
  product: string; // e.g. "dental-flow", "stayhunt", "dentestock"
  sprint?: string;
  story_points?: number;
  created_at: string;
  updated_at: string;
  due_date?: string;
  tags?: string[];
}

// ─── Agents ────────────────────────────────────────────────────────────────

export type AgentStatus = 'active' | 'idle' | 'error' | 'offline';

export interface Agent {
  id: string;
  name: string;
  role: string;
  status: AgentStatus;
  current_task?: string;
  last_seen?: string;
  session_id?: string;
  model?: string;
  channel?: string;
}

// ─── Cron Jobs ─────────────────────────────────────────────────────────────

export type CronRunStatus = 'success' | 'failed' | 'running' | 'skipped';

export interface CronJob {
  id: string;
  name: string;
  enabled: boolean;
  createdAtMs: number;
  updatedAtMs: number;
  schedule: {
    kind: string;
    expr: string;
    tz?: string;
    staggerMs?: number;
  };
  sessionTarget: string;
  wakeMode?: string;
  payload?: { kind: string; message?: string };
  delivery?: { mode: string; channel?: string; to?: string };
  state?: { nextRunAtMs?: number; lastRunAtMs?: number };
}

export interface CronRun {
  id: string;
  job_id: string;
  job_name?: string;
  status: CronRunStatus;
  started_at?: string;
  startedAtMs?: number;
  finished_at?: string;
  finishedAtMs?: number;
  duration_ms?: number;
  output?: string;
  error?: string;
}

// ─── API / Cost Tracking ────────────────────────────────────────────────────

export interface ApiUsageRecord {
  id: string;
  date: string; // ISO date string
  model: string;
  provider: string; // 'anthropic' | 'openai' | etc.
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  session_id?: string;
  agent?: string;
  product?: string;
}

export interface DailyCostSummary {
  date: string;
  total_cost_usd: number;
  total_input_tokens: number;
  total_output_tokens: number;
  by_model: Record<string, { cost_usd: number; calls: number }>;
  by_agent: Record<string, { cost_usd: number; calls: number }>;
}

// ─── Activity Log ───────────────────────────────────────────────────────────

export type ActivityEventType =
  | 'task_created'
  | 'task_updated'
  | 'task_completed'
  | 'agent_message'
  | 'deploy'
  | 'error'
  | 'cron_run'
  | 'system';

export interface ActivityEvent {
  id: string;
  event_type: ActivityEventType;
  agent?: string;
  product?: string;
  title: string;
  body?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

// ─── Gateway ────────────────────────────────────────────────────────────────

export interface GatewayStatus {
  status: 'online' | 'offline' | 'degraded';
  uptime?: number; // seconds
  version?: string;
  sessions?: number;
}

export interface GatewaySession {
  id: string;
  label?: string;
  model?: string;
  channel?: string;
  created_at?: string;
  last_activity?: string;
  status?: string;
}

// ─── Brain / Memory ─────────────────────────────────────────────────────────

export interface BrainFile {
  path: string;
  name: string;
  content?: string;
  last_modified?: string;
  size_bytes?: number;
}
