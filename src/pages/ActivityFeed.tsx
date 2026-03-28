import { useEffect, useState, useCallback, useRef } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  CheckCircle,
  PlusCircle,
  Layers,
  Database,
  ArrowRight,
  Bug,
  GitPullRequest,
  Activity,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────

interface ActivityRow {
  id: string;
  timestamp: string;
  agent_id: string;
  action_type: string;
  description: string;
  product?: string;
  metadata?: Record<string, unknown>;
}

// ─── Constants ────────────────────────────────────────────────────────────

const AGENT_COLORS: Record<string, { bg: string; text: string }> = {
  jr:     { bg: '#312e81', text: '#a5b4fc' },
  arjun:  { bg: '#1e3a8a', text: '#93c5fd' },
  priya:  { bg: '#14532d', text: '#86efac' },
  vikram: { bg: '#7f1d1d', text: '#fca5a5' },
  meera:  { bg: '#7c2d12', text: '#fdba74' },
  rahul:  { bg: '#581c87', text: '#d8b4fe' },
  nisha:  { bg: '#831843', text: '#f9a8d4' },
};

const ACTION_ICONS: Record<string, React.ElementType> = {
  task_completed:  CheckCircle,
  task_created:    PlusCircle,
  sprint_created:  Layers,
  tables_created:  Database,
  status_changed:  ArrowRight,
  bug_filed:       Bug,
  pr_created:      GitPullRequest,
};

const ALL_AGENTS = ['jr', 'arjun', 'priya', 'vikram', 'meera', 'rahul', 'nisha'];
const PAGE_SIZE = 50;

// ─── Helper ───────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return iso;
  }
}

// ─── Activity Entry ───────────────────────────────────────────────────────

function Entry({ row }: { row: ActivityRow }) {
  const colors = AGENT_COLORS[row.agent_id] ?? { bg: '#1f2937', text: '#9ca3af' };
  const Icon = ACTION_ICONS[row.action_type] ?? Activity;
  return (
    <div className="flex items-start gap-3 px-5 py-3.5 border-b border-gray-700/60 hover:bg-gray-700/20 transition-colors">
      {/* Icon */}
      <div className="mt-0.5 flex-shrink-0 text-gray-400">
        <Icon size={16} />
      </div>
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Agent badge */}
          <span
            className="px-2 py-0.5 rounded text-xs font-bold uppercase"
            style={{ backgroundColor: colors.bg, color: colors.text }}
          >
            {row.agent_id}
          </span>
          {/* Product badge */}
          {row.product && (
            <span className="px-2 py-0.5 rounded text-xs bg-gray-700 text-gray-300">
              {row.product}
            </span>
          )}
          {/* Action type */}
          <span className="text-xs text-gray-500">{row.action_type.replace(/_/g, ' ')}</span>
          {/* Time */}
          <span className="text-xs text-gray-600 ml-auto">{relativeTime(row.timestamp)}</span>
        </div>
        <p className="text-sm text-gray-300 mt-1 leading-snug">{row.description}</p>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────

export default function ActivityFeed() {
  const [entries, setEntries] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [agentFilter, setAgentFilter] = useState<string>('all');
  const [productFilter, setProductFilter] = useState<string>('');
  const [products, setProducts] = useState<string[]>([]);
  const offsetRef = useRef(0);

  // Build query
  const buildQuery = useCallback(
    (from: number) => {
      let q = supabase
        .from('activity_log')
        .select('*')
        .order('timestamp', { ascending: false })
        .range(from, from + PAGE_SIZE - 1);
      if (agentFilter !== 'all') q = q.eq('agent_id', agentFilter);
      if (productFilter) q = q.eq('product', productFilter);
      return q;
    },
    [agentFilter, productFilter]
  );

  // Initial load + on filter change
  useEffect(() => {
    async function load() {
      setLoading(true);
      offsetRef.current = 0;
      const { data } = await buildQuery(0);
      const rows = (data ?? []) as ActivityRow[];
      setEntries(rows);
      setHasMore(rows.length === PAGE_SIZE);
      offsetRef.current = rows.length;
      // Collect unique products
      const { data: allData } = await supabase
        .from('activity_log')
        .select('product')
        .not('product', 'is', null);
      if (allData) {
        const unique = [...new Set((allData as { product: string }[]).map((r) => r.product).filter(Boolean))];
        setProducts(unique);
      }
      setLoading(false);
    }
    load();
  }, [buildQuery]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('activity_log_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'activity_log' },
        (payload) => {
          const newRow = payload.new as ActivityRow;
          // Only prepend if matches current filters
          if (agentFilter !== 'all' && newRow.agent_id !== agentFilter) return;
          if (productFilter && newRow.product !== productFilter) return;
          setEntries((prev) => [newRow, ...prev]);
          offsetRef.current += 1;
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [agentFilter, productFilter]);

  // Load more
  async function loadMore() {
    setLoadingMore(true);
    const { data } = await buildQuery(offsetRef.current);
    const rows = (data ?? []) as ActivityRow[];
    setEntries((prev) => [...prev, ...rows]);
    setHasMore(rows.length === PAGE_SIZE);
    offsetRef.current += rows.length;
    setLoadingMore(false);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-white">Activity Feed</h1>
        <p className="text-sm text-gray-400 mt-1">Real-time log of agent actions and system events</p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        {/* Agent filter */}
        <select
          value={agentFilter}
          onChange={(e) => setAgentFilter(e.target.value)}
          className="bg-gray-800 border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="all">All Agents</option>
          {ALL_AGENTS.map((a) => (
            <option key={a} value={a}>{a.toUpperCase()}</option>
          ))}
        </select>

        {/* Product filter */}
        <select
          value={productFilter}
          onChange={(e) => setProductFilter(e.target.value)}
          className="bg-gray-800 border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">All Products</option>
          {products.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>

        <div className="ml-auto flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-gray-400">Live</span>
        </div>
      </div>

      {/* Feed */}
      <div className="bg-gray-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading activity…</div>
        ) : entries.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-gray-300 font-medium">No activity yet</p>
            <p className="text-gray-500 text-sm mt-1">Agent actions will appear here in real time.</p>
          </div>
        ) : (
          <>
            {entries.map((row) => (
              <Entry key={row.id} row={row} />
            ))}
            {hasMore && (
              <div className="p-4 text-center border-t border-gray-700">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm transition-colors disabled:opacity-50"
                >
                  {loadingMore ? 'Loading…' : 'Load more'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
