import { api } from './api.js';

export const getMimeTypeFromPath = (filePath) => {
  if (!filePath || typeof filePath !== 'string') return 'text/plain';
  const ext = filePath.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'js':
    case 'jsx':
    case 'mjs':
    case 'cjs':
      return 'text/javascript';
    case 'ts':
    case 'tsx':
      return 'application/typescript';
    case 'json':
      return 'application/json';
    case 'html':
    case 'htm':
      return 'text/html';
    case 'css':
      return 'text/css';
    case 'md':
      return 'text/markdown';
    case 'svg':
      return 'image/svg+xml';
    default:
      return 'text/plain';
  }
};

export const fileApi = {
  /**
   * Fetch all file metadata for a specific project.
   */
  listFiles: async (projectId) => {
    const response = await api.get(`/projects/${projectId}/files`);
    return response.data;
  },

  /**
   * Create a new file in a project with relative path and initial content.
   */
  createFile: async (projectId, { filePath, content = '', mimeType }) => {
    const resolvedMime = mimeType || getMimeTypeFromPath(filePath);
    const response = await api.post(`/projects/${projectId}/files`, {
      filePath,
      content,
      mimeType: resolvedMime,
    });
    return response.data;
  },

  /**
   * Download and read the content of a file by its ID.
   */
  getFile: async (fileId) => {
    const response = await api.get(`/files/${fileId}`);
    return response.data;
  },

  /**
   * Update a file's content in storage and metadata in database.
   */
  updateFile: async (fileId, { content, mimeType }) => {
    const response = await api.patch(`/files/${fileId}`, {
      content,
      ...(mimeType ? { mimeType } : {}),
    });
    return response.data;
  },

  /**
   * Delete a file and its storage asset permanently.
   */
  deleteFile: async (fileId) => {
    const response = await api.delete(`/files/${fileId}`);
    return response.data;
  },
};

