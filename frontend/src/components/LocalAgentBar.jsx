import React, { useEffect } from 'react';
import { useAgentStore } from '../stores/agentStore.js';
import { useProjectStore } from '../stores/projectStore.js';
import { useSyncStore } from '../stores/syncStore.js';

export const LocalAgentBar = () => {
  const {
    connectionStatus,
    process,
    loading,
    error,
    checkConnection,
    setIsLogsOpen,
    startProcess,
    stopProcess,
    fetchProcessStatus,
    clearError,
  } = useAgentStore();

  const { currentProject } = useProjectStore();
  const {
    syncStatus,
    totalFiles,
    currentFileIndex,
    pendingConflicts,
    setIsConflictModalOpen,
    setIsSummaryModalOpen,
    syncFromCloud,
  } = useSyncStore();

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  // Periodic poll of process status if process is running
  useEffect(() => {
    let interval = null;
    if (connectionStatus === 'connected' && process?.status === 'running') {
      interval = setInterval(() => {
        fetchProcessStatus();
      }, 2500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [connectionStatus, process?.status, fetchProcessStatus]);

  const isConnected = connectionStatus === 'connected';
  const isConnecting = connectionStatus === 'connecting';
  const isRunning = process?.status === 'running';

  return (
    <div className="rounded-xl bg-slate-800/90 border border-slate-700/80 px-4 py-2.5 shadow-md">
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Left Section: Connection Status */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Connection Indicator */}
          <div className="flex items-center space-x-2">
            {isConnected ? (
              <span className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Agent Connected</span>
              </span>
            ) : isConnecting ? (
              <span className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <span>Connecting...</span>
              </span>
            ) : (
              <div className="flex items-center space-x-2">
                <span className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-slate-700/60 text-slate-400 border border-slate-600/50 font-medium">
                  <span className="w-2 h-2 rounded-full bg-slate-500" />
                  <span>Agent Offline</span>
                </span>
                <button
                  onClick={() => checkConnection()}
                  className="px-2 py-0.5 rounded text-[11px] font-medium text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 transition"
                  title="Retry connecting to local agent at 127.0.0.1:4317"
                >
                  Retry
                </button>
              </div>
            )}
          </div>

          {!isConnected && !isConnecting && (
            <span className="text-[11px] text-slate-500 hidden md:inline">
              Local agent is not running on 127.0.0.1:4317 (Cloud workspace is active).
            </span>
          )}
        </div>

        {/* Right Section: Process Execution & Cloud-to-Local Sync Controls */}
        {isConnected && (
          <div className="flex flex-wrap items-center gap-2">
            {/* Cloud-to-Local Sync Controls */}
            <div className="flex items-center space-x-1.5">
              {syncStatus === 'syncing' ? (
                <div className="inline-flex items-center px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-medium space-x-1.5">
                  <span className="w-3 h-3 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
                  <span>Syncing ({currentFileIndex}/{totalFiles})...</span>
                </div>
              ) : pendingConflicts.length > 0 ? (
                <button
                  onClick={() => setIsConflictModalOpen(true)}
                  className="inline-flex items-center px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold space-x-1"
                  title="Resolve detected file conflicts"
                >
                  <span>⚠️ Conflicts ({pendingConflicts.length})</span>
                </button>
              ) : (
                <button
                  onClick={() => currentProject?.id && syncFromCloud(currentProject.id)}
                  className="inline-flex items-center px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-medium transition space-x-1"
                  title="Download and sync all cloud files to local agent workspace"
                >
                  <span>☁️</span>
                  <span>Sync from Cloud</span>
                </button>
              )}

              {(syncStatus === 'completed' || syncStatus === 'error') && (
                <button
                  onClick={() => setIsSummaryModalOpen(true)}
                  className="text-[11px] text-slate-400 hover:text-white underline transition px-1"
                  title="View synchronization summary"
                >
                  Summary
                </button>
              )}
            </div>

            {/* Detected Preview URL Link */}
            {process?.previewUrl && (
              <a
                href={process.previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition space-x-1"
                title="Open Preview in New Tab"
              >
                <span>Preview</span>
                <span className="text-[10px]">↗</span>
              </a>
            )}

            {/* Run / Stop Button */}
            {isRunning ? (
              <button
                onClick={() => stopProcess()}
                disabled={loading}
                className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-500 text-white transition shadow-sm disabled:opacity-50 space-x-1.5"
              >
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                <span>{loading ? 'Stopping...' : 'Stop'}</span>
              </button>
            ) : (
              <button
                onClick={() => startProcess('npm', ['run', 'dev'])}
                disabled={loading}
                className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-sm disabled:opacity-50 space-x-1.5"
              >
                <span>▶</span>
                <span>{loading ? 'Starting...' : 'Run (dev)'}</span>
              </button>
            )}

            {/* Logs Button */}
            <button
              onClick={() => setIsLogsOpen(true)}
              className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium transition"
              title="View process output logs"
            >
              Logs
            </button>
          </div>
        )}
      </div>

      {/* Inline Error Notice */}
      {error && isConnected && (
        <div className="mt-2 flex items-center justify-between p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
          <span>{error}</span>
          <button onClick={clearError} className="text-red-400 hover:text-white ml-2">
            ✕
          </button>
        </div>
      )}
    </div>
  );
};
