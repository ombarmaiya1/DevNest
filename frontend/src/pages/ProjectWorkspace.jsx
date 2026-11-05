import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useProjectStore } from '../stores/projectStore.js';
import { useFileStore } from '../stores/fileStore.js';
import { useAgentStore } from '../stores/agentStore.js';
import { TopMenuBar } from '../components/TopMenuBar.jsx';
import { ActivityBar } from '../components/ActivityBar.jsx';
import { FileExplorer } from '../components/FileExplorer.jsx';
import { EditorTabs } from '../components/EditorTabs.jsx';
import { TextEditor } from '../components/TextEditor.jsx';
import { TerminalPanel } from '../components/TerminalPanel.jsx';
import { AIAssistantPanel } from '../components/AIAssistantPanel.jsx';
import { StatusBar } from '../components/StatusBar.jsx';
import { ProcessLogsModal } from '../components/ProcessLogsModal.jsx';
import { ConflictModal } from '../components/ConflictModal.jsx';
import { SyncSummaryModal } from '../components/SyncSummaryModal.jsx';
import { getLanguageFromPath } from '../utils/editorLanguage.js';

// Safe localStorage parsers with defaults
const getStoredBool = (key, defaultVal) => {
  try {
    const val = localStorage.getItem(key);
    return val !== null ? JSON.parse(val) : defaultVal;
  } catch {
    return defaultVal;
  }
};

const getStoredNum = (key, defaultVal) => {
  try {
    const val = localStorage.getItem(key);
    return val !== null ? Number(val) : defaultVal;
  } catch {
    return defaultVal;
  }
};

export const ProjectWorkspace = () => {
  const { projectId } = useParams();
  const { currentProject, loading, error, fetchProjectById } = useProjectStore();
  const { fetchFiles, resetWorkspace, openTabs, activeTabId } = useFileStore();
  const { initProjectWorkspace } = useAgentStore();

  // Panel Visibility States (Persisted in localStorage)
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => getStoredBool('devnest_isSidebarOpen', true));
  const [isTerminalOpen, setIsTerminalOpen] = useState(() => getStoredBool('devnest_isTerminalOpen', true));
  const [isTerminalMaximized, setIsTerminalMaximized] = useState(false);
  const [isAIOpen, setIsAIOpen] = useState(() => getStoredBool('devnest_isAIOpen', true));
  const [activeView, setActiveView] = useState('explorer');

  // Panel Resizable Dimensions (Persisted in localStorage)
  const [sidebarWidth, setSidebarWidth] = useState(() => getStoredNum('devnest_sidebarWidth', 240));
  const [aiWidth, setAiWidth] = useState(() => getStoredNum('devnest_aiWidth', 340));
  const [terminalHeight, setTerminalHeight] = useState(() => getStoredNum('devnest_terminalHeight', 220));

  // Editor cursor position tracking (Ln X, Col Y)
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });

  // Persist panel preferences
  useEffect(() => {
    try {
      localStorage.setItem('devnest_isSidebarOpen', JSON.stringify(isSidebarOpen));
      localStorage.setItem('devnest_isTerminalOpen', JSON.stringify(isTerminalOpen));
      localStorage.setItem('devnest_isAIOpen', JSON.stringify(isAIOpen));
      localStorage.setItem('devnest_sidebarWidth', sidebarWidth.toString());
      localStorage.setItem('devnest_aiWidth', aiWidth.toString());
      localStorage.setItem('devnest_terminalHeight', terminalHeight.toString());
    } catch {
      // Ignore storage errors
    }
  }, [isSidebarOpen, isTerminalOpen, isAIOpen, sidebarWidth, aiWidth, terminalHeight]);

  // Load project workspace data on mount / projectId change
  useEffect(() => {
    if (projectId) {
      fetchProjectById(projectId).catch(() => {});
      fetchFiles(projectId).catch(() => {});
      initProjectWorkspace(projectId).catch(() => {});
    }

    return () => {
      resetWorkspace();
    };
  }, [projectId, fetchProjectById, fetchFiles, resetWorkspace, initProjectWorkspace]);

  // Derive active tab and language
  const activeTab = useMemo(
    () => openTabs.find((t) => t.fileId === activeTabId),
    [openTabs, activeTabId]
  );

  const activeFileName = useMemo(() => {
    if (!activeTab?.filePath) return '';
    return activeTab.filePath.split('/').pop();
  }, [activeTab]);

  const activeLanguage = useMemo(
    () => (activeTab ? getLanguageFromPath(activeTab.filePath) : 'JavaScript'),
    [activeTab]
  );

  // --- Smooth Horizontal Resizing: Explorer Sidebar ---
  const handleSidebarDragStart = (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = sidebarWidth;

    const onMouseMove = (moveEvent) => {
      const delta = moveEvent.clientX - startX;
      const newWidth = Math.max(160, Math.min(480, startW + delta));
      setSidebarWidth(newWidth);
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // --- Smooth Horizontal Resizing: AI Assistant Sidebar ---
  const handleAIDragStart = (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = aiWidth;

    const onMouseMove = (moveEvent) => {
      const delta = startX - moveEvent.clientX; // Leftward expansion
      const newWidth = Math.max(240, Math.min(650, startW + delta));
      setAiWidth(newWidth);
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // --- Smooth Vertical Resizing: Terminal Panel ---
  const handleTerminalDragStart = (e) => {
    e.preventDefault();
    const startY = e.clientY;
    const startH = terminalHeight;

    const onMouseMove = (moveEvent) => {
      const delta = startY - moveEvent.clientY; // Upward expansion
      const newHeight = Math.max(100, Math.min(550, startH + delta));
      setTerminalHeight(newHeight);
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen w-screen bg-[#1e1e1e] space-y-4">
        <div className="w-10 h-10 border-4 border-[#007acc]/20 border-t-[#007acc] rounded-full animate-spin"></div>
        <p className="text-xs text-[#858585] font-mono">Loading Devnest IDE workspace...</p>
      </div>
    );
  }

  if (error || !currentProject) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-[#1e1e1e] p-6">
        <div className="max-w-md w-full p-8 rounded-xl bg-[#252526] border border-red-500/30 text-center shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center mx-auto mb-4 text-xl font-bold">
            !
          </div>
          <h2 className="text-base font-bold text-white mb-2">Failed to Load Project</h2>
          <p className="text-xs text-[#858585] mb-6">{error || 'Project not found or access denied.'}</p>
          <Link
            to="/"
            className="inline-flex items-center px-4 py-2 rounded bg-[#007acc] hover:bg-[#0062a3] text-white font-medium text-xs transition shadow-md"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-[#1e1e1e] text-[#cccccc] overflow-hidden select-none font-sans">
      {/* 1. Top Application Bar & Window Menus */}
      <TopMenuBar
        projectName={currentProject.name}
        activeFileName={activeFileName}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        isTerminalOpen={isTerminalOpen}
        setIsTerminalOpen={setIsTerminalOpen}
        isAIOpen={isAIOpen}
        setIsAIOpen={setIsAIOpen}
      />

      {/* 2. Main Center IDE Body */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        {/* Leftmost Activity Bar */}
        <ActivityBar
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          activeView={activeView}
          setActiveView={setActiveView}
          isAIOpen={isAIOpen}
          setIsAIOpen={setIsAIOpen}
        />

        {/* Primary Sidebar (Explorer or Other Active Tool) */}
        {isSidebarOpen && (
          <div
            style={{ width: `${sidebarWidth}px` }}
            className="shrink-0 h-full border-r border-[#2b2b2b] bg-[#252526] overflow-hidden relative flex flex-col"
          >
            {activeView === 'explorer' ? (
              <FileExplorer projectId={currentProject.id} />
            ) : (
              <div className="h-full flex flex-col font-sans">
                <div className="h-[35px] flex items-center justify-between px-3 border-b border-[#2b2b2b] text-[11px] font-semibold text-[#858585] uppercase tracking-wider">
                  <span>{activeView.replace('-', ' ')}</span>
                  <button
                    onClick={() => setIsSidebarOpen(false)}
                    className="hover:text-white p-1 text-xs"
                    title="Close Sidebar"
                  >
                    ✕
                  </button>
                </div>
                <div className="p-4 text-xs text-[#858585] space-y-2">
                  <p className="text-[#cccccc] font-medium capitalize">{activeView.replace('-', ' ')} View</p>
                  <p>All project resources and files are synchronizing with your local working storage.</p>
                </div>
              </div>
            )}

            {/* Draggable Vertical Splitter Handle */}
            <div
              onMouseDown={handleSidebarDragStart}
              title="Drag to resize sidebar"
              className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-[#007acc] active:bg-[#007acc] transition z-30"
            />
          </div>
        )}

        {/* Central Editor & Bottom Panel Area */}
        <div className="flex-1 flex flex-col min-w-0 h-full bg-[#1e1e1e] overflow-hidden relative">
          {/* Monaco Editor Tabs & Code Canvas */}
          {!isTerminalMaximized && (
            <>
              <EditorTabs />
              <div className="flex-1 min-h-0 relative">
                <TextEditor
                  onCursorChange={setCursorPos}
                  projectName={currentProject.name}
                />
              </div>
            </>
          )}

          {/* Integrated Terminal Panel */}
          {isTerminalOpen && (
            <div
              style={{
                height: isTerminalMaximized ? '100%' : `${terminalHeight}px`,
              }}
              className="shrink-0 border-t border-[#2b2b2b] relative bg-[#181818] flex flex-col"
            >
              {/* Draggable Horizontal Splitter Handle */}
              {!isTerminalMaximized && (
                <div
                  onMouseDown={handleTerminalDragStart}
                  title="Drag to resize terminal"
                  className="absolute -top-1 left-0 right-0 h-2 cursor-row-resize hover:bg-[#007acc] active:bg-[#007acc] transition z-30"
                />
              )}

              <TerminalPanel
                isOpen={isTerminalOpen}
                onClose={() => setIsTerminalOpen(false)}
                isMaximized={isTerminalMaximized}
                setIsMaximized={setIsTerminalMaximized}
              />
            </div>
          )}
        </div>

        {/* Right Secondary Sidebar: AI Assistant (Demo) */}
        {isAIOpen && (
          <div
            style={{ width: `${aiWidth}px` }}
            className="shrink-0 h-full border-l border-[#2b2b2b] bg-[#181818] overflow-hidden relative flex flex-col"
          >
            {/* Draggable Vertical Splitter Handle */}
            <div
              onMouseDown={handleAIDragStart}
              title="Drag to resize AI Assistant"
              className="absolute top-0 left-0 w-1.5 h-full cursor-col-resize hover:bg-[#007acc] active:bg-[#007acc] transition z-30"
            />

            <AIAssistantPanel
              isOpen={isAIOpen}
              onClose={() => setIsAIOpen(false)}
              projectName={currentProject.name}
            />
          </div>
        )}
      </div>

      {/* 3. Bottom Status Bar */}
      <StatusBar
        isTerminalOpen={isTerminalOpen}
        setIsTerminalOpen={setIsTerminalOpen}
        activeLanguage={activeLanguage}
        cursorPos={cursorPos}
      />

      {/* Modals & Dialogs */}
      <ProcessLogsModal />
      <ConflictModal />
      <SyncSummaryModal />
    </div>
  );
};
