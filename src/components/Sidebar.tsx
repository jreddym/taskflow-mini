import { NavLink } from 'react-router-dom';
import {
  Bot,
  Kanban,
  DollarSign,
  Clock,
  Activity,
  Brain,
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/agents', label: 'Agent Status', icon: Bot },
  { to: '/sprint', label: 'Sprint Board', icon: Kanban },
  { to: '/costs', label: 'Cost Tracker', icon: DollarSign },
  { to: '/cron', label: 'Cron Monitor', icon: Clock },
  { to: '/activity', label: 'Activity Feed', icon: Activity },
  { to: '/brain', label: 'Brain Viewer', icon: Brain },
];

export default function Sidebar() {
  return (
    <aside className="w-56 shrink-0 flex flex-col bg-gray-900 border-r border-gray-700/60">
      <nav className="flex-1 py-4 px-2 flex flex-col gap-0.5">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              [
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors duration-100',
                isActive
                  ? 'bg-indigo-600/20 text-indigo-300 font-medium'
                  : 'text-gray-400 hover:text-gray-100 hover:bg-gray-800',
              ].join(' ')
            }
          >
            <Icon size={16} strokeWidth={1.8} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-700/60">
        <p className="text-xs text-gray-600">PureAura Technologies</p>
        <p className="text-xs text-gray-700">Command Centre v0.1</p>
      </div>
    </aside>
  );
}
