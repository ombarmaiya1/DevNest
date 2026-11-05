import React from 'react';
import { useAgentStore } from '../stores/agentStore.js';
import { useProjectStore } from '../stores/projectStore.js';
import { useSyncStore } from '../stores/syncStore.js';
import { useFileStore } from '../stores/fileStore.js';

export const StatusBar = ({
  isTerminalOpen,
  setIsTerminalOpen,
  activeLanguage = 'JavaScript',
  cursorPos = { line: 1, col: 1 },
}) => {
  const { currentProject } = useProjectStore();
  const { connectionStatus, process, checkConnection } = useAgentStore();
  const {
    syncStatus,
    totalFiles,
    currentFileIndex,
    syncFromCloud,
    setIsConflictModalOpen,
    pendingConflicts,
    activeFileLocalSync,
  } = useSyncStore();
  const {
    openTabs,
    activeTabId,
    pendingCount,
    cloudUploadStatus,
    localSaveStatus,
    saveToCloud,
  } = useFileStore();

  const isConnected = connectionStatus === 'connected';
  const isRunning = process?.status === 'running';

  const activeTab = openTabs.find((t) => t.fileId === activeTabId);
  const activeLocalSync = activeTab ? activeFileLocalSync[activeTab.filePath] : null;

  return (
    <div className="h-[22px] shrink-0 bg-[#181818] border-t border-[#2b2b2b] text-[#cccccc] flex items-center justify-between text-[11px] font-sans select-none z-40">
      {/* Left Region */}
      <div className="flex items-center space-x-2.5 h-full overflow-hidden">
        {/* Remote Host Badge */}
        <div
          title="Devnest Remote Host / Connected Environment"
          className="bg-[#007acc] text-white hover:bg-[#1f8ad2] px-2.5 h-full flex items-center font-bold text-[11px] cursor-pointer select-none transition"
        >
          &gt;&lt;
        </div>

        {/* Problems & Warnings Counter */}
        <div
          title="0 Errors, 0 Warnings"
          className="flex items-center space-x-1.5 px-1.5 py-0.5 rounded hover:bg-[#252526] hover:text-white cursor-pointer transition text-[#858585]"
        >
          <span className="flex items-center space-x-0.5">
            <span className="text-red-400 font-bold">⊗</span>
            <span>0</span>
          </span>
          <span className="flex items-center space-x-0.5">
            <span className="text-amber-400 font-bold">⚠</span>
            <span>0</span>
          </span>
        </div>

        {/* Git Branch Indicator */}
        <div
          title="Git Repository (main branch)"
          className="flex items-center space-x-1 px-1.5 py-0.5 rounded hover:bg-[#252526] hover:text-white cursor-pointer transition text-[#858585]"
        >
          <span className="text-[12px]">⎇</span>
          <span>main*</span>
        </div>

        <span className="text-[#333333]">|</span>

        {/* Local Agent Connection */}
        <button
          onClick={() => checkConnection()}
          title={isConnected ? 'Local Agent Connected (127.0.0.1:4317)' : 'Local Agent Offline (Click to retry)'}
          className="flex items-center space-x-1 px-1.5 py-0.5 rounded hover:bg-[#252526] hover:text-white transition"
        >
          <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-red-400'}`} />
          <span className={isConnected ? 'text-emerald-400' : 'text-red-400'}>
            {isConnected ? 'Agent Connected' : 'Agent Offline'}
          </span>
        </button>

        <span className="text-[#333333]">|</span>

        {/* Cloud Save Status */}
        {cloudUploadStatus === 'uploading' ? (
          <span className="flex items-center space-x-1 text-[#38bdf8] animate-pulse px-1">
            <span>☁️</span>
            <span>Uploading...</span>
          </span>
        ) : pendingCount > 0 ? (
          <button
            onClick={() => saveToCloud()}
            title="Save pending changes to cloud (Ctrl+S)"
            className="flex items-center space-x-1 text-amber-300 hover:text-white px-1.5 py-0.5 rounded hover:bg-[#252526] transition font-medium"
          >
            <span>☁️</span>
            <span>{pendingCount} Unsaved</span>
          </button>
        ) : (
          <button
            onClick={() => saveToCloud()}
            title="All changes saved to cloud (Click to sync)"
            className="flex items-center space-x-1 text-emerald-400/90 hover:text-white px-1.5 py-0.5 rounded hover:bg-[#252526] transition"
          >
            <span>✓</span>
            <span>Cloud Saved</span>
          </button>
        )}

        <span className="text-[#333333]">|</span>

        {/* Local Agent Sync Status */}
        {syncStatus === 'syncing' ? (
          <span className="flex items-center space-x-1 text-[#38bdf8] animate-pulse px-1">
            <span>⚡</span>
            <span>Syncing ({currentFileIndex}/{totalFiles})...</span>
          </span>
        ) : pendingConflicts.length > 0 ? (
          <button
            onClick={() => setIsConflictModalOpen(true)}
            className="flex items-center space-x-1 bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded hover:bg-amber-500/30 transition"
          >
            <span>⚠️</span>
            <span>{pendingConflicts.length} Conflict(s)</span>
          </button>
        ) : (
          <button
            onClick={() => currentProject?.id && syncFromCloud(currentProject.id)}
            className="flex items-center space-x-1 px-1.5 py-0.5 rounded hover:bg-[#252526] hover:text-white text-[#858585] transition"
            title="Sync Working Files to Local Agent Workspace"
          >
            <span>⚡</span>
            <span className="hidden md:inline">Sync to Workspace</span>
          </button>
        )}

        {/* Active Tab Local File Sync Status */}
        {activeTab && (
          <span className="hidden xl:flex items-center space-x-1.5 text-[#858585] text-[10px]">
            <span>•</span>
            <span>{localSaveStatus === 'saving' ? '💾 Saving...' : 'IndexedDB Ready'}</span>
            {activeLocalSync?.status === 'synced' && (
              <>
                <span>•</span>
                <span className="text-emerald-400">Workspace Synced</span>
              </>
            )}
            {activeLocalSync?.status === 'error' && (
              <>
                <span>•</span>
                <span className="text-red-400">Workspace Error</span>
              </>
            )}
          </span>
        )}
      </div>

      {/* Right Region */}
      <div className="flex items-center space-x-3 shrink-0 pr-2">
        {/* Process Status (if running) */}
        {isRunning && (
          <span className="flex items-center space-x-1 text-emerald-400 font-mono text-[10px] bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
            <span>▶</span>
            <span>PID: {process.pid}</span>
          </span>
        )}

        {/* Cursor Position (Ln X, Col Y) */}
        <span
          title="Line, Column Position"
          className="px-1.5 py-0.5 rounded hover:bg-[#252526] hover:text-white cursor-pointer transition text-[#cccccc] font-mono text-[10px]"
        >
          Ln {cursorPos?.line || 1}, Col {cursorPos?.col || 1}
        </span>

        {/* Indentation */}
        <span
          title="Tab Size: 2 Spaces"
          className="hidden sm:inline px-1 py-0.5 rounded hover:bg-[#252526] hover:text-white cursor-pointer transition text-[#858585]"
        >
          Spaces: 2
        </span>

        {/* Encoding */}
        <span
          title="File Encoding"
          className="hidden md:inline px-1 py-0.5 rounded hover:bg-[#252526] hover:text-white cursor-pointer transition text-[#858585]"
        >
          UTF-8
        </span>

        {/* Line Endings */}
        <span
          title="Line Endings"
          className="hidden md:inline px-1 py-0.5 rounded hover:bg-[#252526] hover:text-white cursor-pointer transition text-[#858585]"
        >
          LF
        </span>

        {/* Language Mode */}
        <span
          title="Select Language Mode"
          className="flex items-center space-x-1 px-1.5 py-0.5 rounded hover:bg-[#252526] hover:text-white cursor-pointer transition text-[#cccccc] font-mono text-[10px]"
        >
          <span className="text-[#858585]">{'{}'}</span>
          <span>{activeLanguage || 'JavaScript'}</span>
        </span>

        {/* Terminal Toggle Button */}
        <button
          onClick={() => setIsTerminalOpen(!isTerminalOpen)}
          className={`flex items-center space-x-1 px-1.5 py-0.5 rounded transition ${
            isTerminalOpen
              ? 'bg-[#007acc] text-white font-medium'
              : 'hover:bg-[#252526] hover:text-white text-[#858585]'
          }`}
          title="Toggle Integrated Terminal (Ctrl+`)"
        >
          <span>Terminal</span>
        </button>

        {/* Notification Bell */}
        <button
          title="Notifications"
          className="p-1 rounded hover:bg-[#252526] hover:text-white text-[#858585] transition text-[11px]"
        >
          🔔
        </button>
      </div>
    </div>
  );
};
