import { useEffect, useState, useCallback } from 'react';
import { listCronJobs, listCronRuns } from '../lib/gateway';
import type { CronJob, CronRun } from '../types';
import { RefreshCw, Calendar, Clock, CheckCircle2, XCircle, Minus } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Very lightweight cron expression → human-readable */
function humanizeCron(expr: string): string {
  if (!expr) return expr;
  const map: Record<string, string> = {
    '* * * * *':      'Every minute',
    '*/5 * * * *':    'Every 5 minutes',
    '*/10 * * * *':   'Every 10 minutes',
    '*/15 * * * *':   'Every 15 minutes',
    '*/30 * * * *':   'Every 30 minutes',
    '0 * * * *':      'Every hour',
    '0 */2 * * *':    'Every 2 hours',
    '0 */6 * * *':    'Every 6 hours',
    '0 */12 * * *':   'Every 12 hours',
    '0 0 * * *':      'Daily at midnight',
    '0 8 * * *':      'Daily at 8:00 AM',
    '0 9 * * *':      'Daily at 9:00 AM',
    '0 18 * * *':     'Daily at 6:00 PM',
    '0 0 * * 0':      'Weekly on Sunday',
    '0 0 * * 1':      'Weekly on Monday',
    '0 0 1 * *':      'Monthly on the 1st',
  };
  return map[expr] ?? expr;
}

function formatTime(iso?: string): string {
  if (!iso) return '—';
  try {
    return format(new Date(iso), 'MMM d, HH:mm');
  } catch {
    return iso;
  }
}

function timeAgo(iso?: string): string {
  if (!iso) return '—';
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return iso;
  }
}

// ─── Status indicator ────────────────────────────────────────────────────────

type RunStatus = 'success' | 'failed' | 'never' | 'running';

function StatusDot({ runStatus }: { runStatus: RunStatus }) {
  if (runStatus === 'success') {
    return (
      <div className="flex items-center gap-1.5 text-green-400">
        <CheckCircle2 size={14} />
        <span className="text-xs font-medium">Success</span>
      </div>
    );
  }
  if (runStatus === 'failed') {
    return (
      <div className="flex items-center gap-1.5 text-red-400">
        <XCircle size={14} />
        <span className="text-xs font-medium">Failed</span>
      </div>
    );
  }
  if (runStatus === 'running') {
    return (
      <div className="flex items-center gap-1.5 text-yellow-400">
        <RefreshCw size={14} className="animate-spin" />
        <span className="text-xs font-medium">Running</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5 text-gray-500">
      <Minus size={14} />
      <span className="text-xs font-medium">Never run</span>
    </div>
  );
}

// ─── Job card ────────────────────────────────────────────────────────────────

interface JobCardProps {
  job: CronJob;
  lastRun?: CronRun;
}

function JobCard({ job, lastRun }: JobCardProps) {
  const runStatus: RunStatus = lastRun
    ? (lastRun.status as RunStatus)
    : 'never';

  const borderColor =
    runStatus === 'success' ? 'border-green-700/40' :
    runStatus === 'failed'  ? 'border-red-700/40' :
    runStatus === 'running' ? 'border-yellow-700/40' :
    'border-gray-700';

  return (
    <div className={`bg-gray-800 border ${borderColor} rounded-lg p-4 flex flex-col gap-3 hover:border-gray-500 transition-colors`}>
      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-white font-medium text-sm truncate">{job.name}</div>
          {job.description && (
            <div className="text-gray-400 text-xs mt-0.5 line-clamp-2">{job.description}</div>
          )}
        </div>
        <div className="shrink-0">
          {job.status === 'paused' ? (
            <span className="text-xs px-2 py-0.5 rounded bg-yellow-900/40 text-yellow-300 border border-yellow-700/40">
              Paused
            </span>
          ) : job.status === 'disabled' ? (
            <span className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-400 border border-gray-600">
              Disabled
            </span>
          ) : (
            <span className="text-xs px-2 py-0.5 rounded bg-green-900/30 text-green-300 border border-green-700/30">
              Active
            </span>
          )}
        </div>
      </div>

      {/* Schedule */}
      <div className="flex items-center gap-1.5 text-xs text-gray-400">
        <Calendar size={12} className="text-gray-500 shrink-0" />
        <span className="font-mono">{job.schedule}</span>
        <span className="text-gray-600">·</span>
        <span>{humanizeCron(job.schedule)}</span>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-700/60" />

      {/* Run status + times */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <div className="text-gray-500 mb-1">Last run status</div>
          <StatusDot runStatus={runStatus} />
        </div>
        <div>
          <div className="text-gray-500 mb-1">Last run</div>
          <div className="text-gray-300">{timeAgo(job.last_run ?? lastRun?.started_at)}</div>
        </div>
        <div>
          <div className="text-gray-500 mb-1">Last run at</div>
          <div className="flex items-center gap-1 text-gray-400">
            <Clock size={11} />
            {formatTime(job.last_run ?? lastRun?.started_at)}
          </div>
        </div>
        <div>
          <div className="text-gray-500 mb-1">Next run</div>
          <div className="flex items-center gap-1 text-gray-400">
            <Clock size={11} />
            {formatTime(job.next_run)}
          </div>
        </div>
      </div>

      {/* Error snippet */}
      {lastRun?.error && (
        <div className="bg-red-900/20 border border-red-700/30 rounded p-2 text-xs text-red-300 font-mono truncate">
          {lastRun.error}
        </div>
      )}

      {/* Duration */}
      {lastRun?.duration_ms != null && (
        <div className="text-xs text-gray-500">
          Duration: <span className="text-gray-400 font-mono">{lastRun.duration_ms}ms</span>
        </div>
      )}
    </div>
  );
}

// ─── Empty / Offline states ─────────────────────────────────────────────────

function EmptyState({ offline }: { offline: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      {offline ? (
        <>
          <XCircle size={40} className="text-red-500 mb-3" />
          <div className="text-gray-300 font-medium">Gateway Offline</div>
          <div className="text-gray-500 text-sm mt-1">Cannot reach the gateway API to fetch cron jobs.</div>
        </>
      ) : (
        <>
          <Calendar size={40} className="text-gray-600 mb-3" />
          <div className="text-gray-300 font-medium">No cron jobs found</div>
          <div className="text-gray-500 text-sm mt-1">No scheduled jobs are configured on this gateway.</div>
        </>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CronMonitor() {
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [runs, setRuns] = useState<CronRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [jobsResult, runsResult] = await Promise.allSettled([
        listCronJobs(),
        listCronRuns(undefined, 100),
      ]);

      if (jobsResult.status === 'fulfilled') {
        setJobs(jobsResult.value);
        setOffline(false);
      } else {
        setOffline(true);
        setJobs([]);
      }

      if (runsResult.status === 'fulfilled') {
        setRuns(runsResult.value);
      }
    } finally {
      setLoading(false);
      setLastRefresh(new Date());
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 60_000);
    return () => clearInterval(interval);
  }, [refresh]);

  // Build a map of job_id -> most recent run
  const latestRunByJob: Record<string, CronRun> = {};
  for (const run of runs) {
    const existing = latestRunByJob[run.job_id];
    if (!existing || new Date(run.started_at) > new Date(existing.started_at)) {
      latestRunByJob[run.job_id] = run;
    }
  }

  const successCount = jobs.filter(j => latestRunByJob[j.id]?.status === 'success').length;
  const failedCount  = jobs.filter(j => latestRunByJob[j.id]?.status === 'failed').length;
  const idleCount    = jobs.filter(j => !latestRunByJob[j.id]).length;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Cron Monitor</h1>
          <p className="text-gray-400 text-sm mt-0.5">Scheduled jobs, run history, and failure alerts</p>
        </div>
        <div className="flex items-center gap-3">
          {lastRefresh && (
            <span className="text-xs text-gray-500">
              Refreshed {formatDistanceToNow(lastRefresh, { addSuffix: true })}
            </span>
          )}
          <button
            onClick={refresh}
            disabled={loading}
            className="flex items-center gap-1.5 bg-gray-750 hover:bg-gray-700 border border-gray-600 text-gray-300 text-xs px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary bar */}
      {!offline && jobs.length > 0 && (
        <div className="flex gap-4">
          <div className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-gray-500" />
            <span className="text-gray-300 text-sm font-medium">{jobs.length} jobs</span>
          </div>
          <div className="bg-gray-800 border border-green-700/40 rounded-lg px-4 py-3 flex items-center gap-2">
            <CheckCircle2 size={14} className="text-green-400" />
            <span className="text-green-300 text-sm font-medium">{successCount} healthy</span>
          </div>
          {failedCount > 0 && (
            <div className="bg-gray-800 border border-red-700/40 rounded-lg px-4 py-3 flex items-center gap-2">
              <XCircle size={14} className="text-red-400" />
              <span className="text-red-300 text-sm font-medium">{failedCount} failed</span>
            </div>
          )}
          <div className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 flex items-center gap-2">
            <Minus size={14} className="text-gray-500" />
            <span className="text-gray-400 text-sm font-medium">{idleCount} never run</span>
          </div>
        </div>
      )}

      {/* Content */}
      {loading && jobs.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw size={24} className="animate-spin text-gray-500" />
        </div>
      ) : offline || jobs.length === 0 ? (
        <EmptyState offline={offline} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {jobs.map(job => (
            <JobCard key={job.id} job={job} lastRun={latestRunByJob[job.id]} />
          ))}
        </div>
      )}

      <p className="text-xs text-gray-600 text-center">Auto-refreshes every 60 seconds</p>
    </div>
  );
}
