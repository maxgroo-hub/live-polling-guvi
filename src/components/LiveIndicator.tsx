import React from 'react';
import { RealtimeConnectionState } from '../types';
import { RefreshCw, WifiOff } from 'lucide-react';

interface LiveIndicatorProps {
  status: RealtimeConnectionState;
  reconnectAttempts?: number;
  onReconnect?: () => void;
}

export const LiveIndicator: React.FC<LiveIndicatorProps> = ({
  status,
  reconnectAttempts = 0,
  onReconnect,
}) => {
  if (status === 'connected') {
    return (
      <div
        id="live-indicator-connected"
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 shadow-xs"
        title="Realtime connection active via Redis Pub/Sub"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span>Live</span>
      </div>
    );
  }

  if (status === 'reconnecting') {
    return (
      <div
        id="live-indicator-reconnecting"
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-950/60 text-amber-300 border border-amber-800/60 shadow-xs"
        title={`Attempting to reconnect (${reconnectAttempts}/5)`}
      >
        <RefreshCw className="w-3 h-3 animate-spin text-amber-400" />
        <span>Reconnecting...</span>
      </div>
    );
  }

  if (status === 'connecting') {
    return (
      <div
        id="live-indicator-connecting"
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-cyan-950/60 text-cyan-300 border border-cyan-800/60 shadow-xs"
      >
        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
        <span>Connecting...</span>
      </div>
    );
  }

  // Disconnected state
  return (
    <div
      id="live-indicator-disconnected"
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-900 text-slate-400 border border-slate-700/80 shadow-xs"
    >
      <WifiOff className="w-3 h-3 text-slate-500" />
      <span>Offline</span>
      {onReconnect && (
        <button
          type="button"
          onClick={onReconnect}
          className="ml-1 text-[11px] underline text-cyan-400 hover:text-cyan-300 cursor-pointer font-medium"
        >
          Retry
        </button>
      )}
    </div>
  );
};
