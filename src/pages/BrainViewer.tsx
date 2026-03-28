import { useState } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import {
  ChevronRight,
  ChevronDown,
  FileText,
  Folder,
  FolderOpen,
  Star,
  Lock,
} from 'lucide-react';

// ─── Hardcoded File Contents ──────────────────────────────────────────────

const FILE_CONTENTS: Record<string, string> = {
  'priorities/current-week.md': `# Weekly Priorities

## Priority 1: Dental Flow — Fix SSR/indexability on dentalflow.co.in
## Priority 2: Dental Flow — Visual dental charting UI Phase 1
## Priority 3: StayHunt — UI polish pass
## Priority 4: Dentestock — UI polish pass
`,
  'projects/command-centre.md': `# PureAura Command Centre

## Overview
React dashboard to manage the PureAura Technologies AI dev team. A real internal tool used daily.

## Tech Stack
- **Frontend:** React + TypeScript + Tailwind CSS (Vite)
- **Backend:** Supabase (pureaura-sprint-board project)
- **Repo:** ~/repos/taskflow-mini | GitHub: jreddym/taskflow-mini
- **Dark mode by default, desktop-first**

## Data Sources
1. **OpenClaw Gateway API** — ws://127.0.0.1:18789 (auth token in ~/.openclaw/openclaw.json → gateway.auth.token)
2. **Supabase** — sprint_board, api_usage, activity_log tables (creds in sprint-board-config.md)

## 6 Sections
1. **Agent Status Panel** — 7 agents status, gateway health, auto-refresh 30s
2. **Sprint Board (Kanban)** — Drag-drop, filters, realtime, create tasks
3. **API Usage & Cost Tracker** — Token usage, cost calc, budget bar ($100/mo)
4. **Cron Job Monitor** — 8 jobs, status indicators
5. **Activity Feed** — Real-time agent action log
6. **Brain Folder Viewer** — Markdown file viewer (read-only)

## Layout
- Top bar: title + gateway status indicator (green dot)
- Left sidebar: section navigation
- Main: selected section content

## Sprint Plan (5 days)
- **Day 1:** Project scaffold (Arjun) + Supabase/Gateway API layer (Priya)
- **Day 2:** Agent Status Panel + Kanban start + Realtime subscriptions
- **Day 3:** Kanban finish + Cost Tracker + Cron Monitor + Brain file server
- **Day 4:** Activity Feed + Brain Viewer + QA begins + Deployment setup
- **Day 5:** QA complete + Security review + Docs + Polish

## Team Assignments
- **ARJUN** (6 tasks): All UI sections
- **PRIYA** (4 tasks): Supabase client, Gateway API, Realtime, Brain file server
- **VIKRAM** (2 tasks): Full QA pass + Security review
- **MEERA** (1 task): Deployment setup
- **RAHUL** (1 task): Documentation

## Supabase Tables
- sprint_board (existing)
- api_usage (created 2026-03-28)
- activity_log (created 2026-03-28)

## Cost Model (per 1M tokens)
| Model | Input | Output |
|-------|-------|--------|
| Opus | $15 | $75 |
| Sonnet | $3 | $15 |
| Haiku | $0.80 | $4 |
| Monthly budget | $100 | |
`,
};

// ─── File Tree Definition ─────────────────────────────────────────────────

interface FileNode {
  name: string;
  path?: string;        // set for files only
  children?: FileNode[];
  starred?: boolean;
}

const TREE: FileNode[] = [
  {
    name: 'brain',
    children: [
      {
        name: 'priorities',
        children: [
          { name: 'current-week.md', path: 'priorities/current-week.md', starred: true },
        ],
      },
      {
        name: 'projects',
        children: [
          { name: 'command-centre.md', path: 'projects/command-centre.md' },
        ],
      },
      { name: 'agents', children: [] },
      { name: 'decisions', children: [] },
      { name: 'meetings', children: [] },
      { name: 'retrospectives', children: [] },
    ],
  },
];

// ─── Tree Node Component ──────────────────────────────────────────────────

interface TreeNodeProps {
  node: FileNode;
  depth: number;
  selected: string | null;
  onSelect: (path: string) => void;
}

function TreeNode({ node, depth, selected, onSelect }: TreeNodeProps) {
  const isFolder = !!node.children;
  const [open, setOpen] = useState(depth < 2); // auto-expand top levels

  const isFile = !isFolder;
  const isSelected = isFile && node.path === selected;

  if (isFile) {
    return (
      <button
        onClick={() => node.path && onSelect(node.path)}
        className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded text-left text-sm transition-colors ${
          isSelected
            ? 'bg-indigo-600/30 text-indigo-300'
            : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
        }`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        <FileText size={13} className="flex-shrink-0 text-gray-500" />
        <span className="truncate">{node.name}</span>
        {node.starred && (
          <Star size={12} className="flex-shrink-0 text-yellow-400 fill-yellow-400 ml-0.5" />
        )}
      </button>
    );
  }

  // Folder
  const Icon = open ? FolderOpen : Folder;
  const ChevIcon = open ? ChevronDown : ChevronRight;

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded text-left text-sm text-gray-400 hover:bg-gray-700/40 hover:text-gray-200 transition-colors"
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        <ChevIcon size={12} className="flex-shrink-0" />
        <Icon size={13} className="flex-shrink-0 text-yellow-600/80" />
        <span className="font-medium">{node.name}</span>
      </button>
      {open && node.children && node.children.length > 0 && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.name}
              node={child}
              depth={depth + 1}
              selected={selected}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Markdown Renderer Styles ─────────────────────────────────────────────

const mdComponents: Components = {
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h1 className="text-2xl font-bold text-white mb-4 pb-2 border-b border-gray-700">{children}</h1>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 className="text-lg font-semibold text-indigo-300 mt-6 mb-2">{children}</h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="text-base font-semibold text-gray-200 mt-4 mb-1">{children}</h3>
  ),
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="text-gray-300 leading-relaxed mb-3">{children}</p>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="list-disc list-inside text-gray-300 mb-3 space-y-1">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="list-decimal list-inside text-gray-300 mb-3 space-y-1">{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="text-gray-300">{children}</li>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold text-white">{children}</strong>
  ),
  code: ({ children, className }: { children?: React.ReactNode; className?: string }) => {
    const isBlock = className?.includes('language-');
    if (isBlock) {
      return (
        <code className="block bg-gray-900 text-green-300 text-xs font-mono rounded-lg p-4 overflow-x-auto my-3">
          {children}
        </code>
      );
    }
    return (
      <code className="bg-gray-900 text-green-300 text-xs font-mono rounded px-1.5 py-0.5">
        {children}
      </code>
    );
  },
  pre: ({ children }: { children?: React.ReactNode }) => (
    <pre className="bg-gray-900 text-green-300 text-xs font-mono rounded-lg p-4 overflow-x-auto my-3">
      {children}
    </pre>
  ),
  table: ({ children }: { children?: React.ReactNode }) => (
    <div className="overflow-x-auto my-3">
      <table className="w-full text-sm border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }: { children?: React.ReactNode }) => (
    <thead className="bg-gray-700/50">{children}</thead>
  ),
  th: ({ children }: { children?: React.ReactNode }) => (
    <th className="text-left px-3 py-2 text-gray-300 font-semibold border-b border-gray-600">{children}</th>
  ),
  td: ({ children }: { children?: React.ReactNode }) => (
    <td className="px-3 py-2 text-gray-300 border-b border-gray-700/50">{children}</td>
  ),
  a: ({ children, href }: { children?: React.ReactNode; href?: string }) => (
    <a href={href} className="text-indigo-400 hover:text-indigo-300 underline" target="_blank" rel="noreferrer">
      {children}
    </a>
  ),
  hr: () => <hr className="border-gray-700 my-4" />,
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="border-l-4 border-indigo-500 pl-4 text-gray-400 italic my-3">
      {children}
    </blockquote>
  ),
};

// ─── Main Component ───────────────────────────────────────────────────────

export default function BrainViewer() {
  const [selectedPath, setSelectedPath] = useState<string>('priorities/current-week.md');

  const content = selectedPath ? FILE_CONTENTS[selectedPath] : null;
  const fileName = selectedPath ? selectedPath.split('/').pop() : null;

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Brain Viewer</h1>
          <p className="text-sm text-gray-400 mt-1">Browse and read agent knowledge files</p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-700 rounded-full">
          <Lock size={11} className="text-gray-400" />
          <span className="text-xs text-gray-400 font-medium">Read Only</span>
        </div>
      </div>

      {/* Star card for current-week.md */}
      <button
        onClick={() => setSelectedPath('priorities/current-week.md')}
        className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors text-left ${
          selectedPath === 'priorities/current-week.md'
            ? 'border-yellow-500/50 bg-yellow-500/10'
            : 'border-gray-700 bg-gray-800 hover:border-yellow-600/40 hover:bg-yellow-500/5'
        }`}
      >
        <Star size={16} className="text-yellow-400 fill-yellow-400 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-white">priorities/current-week.md</p>
          <p className="text-xs text-gray-400">This week's top priorities</p>
        </div>
      </button>

      {/* Split pane */}
      <div className="flex gap-4 flex-1 min-h-0" style={{ height: 'calc(100vh - 280px)' }}>
        {/* Left: file tree */}
        <div className="w-56 flex-shrink-0 bg-gray-800 rounded-xl overflow-y-auto p-2">
          {TREE.map((node) => (
            <TreeNode
              key={node.name}
              node={node}
              depth={0}
              selected={selectedPath}
              onSelect={setSelectedPath}
            />
          ))}
        </div>

        {/* Right: content */}
        <div className="flex-1 bg-gray-800 rounded-xl overflow-hidden flex flex-col min-w-0">
          {/* File title bar */}
          {selectedPath && (
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-700 flex-shrink-0">
              <div className="flex items-center gap-2">
                <FileText size={14} className="text-gray-400" />
                <span className="text-sm font-medium text-gray-300">{fileName}</span>
                {selectedPath === 'priorities/current-week.md' && (
                  <Star size={12} className="text-yellow-400 fill-yellow-400" />
                )}
              </div>
              <span className="text-xs text-gray-500 font-mono">{selectedPath}</span>
            </div>
          )}

          {/* Markdown */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {!selectedPath ? (
              <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                Select a file from the tree to view its contents
              </div>
            ) : content == null ? (
              <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                No content available for this file yet.
              </div>
            ) : (
              <ReactMarkdown components={mdComponents}>
                {content}
              </ReactMarkdown>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
