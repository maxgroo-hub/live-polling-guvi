import React, { useState, useEffect, useCallback } from 'react';
import { Poll, User, VoteStatus } from '../types';
import { usePollRealtime } from '../hooks/usePollRealtime';
import { LiveIndicator } from './LiveIndicator';
import { getVoterIdentifier } from '../lib/voter';
import { CheckCircle2, Lock, ArrowLeft, Vote as VoteIcon, Users, Calendar } from 'lucide-react';

interface LivePollViewProps {
  pollId: string;
  currentUser: User | null;
  authToken: string | null;
  onBack: () => void;
  onRequireAuth?: () => void;
}

export const LivePollView: React.FC<LivePollViewProps> = ({
  pollId,
  currentUser,
  authToken,
  onBack,
}) => {
  const {
    poll,
    connectionState,
    reconnectAttempts,
    lastUpdated,
    refreshState,
  } = usePollRealtime({ pollId });

  const [voteStatus, setVoteStatus] = useState<VoteStatus | null>(null);
  const [votingOptionId, setVotingOptionId] = useState<string | null>(null);
  const [voteError, setVoteError] = useState<string | null>(null);
  const [isClosingPoll, setIsClosingPoll] = useState(false);

  const voterIdentifier = getVoterIdentifier();

  // Check if current voter has already voted on this poll
  const checkVoteStatus = useCallback(async () => {
    try {
      const headers: Record<string, string> = {};
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }
      const res = await fetch(`/api/polls/${pollId}/vote-status?voter_identifier=${encodeURIComponent(voterIdentifier)}`, {
        headers,
      });
      if (res.ok) {
        const json = await res.json();
        setVoteStatus(json);
      }
    } catch {
      // ignore
    }
  }, [pollId, authToken, voterIdentifier]);

  useEffect(() => {
    checkVoteStatus();
  }, [checkVoteStatus]);

  // Cast a vote
  const handleVote = async (optionId: string) => {
    if (!poll || poll.status === 'closed' || voteStatus?.has_voted) return;

    setVotingOptionId(optionId);
    setVoteError(null);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const res = await fetch(`/api/polls/${pollId}/vote`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          option_id: optionId,
          voter_identifier: voterIdentifier,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          setVoteStatus({ has_voted: true, voted_option_id: optionId });
          setVoteError('You have already voted on this poll.');
        } else {
          setVoteError(data.message || 'Failed to submit vote.');
        }
      } else {
        // Vote recorded successfully! Mark local voter state as voted
        setVoteStatus({ has_voted: true, voted_option_id: optionId });
        // Real-time update will automatically arrive via Redis Pub/Sub -> SSE without page refresh!
      }
    } catch (err) {
      setVoteError(err instanceof Error ? err.message : 'Network error while casting vote');
    } finally {
      setVotingOptionId(null);
    }
  };

  // Close poll (owner only)
  const handleClosePoll = async () => {
    if (!authToken || !poll) return;
    setIsClosingPoll(true);
    try {
      const res = await fetch(`/api/polls/${pollId}/close`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.message || 'Failed to close poll');
      }
      // POLL_STATUS event will arrive via Redis Pub/Sub to all clients
    } catch {
      alert('Network error while closing poll');
    } finally {
      setIsClosingPoll(false);
    }
  };

  if (!poll) {
    return (
      <div className="max-w-2xl w-full mx-auto p-8 text-center bg-slate-900 border border-slate-800 rounded-xl">
        <div className="inline-block animate-spin w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full mb-4"></div>
        <p className="text-slate-400">Connecting to live poll stream...</p>
      </div>
    );
  }

  const isOwner = currentUser && currentUser.id === poll.owner_id;
  const isClosed = poll.status === 'closed';
  const hasVoted = voteStatus?.has_voted;
  const votedOptionId = voteStatus?.voted_option_id;

  return (
    <div id="live-poll-view" className="max-w-2xl w-full mx-auto space-y-6">
      {/* Top Navigation & Status Bar */}
      <div className="flex items-center justify-between">
        <button
          id="back-to-polls-btn"
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>All Polls</span>
        </button>

        <div className="flex items-center gap-3">
          <LiveIndicator
            status={connectionState}
            reconnectAttempts={reconnectAttempts}
            onReconnect={refreshState}
          />

          <span
            className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${
              isClosed
                ? 'bg-rose-950/60 text-rose-300 border-rose-800/60'
                : 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
            }`}
          >
            {isClosed ? 'Closed' : 'Active'}
          </span>
        </div>
      </div>

      {/* Main Poll Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-6">
        <div>
          <h2 id="poll-title" className="text-2xl font-bold text-white tracking-tight">
            {poll.title}
          </h2>
          {poll.description && (
            <p className="text-slate-400 text-sm mt-1">{poll.description}</p>
          )}

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mt-4 pt-4 border-t border-slate-800">
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-cyan-400" />
              <strong className="text-slate-200">{poll.total_votes}</strong> {poll.total_votes === 1 ? 'vote' : 'votes'} total
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              Created {new Date(poll.created_at).toLocaleDateString()}
            </span>
            {lastUpdated && (
              <span className="text-slate-500 ml-auto text-[11px]">
                Updated: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>

        {/* Notice Banners */}
        {isClosed && (
          <div className="p-3 bg-rose-950/40 border border-rose-900/60 rounded-lg text-rose-200 text-xs flex items-center gap-2">
            <Lock className="w-4 h-4 text-rose-400 shrink-0" />
            <span>This poll is closed. Voting has concluded, but real-time results remain visible.</span>
          </div>
        )}

        {hasVoted && (
          <div className="p-3 bg-cyan-950/40 border border-cyan-900/60 rounded-lg text-cyan-200 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>You have cast your vote on this poll. Watching live updates via Redis Pub/Sub.</span>
          </div>
        )}

        {voteError && (
          <div className="p-3 bg-rose-900/40 border border-rose-800 rounded-lg text-rose-200 text-xs">
            {voteError}
          </div>
        )}

        {/* Options List with Real-time Count Bars */}
        <div className="space-y-3">
          {poll.options.map((option) => {
            const percentage = poll.total_votes > 0 ? Math.round((option.vote_count / poll.total_votes) * 100) : 0;
            const isVoted = votedOptionId === option.id;
            const isVotingThis = votingOptionId === option.id;

            return (
              <div
                key={option.id}
                id={`option-card-${option.id}`}
                className={`relative overflow-hidden rounded-xl border transition-all ${
                  isVoted
                    ? 'border-cyan-500/80 bg-slate-800/80'
                    : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                }`}
              >
                {/* Visual Progress Bar Fill */}
                <div
                  className={`absolute top-0 bottom-0 left-0 transition-all duration-500 ease-out ${
                    isVoted ? 'bg-cyan-500/15' : 'bg-slate-800/50'
                  }`}
                  style={{ width: `${percentage}%` }}
                />

                <div className="relative p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-medium text-slate-100 truncate text-sm">
                      {option.text}
                    </span>
                    {isVoted && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-cyan-400 bg-cyan-950/80 border border-cyan-800/60 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3" />
                        Your vote
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <span className="text-sm font-semibold text-white font-mono">
                        {option.vote_count}
                      </span>
                      <span className="text-xs text-slate-400 ml-1.5 font-mono">
                        ({percentage}%)
                      </span>
                    </div>

                    {!isClosed && !hasVoted && (
                      <button
                        type="button"
                        id={`vote-btn-${option.id}`}
                        onClick={() => handleVote(option.id)}
                        disabled={!!votingOptionId}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white shadow-xs transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1"
                      >
                        {isVotingThis ? (
                          <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        ) : (
                          <VoteIcon className="w-3 h-3" />
                        )}
                        <span>Vote</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Owner Controls */}
        {isOwner && !isClosed && (
          <div className="pt-4 border-t border-slate-800 flex justify-end">
            <button
              id="close-poll-btn"
              type="button"
              onClick={handleClosePoll}
              disabled={isClosingPoll}
              className="px-3.5 py-1.5 text-xs font-medium rounded-lg bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5 text-rose-400" />
              <span>{isClosingPoll ? 'Closing...' : 'Close Poll to Further Votes'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
