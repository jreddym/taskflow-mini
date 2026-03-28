import { useEffect, useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { supabase } from '../lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────

interface UsageRow {
  id?: string;
  agent_id: string;
  date: string;
  model?: string;
  input_tokens: number;
  output_tokens: number;
  estimated_cost?: number;
  cost_usd?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

const BUDGET = 100; // USD / month

const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'claude-opus-4-6':   { input: 15,   output: 75 },
  'claude-sonnet-4-6': { input: 3,    output: 15 },
  haiku:               { input: 0.80, output: 4  },
};

function calcCost(row: UsageRow): number {
  if (row.estimated_cost != null) return row.estimated_cost;
  if (row.cost_usd != null) return row.cost_usd;
  const model = row.model ?? 'claude-sonnet-4-6';
  const key = Object.keys(MODEL_PRICING).find((k) => model.includes(k)) ?? 'claude-sonnet-4-6';
  const p = MODEL_PRICING[key];
  return (row.input_tokens / 1_000_000) * p.input + (row.output_tokens / 1_000_000) * p.output;
}

const AGENT_COLORS: Record<string, string> = {
  jr:     '#6366f1',
  arjun:  '#3b82f6',
  priya:  '#22c55e',
  vikram: '#ef4444',
  meera:  '#f97316',
  rahul:  '#a855f7',
  nisha:  '#ec4899',
};

type TimeRange = 'daily' | 'weekly' | 'monthly';

function filterByRange(rows: UsageRow[], range: TimeRange): UsageRow[] {
  const now = new Date();
  return rows.filter((r) => {
    const d = new Date(r.date);
    if (range === 'daily') {
      return d.toDateString() === now.toDateString();
    }
    if (range === 'weekly') {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return d >= weekAgo;
    }
    // monthly
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
}

// ─── Budget Progress Bar ──────────────────────────────────────────────────

function BudgetBar({ spent }: { spent: number }) {
  const pct = Math.min((spent / BUDGET) * 100, 100);
  const color = pct < 60 ? 'bg-green-500' : pct < 80 ? 'bg-yellow-400' : 'bg-red-500';
  return (
    <div className="bg-gray-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-300">Monthly Budget</span>
        <span className="text-sm font-semibold text-white">
          ${spent.toFixed(2)} / ${BUDGET.toFixed(2)}
        </span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-3">
        <div
          className={`${color} h-3 rounded-full transition-all duration-700`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-gray-500 mt-1">{pct.toFixed(1)}% of $100/mo budget used</p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────

export default function CostTracker() {
  const [rows, setRows] = useState<UsageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<TimeRange>('monthly');

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from('api_usage')
        .select('*')
        .order('date', { ascending: true });
      if (!error && data) setRows(data as UsageRow[]);
      setLoading(false);
    }
    load();
  }, []);

  const monthlyRows = useMemo(() => filterByRange(rows, 'monthly'), [rows]);
  const filteredRows = useMemo(() => filterByRange(rows, range), [rows, range]);

  const totalSpent = useMemo(
    () => monthlyRows.reduce((sum, r) => sum + calcCost(r), 0),
    [monthlyRows]
  );

  // Build chart data: group by date, stacked by agent
  const agents = useMemo(() => [...new Set(filteredRows.map((r) => r.agent_id))], [filteredRows]);
  const chartData = useMemo(() => {
    const byDate: Record<string, Record<string, number>> = {};
    filteredRows.forEach((r) => {
      const label = range === 'monthly' ? r.date.slice(0, 7) : r.date.slice(0, 10);
      if (!byDate[label]) byDate[label] = {};
      byDate[label][r.agent_id] = (byDate[label][r.agent_id] ?? 0) + r.input_tokens + r.output_tokens;
    });
    return Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, vals]) => ({ date, ...vals }));
  }, [filteredRows, range]);

  // Agent breakdown table
  const agentBreakdown = useMemo(() => {
    const map: Record<string, { input: number; output: number; cost: number }> = {};
    filteredRows.forEach((r) => {
      if (!map[r.agent_id]) map[r.agent_id] = { input: 0, output: 0, cost: 0 };
      map[r.agent_id].input += r.input_tokens;
      map[r.agent_id].output += r.output_tokens;
      map[r.agent_id].cost += calcCost(r);
    });
    return Object.entries(map).sort(([, a], [, b]) => b.cost - a.cost);
  }, [filteredRows]);

  const filteredTotal = agentBreakdown.reduce((s, [, v]) => s + v.cost, 0);

  const tabs: { label: string; value: TimeRange }[] = [
    { label: 'Daily', value: 'daily' },
    { label: 'Weekly', value: 'weekly' },
    { label: 'Monthly', value: 'monthly' },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-white">API Usage & Cost Tracker</h1>
        <p className="text-sm text-gray-400 mt-1">Token consumption and estimated costs across all agents</p>
      </div>

      {/* Budget bar (always monthly) */}
      <BudgetBar spent={totalSpent} />

      {/* Time range tabs */}
      <div className="flex gap-2">
        {tabs.map((t) => (
          <button
            key={t.value}
            onClick={() => setRange(t.value)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              range === t.value
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-gray-400 text-sm">Loading usage data…</div>
      ) : rows.length === 0 ? (
        <div className="bg-gray-800 rounded-xl p-10 text-center">
          <p className="text-gray-300 text-base font-medium">No usage data recorded yet.</p>
          <p className="text-gray-500 text-sm mt-1">Cost tracking will populate as agents work.</p>
        </div>
      ) : (
        <>
          {/* Token usage chart */}
          <div className="bg-gray-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-300 mb-4">Token Usage by Agent</h2>
            {chartData.length === 0 ? (
              <p className="text-gray-500 text-sm">No data for this time range.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 8 }}
                    labelStyle={{ color: '#e5e7eb' }}
                    itemStyle={{ color: '#d1d5db' }}
                    formatter={(v) => [`${Number(v).toLocaleString()} tokens`]}
                  />
                  <Legend wrapperStyle={{ color: '#9ca3af', fontSize: 12 }} />
                  {agents.map((agent) => (
                    <Bar
                      key={agent}
                      dataKey={agent}
                      stackId="a"
                      fill={AGENT_COLORS[agent] ?? '#6b7280'}
                      name={agent.toUpperCase()}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Agent breakdown table */}
          <div className="bg-gray-800 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-700">
              <h2 className="text-sm font-semibold text-gray-300">Agent Breakdown</h2>
            </div>
            {agentBreakdown.length === 0 ? (
              <p className="text-gray-500 text-sm p-5">No data for this time range.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 text-xs uppercase border-b border-gray-700">
                    <th className="text-left px-5 py-2.5">Agent</th>
                    <th className="text-right px-5 py-2.5">Input Tokens</th>
                    <th className="text-right px-5 py-2.5">Output Tokens</th>
                    <th className="text-right px-5 py-2.5">Est. Cost</th>
                    <th className="text-right px-5 py-2.5">% of Budget</th>
                  </tr>
                </thead>
                <tbody>
                  {agentBreakdown.map(([agent, v]) => {
                    const pctBudget = (v.cost / BUDGET) * 100;
                    const color = AGENT_COLORS[agent] ?? '#6b7280';
                    return (
                      <tr key={agent} className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors">
                        <td className="px-5 py-3">
                          <span
                            className="px-2 py-0.5 rounded text-xs font-semibold uppercase"
                            style={{ backgroundColor: `${color}22`, color }}
                          >
                            {agent}
                          </span>
                        </td>
                        <td className="text-right px-5 py-3 text-gray-300 font-mono">
                          {v.input.toLocaleString()}
                        </td>
                        <td className="text-right px-5 py-3 text-gray-300 font-mono">
                          {v.output.toLocaleString()}
                        </td>
                        <td className="text-right px-5 py-3 text-white font-semibold">
                          ${v.cost.toFixed(4)}
                        </td>
                        <td className="text-right px-5 py-3 text-gray-400">
                          {pctBudget.toFixed(2)}%
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="bg-gray-700/40">
                    <td className="px-5 py-3 text-gray-400 font-medium">Total</td>
                    <td className="text-right px-5 py-3 text-gray-300 font-mono">
                      {agentBreakdown.reduce((s, [, v]) => s + v.input, 0).toLocaleString()}
                    </td>
                    <td className="text-right px-5 py-3 text-gray-300 font-mono">
                      {agentBreakdown.reduce((s, [, v]) => s + v.output, 0).toLocaleString()}
                    </td>
                    <td className="text-right px-5 py-3 text-white font-semibold">
                      ${filteredTotal.toFixed(4)}
                    </td>
                    <td className="text-right px-5 py-3 text-gray-400">
                      {((filteredTotal / BUDGET) * 100).toFixed(2)}%
                    </td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
