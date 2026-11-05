import React, { useState } from 'react';
import { useFileStore } from '../stores/fileStore.js';

const getTabIcon = (fileName = '') => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'js':
    case 'jsx':
    case 'mjs':
      return { label: 'JS', color: 'text-[#e5c07b]' };
    case 'ts':
    case 'tsx':
      return { label: 'TS', color: 'text-[#61afef]' };
    case 'json':
      return { label: '{}', color: 'text-[#e5c07b]' };
    case 'html':
      return { label: '<>', color: 'text-[#e06c75]' };
    case 'css':
    case 'scss':
      return { label: '#', color: 'text-[#56b6c2]' };
    case 'md':
      return { label: 'MD', color: 'text-[#c678dd]' };
    default:
      return { label: '📄', color: 'text-[#abb2bf]' };
  }
};

export const EditorTabs = () => {
  const { openTabs, activeTabId, setActiveTab, closeTab } = useFileStore();
  const [tabToForceClose, setTabToForceClose] = useState(null);

  if (!openTabs || openTabs.length === 0) {
    return null;
  }

  const handleCloseClick = (e, tab) => {
    e.stopPropagation();
    const result = closeTab(tab.fileId, false);
    if (result?.requiresConfirmation) {
      setTabToForceClose(tab);
    }
  };

  const confirmForceClose = () => {
    if (tabToForceClose) {
      closeTab(tabToForceClose.fileId, true);
      setTabToForceClose(null);
    }
  };

  return (
    <>
      <div className="h-[35px] flex items-center justify-between bg-[#252526] border-b border-[#2b2b2b] select-none text-xs font-sans">
        {/* Scrollable Tabs */}
        <div className="flex items-center h-full overflow-x-auto scrollbar-none flex-1">
          {openTabs.map((tab) => {
            const isActive = tab.fileId === activeTabId;
            const fileName = tab.filePath.split('/').pop();
            const { label, color } = getTabIcon(fileName);

            return (
              <div
                key={tab.fileId}
                onClick={() => setActiveTab(tab.fileId)}
                title={tab.filePath}
                className={`group h-full flex items-center space-x-2 px-3 border-r border-[#2b2b2b] cursor-pointer transition min-w-[120px] max-w-[200px] shrink-0 text-[12px] relative ${
                  isActive
                    ? 'bg-[#1e1e1e] text-white font-medium border-t-2 border-t-[#007acc]'
                    : 'bg-[#2d2d2d] text-[#969696] hover:bg-[#2a2a2a] hover:text-[#cccccc]'
                }`}
              >
                <span className={`text-[10px] font-mono font-bold ${color}`}>{label}</span>
                <span className="truncate flex-1">{fileName}</span>

                {/* Unsaved indicator / Close Button */}
                <div className="w-4 h-4 flex items-center justify-center shrink-0">
                  {tab.isDirty ? (
                    <span
                      onClick={(e) => handleCloseClick(e, tab)}
                      title="Unsaved changes (click to close)"
                      className="w-2 h-2 rounded-full bg-white group-hover:hidden transition"
                    />
                  ) : null}

                  <button
                    onClick={(e) => handleCloseClick(e, tab)}
                    title="Close tab (Ctrl+W)"
                    className={`text-[11px] hover:bg-[#333333] hover:text-white rounded p-0.5 leading-none transition ${
                      tab.isDirty ? 'hidden group-hover:block' : 'opacity-0 group-hover:opacity-100'
                    }`}
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Tab Bar Controls */}
        <div className="flex items-center space-x-1 px-2 text-[#858585] shrink-0">
          <button
            title="Split Editor Right"
            className="p-1 hover:text-[#cccccc] hover:bg-[#333333] rounded transition"
          >
            <svg className="w-3.5 h-3.5 fill-none stroke-current" viewBox="0 0 16 16" strokeWidth="1.3">
              <rect x="1" y="2" width="14" height="12" rx="1.5" />
              <line x1="8" y1="2" x2="8" y2="14" />
            </svg>
          </button>
          <button
            title="More Actions..."
            className="p-1 hover:text-[#cccccc] hover:bg-[#333333] rounded transition"
          >
            <svg className="w-3.5 h-3.5 fill-none stroke-current" viewBox="0 0 16 16" strokeWidth="1.3">
              <circle cx="3" cy="8" r="1" />
              <circle cx="8" cy="8" r="1" />
              <circle cx="13" cy="8" r="1" />
            </svg>
          </button>
        </div>
      </div>

      {/* Unsaved Changes Confirmation Modal */}
      {tabToForceClose && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm p-4 rounded bg-[#252526] border border-amber-500/40 shadow-2xl text-[#cccccc]">
            <div className="flex items-center space-x-2 text-amber-400 mb-2">
              <span className="text-base font-bold">⚠️</span>
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">Unsaved Changes</h3>
            </div>
            <p className="text-xs text-[#cccccc] mb-4 leading-relaxed">
              Do you want to save the changes you made to{' '}
              <strong className="text-white font-mono bg-[#1e1e1e] px-1 py-0.5 rounded">
                {tabToForceClose.filePath}
              </strong>
              ?
            </p>

            <div className="flex justify-end space-x-2 pt-2 border-t border-[#333333]">
              <button
                type="button"
                onClick={() => setTabToForceClose(null)}
                className="px-3 py-1 rounded text-xs bg-[#333333] hover:bg-[#3e3e42] text-white transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmForceClose}
                className="px-3 py-1 rounded text-xs font-semibold bg-red-600 hover:bg-red-500 text-white transition"
              >
                Don't Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
