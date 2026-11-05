import { create } from 'zustand';
import { localAgentApi } from '../services/localAgentApi.js';

export const useAgentStore = create((set, get) => ({
  // Connection state
  connectionStatus: 'disconnected', // 'disconnected' | 'connecting' | 'connected'
  agentInfo: null,

  // Workspace state
  currentWorkspace: null,

  // Execution state
  process: null,
  logs: [],
  logsRaw: '',
  isLogsOpen: false,

  // Status flags
  loading: false,
  error: null,

  // Clear UI error
  clearError: () => set({ error: null }),

  // Set modal states
  setIsLogsOpen: (isOpen) => set({ isLogsOpen: isOpen }),

  /**
   * Check local agent health and connection
   */
  checkConnection: async () => {
    set({ connectionStatus: 'connecting', error: null });
    try {
      const data = await localAgentApi.checkHealth();
      set({
        connectionStatus: 'connected',
        agentInfo: data,
        error: null,
      });

      // Synchronize workspace and process status in background
      await get().fetchWorkspace();
      await get().fetchProcessStatus();
      return true;
    } catch (err) {
      set({
        connectionStatus: 'disconnected',
        agentInfo: null,
        error: err.message,
      });
      return false;
    }
  },

  /**
   * Fetch current active workspace from the agent
   */
  fetchWorkspace: async () => {
    try {
      const res = await localAgentApi.getWorkspace();
      set({ currentWorkspace: res.workspace || null });
    } catch {
      // Keep existing state if unreachable
    }
  },

  /**
   * Initializes the designated Devnest-managed local workspace for the current project.
   */
  initProjectWorkspace: async (projectId) => {
    if (!projectId) return null;
    try {
      const res = await localAgentApi.selectProjectWorkspace(projectId);
      set({ currentWorkspace: res.workspace });
      return res.workspace;
    } catch {
      // If agent is offline, fails silently without breaking cloud project
      return null;
    }
  },

  /**
   * Select a local workspace folder
   */
  selectFolder: async (targetPath) => {
    set({ loading: true, error: null });
    try {
      const res = await localAgentApi.selectWorkspace(targetPath);
      set({
        currentWorkspace: res.workspace,
        loading: false,
      });
      return res.workspace;
    } catch (err) {
      set({ loading: false, error: err.message });
      throw err;
    }
  },

  /**
   * Fetch current process status
   */
  fetchProcessStatus: async () => {
    try {
      const res = await localAgentApi.getProcessStatus();
      set({ process: res.process || null });
      return res.process;
    } catch {
      // Ignored if agent is temporarily offline
      return null;
    }
  },

  /**
   * Start process in the selected workspace
   */
  startProcess: async (command = 'npm', args = ['run', 'dev']) => {
    set({ loading: true, error: null });
    try {
      const res = await localAgentApi.startProcess(command, args);
      set({
        process: res.process,
        loading: false,
      });
      // Immediately fetch logs
      await get().fetchLogs();
      return res.process;
    } catch (err) {
      set({ loading: false, error: err.message });
      throw err;
    }
  },

  /**
   * Stop the running process
   */
  stopProcess: async () => {
    set({ loading: true, error: null });
    try {
      const res = await localAgentApi.stopProcess();
      set({
        process: res.process,
        loading: false,
      });
      await get().fetchLogs();
      return res.process;
    } catch (err) {
      set({ loading: false, error: err.message });
      throw err;
    }
  },

  /**
   * Fetch recent process logs
   */
  fetchLogs: async (limit = 100) => {
    try {
      const res = await localAgentApi.getProcessLogs(limit);
      set({
        logs: res.logs || [],
        logsRaw: res.raw || '',
      });
    } catch {
      // Silent error on background log fetch
    }
  },
}));

