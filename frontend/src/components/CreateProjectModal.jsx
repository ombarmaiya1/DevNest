import React, { useState } from 'react';
import { useProjectStore } from '../stores/projectStore.js';

export const CreateProjectModal = ({ isOpen, onClose }) => {
  const [name, setName] = useState('');
  const [stack, setStack] = useState('MERN');
  const [localError, setLocalError] = useState('');

  const { createProject, actionLoading } = useProjectStore();

  if (!isOpen) return null;

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

    try {
      await createProject({ name: trimmedName, stack });
      setName('');
      onClose();
    } catch (err) {
      setLocalError(err.message || 'Failed to create project.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md p-6 rounded-2xl bg-slate-800 border border-slate-700 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-700/80 mb-5">
          <h2 className="text-xl font-bold text-white tracking-tight">Create New Project</h2>
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
              placeholder="e.g., E-Commerce Platform"
              className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm"
            />
            <span className="text-[11px] text-slate-500 block mt-1 text-right">
              {name.length}/100 characters
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Technology Stack
            </label>
            <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-between">
              <div>
                <div className="font-semibold text-sm text-indigo-400">MERN Stack</div>
                <div className="text-xs text-slate-400 mt-0.5">MongoDB, Express, React, Node.js</div>
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                Default
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Currently restricted to MERN stack during the developer platform foundation.
            </p>
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
              {actionLoading ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

