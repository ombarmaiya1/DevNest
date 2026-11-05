import React, { useEffect } from 'react';
import { useAgentStore } from '../stores/agentStore.js';

export const ProcessLogsModal = () => {
  const { isLogsOpen, setIsLogsOpen, process, logs, logsRaw, fetchLogs, fetchProcessStatus } = useAgentStore();

  useEffect(() => {
    let interval = null;
    if (isLogsOpen) {
      fetchLogs();
      fetchProcessStatus();

      // Poll periodically while modal is open if process is running
      if (process?.status === 'running') {
        interval = setInterval(() => {
          fetchLogs();
          fetchProcessStatus();
        }, 1500);
      }
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isLogsOpen, process?.status, fetchLogs, fetchProcessStatus]);

  if (!isLogsOpen) return null;

  const isRunning = process?.status === 'running';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-4xl h-[85vh] max-h-[750px] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900/90">
          <div className="flex items-center space-x-3">
            <span className="text-xl">⚡</span>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-white">Process Execution Logs</h3>
                {isRunning ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />
                    Running (PID: {process.pid})
                  </span>
                ) : process?.status === 'stopped' ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-700/50 text-slate-300 border border-slate-600/50">
                    Stopped {process.exitCode !== null ? `(Code: ${process.exitCode})` : ''}
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-800 text-slate-400">
                    No active process
                  </span>
                )}
              </div>
              <p className="text-xs font-mono text-slate-400 mt-0.5">
                {process ? `${process.command} ${(process.args || []).join(' ')}` : 'Idle'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {process?.previewUrl && (
              <a
                href={process.previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/40 transition shadow-sm"
              >
                Open Preview ↗
              </a>
            )}
            <button
              onClick={() => {
                fetchLogs();
                fetchProcessStatus();
              }}
              className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition"
              title="Refresh logs"
            >
              🔄 Refresh
            </button>
            <button
              onClick={() => setIsLogsOpen(false)}
              className="text-slate-400 hover:text-white transition p-1.5 rounded-xl hover:bg-slate-800"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Terminal Log Output */}
        <div className="flex-1 bg-slate-950 p-4 overflow-y-auto font-mono text-xs text-slate-300 select-text">
          {logs && logs.length > 0 ? (
            <div className="space-y-1">
              {logs.map((log, idx) => (
                <div
                  key={idx}
                  className={`flex items-start space-x-3 leading-relaxed ${
                    log.stream === 'stderr' ? 'text-amber-400/90' : 'text-slate-300'
                  }`}
                >
                  <span className="text-[10px] text-slate-600 shrink-0 select-none">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <span
                    className={`text-[10px] px-1 py-0.2 rounded font-mono shrink-0 select-none ${
                      log.stream === 'stderr'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    {log.stream}
                  </span>
                  <span className="break-all whitespace-pre-wrap">{log.text}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-2">
              <span className="text-2xl">📋</span>
              <p>No execution logs recorded yet.</p>
              <p className="text-[11px] text-slate-600">Start the process to view realtime stdout and stderr.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
          <span>Buffer: {logs.length} lines captured in memory</span>
          {process?.startTime && (
            <span>Started: {new Date(process.startTime).toLocaleTimeString()}</span>
          )}
        </div>
      </div>
    </div>
  );
};

