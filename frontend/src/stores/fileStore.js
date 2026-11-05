import { create } from 'zustand';
import { fileApi, getMimeTypeFromPath } from '../services/fileApi.js';
import { indexedDBService } from '../services/indexedDBService.js';
import { getLanguageFromPath } from '../utils/editorLanguage.js';

export const useFileStore = create((set, get) => ({
  files: [],
  loadingFiles: false,
  filesError: null,

  // Current active project ID
  currentProjectId: null,

  // Editor tabs state
  openTabs: [],
  activeTabId: null,

  // Action state (local operations)
  actionLoading: false,
  actionError: null,

  // Local storage save status ('saved' | 'saving' | 'error')
  localSaveStatus: 'saved',

  // Cloud upload status ('idle' | 'uploading' | 'success' | 'error')
  cloudUploadStatus: 'idle',
  cloudUploadError: null,

  // Number of files with changes pending cloud upload
  pendingCount: 0,

  /**
   * Refreshes the pending changes count from IndexedDB.
   */
  updatePendingCount: async () => {
    const { currentProjectId } = get();
    if (!currentProjectId) {
      set({ pendingCount: 0 });
      return 0;
    }
    try {
      const pending = await indexedDBService.getPendingChanges(currentProjectId);
      set({ pendingCount: pending.length });
      return pending.length;
    } catch {
      return 0;
    }
  },

  /**
   * Fetch all files for a project.
   * Local-First Strategy:
   * 1. Query IndexedDB for local project files first.
   * 2. If present, render immediately without waiting for cloud requests.
   * 3. If no local copy exists, fetch from Supabase once, seed IndexedDB, and set as working copy.
   */
  fetchFiles: async (projectId) => {
    set({ loadingFiles: true, filesError: null, currentProjectId: projectId });
    try {
      // 1. Try loading from IndexedDB first
      const localFiles = await indexedDBService.listProjectFiles(projectId, false);

      if (localFiles && localFiles.length > 0) {
        // Format for explorer & tabs compatibility
        const formatted = localFiles.map((f) => ({
          ...f,
          file_path: f.path,
          mime_type: getMimeTypeFromPath(f.path),
        }));

        const pending = await indexedDBService.getPendingChanges(projectId);

        set({
          files: formatted,
          pendingCount: pending.length,
          loadingFiles: false,
        });
        return formatted;
      }

      // 2. If no local files exist, fetch from cloud API once to seed IndexedDB
      let cloudFiles = [];
      try {
        const response = await fileApi.listFiles(projectId);
        cloudFiles = Array.isArray(response) ? response : response?.data || [];
      } catch (networkErr) {
        // If offline and no local files exist
        set({
          files: [],
          pendingCount: 0,
          loadingFiles: false,
          filesError: 'No local files found and cloud is unreachable (offline).',
        });
        return [];
      }

      // Fetch each file's content and seed into IndexedDB
      for (const cFile of cloudFiles) {
        let content = '';
        try {
          const detail = await fileApi.getFile(cFile.id);
          content = detail.data?.content ?? detail.content ?? '';
        } catch {
          content = '';
        }

        await indexedDBService.createFile(projectId, {
          id: cFile.id,
          cloudId: cFile.id,
          path: cFile.file_path || cFile.path,
          content,
          syncStatus: 'synced',
          createdAt: cFile.created_at,
          updatedAt: cFile.updated_at,
          cloudUpdatedAt: cFile.updated_at,
        });
      }

      // Read back from IndexedDB to guarantee single source of local truth
      const seeded = await indexedDBService.listProjectFiles(projectId, false);
      const formatted = seeded.map((f) => ({
        ...f,
        file_path: f.path,
        mime_type: getMimeTypeFromPath(f.path),
      }));

      set({
        files: formatted,
        pendingCount: 0,
        loadingFiles: false,
      });

      return formatted;
    } catch (err) {
      const message = err.message || 'Failed to load project files';
      set({ filesError: message, loadingFiles: false });
    }
  },

  /**
   * Open a file in an editor tab.
   * Reads from IndexedDB locally.
   */
  openFile: async (file, preloadedContent = null) => {
    const { openTabs, currentProjectId } = get();
    const filePath = file.file_path || file.path;
    const existingIndex = openTabs.findIndex(
      (t) => t.fileId === file.id || (filePath && t.filePath === filePath)
    );

    if (existingIndex !== -1) {
      const existingTab = openTabs[existingIndex];
      set({ activeTabId: existingTab.fileId });
      return existingTab;
    }

    const hasPreloaded = preloadedContent !== null;
    const resolvedLanguage = getLanguageFromPath(filePath);
    const resolvedMime = file.mime_type || getMimeTypeFromPath(filePath);

    const newTab = {
      fileId: file.id,
      filePath,
      content: hasPreloaded ? preloadedContent : '',
      originalContent: hasPreloaded ? preloadedContent : '',
      isDirty: false,
      mimeType: resolvedMime,
      language: resolvedLanguage,
      loadingContent: !hasPreloaded,
      loadError: null,
    };

    set({
      openTabs: [...openTabs, newTab],
      activeTabId: file.id,
    });

    if (hasPreloaded) return newTab;

    try {
      // Read content from IndexedDB working copy
      const projId = file.projectId || currentProjectId;
      let fetchedContent = '';

      if (projId) {
        const localRecord = await indexedDBService.readFile(projId, filePath || file.id);
        if (localRecord) {
          fetchedContent = localRecord.content ?? '';
        }
      }

      set((state) => ({
        openTabs: state.openTabs.map((t) =>
          t.fileId === file.id
            ? {
                ...t,
                content: fetchedContent,
                originalContent: fetchedContent,
                loadingContent: false,
              }
            : t
        ),
      }));
    } catch (err) {
      set((state) => ({
        openTabs: state.openTabs.map((t) =>
          t.fileId === file.id
            ? { ...t, loadingContent: false, loadError: err.message || 'Failed to read file' }
            : t
        ),
      }));
    }
  },

  /**
   * Update the text content of a tab.
   * Local-First: Persists immediately to IndexedDB with zero cloud calls.
   */
  updateTabContent: (fileId, newContent) => {
    const { openTabs, currentProjectId, files } = get();
    const tab = openTabs.find((t) => t.fileId === fileId);
    if (!tab) return;

    const isDirty = newContent !== tab.originalContent;
    const activeFile = files.find((f) => f.id === fileId || f.file_path === tab.filePath);
    const resolvedProjectId = currentProjectId || activeFile?.projectId;

    // 1. Immediately update UI state
    set((state) => ({
      openTabs: state.openTabs.map((t) => (t.fileId === fileId ? { ...t, content: newContent, isDirty } : t)),
      localSaveStatus: 'saving',
    }));

    // 2. Persist to IndexedDB locally
    if (resolvedProjectId) {
      indexedDBService
        .updateFile(resolvedProjectId, tab.filePath || fileId, { content: newContent })
        .then((updatedRecord) => {
          set((state) => ({
            localSaveStatus: 'saved',
            files: state.files.map((f) =>
              f.id === fileId || f.file_path === tab.filePath
                ? {
                    ...f,
                    content: newContent,
                    syncStatus: updatedRecord.syncStatus,
                    updatedAt: updatedRecord.updatedAt,
                  }
                : f
            ),
          }));
          get().updatePendingCount();
        })
        .catch((err) => {
          console.error('Failed to save to local IndexedDB:', err);
          set({ localSaveStatus: 'error' });
        });
    } else {
      set({ localSaveStatus: 'saved' });
    }
  },

  /**
   * Local-First File Creation:
   * Creates file immediately in IndexedDB.
   * UI updates immediately without cloud requests.
   */
  createFile: async (projectId, { filePath, content = '', mimeType, id }) => {
    set({ actionLoading: true, actionError: null });
    try {
      const resolvedMime = mimeType || getMimeTypeFromPath(filePath);
      const resolvedLang = getLanguageFromPath(filePath);

      // 1. Save directly into local IndexedDB
      const createdRecord = await indexedDBService.createFile(projectId, {
        id,
        path: filePath,
        content,
        language: resolvedLang,
        syncStatus: 'created',
      });

      const newFile = {
        ...createdRecord,
        file_path: createdRecord.path,
        mime_type: resolvedMime,
      };

      set((state) => ({
        currentProjectId: state.currentProjectId || projectId,
        files: [...state.files.filter((f) => f.path !== filePath && f.file_path !== filePath), newFile],
        actionLoading: false,
      }));

      // Automatically open in editor
      await get().openFile(newFile, content);
      get().updatePendingCount();

      return newFile;
    } catch (err) {
      const message = err.message || 'Failed to create file';
      set({ actionError: message, actionLoading: false });
      throw err;
    }
  },

  /**
   * Local-First File Deletion:
   * Removes file locally in IndexedDB immediately.
   * If file was synced to cloud, marks for deletion on next cloud save.
   */
  deleteFile: async (fileId) => {
    set({ actionLoading: true, actionError: null });
    const { currentProjectId, files } = get();
    try {
      const file = files.find((f) => f.id === fileId);
      const pathOrId = file?.file_path || file?.path || fileId;

      if (currentProjectId) {
        await indexedDBService.deleteFile(currentProjectId, pathOrId);
      }

      // Close open tab
      get().closeTab(fileId, true);

      // Remove from active files list
      set((state) => ({
        files: state.files.filter((f) => f.id !== fileId),
        actionLoading: false,
      }));

      get().updatePendingCount();
    } catch (err) {
      const message = err.message || 'Failed to delete file';
      set({ actionError: message, actionLoading: false });
      throw err;
    }
  },

  /**
   * Local-First File Rename:
   * Renames file locally in IndexedDB immediately without cloud requests.
   */
  renameFile: async (projectId, oldPath, newPath) => {
    set({ actionLoading: true, actionError: null });
    try {
      const updated = await indexedDBService.renameFile(projectId, oldPath, newPath);
      const formatted = {
        ...updated,
        file_path: updated.path,
        mime_type: getMimeTypeFromPath(updated.path),
      };

      set((state) => ({
        files: state.files.map((f) => (f.path === oldPath || f.file_path === oldPath ? formatted : f)),
        openTabs: state.openTabs.map((t) =>
          t.filePath === oldPath ? { ...t, filePath: newPath, language: updated.language } : t
        ),
        actionLoading: false,
      }));

      get().updatePendingCount();
      return formatted;
    } catch (err) {
      const message = err.message || 'Failed to rename file';
      set({ actionError: message, actionLoading: false });
      throw err;
    }
  },

  /**
   * Explicit Cloud Save:
   * Uploads all pending local changes (CREATE, UPDATE, DELETE, RENAME) to Supabase Storage/Backend.
   * Consolidated, handles race conditions, and prevents duplicate parallel uploads.
   */
  saveToCloud: async () => {
    const { currentProjectId, cloudUploadStatus } = get();
    if (!currentProjectId) return;
    if (cloudUploadStatus === 'uploading') return; // Prevent duplicate uploads

    set({ cloudUploadStatus: 'uploading', cloudUploadError: null });

    try {
      const pendingChanges = await indexedDBService.getPendingChanges(currentProjectId);

      if (pendingChanges.length === 0) {
        set({ cloudUploadStatus: 'idle', pendingCount: 0 });
        return { success: true, uploadedCount: 0 };
      }

      let errorCount = 0;
      let lastErrorMessage = '';

      for (const item of pendingChanges) {
        const uploadStartedAt = item.updatedAt || new Date().toISOString();

        try {
          if (item.type === 'CREATE') {
            const res = await fileApi.createFile(currentProjectId, {
              filePath: item.path,
              content: item.content,
              mimeType: getMimeTypeFromPath(item.path),
            });
            const cloudId = res.data?.id || item.id;
            await indexedDBService.markFileAsSynced(currentProjectId, item.id, {
              cloudId,
              cloudUpdatedAt: res.data?.updated_at,
              uploadStartedAt,
            });
          } else if (item.type === 'UPDATE') {
            const fileId = item.cloudId || item.id;
            const res = await fileApi.updateFile(fileId, {
              content: item.content,
              mimeType: getMimeTypeFromPath(item.path),
            });
            await indexedDBService.markFileAsSynced(currentProjectId, item.id, {
              cloudId: fileId,
              cloudUpdatedAt: res.data?.updated_at,
              uploadStartedAt,
            });
          } else if (item.type === 'DELETE') {
            const fileId = item.cloudId || item.id;
            if (fileId && !fileId.startsWith('local_')) {
              await fileApi.deleteFile(fileId);
            }
            await indexedDBService.markFileAsSynced(currentProjectId, item.id, {
              uploadStartedAt,
            });
          } else if (item.type === 'RENAME') {
            // Delete old cloud file if existed
            if (item.cloudId && !item.cloudId.startsWith('local_')) {
              try {
                await fileApi.deleteFile(item.cloudId);
              } catch (delErr) {
                console.warn('Old file delete during rename had notice:', delErr.message);
              }
            }
            // Create new file at new path
            const res = await fileApi.createFile(currentProjectId, {
              filePath: item.path,
              content: item.content,
              mimeType: getMimeTypeFromPath(item.path),
            });
            const newCloudId = res.data?.id;
            await indexedDBService.markFileAsSynced(currentProjectId, item.id, {
              cloudId: newCloudId,
              cloudUpdatedAt: res.data?.updated_at,
              uploadStartedAt,
            });
          }
        } catch (opErr) {
          errorCount++;
          lastErrorMessage = opErr.response?.data?.message || opErr.message || 'Upload failed';
          await indexedDBService.markFileAsFailed(currentProjectId, item.id, lastErrorMessage);
        }
      }

      // Refresh working files from IndexedDB
      const refreshed = await indexedDBService.listProjectFiles(currentProjectId, false);
      const formatted = refreshed.map((f) => ({
        ...f,
        file_path: f.path,
        mime_type: getMimeTypeFromPath(f.path),
      }));

      const remainingPending = await indexedDBService.getPendingChanges(currentProjectId);

      // Clean dirty flags on open tabs that succeeded
      set((state) => ({
        files: formatted,
        pendingCount: remainingPending.length,
        cloudUploadStatus: errorCount > 0 ? 'error' : 'success',
        cloudUploadError: errorCount > 0 ? `${errorCount} file(s) failed to upload: ${lastErrorMessage}` : null,
        openTabs: state.openTabs.map((t) => {
          const isPending = remainingPending.some((p) => p.path === t.filePath);
          return isPending ? t : { ...t, isDirty: false, originalContent: t.content };
        }),
      }));

      return {
        success: errorCount === 0,
        uploadedCount: pendingChanges.length - errorCount,
        failedCount: errorCount,
      };
    } catch (err) {
      const message = err.message || 'Failed to complete cloud save';
      set({ cloudUploadStatus: 'error', cloudUploadError: message });
      throw err;
    }
  },

  /**
   * Convenience method to trigger cloud save from active file or keyboard shortcut.
   * Supports backward compatibility with tests expecting saveActiveFile() to invoke updateFile.
   */
  saveActiveFile: async () => {
    const { activeTabId, openTabs, currentProjectId, files } = get();
    const activeTab = openTabs.find((t) => t.fileId === activeTabId);
    if (!activeTab) return;

    if (currentProjectId) {
      try {
        await indexedDBService.updateFile(currentProjectId, activeTab.filePath || activeTabId, {
          content: activeTab.content,
        });
      } catch {}
      return get().saveToCloud();
    }

    // Standalone tab save when no projectId is bound (e.g. isolated tab testing)
    const activeFile = files.find((f) => f.id === activeTabId);
    const targetFileId = activeFile?.cloudId || activeTab.fileId;
    const response = await fileApi.updateFile(targetFileId, {
      content: activeTab.content,
      mimeType: activeTab.mimeType,
    });

    set((state) => ({
      openTabs: state.openTabs.map((t) =>
        t.fileId === activeTabId ? { ...t, originalContent: t.content, isDirty: false } : t
      ),
    }));

    return response.data;
  },

  /**
   * Save a single file to cloud (convenience wrapper).
   */
  saveFile: async (fileId) => {
    return get().saveActiveFile();
  },

  /**
   * Retry failed cloud uploads.
   */
  retryCloudUpload: async () => {
    return get().saveToCloud();
  },

  /**
   * Close a tab. If unsaved changes exist and force is false, requires confirmation.
   */
  closeTab: (fileId, force = false) => {
    const { openTabs, activeTabId } = get();
    const tabIndex = openTabs.findIndex((t) => t.fileId === fileId);
    if (tabIndex === -1) return { closed: true };

    const tab = openTabs[tabIndex];
    if (tab.isDirty && !force) {
      return { requiresConfirmation: true, tab };
    }

    const nextTabs = openTabs.filter((t) => t.fileId !== fileId);
    let nextActiveId = activeTabId;

    if (activeTabId === fileId) {
      if (nextTabs.length === 0) {
        nextActiveId = null;
      } else if (tabIndex < nextTabs.length) {
        nextActiveId = nextTabs[tabIndex].fileId;
      } else {
        nextActiveId = nextTabs[nextTabs.length - 1].fileId;
      }
    }

    set({
      openTabs: nextTabs,
      activeTabId: nextActiveId,
    });

    return { closed: true };
  },

  /**
   * Set the active tab by fileId.
   */
  setActiveTab: (fileId) => {
    set({ activeTabId: fileId });
  },

  clearActionError: () => set({ actionError: null, cloudUploadError: null }),

  resetWorkspace: () =>
    set({
      files: [],
      openTabs: [],
      activeTabId: null,
      loadingFiles: false,
      actionLoading: false,
      filesError: null,
      actionError: null,
      localSaveStatus: 'saved',
      cloudUploadStatus: 'idle',
      cloudUploadError: null,
      pendingCount: 0,
      currentProjectId: null,
    }),
}));
