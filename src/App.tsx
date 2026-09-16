import React, { useCallback, useEffect, useState } from 'react';
import { Activity, Server, Radio, LogIn, LogOut, User as UserIcon, Shield } from 'lucide-react';
import { Poll, User } from './types';
import { LivePollView } from './components/LivePollView';
import { PollList } from './components/PollList';
import { CreatePollModal } from './components/CreatePollModal';
import { AuthModal } from './components/AuthModal';
import { DeletePollModal } from './components/DeletePollModal';
import { ToastProvider, useToast } from './components/Toast';
import { api, getStoredToken, setStoredToken } from './services/api';

interface HealthResponse {
  status: string;
  timestamp?: string;
  services?: {
    mongodb?: string;
    redis?: string;
  };
  message?: string;
}

function MainApp() {
  const { showToast } = useToast();
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [selectedPollId, setSelectedPollId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isHealthModalOpen, setIsHealthModalOpen] = useState(false);
  const [pollToDelete, setPollToDelete] = useState<Poll | null>(null);

  // Authentication State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);

  // Initialize auth from localStorage & /api/auth/me
  useEffect(() => {
    const token = getStoredToken();
    const savedUser = localStorage.getItem('live_poll_user');

    if (token) {
      setAuthToken(token);
      if (savedUser) {
        try {
          setCurrentUser(JSON.parse(savedUser));
        } catch {
          // ignore
        }
      }

      // Verify token validity against /api/auth/me
      api.getCurrentUser()
        .then((user) => {
          setCurrentUser(user);
          localStorage.setItem('live_poll_user', JSON.stringify(user));
        })
        .catch(() => {
          // Token expired or invalid
          setStoredToken(null);
          localStorage.removeItem('live_poll_user');
          setAuthToken(null);
          setCurrentUser(null);
        });
    }

    // Check URL hash for initial poll selection e.g. #poll-id
    const hash = window.location.hash.replace('#', '');
    if (hash && hash.length === 24) {
      setSelectedPollId(hash);
    }
  }, []);

  // Update hash when poll changes
  const handleSelectPoll = (pollId: string) => {
    setSelectedPollId(pollId);
    window.location.hash = pollId;
  };

  const handleBackToPolls = () => {
    setSelectedPollId(null);
    window.location.hash = '';
  };

  const handleAuthSuccess = (token: string, user: User) => {
    setAuthToken(token);
    setCurrentUser(user);
  };

  const handleLogout = () => {
    setStoredToken(null);
    localStorage.removeItem('live_poll_user');
    setAuthToken(null);
    setCurrentUser(null);
    showToast('You have been logged out.', 'info', 'Logged Out');
  };

  // Health check query
  const checkHealth = useCallback(async () => {
    try {
      const res = await fetch('/api/health');
      const data = (await res.json().catch(() => null)) as HealthResponse | null;
      if (res.ok && data) {
        setHealth(data);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    checkHealth();
    const timer = setInterval(checkHealth, 15000);
    return () => clearInterval(timer);
  }, [checkHealth]);

  const isHealthy = health?.status === 'healthy';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Primary Navigation Bar */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div
            id="nav-brand"
            onClick={handleBackToPolls}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-lg bg-cyan-600/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 group-hover:bg-cyan-600/30 transition-colors">
              <Radio className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white tracking-tight leading-none group-hover:text-cyan-300 transition-colors">
                Live Polling
              </h1>
              <span className="text-[10px] text-slate-400 font-mono">Redis Pub/Sub Realtime</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* System Health Status Pill */}
            <button
              id="system-status-btn"
              type="button"
              onClick={() => setIsHealthModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60 transition-colors cursor-pointer"
              title="View MongoDB & Redis System Health"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isHealthy ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'
                }`}
              />
              <span className="hidden sm:inline">Backend:</span>
              <span className={isHealthy ? 'text-emerald-400' : 'text-amber-400'}>
                {health?.status || 'Connecting'}
              </span>
            </button>

            {/* Auth Button */}
            {currentUser ? (
              <div className="flex items-center gap-2">
                <span className="hidden md:inline-flex items-center gap-1.5 text-xs text-slate-300 bg-slate-800/60 px-2.5 py-1 rounded-lg border border-slate-700/40">
                  <UserIcon className="w-3 h-3 text-cyan-400" />
                  <span>{currentUser.name}</span>
                </span>
                <button
                  id="logout-btn"
                  type="button"
                  onClick={handleLogout}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Log Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                id="login-btn"
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5 text-cyan-400" />
                <span>Log In</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col justify-start">
        {selectedPollId ? (
          <LivePollView
            pollId={selectedPollId}
            currentUser={currentUser}
            authToken={authToken}
            onBack={handleBackToPolls}
            onRequireAuth={() => setIsAuthModalOpen(true)}
            onPollDeleted={() => {
              handleBackToPolls();
            }}
          />
        ) : (
          <PollList
            currentUser={currentUser}
            onSelectPoll={handleSelectPoll}
            onCreatePollClick={() => {
              if (!authToken) {
                setIsAuthModalOpen(true);
              } else {
                setIsCreateModalOpen(true);
              }
            }}
            onOpenDeleteModal={(poll) => setPollToDelete(poll)}
          />
        )}
      </main>

      {/* Observability & System Health Modal */}
      {isHealthModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 relative shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Server className="w-5 h-5 text-cyan-400" />
                <h3 className="text-lg font-bold text-white">System Infrastructure</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsHealthModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Backend API:</span>
                  <span className="text-cyan-400 font-mono">Go / Gin on :8081</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Realtime Transport:</span>
                  <span className="text-emerald-400 font-mono">Server-Sent Events (SSE)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Pub/Sub Message Broker:</span>
                  <span className="text-slate-200 font-mono">Redis (Channels: poll:&#123;id&#125;:events)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Persistent Storage:</span>
                  <span className="text-slate-200 font-mono">MongoDB (Atomic $inc)</span>
                </div>
              </div>

              {health && (
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-400">MongoDB Status:</span>
                    <span className="text-emerald-400">{health.services?.mongodb}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Redis Status:</span>
                    <span className="text-emerald-400">{health.services?.redis}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Overall Health:</span>
                    <span className={health.status === 'healthy' ? 'text-emerald-400' : 'text-amber-400'}>
                      {health.status}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Poll Modal */}
      <CreatePollModal
        isOpen={isCreateModalOpen}
        authToken={authToken}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={(id) => handleSelectPoll(id)}
        onRequireAuth={() => {
          setIsCreateModalOpen(false);
          setIsAuthModalOpen(true);
        }}
      />

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />

      {/* Delete Poll Modal from List View */}
      {pollToDelete && (
        <DeletePollModal
          isOpen={!!pollToDelete}
          pollId={pollToDelete.id}
          pollTitle={pollToDelete.title}
          onClose={() => setPollToDelete(null)}
          onDeleted={() => {
            showToast(`Poll "${pollToDelete.title}" deleted.`, 'info', 'Poll Deleted');
            setPollToDelete(null);
            // If the deleted poll was currently selected, return to list
            if (selectedPollId === pollToDelete.id) {
              handleBackToPolls();
            }
          }}
          onError={(msg) => {
            showToast(msg, 'error', 'Delete Failed');
          }}
        />
      )}

      {/* Subtle Footer */}
      <footer className="mt-auto border-t border-slate-850 py-4 px-6 text-center text-xs text-slate-500">
        <div className="flex items-center justify-center gap-2">
          <Activity className="w-3.5 h-3.5 text-cyan-500" />
          <span>Realtime Polling Engine powered by Go, MongoDB, and Redis Pub/Sub</span>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <MainApp />
    </ToastProvider>
  );
}
