import React from 'react';
import { useSyncStore } from '../stores/syncStore.js';

export const ConflictModal = () => {
  const {
    isConflictModalOpen,
    setIsConflictModalOpen,
    pendingConflicts,
    resolveConflict,
    resolveAllConflicts,
  } = useSyncStore();

  if (!isConflictModalOpen || !pendingConflicts || pendingConflicts.length === 0) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl bg-slate-900 border border-amber-500/30 rounded-2xl shadow-2xl p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2.5 text-amber-400">
            <span className="text-xl">⚠️</span>
            <h3 className="text-base font-bold text-white">File Conflicts Detected</h3>
          </div>
          <button
            onClick={() => setIsConflictModalOpen(false)}
            className="text-slate-400 hover:text-white transition p-1 rounded-lg"
          >
            ✕
          </button>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          The following file(s) exist in the local project workspace with different contents than the cloud project.
          Cloud storage remains the source of truth. Choose whether to overwrite or keep each local file.
        </p>

        {/* Conflicted Files List */}
        <div className="max-h-60 overflow-y-auto space-y-2.5 pr-1">
          {pendingConflicts.map((conflict) => (
            <div
              key={conflict.filePath}
              className="flex items-center justify-between p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs"
            >
              <div className="flex items-center space-x-2 font-mono text-slate-200 truncate pr-3">
                <span className="text-slate-500">📄</span>
                <span className="truncate" title={conflict.filePath}>
                  {conflict.filePath}
                </span>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <button
                  type="button"
                  onClick={() => resolveConflict(conflict.filePath, 'skip')}
                  className="px-2.5 py-1 text-[11px] font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition"
                >
                  Skip
                </button>
                <button
                  type="button"
                  onClick={() => resolveConflict(conflict.filePath, 'overwrite')}
                  className="px-2.5 py-1 text-[11px] font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded-lg transition shadow-sm"
                >
                  Overwrite
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
          <span className="text-[11px] text-slate-500 font-mono">
            {pendingConflicts.length} conflict(s) remaining
          </span>

          <div className="flex items-center space-x-2.5">
            <button
              type="button"
              onClick={() => resolveAllConflicts('skip')}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition"
            >
              Skip All
            </button>
            <button
              type="button"
              onClick={() => resolveAllConflicts('overwrite')}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded-xl transition shadow-md shadow-amber-600/20"
            >
              Overwrite All
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

