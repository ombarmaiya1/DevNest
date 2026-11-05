import React, { useState } from 'react';
import { useProjectStore } from '../stores/projectStore.js';

export const DeleteConfirmModal = ({ isOpen, onClose, project }) => {
  const [localError, setLocalError] = useState('');
  const { deleteProject, actionLoading } = useProjectStore();

  if (!isOpen || !project) return null;

  const handleDelete = async () => {
    setLocalError('');
    try {
      await deleteProject(project.id);
      onClose();
    } catch (err) {
      setLocalError(err.message || 'Failed to delete project.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md p-6 rounded-2xl bg-slate-800 border border-red-500/30 shadow-2xl">
        <div className="flex items-center space-x-3 text-red-400 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-lg font-bold">
            ⚠️
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Delete Project</h2>
            <p className="text-xs text-slate-400">This action cannot be undone.</p>
          </div>
        </div>

        <p className="text-sm text-slate-300 leading-relaxed mb-4">
          Are you sure you want to permanently delete{' '}
          <span className="font-semibold text-white bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700">
            {project.name}
          </span>
          ? All project files, storage assets, and metadata will be permanently deleted.
        </p>

        {localError && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {localError}
          </div>
        )}

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
            type="button"
            onClick={handleDelete}
            disabled={actionLoading}
            className="px-5 py-2 text-sm font-semibold rounded-lg bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/30 transition disabled:opacity-50"
          >
            {actionLoading ? 'Deleting...' : 'Delete Project'}
          </button>
        </div>
      </div>
    </div>
  );
};

