import React, { useRef, useEffect, useMemo } from 'react';
import Editor from '@monaco-editor/react';
import { useFileStore } from '../stores/fileStore.js';
import { useAgentStore } from '../stores/agentStore.js';
import { useSyncStore } from '../stores/syncStore.js';
import { getLanguageFromPath } from '../utils/editorLanguage.js';

export { getLanguageFromPath };

export const TextEditor = ({ onCursorChange, projectName = 'devnest' }) => {
  const {
    files,
    openTabs,
    activeTabId,
    actionLoading,
    actionError,
    localSaveStatus,
    cloudUploadStatus,
    cloudUploadError,
    pendingCount,
    updateTabContent,
    saveActiveFile,
    saveToCloud,
  } = useFileStore();

  const { connectionStatus, currentWorkspace } = useAgentStore();
  const { activeFileLocalSync, syncActiveFileToLocal } = useSyncStore();

  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const viewStatesRef = useRef(new Map());
  const prevTabIdRef = useRef(activeTabId);

  const activeTab = openTabs.find((t) => t.fileId === activeTabId);
  const activeFile = files.find(
    (f) => f.id === activeTabId || f.file_path === activeTab?.filePath || f.path === activeTab?.filePath
  );
  const localSyncInfo = activeTab ? activeFileLocalSync[activeTab.filePath] : null;

  const language = useMemo(
    () => (activeTab ? getLanguageFromPath(activeTab.filePath) : 'plaintext'),
    [activeTab?.filePath]
  );

  // Synchronize save handler ref for event callbacks & button click
  const performSave = async () => {
    if (cloudUploadStatus === 'uploading') return;
    try {
      await saveActiveFile();
      const { connectionStatus: liveConn, currentWorkspace: liveWs } = useAgentStore.getState();
      if (liveConn === 'connected' && liveWs?.path && activeTab) {
        await syncActiveFileToLocal(activeTab.filePath, activeTab.content);
      }
    } catch {
      // Cloud save error handled by fileStore
    }
  };

  const saveRef = useRef();
  saveRef.current = performSave;

  // Global Ctrl+S / Cmd+S keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (saveRef.current) {
          saveRef.current();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Preserve and restore view states across tab switches
  useEffect(() => {
    if (editorRef.current && prevTabIdRef.current && prevTabIdRef.current !== activeTabId) {
      const state = editorRef.current.saveViewState();
      if (state) {
        viewStatesRef.current.set(prevTabIdRef.current, state);
      }
    }

    prevTabIdRef.current = activeTabId;

    if (editorRef.current && activeTabId) {
      const savedState = viewStatesRef.current.get(activeTabId);
      if (savedState) {
        editorRef.current.restoreViewState(savedState);
      }
    }
  }, [activeTabId]);

  // Clean up view states for closed tabs
  useEffect(() => {
    const currentTabIds = new Set(openTabs.map((t) => t.fileId));
    for (const fileId of viewStatesRef.current.keys()) {
      if (!currentTabIds.has(fileId)) {
        viewStatesRef.current.delete(fileId);
      }
    }
  }, [openTabs]);

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Attach Ctrl+S / Cmd+S command directly inside Monaco Editor
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      if (saveRef.current) {
        saveRef.current();
      }
    });

    // Cursor position tracking for bottom status bar
    editor.onDidChangeCursorPosition((e) => {
      if (onCursorChange) {
        onCursorChange({
          line: e.position.lineNumber,
          col: e.position.column,
        });
      }
    });

    // Restore view state if active tab already had one
    if (activeTabId && viewStatesRef.current.has(activeTabId)) {
      const savedState = viewStatesRef.current.get(activeTabId);
      if (savedState) {
        editor.restoreViewState(savedState);
      }
    }

    editor.focus();
  };

  // If no tab is active
  if (!activeTab) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#1e1e1e] text-center select-none text-[#858585]">
        <div className="w-16 h-16 rounded-xl bg-[#252526] border border-[#2b2b2b] flex items-center justify-center text-3xl mb-3">
          <svg className="w-8 h-8 text-[#555555]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
        </div>
        <h3 className="text-sm font-semibold text-[#cccccc]">No Files Open</h3>
        <p className="text-xs text-[#858585] max-w-xs mt-1">
          Select a file from the explorer on the left or press <span className="font-mono bg-[#252526] px-1 py-0.5 rounded text-[#cccccc]">Ctrl+N</span> to create a file.
        </p>
      </div>
    );
  }

  // Loading file content
  if (activeTab.loadingContent) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#1e1e1e] text-center">
        <div className="w-8 h-8 border-2 border-indigo-500/20 border-t-[#007acc] rounded-full animate-spin mb-3"></div>
        <p className="text-xs text-[#858585]">Loading {activeTab.filePath}...</p>
      </div>
    );
  }

  // Failed to load file content
  if (activeTab.loadError) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#1e1e1e] text-center">
        <div className="p-4 rounded bg-red-950/40 border border-red-500/30 text-red-300 max-w-md">
          <p className="text-xs font-semibold mb-1">Failed to read file</p>
          <p className="text-[11px] text-[#cccccc]">{activeTab.loadError}</p>
        </div>
      </div>
    );
  }

  const editorOptions = {
    theme: 'vs-dark',
    automaticLayout: true,
    minimap: { enabled: true }, // Default: minimap: { enabled: false }
    lineNumbers: 'on',
    wordWrap: 'on',
    formatOnPaste: true,
    formatOnType: true,
    fontSize: 13,
    fontFamily: "Fira Code, Menlo, Monaco, Consolas, 'Courier New', monospace",
    scrollBeyondLastLine: false,
    tabSize: 2,
    cursorBlinking: 'smooth',
    smoothScrolling: true,
    fixedOverflowWidgets: true,
    padding: { top: 6, bottom: 6 },
  };

  const isUploading = cloudUploadStatus === 'uploading';
  const isSyncFailed =
    Boolean(activeFile?.lastSyncError) ||
    (cloudUploadStatus === 'error' && activeFile?.syncStatus !== 'synced');
  const isUnsavedToCloud =
    activeFile?.syncStatus !== 'synced' || activeTab.isDirty;

  const breadcrumbSegments = activeTab.filePath.split('/');

  return (
    <div className="flex-1 flex flex-col h-full bg-[#1e1e1e] overflow-hidden">
      {/* VS Code Breadcrumb Bar & Quick Save Header */}
      <div className="h-[24px] flex items-center justify-between px-3 bg-[#1e1e1e] border-b border-[#2b2b2b] text-[11px] font-sans select-none text-[#858585]">
        {/* Breadcrumb Path Segments */}
        <div className="flex items-center space-x-1.5 truncate">
          <span className="hover:text-[#cccccc] cursor-pointer">{projectName}</span>
          {breadcrumbSegments.map((seg, i) => (
            <React.Fragment key={i}>
              <span className="text-[#555555]">›</span>
              <span
                className={`truncate ${
                  i === breadcrumbSegments.length - 1
                    ? 'text-[#cccccc] font-medium'
                    : 'hover:text-[#cccccc] cursor-pointer'
                }`}
              >
                {seg}
              </span>
            </React.Fragment>
          ))}

          {/* Local Status */}
          <span className="hidden sm:inline-flex items-center px-1 rounded text-[10px] bg-[#252526] text-[#858585] ml-2">
            {localSaveStatus === 'saving' ? '💾 Saving' : '✓ Local'}
          </span>

          {/* Cloud Status */}
          {isUploading ? (
            <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold bg-sky-500/10 text-sky-400">
              ☁ Uploading...
            </span>
          ) : isSyncFailed ? (
            <span className="inline-flex items-center space-x-1 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-red-500/10 text-red-400">
              <span>⚠️ Sync Failed</span>
              <button
                type="button"
                onClick={() => performSave()}
                className="underline hover:text-white font-bold ml-1"
                title={activeFile?.lastSyncError || cloudUploadError || 'Retry cloud upload'}
              >
                Retry
              </button>
            </span>
          ) : isUnsavedToCloud ? (
            <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold bg-amber-400/10 text-amber-400">
              • Unsaved to Cloud
            </span>
          ) : (
            <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-medium bg-emerald-400/10 text-emerald-400">
              ✓ Cloud Saved
            </span>
          )}

          {pendingCount > 0 && (
            <span className="hidden md:inline-flex text-[10px] text-amber-300 font-mono">
              ({pendingCount} pending)
            </span>
          )}
        </div>

        {/* Right Action: Save to Cloud Button */}
        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={() => performSave()}
            disabled={isUploading || (pendingCount === 0 && !activeTab.isDirty)}
            className={`px-2 py-0.5 rounded text-[11px] font-semibold transition flex items-center space-x-1 ${
              isUploading
                ? 'bg-[#007acc] text-white opacity-80 cursor-wait'
                : pendingCount > 0 || activeTab.isDirty
                ? 'bg-[#007acc] hover:bg-[#0062a3] text-white shadow-sm'
                : 'text-[#666666] hover:text-[#999999] hover:bg-[#252526]'
            }`}
            title="Explicit Cloud Save (Ctrl+S / Cmd+S)"
          >
            <span>{isUploading ? 'Uploading...' : 'Save'}</span>
            <span className="text-[9px] opacity-70 font-mono">(Ctrl+S)</span>
          </button>
        </div>
      </div>

      {/* Monaco Editor Container */}
      <div className="flex-1 w-full h-full overflow-hidden bg-[#1e1e1e]">
        <Editor
          height="100%"
          language={language}
          theme="vs-dark"
          value={activeTab.content}
          onChange={(value) => updateTabContent(activeTab.fileId, value ?? '')}
          onMount={handleEditorDidMount}
          options={editorOptions}
          loading={
            <div className="flex items-center justify-center h-full text-xs text-[#858585]">
              <span className="animate-spin mr-2">⚡</span> Loading editor...
            </div>
          }
        />
      </div>
    </div>
  );
};
