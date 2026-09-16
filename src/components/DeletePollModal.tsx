import React, { useState } from 'react';
import { AlertTriangle, Trash2, X, Loader2 } from 'lucide-react';
import { api, ApiError } from '../services/api';

interface DeletePollModalProps {
  isOpen: boolean;
  pollId: string;
  pollTitle: string;
  onClose: () => void;
  onDeleted: (pollId: string) => void;
  onError: (message: string) => void;
}

export const DeletePollModal: React.FC<DeletePollModalProps> = ({
  isOpen,
  pollId,
  pollTitle,
  onClose,
  onDeleted,
  onError,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      await api.deletePoll(pollId);
      onDeleted(pollId);
      onClose();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to delete poll';
      setError(msg);
      onError(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div
        id="delete-poll-modal"
        className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 relative shadow-2xl space-y-4"
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-rose-400">
            <AlertTriangle className="w-5 h-5" />
            <h3 className="text-base font-bold text-white">Delete Poll</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="text-slate-400 hover:text-white p-1 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-lg text-rose-300 text-xs">
            {error}
          </div>
        )}

        <div className="space-y-2 text-xs text-slate-300">
          <p>
            Are you sure you want to delete <span className="font-semibold text-white">"{pollTitle}"</span>?
          </p>
          <p className="text-slate-400">
            This action cannot be undone. All votes, options, and live real-time statistics associated with this poll will be permanently removed.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-3.5 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            id="confirm-delete-poll-btn"
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Poll</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
