import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Poll, User } from '../types';
import { api, ApiError } from '../services/api';
import { useToast } from './Toast';
import {
  Plus,
  Users,
  ChevronRight,
  Activity,
  Clock,
  Search,
  SlidersHorizontal,
  RefreshCw,
  Trash2,
  Lock,
} from 'lucide-react';

export type PollFilterType = 'all' | 'active' | 'closed' | 'my';
export type PollSortType = 'newest' | 'votes';

interface PollListProps {
  onSelectPoll: (pollId: string) => void;
  onCreatePollClick: () => void;
  currentUser?: User | null;
  onOpenDeleteModal?: (poll: Poll) => void;
}

export const PollList: React.FC<PollListProps> = ({
  onSelectPoll,
  onCreatePollClick,
  currentUser,
  onOpenDeleteModal,
}) => {
  const { showToast } = useToast();
  const [allPolls, setAllPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters and sorting state
  const [filter, setFilter] = useState<PollFilterType>('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<PollSortType>('newest');

  const fetchPolls = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let data: Poll[];
      if (filter === 'my') {
        if (!currentUser) {
          setAllPolls([]);
          setLoading(false);
          return;
        }
        data = await api.getMyPolls();
      } else {
        data = await api.getActivePolls(100);
      }

      setAllPolls(data);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to load polls';
      setError(msg);
      showToast(msg, 'error', 'Error loading polls');
    } finally {
      setLoading(false);
    }
  }, [filter, currentUser, showToast]);

  useEffect(() => {
    fetchPolls();
  }, [fetchPolls]);

  // Client-side filtering and sorting
  const filteredAndSortedPolls = useMemo(() => {
    let result = [...allPolls];

    // Status filter
    if (filter === 'active') {
      result = result.filter((p) => p.status === 'active');
    } else if (filter === 'closed') {
      result = result.filter((p) => p.status === 'closed');
    }

    // Search query filter
    const query = search.trim().toLowerCase();
    if (query) {
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(query) ||
          (p.description && p.description.toLowerCase().includes(query))
      );
    }

    // Sort order
    result.sort((a, b) => {
      if (sortBy === 'votes') {
        if (b.total_votes !== a.total_votes) {
          return b.total_votes - a.total_votes;
        }
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return result;
  }, [allPolls, filter, search, sortBy]);

  return (
    <div id="poll-list-view" className="max-w-3xl w-full mx-auto space-y-5">
      {/* Header and Call to Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Live Public Polls</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Participate and observe real-time vote updates via Redis Pub/Sub &amp; SSE
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchPolls}
            title="Refresh poll list"
            className="p-2 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
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
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="poll-search-input"
              type="text"
              placeholder="Search polls by title or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-[11px] text-slate-400">Sort:</span>
            <select
              id="poll-sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as PollSortType)}
              className="px-2.5 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              <option value="newest">Newest First</option>
              <option value="votes">Most Voted</option>
            </select>
          </div>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-1.5 pt-1 border-t border-slate-800/80 overflow-x-auto">
          <button
            type="button"
            id="tab-filter-all"
            onClick={() => setFilter('all')}
            className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
              filter === 'all'
                ? 'bg-cyan-600/20 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            All
          </button>
          <button
            type="button"
            id="tab-filter-active"
            onClick={() => setFilter('active')}
            className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
              filter === 'active'
                ? 'bg-cyan-600/20 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Active
          </button>
          <button
            type="button"
            id="tab-filter-closed"
            onClick={() => setFilter('closed')}
            className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
              filter === 'closed'
                ? 'bg-cyan-600/20 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Closed
          </button>

          {currentUser && (
            <button
              type="button"
              id="tab-filter-my"
              onClick={() => setFilter('my')}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                filter === 'my'
                  ? 'bg-cyan-600/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <span>My Polls</span>
            </button>
          )}
        </div>
      </div>

      {/* Poll Cards / States */}
      {loading ? (
        <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-xl space-y-2">
          <div className="inline-block animate-spin w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full"></div>
          <p className="text-slate-400 text-xs">Loading available polls...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-slate-900 border border-rose-800/60 rounded-xl text-center space-y-3">
          <p className="text-rose-400 text-sm">{error}</p>
          <button
            type="button"
            onClick={fetchPolls}
            className="px-3.5 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors cursor-pointer"
          >
            Try Again
          </button>
        </div>
      ) : filteredAndSortedPolls.length === 0 ? (
        <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-xl space-y-3">
          <Activity className="w-8 h-8 text-slate-600 mx-auto" />
          <p className="text-slate-300 font-medium">
            {filter === 'my'
              ? "You haven't created any polls yet"
              : search
              ? 'No polls matched your search'
              : 'No polls found'}
          </p>
          <p className="text-slate-500 text-xs max-w-sm mx-auto">
            {filter === 'my'
              ? 'Create your first live poll to start collecting votes in real-time.'
              : search
              ? `No polls matched "${search}". Try searching with different keywords.`
              : 'Create the first live poll to start collecting votes in real-time.'}
          </p>
          {filter === 'my' || !search ? (
            <button
              type="button"
              onClick={onCreatePollClick}
              className="mt-2 px-4 py-2 text-xs font-medium rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white cursor-pointer"
            >
              Create Poll
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="mt-2 px-4 py-2 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-white cursor-pointer"
            >
              Clear Search
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredAndSortedPolls.map((p) => {
            const isOwner = currentUser && currentUser.id === p.owner_id;

            return (
              <div
                key={p.id}
                id={`poll-item-${p.id}`}
                className="group p-4 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-cyan-500/40 rounded-xl transition-all cursor-pointer flex items-center justify-between"
                onClick={() => onSelectPoll(p.id)}
              >
                <div className="min-w-0 pr-4 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="text-sm font-semibold text-white group-hover:text-cyan-300 transition-colors truncate max-w-md">
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

                    {isOwner && (
                      <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-cyan-950/60 text-cyan-300 border border-cyan-800/60">
                        Your Poll
                      </span>
                    )}
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

                <div className="flex items-center gap-2 shrink-0">
                  {isOwner && onOpenDeleteModal && (
                    <button
                      type="button"
                      title="Delete poll"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenDeleteModal(p);
                      }}
                      className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}

                  <div className="p-2 rounded-lg bg-slate-800 group-hover:bg-cyan-600 text-slate-400 group-hover:text-white transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
