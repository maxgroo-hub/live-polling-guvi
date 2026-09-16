import React, { useState, useEffect, useCallback } from 'react';
import { Poll } from '../types';
import { Plus, Users, ChevronRight, Activity, Clock } from 'lucide-react';

interface PollListProps {
  onSelectPoll: (pollId: string) => void;
  onCreatePollClick: () => void;
}

export const PollList: React.FC<PollListProps> = ({
  onSelectPoll,
  onCreatePollClick,
}) => {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPolls = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/polls?limit=50');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setPolls(json.data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load polls');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPolls();
  }, [fetchPolls]);

  return (
    <div id="poll-list-view" className="max-w-3xl w-full mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Active Live Polls</h2>
          <p className="text-xs text-slate-400 mt-0.5">Select a poll to participate and watch live updates in real-time</p>
        </div>

        <button
          id="create-poll-btn"
          type="button"
          onClick={onCreatePollClick}
          className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Poll</span>
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-xl">
          <div className="inline-block animate-spin w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full mb-2"></div>
          <p className="text-slate-400 text-xs">Loading available polls...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-slate-900 border border-rose-800/60 rounded-xl text-center">
          <p className="text-rose-400 text-sm mb-3">{error}</p>
          <button
            type="button"
            onClick={fetchPolls}
            className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-white rounded-lg cursor-pointer"
          >
            Try Again
          </button>
        </div>
      ) : polls.length === 0 ? (
        <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-xl space-y-3">
          <Activity className="w-8 h-8 text-slate-600 mx-auto" />
          <p className="text-slate-300 font-medium">No polls found</p>
          <p className="text-slate-500 text-xs max-w-sm mx-auto">Create the first live poll to start collecting votes in real-time.</p>
          <button
            type="button"
            onClick={onCreatePollClick}
            className="mt-2 px-4 py-2 text-xs font-medium rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white cursor-pointer"
          >
            Create Poll
          </button>
        </div>
      ) : (
        <div className="grid gap-3">
          {polls.map((p) => (
            <div
              key={p.id}
              id={`poll-item-${p.id}`}
              onClick={() => onSelectPoll(p.id)}
              className="group p-4 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-cyan-500/40 rounded-xl transition-all cursor-pointer flex items-center justify-between"
            >
              <div className="min-w-0 pr-4">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-semibold text-white group-hover:text-cyan-300 transition-colors truncate">
                    {p.title}
                  </h3>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-medium rounded-full border ${
                      p.status === 'closed'
                        ? 'bg-rose-950/60 text-rose-300 border-rose-800/60'
                        : 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
                    }`}
                  >
                    {p.status}
                  </span>
                </div>

                {p.description && (
                  <p className="text-xs text-slate-400 line-clamp-1 mb-2">{p.description}</p>
                )}

                <div className="flex items-center gap-4 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3 text-cyan-400" />
                    <strong>{p.total_votes}</strong> {p.total_votes === 1 ? 'vote' : 'votes'}
                  </span>
                  <span>{p.options.length} options</span>
                  <span className="flex items-center gap-1 text-slate-500">
                    <Clock className="w-3 h-3" />
                    {new Date(p.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="shrink-0 p-2 rounded-lg bg-slate-800 group-hover:bg-cyan-600 text-slate-400 group-hover:text-white transition-colors">
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
