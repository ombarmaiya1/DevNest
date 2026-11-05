import { create } from 'zustand';
import { projectApi } from '../services/projectApi.js';

export const useProjectStore = create((set, get) => ({
  projects: [],
  currentProject: null,
  loading: false,
  actionLoading: false,
  error: null,
  actionError: null,

  /**
   * Fetch projects for the authenticated user and update state.
   */
  fetchProjects: async () => {
    set({ loading: true, error: null });
    try {
      const response = await projectApi.list();
      set({ projects: response.data || [], loading: false });
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Failed to load projects';
      set({ error: message, loading: false });
    }
  },

  /**
   * Fetch a single project by ID for the workspace view.
   */
  fetchProjectById: async (projectId) => {
    set({ loading: true, error: null, currentProject: null });
    try {
      const response = await projectApi.getById(projectId);
      set({ currentProject: response.data, loading: false });
      return response.data;
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Failed to load project';
      set({ error: message, loading: false });
      throw err;
    }
  },

  /**
   * Create a new project and refresh the list.
   */
  createProject: async ({ name, stack = 'MERN' }) => {
    set({ actionLoading: true, actionError: null });
    try {
      const response = await projectApi.create({ name, stack });
      const created = response.data;
      // Prepend the new project and update list
      set((state) => ({
        projects: [created, ...state.projects],
        actionLoading: false,
      }));
      return created;
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Failed to create project';
      set({ actionError: message, actionLoading: false });
      throw err;
    }
  },

  /**
   * Rename an existing project and update local state.
   */
  renameProject: async (projectId, name) => {
    set({ actionLoading: true, actionError: null });
    try {
      const response = await projectApi.rename(projectId, name);
      const updated = response.data;

      set((state) => ({
        projects: state.projects.map((p) => (p.id === projectId ? updated : p)),
        currentProject:
          state.currentProject?.id === projectId ? updated : state.currentProject,
        actionLoading: false,
      }));
      return updated;
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Failed to rename project';
      set({ actionError: message, actionLoading: false });
      throw err;
    }
  },

  /**
   * Delete a project and remove it from local state.
   */
  deleteProject: async (projectId) => {
    set({ actionLoading: true, actionError: null });
    try {
      await projectApi.delete(projectId);

      set((state) => ({
        projects: state.projects.filter((p) => p.id !== projectId),
        currentProject:
          state.currentProject?.id === projectId ? null : state.currentProject,
        actionLoading: false,
      }));
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Failed to delete project';
      set({ actionError: message, actionLoading: false });
      throw err;
    }
  },

  clearErrors: () => set({ error: null, actionError: null }),
}));

