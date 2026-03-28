import { useEffect, useState } from 'react';
import { fetchGatewayStatus } from '../lib/gateway';
import type { GatewayStatus } from '../types';

export default function TopBar() {
  const [gwStatus, setGwStatus] = useState<GatewayStatus>({ status: 'offline' });

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const s = await fetchGatewayStatus();
      if (!cancelled) setGwStatus(s);
    }

    check();
    const interval = setInterval(check, 15_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const isOnline = gwStatus.status === 'online';

  return (
    <header className="h-14 flex items-center justify-between px-6 border-b border-gray-700/60 bg-gray-900 shrink-0">
      {/* Title */}
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-md bg-indigo-600 flex items-center justify-center">
          <span className="text-white text-xs font-bold">PA</span>
        </div>
        <h1 className="text-white font-semibold text-sm tracking-wide">
          PureAura Technologies{' '}
          <span className="text-gray-400 font-normal">Command Centre</span>
        </h1>
      </div>

      {/* Gateway status */}
      <div className="flex items-center gap-2">
        <span
          className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-green-400' : 'bg-red-500'}`}
          title={`Gateway ${gwStatus.status}`}
        />
        <span className="text-xs text-gray-400">
          Gateway{' '}
          <span className={isOnline ? 'text-green-400' : 'text-red-400'}>
            {isOnline ? 'Online' : 'Offline'}
          </span>
          {isOnline && gwStatus.version && (
            <span className="ml-1 text-gray-500">v{gwStatus.version}</span>
          )}
        </span>
      </div>
    </header>
  );
}
