import { useEffect, useState, useCallback } from 'react';
import { listSessions } from '../lib/gateway';
import type { GatewayStatus, GatewaySession } from '../types';
import { RefreshCw, Wifi, WifiOff, Clock, Server, Cpu } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

// ─── Static agent definitions ──────────────────────────────────────────────

interface AgentDef {
  name: string;
  role: string;
  model: string;
  emoji: string;
}

const AGENTS: AgentDef[] = [
  { name: 'JR',    role: 'Tech Lead',        model: 'claude-opus-4-6',   emoji: '🧠' },
  { name: 'ARJUN', role: 'Frontend',         model: 'claude-sonnet-4-6', emoji: '🎨' },
  { name: 'PRIYA', role: 'Backend',          model: 'claude-sonnet-4-6', emoji: '⚙️' },
  { name: 'VIKRAM',role: 'QA',               model: 'claude-sonnet-4-6', emoji: '🔍' },
  { name: 'MEERA', role: 'DevOps',           model: 'claude-sonnet-4-6', emoji: '🚀' },
  { name: 'RAHUL', role: 'Product',          model: 'claude-sonnet-4-6', emoji: '📊' },
  { name: 'NISHA', role: 'Customer Success', model: 'claude-sonnet-4-6', emoji: '💬' },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const parts: string[] = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  parts.push(`${m}m`);
  return parts.join(' ');
}

function sessionMatchesAgent(session: GatewaySession, agentName: string): boolean {
  const label = (session.label ?? '').toLowerCase();
  const channel = (session.channel ?? '').toLowerCase();
  const name = agentName.toLowerCase();
  return label.includes(name) || channel.includes(name);
}

function getAgentSession(sessions: GatewaySession[], agentName: string): GatewaySession | undefined {
  return sessions.find(s => sessionMatchesAgent(s, agentName));
}

// ─── Sub-components ──────────────────────────────────────────────────────────

interface AgentCardProps {
  agent: AgentDef;
  session?: GatewaySession;
  gatewayOnline: boolean;
}

function AgentCard({ agent, session, gatewayOnline }: AgentCardProps) {
  const isOnline = gatewayOnline && !!session;
  const lastActive = session?.last_activity;

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 flex flex-col gap-3 hover:border-gray-600 transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">{agent.emoji}</span>
          <div>
            <div className="text-white font-semibold text-sm">{agent.name}</div>
            <div className="text-gray-400 text-xs">{agent.role}</div>
          </div>
        </div>
        {/* Status dot */}
        <div className="flex items-center gap-1.5">
          <div
            className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-green-400 shadow-[0_0_6px_#4ade80]' : 'bg-gray-600'}`}
          />
          <span className={`text-xs font-medium ${isOnline ? 'text-green-400' : 'text-gray-500'}`}>
            {gatewayOnline ? (isOnline ? 'Online' : 'Idle') : '—'}
          </span>
        </div>
      </div>

      {/* Model badge */}
      <div className="flex items-center gap-1.5">
        <Cpu size={12} className="text-gray-500" />
        <span className="text-xs text-gray-400 font-mono bg-gray-750 px-2 py-0.5 rounded">
          {agent.model}
        </span>
      </div>

      {/* Last active */}
      <div className="flex items-center gap-1.5 text-xs text-gray-500">
        <Clock size={11} />
        {lastActive ? (
          <span>
            Active {formatDistanceToNow(new Date(lastActive), { addSuffix: true })}
          </span>
        ) : session?.created_at ? (
          <span>
            Session started {formatDistanceToNow(new Date(session.created_at), { addSuffix: true })}
          </span>
        ) : (
          <span>No recent activity</span>
        )}
      </div>

      {/* Session label if any */}
      {session?.label && (
        <div className="text-xs text-gray-500 truncate border-t border-gray-700 pt-2">
          {session.label}
        </div>
      )}
    </div>
  );
}

// ─── Gateway Health ──────────────────────────────────────────────────────────

interface GatewayHealthProps {
  status: GatewayStatus;
  rawData: Record<string, unknown> | null;
}

function GatewayHealth({ status, rawData }: GatewayHealthProps) {
  const memory = rawData?.memory as { rss?: number; heapUsed?: number; heapTotal?: number } | undefined;

  const toMB = (bytes?: number) =>
    bytes != null ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : '—';

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <Server size={16} className="text-gray-400" />
        <span className="text-sm font-semibold text-gray-200">Gateway Health</span>
        <div
          className={`ml-auto flex items-center gap-1.5 text-xs font-medium ${
            status.status === 'online' ? 'text-green-400' : 'text-red-400'
          }`}
        >
          {status.status === 'online' ? <Wifi size={13} /> : <WifiOff size={13} />}
          {status.status === 'online' ? 'Online' : 'Offline'}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
        <div className="flex justify-between">
          <span className="text-gray-500">Uptime</span>
          <span className="text-gray-200 font-mono">
            {status.uptime != null ? formatUptime(status.uptime) : '—'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Node</span>
          <span className="text-gray-200 font-mono">{status.version ?? '—'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Active sessions</span>
          <span className="text-gray-200 font-mono">{status.sessions ?? '—'}</span>
        </div>
        {memory && (
          <>
            <div className="flex justify-between">
              <span className="text-gray-500">Heap used</span>
              <span className="text-gray-200 font-mono">{toMB(memory.heapUsed)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Heap total</span>
              <span className="text-gray-200 font-mono">{toMB(memory.heapTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">RSS</span>
              <span className="text-gray-200 font-mono">{toMB(memory.rss)}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AgentStatus() {
  const [gatewayStatus, setGatewayStatus] = useState<GatewayStatus>({ status: 'offline' });
  const [rawData, setRawData] = useState<Record<string, unknown> | null>(null);
  const [sessions, setSessions] = useState<GatewaySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const BASE_URL = (import.meta.env.VITE_GATEWAY_URL as string)
    .replace(/^ws/, 'http')
    .replace(/\/$/, '');
  const TOKEN = import.meta.env.VITE_GATEWAY_TOKEN as string;

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch raw status for memory/node data
      const [statusResult, sessionsResult] = await Promise.allSettled([
        (async () => {
          const res = await fetch(`${BASE_URL}/api/status`, {
            headers: { Authorization: `Bearer ${TOKEN}` },
          });
          if (!res.ok) throw new Error('Gateway unreachable');
          return res.json() as Promise<Record<string, unknown>>;
        })(),
        listSessions(),
      ]);

      if (statusResult.status === 'fulfilled') {
        const d = statusResult.value;
        setRawData(d);
        setGatewayStatus({
          status: 'online',
          uptime: d.uptime as number | undefined,
          version: d.version as string | undefined,
          sessions: d.sessions as number | undefined,
        });
      } else {
        setGatewayStatus({ status: 'offline' });
        setRawData(null);
      }

      if (sessionsResult.status === 'fulfilled') {
        setSessions(sessionsResult.value);
      }
    } finally {
      setLoading(false);
      setLastRefresh(new Date());
    }
  }, [BASE_URL, TOKEN]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30_000);
    return () => clearInterval(interval);
  }, [refresh]);

  const gatewayOnline = gatewayStatus.status === 'online';

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Agent Status</h1>
          <p className="text-gray-400 text-sm mt-0.5">Live view of all 7 agents and their sessions</p>
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

      {/* Gateway offline banner */}
      {!gatewayOnline && !loading && (
        <div className="flex items-center gap-3 bg-red-900/30 border border-red-700/50 rounded-lg px-4 py-3 text-sm text-red-300">
          <WifiOff size={16} />
          <span>Gateway is offline — agent sessions unavailable. Status shown based on static definitions.</span>
        </div>
      )}

      {/* Gateway Health */}
      <GatewayHealth status={gatewayStatus} rawData={rawData} />

      {/* Agent Cards */}
      <div>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Agents</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {AGENTS.map(agent => (
            <AgentCard
              key={agent.name}
              agent={agent}
              session={getAgentSession(sessions, agent.name)}
              gatewayOnline={gatewayOnline}
            />
          ))}
        </div>
      </div>

      {/* Auto-refresh note */}
      <p className="text-xs text-gray-600 text-center">Auto-refreshes every 30 seconds</p>
    </div>
  );
}
