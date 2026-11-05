import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useFileStore } from '../stores/fileStore.js';
import { buildFileTree } from '../utils/fileTree.js';

/**
 * File icon resolver based on file extension
 */
const getFileIcon = (fileName = '') => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'js':
    case 'jsx':
    case 'mjs':
      return { icon: 'JS', color: 'text-[#e5c07b] bg-[#e5c07b]/10' };
    case 'ts':
    case 'tsx':
      return { icon: 'TS', color: 'text-[#61afef] bg-[#61afef]/10' };
    case 'json':
      return { icon: '{}', color: 'text-[#e5c07b] bg-[#e5c07b]/10' };
    case 'html':
      return { icon: '<>', color: 'text-[#e06c75] bg-[#e06c75]/10' };
    case 'css':
    case 'scss':
      return { icon: '#', color: 'text-[#56b6c2] bg-[#56b6c2]/10' };
    case 'md':
      return { icon: 'MD', color: 'text-[#c678dd] bg-[#c678dd]/10' };
    case 'svg':
    case 'png':
    case 'jpg':
      return { icon: '🖼', color: 'text-[#98c379] bg-[#98c379]/10' };
    default:
      return { icon: '📄', color: 'text-[#abb2bf] bg-[#abb2bf]/10' };
  }
};

/**
 * Recursive Tree Node renderer
 */
const TreeNode = ({
  node,
  level = 0,
  activeTabId,
  expandedDirs,
  onToggleDir,
  onOpenFile,
  onPromptDelete,
  onPromptRename,
  onContextMenu,
}) => {
  const isExpanded = expandedDirs.has(node.path);
  const isSelected = !node.isDirectory && node.file?.id === activeTabId;

  if (node.isDirectory) {
    return (
      <div>
        <div
          onClick={() => onToggleDir(node.path)}
          onContextMenu={(e) => onContextMenu(e, node)}
          style={{ paddingLeft: `${level * 12 + 8}px` }}
          className="h-[22px] flex items-center space-x-1.5 cursor-pointer hover:bg-[#2a2d2e] text-[#cccccc] hover:text-white transition rounded-none text-xs select-none group"
        >
          <span className="text-[10px] text-[#858585] group-hover:text-[#cccccc] w-3 text-center">
            {isExpanded ? '▾' : '▸'}
          </span>
          <span className="text-[11px] opacity-80">{isExpanded ? '📂' : '📁'}</span>
          <span className="font-medium truncate text-[12px]">{node.name}</span>
        </div>

        {isExpanded && node.children && (
          <div>
            {node.children.map((child) => (
              <TreeNode
                key={child.id || child.path}
                node={child}
                level={level + 1}
                activeTabId={activeTabId}
                expandedDirs={expandedDirs}
                onToggleDir={onToggleDir}
                onOpenFile={onOpenFile}
                onPromptDelete={onPromptDelete}
                onPromptRename={onPromptRename}
                onContextMenu={onContextMenu}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  const { icon, color } = getFileIcon(node.name);
  const syncStatus = node.file?.syncStatus;

  return (
    <div
      style={{ paddingLeft: `${level * 12 + 16}px` }}
      onClick={() => onOpenFile(node.file)}
      onContextMenu={(e) => onContextMenu(e, node)}
      className={`group h-[22px] flex items-center justify-between cursor-pointer transition text-xs select-none pr-2 ${
        isSelected
          ? 'bg-[#37373d] text-white font-medium'
          : 'text-[#cccccc] hover:text-white hover:bg-[#2a2d2e]'
      }`}
    >
      <div className="flex items-center space-x-1.5 truncate">
        <span
          className={`text-[9px] font-mono px-1 py-0.2 rounded font-bold leading-none ${color}`}
        >
          {icon}
        </span>
        <span className="truncate text-[12px]">{node.name}</span>

        {/* Change Tracking Badges */}
        {syncStatus === 'created' && (
          <span className="text-[10px] font-mono text-emerald-400 font-bold ml-1" title="Locally Created (Untracked)">
            U
          </span>
        )}
        {syncStatus === 'modified' && (
          <span className="text-[10px] font-mono text-amber-400 font-bold ml-1" title="Locally Modified">
            M
          </span>
        )}
        {syncStatus === 'renamed' && (
          <span className="text-[10px] font-mono text-purple-400 font-bold ml-1" title="Locally Renamed">
            R
          </span>
        )}
        {node.file?.lastSyncError && (
          <span className="text-[10px] font-mono text-red-400 font-bold ml-1" title="Sync Failed">
            !
          </span>
        )}
      </div>

      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 shrink-0">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPromptRename(node.file);
          }}
          title={`Rename ${node.name} (F2)`}
          className="hover:text-sky-400 text-[#858585] p-0.5 transition rounded"
        >
          ✏️
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPromptDelete(node.file);
          }}
          title={`Delete ${node.name}`}
          className="hover:text-red-400 text-[#858585] p-0.5 transition rounded"
        >
          🗑
        </button>
      </div>
    </div>
  );
};

export const FileExplorer = ({ projectId, projectName = 'devnest' }) => {
  const {
    files,
    loadingFiles,
    filesError,
    actionLoading,
    activeTabId,
    pendingCount,
    fetchFiles,
    createFile,
    deleteFile,
    renameFile,
    openFile,
  } = useFileStore();

  const [isProjectExpanded, setIsProjectExpanded] = useState(true);
  const [isOutlineExpanded, setIsOutlineExpanded] = useState(false);
  const [isTimelineExpanded, setIsTimelineExpanded] = useState(false);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createMode, setCreateMode] = useState('file'); // 'file' | 'folder'
  const [newPath, setNewPath] = useState('');
  const [createError, setCreateError] = useState('');

  const [fileToDelete, setFileToDelete] = useState(null);
  const [deleteError, setDeleteError] = useState('');

  const [fileToRename, setFileToRename] = useState(null);
  const [newRenamePath, setNewRenamePath] = useState('');
  const [renameError, setRenameError] = useState('');

  // Context Menu state
  const [contextMenu, setContextMenu] = useState(null);
  const contextMenuRef = useRef(null);

  // Close context menu on click elsewhere
  useEffect(() => {
    const handleCloseMenu = () => setContextMenu(null);
    window.addEventListener('click', handleCloseMenu);
    return () => window.removeEventListener('click', handleCloseMenu);
  }, []);

  // Track expanded folder paths
  const [expandedDirs, setExpandedDirs] = useState(() => new Set());

  // Build tree from flat files
  const fileTree = useMemo(() => {
    const tree = buildFileTree(files);
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      const collectDirs = (nodes) => {
        for (const n of nodes) {
          if (n.isDirectory) {
            next.add(n.path);
            if (n.children) collectDirs(n.children);
          }
        }
      };
      collectDirs(tree);
      return next;
    });
    return tree;
  }, [files]);

  const toggleDir = (dirPath) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(dirPath)) {
        next.delete(dirPath);
      } else {
        next.add(dirPath);
      }
      return next;
    });
  };

  const collapseAllFolders = () => {
    setExpandedDirs(new Set());
  };

  const handleOpenCreateModal = (mode = 'file', initialFolder = '') => {
    setCreateMode(mode);
    setNewPath(initialFolder ? `${initialFolder}/` : '');
    setCreateError('');
    setIsCreateOpen(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setCreateError('');

    let trimmed = newPath.trim();
    if (!trimmed) {
      setCreateError('Path cannot be empty.');
      return;
    }

    if (trimmed.startsWith('/') || trimmed.startsWith('\\')) {
      setCreateError('Path must be relative (do not start with /).');
      return;
    }

    if (trimmed.includes('..')) {
      setCreateError('Path traversal (..) is not allowed.');
      return;
    }

    if (createMode === 'folder') {
      trimmed = trimmed.replace(/\/+$/, '');
      trimmed = `${trimmed}/.gitkeep`;
    }

    try {
      await createFile(projectId, { filePath: trimmed, content: '' });
      setNewPath('');
      setIsCreateOpen(false);
    } catch (err) {
      setCreateError(err.message || 'Failed to create file.');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!fileToDelete) return;
    setDeleteError('');
    try {
      await deleteFile(fileToDelete.id);
      setFileToDelete(null);
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete file.');
    }
  };

  const handlePromptRename = (file) => {
    setFileToRename(file);
    setNewRenamePath(file.file_path || file.path);
    setRenameError('');
  };

  const handleRenameSubmit = async (e) => {
    e.preventDefault();
    if (!fileToRename) return;
    setRenameError('');

    const trimmed = newRenamePath.trim();
    if (!trimmed) {
      setRenameError('New path cannot be empty.');
      return;
    }

    if (trimmed === (fileToRename.file_path || fileToRename.path)) {
      setFileToRename(null);
      return;
    }

    try {
      await renameFile(projectId, fileToRename.file_path || fileToRename.path, trimmed);
      setFileToRename(null);
    } catch (err) {
      setRenameError(err.message || 'Failed to rename file.');
    }
  };

  const handleContextMenu = (e, node) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      node,
    });
  };

  return (
    <div
      onContextMenu={(e) => handleContextMenu(e, null)}
      className="flex flex-col h-full bg-[#252526] select-none text-[#cccccc] font-sans text-xs overflow-hidden"
    >
      {/* Explorer Header */}
      <div className="h-[35px] flex items-center justify-between px-3 border-b border-[#2b2b2b] bg-[#252526]">
        <div className="flex items-center space-x-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#bbbbbb]">
            Explorer
          </span>
          {pendingCount > 0 && (
            <span
              className="text-[9px] font-mono font-semibold px-1 py-0.2 rounded bg-amber-400/20 text-amber-300"
              title={`${pendingCount} pending cloud upload(s)`}
            >
              {pendingCount}
            </span>
          )}
        </div>

        {/* Action Icons in Explorer Header */}
        <div className="flex items-center space-x-0.5 text-[#858585]">
          <button
            onClick={() => handleOpenCreateModal('file')}
            title="New File..."
            className="p-1 hover:text-white hover:bg-[#333333] rounded transition"
          >
            <svg className="w-3.5 h-3.5 fill-none stroke-current" viewBox="0 0 16 16" strokeWidth="1.3">
              <path d="M9 1H4a1 1 0 00-1 1v12a1 1 0 001 1h8a1 1 0 001-1V5L9 1z" />
              <line x1="8" y1="7" x2="8" y2="12" />
              <line x1="5.5" y1="9.5" x2="10.5" y2="9.5" />
            </svg>
          </button>

          <button
            onClick={() => handleOpenCreateModal('folder')}
            title="New Folder..."
            className="p-1 hover:text-white hover:bg-[#333333] rounded transition"
          >
            <svg className="w-3.5 h-3.5 fill-none stroke-current" viewBox="0 0 16 16" strokeWidth="1.3">
              <path d="M1 3.5A1.5 1.5 0 012.5 2h3l1.5 2h6.5A1.5 1.5 0 0115 5.5v7a1.5 1.5 0 01-1.5 1.5h-11A1.5 1.5 0 011 12.5v-9z" />
              <line x1="8" y1="8" x2="8" y2="12" />
              <line x1="6" y1="10" x2="10" y2="10" />
            </svg>
          </button>

          <button
            onClick={() => fetchFiles(projectId)}
            disabled={loadingFiles}
            title="Refresh Explorer"
            className="p-1 hover:text-white hover:bg-[#333333] rounded transition"
          >
            <svg className="w-3.5 h-3.5 fill-none stroke-current" viewBox="0 0 16 16" strokeWidth="1.3">
              <path d="M13.5 8a5.5 5.5 0 11-1.6-3.9L14 2v4h-4" />
            </svg>
          </button>

          <button
            onClick={collapseAllFolders}
            title="Collapse Folders in Explorer"
            className="p-1 hover:text-white hover:bg-[#333333] rounded transition"
          >
            <svg className="w-3.5 h-3.5 fill-none stroke-current" viewBox="0 0 16 16" strokeWidth="1.3">
              <path d="M2 10l6-5 6 5" />
              <path d="M2 14l6-5 6 5" />
            </svg>
          </button>
        </div>
      </div>

      {/* Explorer Content */}
      <div className="flex-1 overflow-y-auto flex flex-col justify-between">
        <div className="py-1">
          {/* Main Project Root Accordion */}
          <div
            onClick={() => setIsProjectExpanded(!isProjectExpanded)}
            className="h-[22px] px-2 flex items-center space-x-1 font-bold text-[11px] text-[#bbbbbb] uppercase tracking-wider cursor-pointer hover:bg-[#2a2d2e] transition select-none"
          >
            <span className="text-[10px] text-[#858585]">{isProjectExpanded ? '▾' : '▸'}</span>
            <span className="truncate">{projectName}</span>
          </div>

          {isProjectExpanded && (
            <div className="mt-0.5">
              {loadingFiles && files.length === 0 && (
                <div className="px-4 py-3 text-xs text-[#858585] flex items-center space-x-2">
                  <span className="animate-spin">⏳</span>
                  <span>Loading files...</span>
                </div>
              )}

              {filesError && (
                <div className="m-2 p-2 bg-red-950/40 border border-red-500/30 text-red-300 rounded text-[11px]">
                  <p>{filesError}</p>
                  <button
                    onClick={() => fetchFiles(projectId)}
                    className="mt-1 underline text-sky-400"
                  >
                    Retry
                  </button>
                </div>
              )}

              {!loadingFiles && !filesError && files.length === 0 && (
                <div className="p-4 text-center text-[#858585] space-y-1">
                  <p className="text-xs">No files in project.</p>
                  <button
                    onClick={() => handleOpenCreateModal('file')}
                    className="text-xs text-[#38bdf8] hover:underline"
                  >
                    + Create file
                  </button>
                </div>
              )}

              {fileTree.map((node) => (
                <TreeNode
                  key={node.id || node.path}
                  node={node}
                  level={0}
                  activeTabId={activeTabId}
                  expandedDirs={expandedDirs}
                  onToggleDir={toggleDir}
                  onOpenFile={openFile}
                  onPromptDelete={setFileToDelete}
                  onPromptRename={handlePromptRename}
                  onContextMenu={handleContextMenu}
                />
              ))}
            </div>
          )}
        </div>

        {/* Collapsible Lower Panels (Outline & Timeline) */}
        <div className="border-t border-[#2b2b2b] shrink-0 bg-[#252526]">
          {/* Outline Accordion */}
          <div>
            <div
              onClick={() => setIsOutlineExpanded(!isOutlineExpanded)}
              className="h-[22px] px-2 flex items-center space-x-1 font-semibold text-[11px] text-[#858585] hover:text-[#cccccc] uppercase tracking-wider cursor-pointer hover:bg-[#2a2d2e] transition select-none"
            >
              <span className="text-[10px]">{isOutlineExpanded ? '▾' : '▸'}</span>
              <span>Outline</span>
            </div>
            {isOutlineExpanded && (
              <div className="px-4 py-2 text-[11px] text-[#858585] italic">
                No symbols found in current file.
              </div>
            )}
          </div>

          {/* Timeline Accordion */}
          <div className="border-t border-[#2b2b2b]">
            <div
              onClick={() => setIsTimelineExpanded(!isTimelineExpanded)}
              className="h-[22px] px-2 flex items-center space-x-1 font-semibold text-[11px] text-[#858585] hover:text-[#cccccc] uppercase tracking-wider cursor-pointer hover:bg-[#2a2d2e] transition select-none"
            >
              <span className="text-[10px]">{isTimelineExpanded ? '▾' : '▸'}</span>
              <span>Timeline</span>
            </div>
            {isTimelineExpanded && (
              <div className="px-4 py-2 text-[11px] text-[#858585] italic">
                Local history synced to IndexedDB.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Click Context Menu */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
          className="fixed z-50 w-48 py-1 bg-[#252526] border border-[#333333] rounded shadow-2xl text-xs font-sans text-[#cccccc]"
        >
          <button
            onClick={() => {
              const folder = contextMenu.node?.isDirectory ? contextMenu.node.path : '';
              handleOpenCreateModal('file', folder);
            }}
            className="w-full text-left px-3 py-1 hover:bg-[#007acc] hover:text-white transition"
          >
            New File...
          </button>
          <button
            onClick={() => {
              const folder = contextMenu.node?.isDirectory ? contextMenu.node.path : '';
              handleOpenCreateModal('folder', folder);
            }}
            className="w-full text-left px-3 py-1 hover:bg-[#007acc] hover:text-white transition"
          >
            New Folder...
          </button>

          {contextMenu.node && !contextMenu.node.isDirectory && (
            <>
              <div className="my-1 border-t border-[#333333]" />
              <button
                onClick={() => handlePromptRename(contextMenu.node.file)}
                className="w-full text-left px-3 py-1 hover:bg-[#007acc] hover:text-white transition"
              >
                Rename... <span className="float-right text-[10px] opacity-60">F2</span>
              </button>
              <button
                onClick={() => setFileToDelete(contextMenu.node.file)}
                className="w-full text-left px-3 py-1 hover:bg-[#007acc] hover:text-white transition"
              >
                Delete
              </button>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(contextMenu.node.path);
                }}
                className="w-full text-left px-3 py-1 hover:bg-[#007acc] hover:text-white transition"
              >
                Copy Relative Path
              </button>
            </>
          )}
        </div>
      )}

      {/* Create File / Folder Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm p-4 rounded bg-[#252526] border border-[#333333] shadow-2xl text-[#cccccc]">
            <div className="flex items-center justify-between pb-2 border-b border-[#333333] mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                {createMode === 'folder' ? 'Create New Folder' : 'Create New File'}
              </h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-[#858585] hover:text-white">
                ✕
              </button>
            </div>

            {createError && (
              <div className="mb-3 p-2 bg-red-950/40 border border-red-500/30 text-red-300 text-xs rounded">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] text-[#858585] mb-1 font-mono">
                  {createMode === 'folder' ? 'Relative Folder Path' : 'Relative File Path'}
                </label>
                <input
                  type="text"
                  autoFocus
                  required
                  placeholder={createMode === 'folder' ? 'src/components' : 'src/App.jsx'}
                  value={newPath}
                  onChange={(e) => setNewPath(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded bg-[#1e1e1e] border border-[#333333] text-white text-xs focus:outline-none focus:border-[#007acc]"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-[#333333]">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  disabled={actionLoading}
                  className="px-3 py-1 rounded text-xs bg-[#333333] hover:bg-[#3e3e42] text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-3 py-1 rounded text-xs font-semibold bg-[#007acc] hover:bg-[#0062a3] text-white transition"
                >
                  {actionLoading ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rename File Modal */}
      {fileToRename && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm p-4 rounded bg-[#252526] border border-[#333333] shadow-2xl text-[#cccccc]">
            <div className="flex items-center justify-between pb-2 border-b border-[#333333] mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">Rename File</h3>
              <button onClick={() => setFileToRename(null)} className="text-[#858585] hover:text-white">
                ✕
              </button>
            </div>

            {renameError && (
              <div className="mb-3 p-2 bg-red-950/40 border border-red-500/30 text-red-300 text-xs rounded">
                {renameError}
              </div>
            )}

            <form onSubmit={handleRenameSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] text-[#858585] mb-1 font-mono">New Path</label>
                <input
                  type="text"
                  autoFocus
                  required
                  value={newRenamePath}
                  onChange={(e) => setNewRenamePath(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded bg-[#1e1e1e] border border-[#333333] text-white text-xs focus:outline-none focus:border-[#007acc]"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-[#333333]">
                <button
                  type="button"
                  onClick={() => setFileToRename(null)}
                  disabled={actionLoading}
                  className="px-3 py-1 rounded text-xs bg-[#333333] hover:bg-[#3e3e42] text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-3 py-1 rounded text-xs font-semibold bg-[#007acc] hover:bg-[#0062a3] text-white transition"
                >
                  {actionLoading ? 'Renaming...' : 'Rename'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {fileToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm p-4 rounded bg-[#252526] border border-red-500/40 shadow-2xl text-[#cccccc]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white mb-2">Delete File</h3>
            <p className="text-xs text-[#cccccc] mb-3 leading-relaxed">
              Are you sure you want to delete{' '}
              <strong className="text-white font-mono bg-[#1e1e1e] px-1 py-0.5 rounded">
                {fileToDelete.file_path || fileToDelete.path}
              </strong>
              ?
            </p>

            {deleteError && (
              <div className="mb-3 p-2 bg-red-950/40 border border-red-500/30 text-red-300 text-xs rounded">
                {deleteError}
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-2 border-t border-[#333333]">
              <button
                type="button"
                onClick={() => setFileToDelete(null)}
                disabled={actionLoading}
                className="px-3 py-1 rounded text-xs bg-[#333333] hover:bg-[#3e3e42] text-white transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={actionLoading}
                className="px-3 py-1 rounded text-xs font-semibold bg-red-600 hover:bg-red-500 text-white transition"
              >
                {actionLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
