import React, { useState, useEffect } from 'react';
import { useProjectStore } from '../stores/projectStore.js';

export const RenameProjectModal = ({ isOpen, onClose, project }) => {
  const [name, setName] = useState('');
  const [localError, setLocalError] = useState('');

  const { renameProject, actionLoading } = useProjectStore();

  useEffect(() => {
    if (project) {
      setName(project.name || '');
      setLocalError('');
    }
  }, [project]);

  if (!isOpen || !project) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');

    const trimmedName = name.trim();
    if (!trimmedName) {
      setLocalError('Project name cannot be empty.');
      return;
    }

    if (trimmedName.length > 100) {
      setLocalError('Project name must be 100 characters or less.');
      return;
    }

    if (trimmedName === project.name) {
      onClose();
      return;
    }

    try {
      await renameProject(project.id, trimmedName);
      onClose();
    } catch (err) {
      setLocalError(err.message || 'Failed to rename project.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md p-6 rounded-2xl bg-slate-800 border border-slate-700 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-700/80 mb-5">
          <h2 className="text-xl font-bold text-white tracking-tight">Rename Project</h2>
          <button
            onClick={onClose}
            disabled={actionLoading}
            className="text-slate-400 hover:text-slate-200 transition p-1"
          >
            ✕
          </button>
        </div>

        {localError && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {localError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Project Name
            </label>
            <input
              type="text"
              required
              autoFocus
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter new project name"
              className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm"
            />
            <span className="text-[11px] text-slate-500 block mt-1 text-right">
              {name.length}/100 characters
            </span>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-700/80">
            <button
              type="button"
              onClick={onClose}
              disabled={actionLoading}
              className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition rounded-lg hover:bg-slate-700/50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-5 py-2 text-sm font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
            >
              {actionLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

