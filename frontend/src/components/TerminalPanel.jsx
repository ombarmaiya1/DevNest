import React, { useEffect, useRef, useState } from 'react';
import { useAgentStore } from '../stores/agentStore.js';

export const TerminalPanel = ({ isOpen, onClose, isMaximized, setIsMaximized }) => {
  const {
    process,
    logs,
    loading,
    startProcess,
    stopProcess,
    fetchLogs,
    fetchProcessStatus,
  } = useAgentStore();

  const [activeTab, setActiveTab] = useState('terminal'); // 'problems' | 'output' | 'debug' | 'terminal' | 'ports'
  const [sessions, setSessions] = useState([
    { id: 'dev', name: '1: npm run dev', command: 'npm run dev' },
  ]);
  const [activeSessionId, setActiveSessionId] = useState('dev');

  const terminalEndRef = useRef(null);
  const isRunning = process?.status === 'running';

  // Auto-scroll to bottom of logs on new log line
  useEffect(() => {
    if (isOpen && terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isOpen]);

  // Periodic polling when terminal is open and process is active
  useEffect(() => {
    let interval = null;
    if (isOpen && isRunning) {
      interval = setInterval(() => {
        fetchLogs();
        fetchProcessStatus();
      }, 1500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isOpen, isRunning, fetchLogs, fetchProcessStatus]);

  if (!isOpen) return null;

  const handleAddNewSession = () => {
    const newId = `session-${Date.now()}`;
    const newSession = {
      id: newId,
      name: `${sessions.length + 1}: bash`,
      command: 'node',
    };
    setSessions((prev) => [...prev, newSession]);
    setActiveSessionId(newId);
  };

  return (
    <div className="h-full flex flex-col font-mono text-xs select-none bg-[#181818] overflow-hidden">
      {/* VS Code Terminal Header & Tabs */}
      <div className="h-[35px] flex items-center justify-between px-3 bg-[#1e1e1e] border-b border-[#2b2b2b] text-[#858585] shrink-0 font-sans">
        {/* Left Category Tabs */}
        <div className="flex items-center space-x-1 h-full overflow-x-auto scrollbar-none">
          {[
            { id: 'problems', label: 'Problems', badge: '0' },
            { id: 'output', label: 'Output' },
            { id: 'debug', label: 'Debug Console' },
            { id: 'terminal', label: 'Terminal', hasStatus: true },
            { id: 'ports', label: 'Ports' },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`h-full px-2.5 flex items-center space-x-1.5 text-xs transition border-b-2 ${
                  isActive
                    ? 'border-[#007acc] text-white font-medium'
                    : 'border-transparent text-[#858585] hover:text-[#cccccc]'
                }`}
              >
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-[#252526] text-[#858585]">
                    {tab.badge}
                  </span>
                )}
                {tab.hasStatus && isRunning && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-1" />
                )}
              </button>
            );
          })}
        </div>

        {/* Right Action Controls */}
        <div className="flex items-center space-x-2 shrink-0">
          {/* Preview Dev Server Button */}
          {process?.previewUrl && (
            <a
              href={process.previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[#007acc] hover:bg-[#0062a3] text-white transition space-x-1 shadow-sm"
              title="Open Dev Server Preview in new tab"
            >
              <span>Preview</span>
              <span className="text-[9px]">↗</span>
            </a>
          )}

          {/* Run / Stop Process Controls */}
          {isRunning ? (
            <button
              type="button"
              onClick={() => stopProcess()}
              disabled={loading}
              className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-red-600/80 hover:bg-red-500 text-white transition disabled:opacity-50 space-x-1"
              title="Stop workspace process"
            >
              <span>⏹</span>
              <span>{loading ? 'Stopping...' : 'Stop'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => startProcess('npm', ['run', 'dev'])}
              disabled={loading}
              className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-600/80 hover:bg-emerald-500 text-white transition disabled:opacity-50 space-x-1"
              title="Run project (npm run dev)"
            >
              <span>▶</span>
              <span>{loading ? 'Starting...' : 'Run (dev)'}</span>
            </button>
          )}

          {/* Session Switcher Dropdown */}
          <div className="flex items-center space-x-1 bg-[#252526] px-1.5 py-0.5 rounded border border-[#333333]">
            <span className="text-[10px] text-[#007acc] font-mono font-bold">&gt;</span>
            <select
              value={activeSessionId}
              onChange={(e) => setActiveSessionId(e.target.value)}
              className="bg-transparent text-[11px] text-[#cccccc] outline-none cursor-pointer font-mono"
            >
              {sessions.map((s) => (
                <option key={s.id} value={s.id} className="bg-[#252526] text-white">
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* New Session Button */}
          <button
            type="button"
            onClick={handleAddNewSession}
            title="New Terminal Session"
            className="p-1 hover:text-white hover:bg-[#252526] rounded transition text-xs"
          >
            ＋
          </button>

          {/* Refresh Logs Button */}
          <button
            type="button"
            onClick={() => {
              fetchLogs();
              fetchProcessStatus();
            }}
            className="p-1 hover:text-white hover:bg-[#252526] rounded transition text-xs"
            title="Refresh Output"
          >
            🔄
          </button>

          {/* Maximize / Restore Panel Button */}
          <button
            type="button"
            onClick={() => setIsMaximized && setIsMaximized(!isMaximized)}
            className="p-1 hover:text-white hover:bg-[#252526] rounded transition text-xs font-mono"
            title={isMaximized ? 'Restore Panel Size' : 'Maximize Panel Size'}
          >
            {isMaximized ? '🗗' : '🗖'}
          </button>

          {/* Close Panel Button */}
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:text-white hover:bg-[#252526] rounded transition text-xs"
            title="Close Panel"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Terminal Body Content */}
      <div className="flex-1 overflow-y-auto p-3 text-xs text-[#cccccc] select-text leading-relaxed bg-[#181818] font-mono">
        {activeTab === 'terminal' ? (
          <div>
            {/* Terminal Startup Header (Matching Screenshot) */}
            <div className="text-[#858585] mb-2 space-y-0.5 select-none">
              <p className="text-[#98c379]">Devnest Local Agent Terminal [Version 1.0.0]</p>
              <p>Workspace: Devnest-managed project directory</p>
              <p className="text-[#61afef]">PS Devnest&gt; {isRunning ? 'npm run dev' : '# Click Run (dev) above to start development process'}</p>
            </div>

            {/* Output Stream */}
            {logs && logs.length > 0 ? (
              <div className="space-y-0.5">
                {logs.map((log, index) => (
                  <div
                    key={index}
                    className={`flex items-start space-x-2 ${
                      log.stream === 'stderr' ? 'text-[#e5c07b]' : 'text-[#cccccc]'
                    }`}
                  >
                    <span className="text-[10px] text-[#555555] shrink-0 select-none">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <span className="break-all whitespace-pre-wrap">{log.text}</span>
                  </div>
                ))}
                <div ref={terminalEndRef} />
              </div>
            ) : (
              <div className="text-[#858585] mt-4 space-y-1">
                <p>Devnest Integrated Terminal ready.</p>
                <p className="text-[11px] text-[#666666]">
                  Click 'Run (dev)' above to start the local development server.
                </p>
              </div>
            )}
          </div>
        ) : activeTab === 'problems' ? (
          <div className="p-4 text-center text-[#858585]">
            <p>No problems have been detected in the workspace.</p>
          </div>
        ) : activeTab === 'ports' ? (
          <div className="p-3 text-xs space-y-2">
            <div className="grid grid-cols-3 gap-2 font-semibold text-[#858585] border-b border-[#2b2b2b] pb-1">
              <span>Port</span>
              <span>Protocol</span>
              <span>Preview</span>
            </div>
            {process?.previewUrl ? (
              <div className="grid grid-cols-3 gap-2 text-[#cccccc] items-center">
                <span className="font-mono text-emerald-400">5173 / 4000</span>
                <span>HTTP (Vite)</span>
                <a
                  href={process.previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#007acc] hover:underline"
                >
                  {process.previewUrl} ↗
                </a>
              </div>
            ) : (
              <div className="text-[#858585] py-2">No active local ports forwarded.</div>
            )}
          </div>
        ) : (
          <div className="p-4 text-center text-[#858585]">
            <p>No active output stream for {activeTab}.</p>
          </div>
        )}
      </div>
    </div>
  );
};
