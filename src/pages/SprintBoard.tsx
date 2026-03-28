import { useEffect, useState, useCallback, useRef } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDroppable } from '@dnd-kit/core';
import { supabase } from '../lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { Plus, X, RefreshCw, Loader2 } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type Product = 'dental_flow' | 'stayhunt' | 'dentestock' | 'infrastructure' | 'general';
type TaskType = 'feature' | 'bug' | 'chore' | 'spike' | 'hotfix';
type Severity = 'p0' | 'p1' | 'p2' | 'p3';
type BoardStatus = 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'qa_testing' | 'staging' | 'production_ready' | 'done';

interface Task {
  id: string;
  title: string;
  description?: string;
  product: Product;
  type: TaskType;
  severity?: Severity;
  status: BoardStatus;
  assigned_to?: string;
  assigned_by?: string;
  pr_link?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const COLUMNS: { id: BoardStatus; label: string }[] = [
  { id: 'backlog',           label: 'Backlog' },
  { id: 'todo',              label: 'Todo' },
  { id: 'in_progress',       label: 'In Progress' },
  { id: 'in_review',         label: 'In Review' },
  { id: 'qa_testing',        label: 'QA Testing' },
  { id: 'staging',           label: 'Staging' },
  { id: 'production_ready',  label: 'Prod Ready' },
  { id: 'done',              label: 'Done' },
];

const AGENTS = ['JR', 'ARJUN', 'PRIYA', 'VIKRAM', 'MEERA', 'RAHUL', 'NISHA'];

const PRODUCT_COLORS: Record<Product, string> = {
  dental_flow:    'bg-blue-700/40 text-blue-300 border-blue-600/40',
  stayhunt:       'bg-green-700/40 text-green-300 border-green-600/40',
  dentestock:     'bg-orange-700/40 text-orange-300 border-orange-600/40',
  infrastructure: 'bg-purple-700/40 text-purple-300 border-purple-600/40',
  general:        'bg-gray-700/40 text-gray-300 border-gray-600/40',
};

const PRODUCT_LABELS: Record<Product, string> = {
  dental_flow:    'Dental Flow',
  stayhunt:       'StayHunt',
  dentestock:     'Dentestock',
  infrastructure: 'Infra',
  general:        'General',
};

const SEVERITY_COLORS: Record<Severity, string> = {
  p0: 'bg-red-700/50 text-red-200 border-red-600/50',
  p1: 'bg-orange-700/50 text-orange-200 border-orange-600/50',
  p2: 'bg-yellow-700/50 text-yellow-200 border-yellow-600/50',
  p3: 'bg-gray-700/50 text-gray-300 border-gray-600/50',
};

// ─── Task Card ────────────────────────────────────────────────────────────────

function TaskCard({ task, isDragging = false }: { task: Task; isDragging?: boolean }) {
  const age = formatDistanceToNow(new Date(task.created_at), { addSuffix: false });

  return (
    <div
      className={`bg-gray-750 border border-gray-600 rounded-lg p-3 flex flex-col gap-2 cursor-grab active:cursor-grabbing select-none ${
        isDragging ? 'opacity-90 shadow-2xl ring-2 ring-indigo-500' : 'hover:border-gray-500'
      } transition-colors`}
    >
      {/* Badges row */}
      <div className="flex flex-wrap gap-1">
        <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${PRODUCT_COLORS[task.product]}`}>
          {PRODUCT_LABELS[task.product]}
        </span>
        {task.type === 'bug' && task.severity && (
          <span className={`text-xs px-1.5 py-0.5 rounded border font-medium uppercase ${SEVERITY_COLORS[task.severity]}`}>
            {task.severity}
          </span>
        )}
      </div>

      {/* Title */}
      <div className="text-gray-100 text-sm font-medium leading-snug line-clamp-2">{task.title}</div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-0.5">
        <span className="text-xs text-gray-500">{age} ago</span>
        {task.assigned_to && (
          <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center text-xs text-white font-bold shrink-0">
            {task.assigned_to.charAt(0)}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sortable Task Card (DnD) ─────────────────────────────────────────────────

function SortableTaskCard({ task }: { task: Task }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard task={task} />
    </div>
  );
}

// ─── Column ───────────────────────────────────────────────────────────────────

function KanbanColumn({ column, tasks }: { column: typeof COLUMNS[number]; tasks: Task[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div className="flex flex-col gap-2 min-w-0 w-48 shrink-0">
      {/* Column header */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{column.label}</span>
        <span className="text-xs text-gray-600 bg-gray-800 border border-gray-700 rounded px-1.5 py-0.5">
          {tasks.length}
        </span>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={`flex flex-col gap-2 min-h-20 rounded-lg p-2 border transition-colors ${
          isOver
            ? 'bg-indigo-900/20 border-indigo-600/50'
            : 'bg-gray-800/50 border-gray-700/50'
        }`}
      >
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map(task => (
            <SortableTaskCard key={task.id} task={task} />
          ))}
        </SortableContext>
        {tasks.length === 0 && (
          <div className="flex items-center justify-center h-16 text-gray-600 text-xs">
            Drop here
          </div>
        )}
      </div>
    </div>
  );
}

// ─── New Task Modal ───────────────────────────────────────────────────────────

interface NewTaskModalProps {
  onClose: () => void;
  onCreated: () => void;
}

function NewTaskModal({ onClose, onCreated }: NewTaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [product, setProduct] = useState<Product>('general');
  const [type, setType] = useState<TaskType>('feature');
  const [severity, setSeverity] = useState<Severity>('p3');
  const [assignedTo, setAssignedTo] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError('Title is required'); return; }
    setSaving(true);
    setError('');
    try {
      const { error: dbErr } = await supabase.from('sprint_board').insert({
        title: title.trim(),
        description: description.trim() || null,
        product,
        type,
        severity: type === 'bug' ? severity : null,
        status: 'backlog',
        assigned_to: assignedTo || null,
        assigned_by: 'JR',
      });
      if (dbErr) throw new Error(dbErr.message);
      onCreated();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create task');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 border border-gray-600 rounded-xl w-full max-w-lg shadow-2xl">
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
          <h2 className="text-white font-semibold">New Task</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-5">
          {error && (
            <div className="bg-red-900/30 border border-red-700/50 rounded px-3 py-2 text-red-300 text-sm">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400 font-medium">Title *</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Task title..."
              className="bg-gray-750 border border-gray-600 rounded-md px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400 font-medium">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              placeholder="Optional description..."
              className="bg-gray-750 border border-gray-600 rounded-md px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400 font-medium">Product</label>
              <select
                value={product}
                onChange={e => setProduct(e.target.value as Product)}
                className="bg-gray-750 border border-gray-600 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="general">General</option>
                <option value="dental_flow">Dental Flow</option>
                <option value="stayhunt">StayHunt</option>
                <option value="dentestock">Dentestock</option>
                <option value="infrastructure">Infrastructure</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400 font-medium">Type</label>
              <select
                value={type}
                onChange={e => setType(e.target.value as TaskType)}
                className="bg-gray-750 border border-gray-600 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="feature">Feature</option>
                <option value="bug">Bug</option>
                <option value="chore">Chore</option>
                <option value="spike">Spike</option>
                <option value="hotfix">Hotfix</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {type === 'bug' && (
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-400 font-medium">Severity</label>
                <select
                  value={severity}
                  onChange={e => setSeverity(e.target.value as Severity)}
                  className="bg-gray-750 border border-gray-600 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="p0">P0 — Critical</option>
                  <option value="p1">P1 — High</option>
                  <option value="p2">P2 — Medium</option>
                  <option value="p3">P3 — Low</option>
                </select>
              </div>
            )}

            <div className={`flex flex-col gap-1 ${type !== 'bug' ? 'col-span-2' : ''}`}>
              <label className="text-xs text-gray-400 font-medium">Assign to</label>
              <select
                value={assignedTo}
                onChange={e => setAssignedTo(e.target.value)}
                className="bg-gray-750 border border-gray-600 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="">Unassigned</option>
                {AGENTS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Create Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SprintBoard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [showNewTask, setShowNewTask] = useState(false);
  const [filterProduct, setFilterProduct] = useState<Product | 'all'>('all');
  const [filterAgent, setFilterAgent] = useState<string>('all');
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sprint_board')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      setTasks((data as Task[]) ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();

    // Realtime subscription
    const channel = supabase
      .channel('sprint_board_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sprint_board' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setTasks(prev => [...prev, payload.new as Task]);
          } else if (payload.eventType === 'UPDATE') {
            setTasks(prev => prev.map(t => t.id === (payload.new as Task).id ? (payload.new as Task) : t));
          } else if (payload.eventType === 'DELETE') {
            setTasks(prev => prev.filter(t => t.id !== (payload.old as { id: string }).id));
          }
        }
      )
      .subscribe();

    subscriptionRef.current = channel;
    return () => {
      channel.unsubscribe();
    };
  }, [loadTasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find(t => t.id === event.active.id);
    setActiveTask(task ?? null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over || !active) return;

    // `over.id` is either a task id (same column) or a column id (drop zone)
    const targetColumnId = COLUMNS.find(c => c.id === over.id)?.id
      ?? tasks.find(t => t.id === over.id)?.status;

    if (!targetColumnId) return;
    const task = tasks.find(t => t.id === active.id);
    if (!task || task.status === targetColumnId) return;

    // Optimistic update
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: targetColumnId } : t));

    // Persist to Supabase
    await supabase
      .from('sprint_board')
      .update({ status: targetColumnId, updated_at: new Date().toISOString() })
      .eq('id', task.id);
  };

  // Apply filters
  const filteredTasks = tasks.filter(t => {
    if (filterProduct !== 'all' && t.product !== filterProduct) return false;
    if (filterAgent !== 'all' && t.assigned_to !== filterAgent) return false;
    return true;
  });

  const tasksByStatus = (status: BoardStatus) =>
    filteredTasks.filter(t => t.status === status);

  return (
    <div className="flex flex-col gap-5 h-full">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-semibold text-white">Sprint Board</h1>
          <p className="text-gray-400 text-sm mt-0.5">Kanban across all products · {tasks.length} tasks</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadTasks}
            disabled={loading}
            className="flex items-center gap-1.5 bg-gray-750 hover:bg-gray-700 border border-gray-600 text-gray-300 text-xs px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setShowNewTask(true)}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-3 py-1.5 rounded-md transition-colors"
          >
            <Plus size={14} />
            New Task
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-xs text-gray-500 font-medium">Filter:</span>
        <select
          value={filterProduct}
          onChange={e => setFilterProduct(e.target.value as Product | 'all')}
          className="bg-gray-800 border border-gray-700 rounded-md px-2 py-1 text-xs text-gray-300 focus:outline-none focus:border-indigo-500"
        >
          <option value="all">All products</option>
          <option value="dental_flow">Dental Flow</option>
          <option value="stayhunt">StayHunt</option>
          <option value="dentestock">Dentestock</option>
          <option value="infrastructure">Infrastructure</option>
          <option value="general">General</option>
        </select>
        <select
          value={filterAgent}
          onChange={e => setFilterAgent(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-md px-2 py-1 text-xs text-gray-300 focus:outline-none focus:border-indigo-500"
        >
          <option value="all">All agents</option>
          {AGENTS.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        {(filterProduct !== 'all' || filterAgent !== 'all') && (
          <button
            onClick={() => { setFilterProduct('all'); setFilterAgent('all'); }}
            className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1 transition-colors"
          >
            <X size={11} /> Clear
          </button>
        )}
        <span className="text-xs text-gray-600 ml-auto">
          {filteredTasks.length} of {tasks.length} tasks
        </span>
      </div>

      {/* Loading state */}
      {loading && tasks.length === 0 && (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-gray-500" />
        </div>
      )}

      {/* Kanban board */}
      {!loading || tasks.length > 0 ? (
        <div className="overflow-x-auto pb-4 flex-1">
          <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="flex gap-3 h-full" style={{ width: 'max-content' }}>
              {COLUMNS.map(col => (
                <KanbanColumn
                  key={col.id}
                  column={col}
                  tasks={tasksByStatus(col.id)}
                />
              ))}
            </div>
            <DragOverlay>
              {activeTask ? <TaskCard task={activeTask} isDragging /> : null}
            </DragOverlay>
          </DndContext>
        </div>
      ) : null}

      {/* New Task Modal */}
      {showNewTask && (
        <NewTaskModal
          onClose={() => setShowNewTask(false)}
          onCreated={loadTasks}
        />
      )}
    </div>
  );
}
