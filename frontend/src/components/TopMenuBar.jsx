import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFileStore } from '../stores/fileStore.js';
import { useAgentStore } from '../stores/agentStore.js';

export const TopMenuBar = ({
  projectName = 'Devnest',
  activeFileName = '',
  isSidebarOpen,
  setIsSidebarOpen,
  isTerminalOpen,
  setIsTerminalOpen,
  isAIOpen,
  setIsAIOpen,
  onNewFilePrompt,
}) => {
  const navigate = useNavigate();
  const [activeMenu, setActiveMenu] = useState(null);
  const menuRef = useRef(null);

  const { saveToCloud, openTabs, activeTabId, closeTab } = useFileStore();
  const { startProcess, stopProcess, process, fetchLogs } = useAgentStore();
  const isProcessRunning = process?.status === 'running';

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setActiveMenu(null);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMenuClick = (menuName) => {
    setActiveMenu(activeMenu === menuName ? null : menuName);
  };

  const handleAction = (action) => {
    setActiveMenu(null);
    switch (action) {
      case 'newFile':
        if (onNewFilePrompt) onNewFilePrompt();
        break;
      case 'save':
        saveToCloud().catch(() => {});
        break;
      case 'closeTab':
        if (activeTabId) closeTab(activeTabId);
        break;
      case 'exit':
        navigate('/');
        break;
      case 'toggleExplorer':
        setIsSidebarOpen(!isSidebarOpen);
        break;
      case 'toggleTerminal':
        setIsTerminalOpen(!isTerminalOpen);
        break;
      case 'toggleAI':
        setIsAIOpen(!isAIOpen);
        break;
      case 'startRun':
        if (!isProcessRunning) startProcess('npm', ['run', 'dev']);
        break;
      case 'stopRun':
        if (isProcessRunning) stopProcess();
        break;
      case 'clearTerminal':
        fetchLogs();
        break;
      default:
        break;
    }
  };

  return (
    <div
      ref={menuRef}
      className="h-[35px] shrink-0 bg-[#181818] border-b border-[#2b2b2b] flex items-center justify-between px-3 text-xs select-none z-50 text-[#cccccc] font-sans"
    >
      {/* Left Application Icon & Menus */}
      <div className="flex items-center space-x-1">
        {/* Antigravity / Devnest Emblem */}
        <div
          onClick={() => navigate('/')}
          title="Devnest IDE — Click to return to Dashboard"
          className="flex items-center space-x-1.5 mr-2 cursor-pointer hover:opacity-80 transition"
        >
          <svg className="w-4 h-4 text-[#007acc]" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L2 22h20L12 2zm0 4.5l6.5 13H5.5L12 6.5z" />
          </svg>
        </div>

        {/* Menu Items */}
        {[
          {
            name: 'File',
            items: [
              { label: 'New File...', shortcut: 'Ctrl+N', action: 'newFile' },
              { label: 'Save to Cloud', shortcut: 'Ctrl+S', action: 'save' },
              { type: 'separator' },
              { label: 'Close Tab', shortcut: 'Ctrl+W', action: 'closeTab' },
              { type: 'separator' },
              { label: 'Exit to Projects', action: 'exit' },
            ],
          },
          {
            name: 'Edit',
            items: [
              { label: 'Undo', shortcut: 'Ctrl+Z' },
              { label: 'Redo', shortcut: 'Ctrl+Y' },
              { type: 'separator' },
              { label: 'Cut', shortcut: 'Ctrl+X' },
              { label: 'Copy', shortcut: 'Ctrl+C' },
              { label: 'Paste', shortcut: 'Ctrl+V' },
            ],
          },
          {
            name: 'Selection',
            items: [
              { label: 'Select All', shortcut: 'Ctrl+A' },
              { label: 'Expand Selection' },
              { label: 'Shrink Selection' },
            ],
          },
          {
            name: 'View',
            items: [
              {
                label: `${isSidebarOpen ? '✓ ' : '   '}Explorer`,
                action: 'toggleExplorer',
                shortcut: 'Ctrl+Shift+E',
              },
              {
                label: `${isTerminalOpen ? '✓ ' : '   '}Terminal`,
                action: 'toggleTerminal',
                shortcut: 'Ctrl+`',
              },
              {
                label: `${isAIOpen ? '✓ ' : '   '}Devnest AI Assistant`,
                action: 'toggleAI',
                shortcut: 'Ctrl+Shift+A',
              },
            ],
          },
          {
            name: 'Go',
            items: [
              { label: 'Go to File...', shortcut: 'Ctrl+P' },
              { label: 'Go to Symbol...', shortcut: 'Ctrl+Shift+O' },
              { label: 'Go to Line...', shortcut: 'Ctrl+G' },
            ],
          },
          {
            name: 'Run',
            items: [
              {
                label: isProcessRunning ? 'Stop Server' : 'Start Debugging (npm run dev)',
                shortcut: 'F5',
                action: isProcessRunning ? 'stopRun' : 'startRun',
              },
              {
                label: 'Run Without Debugging',
                shortcut: 'Ctrl+F5',
                action: 'startRun',
              },
            ],
          },
          {
            name: 'Terminal',
            items: [
              { label: 'Toggle Terminal', shortcut: 'Ctrl+`', action: 'toggleTerminal' },
              { label: 'Clear Terminal Logs', action: 'clearTerminal' },
            ],
          },
          {
            name: 'Help',
            items: [
              { label: 'Devnest Documentation', shortcut: 'F1' },
              { label: 'Keyboard Shortcuts' },
              { type: 'separator' },
              { label: 'About Devnest IDE' },
            ],
          },
        ].map((menu) => (
          <div key={menu.name} className="relative">
            <button
              onClick={() => handleMenuClick(menu.name)}
              onMouseEnter={() => activeMenu && setActiveMenu(menu.name)}
              className={`px-2 py-0.5 rounded text-[12px] transition ${
                activeMenu === menu.name
                  ? 'bg-[#333333] text-white'
                  : 'hover:bg-[#252526] hover:text-white text-[#cccccc]'
              }`}
            >
              {menu.name}
            </button>

            {/* Dropdown Menu */}
            {activeMenu === menu.name && (
              <div className="absolute left-0 top-full mt-1 w-52 py-1 bg-[#252526] border border-[#333333] rounded shadow-2xl z-50 animate-fade-in text-xs font-sans">
                {menu.items.map((item, idx) =>
                  item.type === 'separator' ? (
                    <div key={idx} className="my-1 border-t border-[#333333]" />
                  ) : (
                    <button
                      key={item.label}
                      onClick={() => handleAction(item.action)}
                      className="w-full text-left px-3 py-1 flex items-center justify-between hover:bg-[#007acc] hover:text-white text-[#cccccc] transition group"
                    >
                      <span className="truncate">{item.label}</span>
                      {item.shortcut && (
                        <span className="text-[10px] text-[#858585] group-hover:text-white/80 font-mono ml-3">
                          {item.shortcut}
                        </span>
                      )}
                    </button>
                  )
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Center Application Title Bar */}
      <div className="flex-1 text-center font-normal text-[12px] text-[#969696] truncate px-4 pointer-events-none">
        <span>Devnest — Antigravity IDE</span>
        <span className="mx-2 text-[#555555]">•</span>
        <span className="text-[#cccccc] font-medium">{projectName}</span>
        {activeFileName && (
          <>
            <span className="mx-1 text-[#555555]">-</span>
            <span className="font-mono text-[#e0e0e0]">{activeFileName}</span>
          </>
        )}
      </div>

      {/* Right Layout Panel Toggles & Desktop Controls */}
      <div className="flex items-center space-x-1.5 shrink-0">
        {/* Toggle Primary Sidebar (Explorer) */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          title={`Toggle Primary Sidebar (${isSidebarOpen ? 'Active' : 'Hidden'})`}
          className={`p-1.5 rounded transition ${
            isSidebarOpen
              ? 'text-white bg-[#333333]'
              : 'text-[#858585] hover:text-[#cccccc] hover:bg-[#252526]'
          }`}
        >
          <svg className="w-3.5 h-3.5 fill-none stroke-current" viewBox="0 0 16 16" strokeWidth="1.3">
            <rect x="1" y="2" width="14" height="12" rx="1.5" />
            <line x1="5.5" y1="2" x2="5.5" y2="14" />
          </svg>
        </button>

        {/* Toggle Bottom Panel (Terminal) */}
        <button
          onClick={() => setIsTerminalOpen(!isTerminalOpen)}
          title={`Toggle Bottom Panel (${isTerminalOpen ? 'Active' : 'Hidden'})`}
          className={`p-1.5 rounded transition ${
            isTerminalOpen
              ? 'text-white bg-[#333333]'
              : 'text-[#858585] hover:text-[#cccccc] hover:bg-[#252526]'
          }`}
        >
          <svg className="w-3.5 h-3.5 fill-none stroke-current" viewBox="0 0 16 16" strokeWidth="1.3">
            <rect x="1" y="2" width="14" height="12" rx="1.5" />
            <line x1="1" y1="10.5" x2="15" y2="10.5" />
          </svg>
        </button>

        {/* Toggle Secondary Sidebar (AI Assistant) */}
        <button
          onClick={() => setIsAIOpen(!isAIOpen)}
          title={`Toggle AI Assistant Panel (${isAIOpen ? 'Active' : 'Hidden'})`}
          className={`p-1.5 rounded transition ${
            isAIOpen
              ? 'text-white bg-[#333333]'
              : 'text-[#858585] hover:text-[#cccccc] hover:bg-[#252526]'
          }`}
        >
          <svg className="w-3.5 h-3.5 fill-none stroke-current" viewBox="0 0 16 16" strokeWidth="1.3">
            <rect x="1" y="2" width="14" height="12" rx="1.5" />
            <line x1="10.5" y1="2" x2="10.5" y2="14" />
          </svg>
        </button>

        {/* Divider */}
        <div className="h-3 w-[1px] bg-[#333333] mx-1" />

        {/* Window controls: Minimize, Maximize, Close */}
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setIsTerminalOpen(false)}
            title="Minimize"
            className="w-6 h-6 flex items-center justify-center text-[#858585] hover:text-[#cccccc] hover:bg-[#252526] rounded transition text-[10px]"
          >
            ―
          </button>
          <button
            onClick={() => {
              if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(() => {});
              } else {
                document.exitFullscreen().catch(() => {});
              }
            }}
            title="Toggle Full Screen"
            className="w-6 h-6 flex items-center justify-center text-[#858585] hover:text-[#cccccc] hover:bg-[#252526] rounded transition text-[11px]"
          >
            ◻
          </button>
          <button
            onClick={() => navigate('/')}
            title="Close Workspace (Return to Projects)"
            className="w-6 h-6 flex items-center justify-center text-[#858585] hover:text-white hover:bg-red-600 rounded transition text-xs"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
};

