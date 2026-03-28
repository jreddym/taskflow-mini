import { useState, useEffect, useCallback } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import {
  ChevronRight,
  ChevronDown,
  FileText,
  Folder,
  FolderOpen,
  Star,
  Lock,
  Loader2,
  AlertCircle,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────

interface FileNode {
  name: string;
  path?: string;        // set for files only
  children?: FileNode[];
  starred?: boolean;
}

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
  const [tree, setTree] = useState<FileNode[]>([]);
  const [treeLoading, setTreeLoading] = useState(true);
  const [treeError, setTreeError] = useState<string | null>(null);

  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [content, setContent] = useState<string | null>(null);
  const [contentLoading, setContentLoading] = useState(false);
  const [contentError, setContentError] = useState<string | null>(null);

  // Fetch file tree on mount
  useEffect(() => {
    setTreeLoading(true);
    setTreeError(null);
    fetch('/api/brain/tree')
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load tree (${res.status})`);
        return res.json() as Promise<FileNode[]>;
      })
      .then((data) => {
        setTree(data);
        // Auto-select priorities/current-week.md on first render
        setSelectedPath('priorities/current-week.md');
      })
      .catch((err: unknown) => {
        setTreeError(err instanceof Error ? err.message : 'Failed to load file tree');
      })
      .finally(() => setTreeLoading(false));
  }, []);

  // Fetch file content when selection changes
  const fetchContent = useCallback((filePath: string) => {
    setContentLoading(true);
    setContentError(null);
    setContent(null);
    fetch(`/api/brain/file?path=${encodeURIComponent(filePath)}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load file (${res.status})`);
        return res.text();
      })
      .then((text) => setContent(text))
      .catch((err: unknown) => {
        setContentError(err instanceof Error ? err.message : 'Failed to load file content');
      })
      .finally(() => setContentLoading(false));
  }, []);

  useEffect(() => {
    if (selectedPath) {
      fetchContent(selectedPath);
    }
  }, [selectedPath, fetchContent]);

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
          {treeLoading && (
            <div className="flex items-center gap-2 px-2 py-3 text-gray-400 text-sm">
              <Loader2 size={14} className="animate-spin" />
              <span>Loading…</span>
            </div>
          )}
          {treeError && (
            <div className="flex items-start gap-2 px-2 py-3 text-red-400 text-xs">
              <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
              <span>{treeError}</span>
            </div>
          )}
          {!treeLoading && !treeError && tree.length === 0 && (
            <p className="px-2 py-3 text-gray-500 text-sm">No files found.</p>
          )}
          {!treeLoading && !treeError && tree.map((node) => (
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
            ) : contentLoading ? (
              <div className="flex items-center justify-center h-full gap-2 text-gray-400 text-sm">
                <Loader2 size={16} className="animate-spin" />
                <span>Loading file…</span>
              </div>
            ) : contentError ? (
              <div className="flex items-center justify-center h-full gap-2 text-red-400 text-sm">
                <AlertCircle size={16} />
                <span>{contentError}</span>
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
