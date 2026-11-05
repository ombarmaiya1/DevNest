import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjectStore } from '../stores/projectStore.js';
import { CreateProjectModal } from '../components/CreateProjectModal.jsx';
import { RenameProjectModal } from '../components/RenameProjectModal.jsx';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal.jsx';

export const Dashboard = () => {
  const navigate = useNavigate();
  const { projects, loading, error, fetchProjects } = useProjectStore();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [projectToRename, setProjectToRename] = useState(null);
  const [projectToDelete, setProjectToDelete] = useState(null);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return (
    <div className="space-y-8">
      {/* Dashboard Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Projects
            </h1>
            {!loading && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                {projects.length} {projects.length === 1 ? 'project' : 'projects'}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Create, manage, and launch your cloud developer environments.
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 transition self-start sm:self-auto"
        >
          <span>+</span>
          <span>New Project</span>
        </button>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-red-400 font-bold">!</span>
            <span className="text-sm text-red-300">{error}</span>
          </div>
          <button
            onClick={() => fetchProjects()}
            className="text-xs font-semibold text-red-400 hover:text-red-200 underline transition"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && projects.length === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="p-6 rounded-2xl bg-slate-800/40 border border-slate-800 animate-pulse space-y-4"
            >
              <div className="flex justify-between items-center">
                <div className="h-5 w-16 bg-slate-700 rounded"></div>
                <div className="h-4 w-20 bg-slate-700 rounded"></div>
              </div>
              <div className="h-6 w-3/4 bg-slate-700 rounded"></div>
              <div className="h-4 w-1/2 bg-slate-700 rounded"></div>
              <div className="pt-4 border-t border-slate-800 flex justify-between">
                <div className="h-8 w-20 bg-slate-700 rounded"></div>
                <div className="h-8 w-16 bg-slate-700 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && projects.length === 0 && (
        <div className="p-12 md:p-16 rounded-2xl border-2 border-dashed border-slate-800 bg-slate-800/20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center text-3xl mx-auto mb-4">
            🚀
          </div>
          <h2 className="text-lg font-bold text-white mb-1">No projects yet</h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">
            Get started by creating your first project. Devnest will provision the database record, project files structure, and workspace container.
          </p>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 transition"
          >
            <span>+</span>
            <span>Create Your First Project</span>
          </button>
        </div>
      )}

      {/* Populated Project Grid */}
      {!loading && projects.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div
              key={project.id}
              className="group p-6 rounded-2xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/80 hover:border-slate-600 transition-all duration-200 shadow-lg flex flex-col justify-between"
            >
              <div>
                {/* Header: Stack & Creation Date */}
                <div className="flex items-center justify-between mb-3">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                    {project.stack || 'MERN'}
                  </span>
                  <span className="text-xs text-slate-400">
                    {new Date(project.created_at).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>

                {/* Project Title */}
                <h3
                  onClick={() => navigate(`/projects/${project.id}`)}
                  className="text-lg font-bold text-white group-hover:text-indigo-300 transition cursor-pointer truncate"
                  title={project.name}
                >
                  {project.name}
                </h3>

                <p className="text-xs font-mono text-slate-500 mt-1 truncate">
                  ID: {project.id}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-5 mt-5 border-t border-slate-700/60 flex items-center justify-between">
                <button
                  onClick={() => navigate(`/projects/${project.id}`)}
                  className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition flex items-center space-x-1.5"
                >
                  <span>Open</span>
                  <span>→</span>
                </button>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setProjectToRename(project)}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-700/70 border border-slate-700 transition"
                    title="Rename project"
                  >
                    Rename
                  </button>
                  <button
                    onClick={() => setProjectToDelete(project)}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20 transition"
                    title="Delete project"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      <CreateProjectModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />

      <RenameProjectModal
        isOpen={Boolean(projectToRename)}
        onClose={() => setProjectToRename(null)}
        project={projectToRename}
      />

      <DeleteConfirmModal
        isOpen={Boolean(projectToDelete)}
        onClose={() => setProjectToDelete(null)}
        project={projectToDelete}
      />
    </div>
  );
};
