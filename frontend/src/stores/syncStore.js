import { create } from 'zustand';
import { fileApi } from '../services/fileApi.js';
import { localAgentApi } from '../services/localAgentApi.js';
import { useAgentStore } from './agentStore.js';
import { indexedDBService } from '../services/indexedDBService.js';

/**
 * Validates that a relative file path is safe and does not traverse directories.
 */
export const isSafeRelativePath = (relPath) => {
  if (!relPath || typeof relPath !== 'string') return false;
  const normalized = relPath.replace(/\\/g, '/');
  if (normalized.startsWith('/') || /^[a-zA-Z]:/.test(normalized)) return false;
  const segments = normalized.split('/');
  return !segments.some((s) => s === '..' || s === '');
};

/**
 * Normalizes string line endings to compare content accurately across platforms.
 */
export const normalizeLineEndings = (str) => {
  if (typeof str !== 'string') return '';
  return str.replace(/\r\n/g, '\n');
};

export const useSyncStore = create((set, get) => ({
  // Active sync state
  currentProjectId: null,
  selectedWorkspace: null,
  syncStatus: 'idle', // 'idle' | 'syncing' | 'conflict' | 'completed' | 'error'

  // Progress metrics
  totalFiles: 0,
  currentFileIndex: 0,
  currentFileName: '',
  syncedFiles: 0,
  skippedFiles: 0,
  failedFiles: 0,
  lastSyncTime: null,

  // Conflict and error tracking
  pendingConflicts: [], // [{ fileId, filePath, cloudContent, localContent }]
  fileErrors: [], // [{ filePath, error, cloudContent, fileId }]
  isConflictModalOpen: false,
  isSummaryModalOpen: false,

  // Local sync status per active file: { [filePath]: { status: 'synced'|'syncing'|'error', error?: string } }
  activeFileLocalSync: {},

  // Modal toggles
  setIsConflictModalOpen: (open) => set({ isConflictModalOpen: open }),
  setIsSummaryModalOpen: (open) => set({ isSummaryModalOpen: open }),

  /**
   * Resets synchronization state
   */
  resetSyncState: () =>
    set({
      syncStatus: 'idle',
      totalFiles: 0,
      currentFileIndex: 0,
      currentFileName: '',
      syncedFiles: 0,
      skippedFiles: 0,
      failedFiles: 0,
      pendingConflicts: [],
      fileErrors: [],
      isConflictModalOpen: false,
      isSummaryModalOpen: false,
    }),

  /**
   * Initial synchronization: Cloud-to-Local
   * Downloads project files from cloud backend and writes them locally.
   */
  syncFromCloud: async (projectId) => {
    const { syncStatus } = get();
    if (syncStatus === 'syncing') {
      return; // Prevent simultaneous sync operations
    }

    let { connectionStatus, currentWorkspace } = useAgentStore.getState();
    if (connectionStatus !== 'connected') {
      const err = new Error('Local agent is not connected. Start the local agent to enable local synchronization.');
      set({ syncStatus: 'error', isSummaryModalOpen: true });
      throw err;
    }

    if (!currentWorkspace?.path) {
      currentWorkspace = await useAgentStore.getState().initProjectWorkspace(projectId);
    }

    if (!currentWorkspace?.path) {
      const err = new Error('Could not initialize designated local project workspace.');
      set({ syncStatus: 'error', isSummaryModalOpen: true });
      throw err;
    }

    // Initialize sync state
    set({
      currentProjectId: projectId,
      selectedWorkspace: currentWorkspace.path,
      syncStatus: 'syncing',
      totalFiles: 0,
      currentFileIndex: 0,
      currentFileName: 'Fetching file catalog...',
      syncedFiles: 0,
      skippedFiles: 0,
      failedFiles: 0,
      pendingConflicts: [],
      fileErrors: [],
      isConflictModalOpen: false,
      isSummaryModalOpen: false,
    });

    try {
      // 1. Fetch working files from local IndexedDB first, or fallback to cloud API
      let files = [];
      try {
        const localWorkingFiles = await indexedDBService.readAllProjectFiles(projectId);
        if (localWorkingFiles && localWorkingFiles.length > 0) {
          files = localWorkingFiles.map((f) => ({
            id: f.id,
            file_path: f.path,
            content: f.content,
          }));
        }
      } catch {}

      if (files.length === 0) {
        const res = await fileApi.listFiles(projectId);
        files = res.data || [];
      }

      if (files.length === 0) {
        set({
          syncStatus: 'completed',
          totalFiles: 0,
          currentFileName: '',
          lastSyncTime: new Date().toISOString(),
          isSummaryModalOpen: true,
        });
        return;
      }

      set({ totalFiles: files.length });

      const conflicts = [];
      const errors = [];
      let syncedCount = 0;
      let skippedCount = 0;

      // 2. Iterate through each file
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        set({ currentFileIndex: i + 1, currentFileName: file.file_path });

        // Safety check relative path
        if (!isSafeRelativePath(file.file_path)) {
          errors.push({
            filePath: file.file_path,
            error: 'Unsafe file path detected',
            fileId: file.id,
          });
          continue;
        }

        // Determine content from local working copy or download from cloud
        let cloudContent = '';
        if (file.content !== undefined && file.content !== null) {
          cloudContent = file.content;
        } else {
          try {
            const detailRes = await fileApi.getFile(file.id);
            cloudContent = detailRes.data?.content ?? '';
          } catch (fetchErr) {
            errors.push({
              filePath: file.file_path,
              error: `Failed to download file: ${fetchErr.message}`,
              fileId: file.id,
            });
            continue;
          }
        }

        // 3. Check if file already exists locally
        let localExists = false;
        let localContent = '';

        try {
          const localRes = await localAgentApi.readFile(file.file_path);
          localContent = localRes.content ?? '';
          localExists = true;
        } catch {
          // 404 Not Found implies file does not exist locally
          localExists = false;
        }

        if (localExists) {
          // Compare content
          if (normalizeLineEndings(localContent) === normalizeLineEndings(cloudContent)) {
            // Content is identical -> Skip
            skippedCount++;
            set({ skippedFiles: skippedCount });
            continue;
          } else {
            // Content is different -> Record conflict
            conflicts.push({
              fileId: file.id,
              filePath: file.file_path,
              cloudContent,
              localContent,
            });
            continue;
          }
        }

        // 4. File does not exist locally -> Write it
        try {
          await localAgentApi.writeFile(file.file_path, cloudContent);
          syncedCount++;
          set({ syncedFiles: syncedCount });
        } catch (writeErr) {
          errors.push({
            filePath: file.file_path,
            error: `Failed to write local file: ${writeErr.message}`,
            cloudContent,
            fileId: file.id,
          });
        }
      }

      // 5. Check if conflicts were detected
      if (conflicts.length > 0) {
        set({
          pendingConflicts: conflicts,
          fileErrors: errors,
          failedFiles: errors.length,
          syncStatus: 'conflict',
          isConflictModalOpen: true,
        });
      } else {
        const hasErrors = errors.length > 0;
        set({
          fileErrors: errors,
          failedFiles: errors.length,
          syncStatus: hasErrors ? 'error' : 'completed',
          lastSyncTime: new Date().toISOString(),
          isSummaryModalOpen: true,
        });
      }
    } catch (err) {
      set({
        syncStatus: 'error',
        isSummaryModalOpen: true,
      });
      throw err;
    }
  },

  /**
   * Resolves a single conflict ('overwrite' or 'skip')
   */
  resolveConflict: async (filePath, resolution) => {
    const { pendingConflicts, syncedFiles, skippedFiles, failedFiles, fileErrors } = get();
    const conflict = pendingConflicts.find((c) => c.filePath === filePath);
    if (!conflict) return;

    const remainingConflicts = pendingConflicts.filter((c) => c.filePath !== filePath);
    let newSynced = syncedFiles;
    let newSkipped = skippedFiles;
    let newFailed = failedFiles;
    const newErrors = [...fileErrors];

    if (resolution === 'overwrite') {
      try {
        await localAgentApi.writeFile(conflict.filePath, conflict.cloudContent);
        newSynced++;
      } catch (err) {
        newFailed++;
        newErrors.push({
          filePath: conflict.filePath,
          error: `Overwrite failed: ${err.message}`,
          cloudContent: conflict.cloudContent,
          fileId: conflict.fileId,
        });
      }
    } else {
      newSkipped++;
    }

    const isDone = remainingConflicts.length === 0;
    set({
      pendingConflicts: remainingConflicts,
      syncedFiles: newSynced,
      skippedFiles: newSkipped,
      failedFiles: newFailed,
      fileErrors: newErrors,
      isConflictModalOpen: !isDone,
      syncStatus: isDone ? (newFailed > 0 ? 'error' : 'completed') : 'conflict',
      isSummaryModalOpen: isDone,
      ...(isDone ? { lastSyncTime: new Date().toISOString() } : {}),
    });
  },

  /**
   * Resolves all remaining conflicts in batch ('overwrite' or 'skip')
   */
  resolveAllConflicts: async (resolution) => {
    const { pendingConflicts } = get();
    for (const conflict of [...pendingConflicts]) {
      await get().resolveConflict(conflict.filePath, resolution);
    }
  },

  /**
   * Retries writing a single failed file
   */
  retryFailedFile: async (filePath) => {
    const { fileErrors, syncedFiles, failedFiles } = get();
    const item = fileErrors.find((e) => e.filePath === filePath);
    if (!item) return;

    try {
      await localAgentApi.writeFile(item.filePath, item.cloudContent);
      set({
        fileErrors: fileErrors.filter((e) => e.filePath !== filePath),
        syncedFiles: syncedFiles + 1,
        failedFiles: Math.max(0, failedFiles - 1),
      });
    } catch (err) {
      set({
        fileErrors: fileErrors.map((e) =>
          e.filePath === filePath ? { ...e, error: `Retry failed: ${err.message}` } : e
        ),
      });
      throw err;
    }
  },

  /**
   * Retries all failed files in batch
   */
  retryAllFailed: async () => {
    const { fileErrors } = get();
    for (const item of [...fileErrors]) {
      try {
        await get().retryFailedFile(item.filePath);
      } catch {}
    }
  },

  /**
   * Synchronizes an individual file from the editor to the local workspace
   * Called immediately after cloud save succeeds.
   */
  syncActiveFileToLocal: async (filePath, content) => {
    const { connectionStatus, currentWorkspace } = useAgentStore.getState();
    if (connectionStatus !== 'connected' || !currentWorkspace?.path) {
      // Agent is offline or no workspace; silently skip without error
      return { skipped: true, reason: 'agent_offline_or_no_workspace' };
    }

    if (!isSafeRelativePath(filePath)) {
      set((state) => ({
        activeFileLocalSync: {
          ...state.activeFileLocalSync,
          [filePath]: { status: 'error', error: 'Unsafe relative path' },
        },
      }));
      return { success: false, error: 'Unsafe relative path' };
    }

    set((state) => ({
      activeFileLocalSync: {
        ...state.activeFileLocalSync,
        [filePath]: { status: 'syncing', error: null },
      },
    }));

    try {
      await localAgentApi.writeFile(filePath, content);
      set((state) => ({
        activeFileLocalSync: {
          ...state.activeFileLocalSync,
          [filePath]: { status: 'synced', error: null },
        },
      }));
      return { success: true };
    } catch (err) {
      const errMsg = err.message || 'Failed to write to local workspace';
      set((state) => ({
        activeFileLocalSync: {
          ...state.activeFileLocalSync,
          [filePath]: { status: 'error', error: errMsg },
        },
      }));
      return { success: false, error: errMsg };
    }
  },
}));

