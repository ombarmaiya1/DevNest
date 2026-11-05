import axios from 'axios';

const env = (typeof import.meta !== 'undefined' && import.meta.env) || process.env || {};
export const LOCAL_AGENT_BASE_URL = env.VITE_LOCAL_AGENT_URL || 'http://127.0.0.1:4317';

export const agentClient = axios.create({
  baseURL: LOCAL_AGENT_BASE_URL,
  timeout: 4000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Normalizes error messages from Axios network or HTTP responses.
 */
export const formatAgentError = (err) => {
  if (err.response?.data?.error) {
    return err.response.data.error;
  }
  if (err.code === 'ECONNREFUSED' || err.code === 'ERR_NETWORK') {
    return `Local agent is not reachable at ${LOCAL_AGENT_BASE_URL}. Ensure the agent is running.`;
  }
  if (err.code === 'ECONNABORTED') {
    return 'Connection to local agent timed out.';
  }
  return err.message || 'An unknown error occurred while communicating with the local agent.';
};

export const localAgentApi = {
  /**
   * Health check
   * GET /health
   */
  checkHealth: async () => {
    try {
      const res = await agentClient.get('/health');
      return res.data;
    } catch (err) {
      throw new Error(formatAgentError(err));
    }
  },

  /**
   * Initializes or selects the designated Devnest-managed local workspace for a project
   * POST /api/workspace/select
   */
  selectProjectWorkspace: async (projectId) => {
    try {
      const res = await agentClient.post('/api/workspace/select', { projectId });
      return res.data;
    } catch (err) {
      throw new Error(formatAgentError(err));
    }
  },

  /**
   * Select a local workspace directory (programmatic or test use)
   * POST /api/workspace/select
   */
  selectWorkspace: async (targetPath) => {
    try {
      const payload = typeof targetPath === 'object' ? targetPath : { path: targetPath };
      const res = await agentClient.post('/api/workspace/select', payload);
      return res.data;
    } catch (err) {
      throw new Error(formatAgentError(err));
    }
  },

  /**
   * Get selected workspace details
   * GET /api/workspace
   */
  getWorkspace: async () => {
    try {
      const res = await agentClient.get('/api/workspace');
      return res.data;
    } catch (err) {
      throw new Error(formatAgentError(err));
    }
  },

  /**
   * List files recursively in selected workspace
   * GET /api/files
   */
  listFiles: async () => {
    try {
      const res = await agentClient.get('/api/files');
      return res.data;
    } catch (err) {
      throw new Error(formatAgentError(err));
    }
  },

  /**
   * Read file content in selected workspace
   * GET /api/files/content?path=...
   */
  readFile: async (filePath) => {
    try {
      const res = await agentClient.get(`/api/files/content?path=${encodeURIComponent(filePath)}`);
      return res.data;
    } catch (err) {
      throw new Error(formatAgentError(err));
    }
  },

  /**
   * Write file content in selected workspace
   * PUT /api/files/content
   */
  writeFile: async (filePath, content) => {
    try {
      const res = await agentClient.put('/api/files/content', { path: filePath, content });
      return res.data;
    } catch (err) {
      throw new Error(formatAgentError(err));
    }
  },

  /**
   * Start process in selected workspace
   * POST /api/process/start
   */
  startProcess: async (command = 'npm', args = ['run', 'dev']) => {
    try {
      const res = await agentClient.post('/api/process/start', { command, args });
      return res.data;
    } catch (err) {
      throw new Error(formatAgentError(err));
    }
  },

  /**
   * Stop running process in selected workspace
   * POST /api/process/stop
   */
  stopProcess: async () => {
    try {
      const res = await agentClient.post('/api/process/stop');
      return res.data;
    } catch (err) {
      throw new Error(formatAgentError(err));
    }
  },

  /**
   * Get current process execution status
   * GET /api/process/status
   */
  getProcessStatus: async () => {
    try {
      const res = await agentClient.get('/api/process/status');
      return res.data;
    } catch (err) {
      throw new Error(formatAgentError(err));
    }
  },

  /**
   * Get recent execution logs from the in-memory buffer
   * GET /api/process/logs?limit=...
   */
  getProcessLogs: async (limit = 100) => {
    try {
      const res = await agentClient.get(`/api/process/logs?limit=${encodeURIComponent(limit)}`);
      return res.data;
    } catch (err) {
      throw new Error(formatAgentError(err));
    }
  },
};

