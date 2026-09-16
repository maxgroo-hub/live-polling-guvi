import React, { useState, useEffect, useCallback } from 'react';
import { Poll, User, VoteStatus } from '../types';
import { usePollRealtime } from '../hooks/usePollRealtime';
import { LiveIndicator } from './LiveIndicator';
import { getVoterIdentifier } from '../lib/voter';
import { api, ApiError } from '../services/api';
import { useToast } from './Toast';
import { DeletePollModal } from './DeletePollModal';
import {
  CheckCircle2,
  Lock,
  ArrowLeft,
  Vote as VoteIcon,
  Users,
  Calendar,
  Trash2,
  AlertCircle,
  RefreshCw,
  Loader2,
} from 'lucide-react';

interface LivePollViewProps {
  pollId: string;
  currentUser: User | null;
  authToken: string | null;
  onBack: () => void;
  onRequireAuth?: () => void;
  onPollDeleted?: (pollId: string) => void;
}

export const LivePollView: React.FC<LivePollViewProps> = ({
  pollId,
  currentUser,
  authToken,
  onBack,
  onRequireAuth,
  onPollDeleted,
}) => {
  const { showToast } = useToast();
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
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const voterIdentifier = getVoterIdentifier();

  // Check if current voter has already voted on this poll
  const checkVoteStatus = useCallback(async () => {
    try {
      const status = await api.getVoteStatus(pollId, voterIdentifier);
      setVoteStatus(status);
    } catch {
      // Non-blocking background check
    }
  }, [pollId, voterIdentifier]);

  useEffect(() => {
    checkVoteStatus();
  }, [checkVoteStatus]);

  // Cast a vote
  const handleVote = async (optionId: string) => {
    if (!poll || poll.status === 'closed' || voteStatus?.has_voted) return;

    setVotingOptionId(optionId);
    setVoteError(null);

    try {
      await api.castVote(pollId, {
        option_id: optionId,
        voter_identifier: voterIdentifier,
      });

      // Vote recorded successfully!
      setVoteStatus({ has_voted: true, voted_option_id: optionId });
      showToast('Your vote has been recorded and broadcast via Redis Pub/Sub!', 'success', 'Vote Recorded');
      // Real-time update will also arrive via Redis Pub/Sub -> SSE stream
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409 || err.code === 'already_voted') {
          setVoteStatus({ has_voted: true, voted_option_id: optionId });
          setVoteError('You have already voted on this poll.');
          showToast('You have already voted on this poll.', 'warning', 'Duplicate Vote');
        } else if (err.status === 400 && err.code === 'poll_closed') {
          setVoteError('This poll is closed for voting.');
          showToast('This poll is closed for voting.', 'warning', 'Poll Closed');
        } else {
          setVoteError(err.message);
          showToast(err.message, 'error', 'Vote Error');
        }
      } else {
        const msg = 'Network error while casting vote';
        setVoteError(msg);
        showToast(msg, 'error', 'Connection Error');
      }
    } finally {
      setVotingOptionId(null);
    }
  };

  // Close poll (owner only)
  const handleClosePoll = async () => {
    if (!authToken || !poll) {
      onRequireAuth?.();
      return;
    }

    setIsClosingPoll(true);
    setVoteError(null);

    try {
      await api.closePoll(pollId);
      showToast('Poll closed successfully. Further voting is disabled.', 'info', 'Poll Closed');
      // POLL_STATUS event will arrive via Redis Pub/Sub to all connected SSE clients
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Network error while closing poll';
      setVoteError(msg);
      showToast(msg, 'error', 'Close Failed');
    } finally {
      setIsClosingPoll(false);
    }
  };

  if (!poll) {
    return (
      <div className="max-w-2xl w-full mx-auto p-8 text-center bg-slate-900 border border-slate-800 rounded-xl space-y-4">
        <div className="inline-block animate-spin w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full mb-2"></div>
        <p className="text-slate-300 font-medium text-sm">Connecting to live poll stream...</p>
        <p className="text-slate-500 text-xs">Subscribing to Redis channel poll:{pollId}:events via SSE</p>
        <div className="pt-2">
          <button
            type="button"
            onClick={onBack}
            className="px-3 py-1.5 text-xs text-slate-400 hover:text-white bg-slate-800 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Poll List</span>
          </button>
        </div>
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
          <div className="flex items-start justify-between gap-4">
            <h2 id="poll-title" className="text-2xl font-bold text-white tracking-tight">
              {poll.title}
            </h2>

            {isOwner && (
              <span className="shrink-0 px-2.5 py-0.5 text-xs font-medium rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-800/60">
                You created this poll
              </span>
            )}
          </div>

          {poll.description && (
            <p className="text-slate-400 text-sm mt-1.5">{poll.description}</p>
          )}

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mt-4 pt-4 border-t border-slate-800">
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-cyan-400" />
              <strong className="text-slate-200">{poll.total_votes}</strong>{' '}
              {poll.total_votes === 1 ? 'vote' : 'votes'} total
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              Created {new Date(poll.created_at).toLocaleDateString()}
            </span>
            {lastUpdated && (
              <span className="text-slate-500 ml-auto text-[11px] flex items-center gap-1">
                <RefreshCw className="w-3 h-3 text-slate-600" />
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
          <div className="p-3 bg-rose-900/40 border border-rose-800 rounded-lg text-rose-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{voteError}</span>
          </div>
        )}

        {/* Options List with Real-time Count Bars */}
        <div className="space-y-3">
          {poll.options.map((option) => {
            const percentage =
              poll.total_votes > 0
                ? Math.round((option.vote_count / poll.total_votes) * 100)
                : 0;
            const isVoted = votedOptionId === option.id;
            const isVotingThis = votingOptionId === option.id;

            return (
              <div
                key={option.id}
                id={`option-card-${option.id}`}
                className={`relative overflow-hidden rounded-xl border transition-all ${
                  isVoted
                    ? 'border-cyan-500/80 bg-slate-800/80 shadow-md'
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
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
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

        {/* Owner Management Controls */}
        {isOwner && (
          <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-slate-500">Owner Actions:</span>

            <div className="flex items-center gap-2">
              {!isClosed && (
                <button
                  id="close-poll-btn"
                  type="button"
                  onClick={handleClosePoll}
                  disabled={isClosingPoll}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-950/40 hover:bg-amber-900/50 text-amber-300 border border-amber-800/50 transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {isClosingPoll ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                  )}
                  <span>{isClosingPoll ? 'Closing...' : 'Close Poll'}</span>
                </button>
              )}

              <button
                id="delete-poll-btn"
                type="button"
                onClick={() => setIsDeleteModalOpen(true)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 border border-rose-800/50 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span>Delete Poll</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {isOwner && (
        <DeletePollModal
          isOpen={isDeleteModalOpen}
          pollId={poll.id}
          pollTitle={poll.title}
          onClose={() => setIsDeleteModalOpen(false)}
          onDeleted={(deletedId) => {
            showToast('Poll has been permanently deleted.', 'info', 'Poll Deleted');
            onPollDeleted ? onPollDeleted(deletedId) : onBack();
          }}
          onError={(msg) => {
            showToast(msg, 'error', 'Delete Failed');
          }}
        />
      )}
    </div>
  );
};
