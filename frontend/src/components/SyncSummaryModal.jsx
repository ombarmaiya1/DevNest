import React from 'react';
import { useSyncStore } from '../stores/syncStore.js';

export const SyncSummaryModal = () => {
  const {
    isSummaryModalOpen,
    setIsSummaryModalOpen,
    totalFiles,
    syncedFiles,
    skippedFiles,
    failedFiles,
    fileErrors,
    lastSyncTime,
    retryFailedFile,
    retryAllFailed,
  } = useSyncStore();

  if (!isSummaryModalOpen) return null;

  const hasErrors = failedFiles > 0 || (fileErrors && fileErrors.length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <span className="text-xl">{hasErrors ? '⚠️' : '✅'}</span>
            <h3 className="text-base font-bold text-white">
              {hasErrors ? 'Sync Completed with Warnings' : 'Cloud Synchronization Complete'}
            </h3>
          </div>
          <button
            onClick={() => setIsSummaryModalOpen(false)}
            className="text-slate-400 hover:text-white transition p-1 rounded-lg"
          >
            ✕
          </button>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
            <span className="block text-lg font-bold text-white">{totalFiles}</span>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">Total</span>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <span className="block text-lg font-bold text-emerald-400">{syncedFiles}</span>
            <span className="text-[10px] text-emerald-500 uppercase tracking-wider">Synced</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
            <span className="block text-lg font-bold text-slate-300">{skippedFiles}</span>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider">Skipped</span>
          </div>
          <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
            <span className="block text-lg font-bold text-red-400">{failedFiles}</span>
            <span className="text-[10px] text-red-400 uppercase tracking-wider">Failed</span>
          </div>
        </div>

        {/* Failed Files with Per-File Retry Action */}
        {hasErrors && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-red-400">
              <span>Failed Files ({fileErrors.length})</span>
              <button
                type="button"
                onClick={() => retryAllFailed()}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium underline"
              >
                Retry All
              </button>
            </div>

            <div className="max-h-44 overflow-y-auto space-y-2 pr-1">
              {fileErrors.map((err) => (
                <div
                  key={err.filePath}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs"
                >
                  <div className="min-w-0 pr-2">
                    <p className="font-mono text-slate-200 truncate">{err.filePath}</p>
                    <p className="text-[10px] text-red-400 truncate">{err.error}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => retryFailedFile(err.filePath)}
                    className="px-2.5 py-1 text-[11px] font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition shrink-0 shadow-sm"
                  >
                    Retry
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-[11px] text-slate-500">
          <span>{lastSyncTime ? `Last synced: ${new Date(lastSyncTime).toLocaleTimeString()}` : ''}</span>
          <button
            type="button"
            onClick={() => setIsSummaryModalOpen(false)}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

