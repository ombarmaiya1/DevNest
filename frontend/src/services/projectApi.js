import { api } from './api.js';

export const projectApi = {
  /**
   * Fetch all projects for the authenticated user.
   * @returns {Promise<{ success: boolean, data: Array }>}
   */
  list: async () => {
    const response = await api.get('/projects');
    return response.data;
  },

  /**
   * Fetch a single project by ID.
   * @param {string} projectId
   * @returns {Promise<{ success: boolean, data: Object }>}
   */
  getById: async (projectId) => {
    const response = await api.get(`/projects/${projectId}`);
    return response.data;
  },

  /**
   * Create a new project.
   * @param {{ name: string, stack?: string }} payload
   * @returns {Promise<{ success: boolean, data: Object }>}
   */
  create: async ({ name, stack = 'MERN' }) => {
    const response = await api.post('/projects', { name, stack });
    return response.data;
  },

  /**
   * Rename an existing project.
   * @param {string} projectId
   * @param {string} name
   * @returns {Promise<{ success: boolean, data: Object }>}
   */
  rename: async (projectId, name) => {
    const response = await api.patch(`/projects/${projectId}`, { name });
    return response.data;
  },

  /**
   * Delete a project by ID.
   * @param {string} projectId
   * @returns {Promise<{ success: boolean, message: string }>}
   */
  delete: async (projectId) => {
    const response = await api.delete(`/projects/${projectId}`);
    return response.data;
  },
};

