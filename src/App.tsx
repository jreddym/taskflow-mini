import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import AgentStatus from './pages/AgentStatus';
import SprintBoard from './pages/SprintBoard';
import CostTracker from './pages/CostTracker';
import CronMonitor from './pages/CronMonitor';
import ActivityFeed from './pages/ActivityFeed';
import BrainViewer from './pages/BrainViewer';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          {/* Default → Agent Status */}
          <Route index element={<Navigate to="/agents" replace />} />
          <Route path="agents" element={<AgentStatus />} />
          <Route path="sprint" element={<SprintBoard />} />
          <Route path="costs" element={<CostTracker />} />
          <Route path="cron" element={<CronMonitor />} />
          <Route path="activity" element={<ActivityFeed />} />
          <Route path="brain" element={<BrainViewer />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
