import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// Directories to ignore during recursive file exploration
const IGNORED_DIRECTORIES = new Set(['node_modules', '.git', 'dist', 'build']);

/**
 * Designated root directory for Devnest-managed workspaces.
 */
const getManagedWorkspacesRoot = () => {
  return process.env.DEVNEST_WORKSPACES_ROOT || path.resolve(os.homedir(), '.devnest', 'workspaces');
};

/**
 * In-memory state for the active workspace.
 */
let currentWorkspace = null;

export const workspaceService = {
  /**
   * Returns the currently selected workspace.
   */
  getWorkspace: () => {
    return currentWorkspace ? { ...currentWorkspace } : null;
  },

  /**
   * Automatically initializes and selects the designated local workspace for a Devnest project.
   */
  selectProjectWorkspace: async (projectId) => {
    if (!projectId || typeof projectId !== 'string') {
      const err = new Error('Project ID is required and must be a string');
      err.statusCode = 400;
      throw err;
    }

    const trimmed = projectId.trim();
    if (!trimmed || !/^[a-zA-Z0-9_\-]+$/.test(trimmed)) {
      const err = new Error('Invalid project ID format for managed workspace');
      err.statusCode = 400;
      throw err;
    }

    const projectWorkspaceDir = path.join(getManagedWorkspacesRoot(), trimmed);

    // Automatically create designated project workspace
    await fs.mkdir(projectWorkspaceDir, { recursive: true });
    const realPath = await fs.realpath(projectWorkspaceDir);

    currentWorkspace = {
      path: realPath,
      projectId: trimmed,
      status: 'ready',
      selectedAt: new Date().toISOString(),
    };

    return { ...currentWorkspace };
  },

  /**
   * Validates and selects a local workspace directory.
   */
  selectWorkspace: async (targetPath) => {
    if (typeof targetPath === 'object' && targetPath?.projectId) {
      return workspaceService.selectProjectWorkspace(targetPath.projectId);
    }

    if (!targetPath || typeof targetPath !== 'string') {
      const err = new Error('Workspace path is required and must be a string');
      err.statusCode = 400;
      throw err;
    }

    const trimmed = targetPath.trim();
    if (!trimmed) {
      const err = new Error('Workspace path must not be empty');
      err.statusCode = 400;
      throw err;
    }

    const resolved = path.resolve(trimmed);

    // Verify existence
    let stat;
    try {
      stat = await fs.stat(resolved);
    } catch (e) {
      if (e.code === 'ENOENT') {
        const err = new Error(`Workspace directory does not exist: ${resolved}`);
        err.statusCode = 404;
        throw err;
      }
      const err = new Error(`Cannot access workspace directory: ${e.message}`);
      err.statusCode = 403;
      throw err;
    }

    // Verify it is a directory
    if (!stat.isDirectory()) {
      const err = new Error(`Specified path is not a directory: ${resolved}`);
      err.statusCode = 400;
      throw err;
    }

    // Verify read and write permissions
    try {
      await fs.access(resolved, fs.constants.R_OK | fs.constants.W_OK);
    } catch {
      const err = new Error(`Insufficient read/write permissions for directory: ${resolved}`);
      err.statusCode = 403;
      throw err;
    }

    // Obtain canonical real path
    const realPath = await fs.realpath(resolved);

    currentWorkspace = {
      path: realPath,
      status: 'ready',
      selectedAt: new Date().toISOString(),
    };

    return { ...currentWorkspace };
  },

  /**
   * Clears the current workspace (used for resets and isolation in testing).
   */
  clearWorkspace: () => {
    currentWorkspace = null;
  },

  /**
   * Resolves and secures a relative file path within the active workspace.
   */
  resolveSafePath: async (relativePath) => {
    if (!currentWorkspace) {
      const err = new Error('No workspace currently selected. Please select a workspace first.');
      err.statusCode = 400;
      throw err;
    }

    if (!relativePath || typeof relativePath !== 'string') {
      const err = new Error('File path is required and must be a string');
      err.statusCode = 400;
      throw err;
    }

    const trimmed = relativePath.trim();
    if (!trimmed) {
      const err = new Error('File path must not be empty');
      err.statusCode = 400;
      throw err;
    }

    // Reject absolute paths (Unix style, Windows drive letters, UNC shares)
    if (
      path.isAbsolute(trimmed) ||
      /^[a-zA-Z]:[/\\]/.test(trimmed) ||
      trimmed.startsWith('/') ||
      trimmed.startsWith('\\')
    ) {
      const err = new Error('Absolute paths are not permitted for workspace file operations');
      err.statusCode = 400;
      throw err;
    }

    // Reject directory traversal
    const normalizedRelative = trimmed.replace(/\\/g, '/');
    const segments = normalizedRelative.split('/');
    for (const segment of segments) {
      if (segment === '.' || segment === '..') {
        const err = new Error('Directory traversal (.. or .) is not permitted');
        err.statusCode = 400;
        throw err;
      }
    }

    const normWorkspace = path.resolve(currentWorkspace.path);
    const resolvedPath = path.resolve(normWorkspace, trimmed);

    // Verify path stays within workspace boundaries
    if (
      !resolvedPath.startsWith(normWorkspace + path.sep) &&
      resolvedPath !== normWorkspace
    ) {
      const err = new Error('Path resolves outside of the selected workspace');
      err.statusCode = 403;
      throw err;
    }

    // Check if target or any existing path segment is a symlink escaping workspace
    try {
      const lstat = await fs.lstat(resolvedPath);
      if (lstat.isSymbolicLink()) {
        const real = await fs.realpath(resolvedPath);
        if (!real.startsWith(normWorkspace + path.sep) && real !== normWorkspace) {
          const err = new Error('Symbolic link escapes the selected workspace boundary');
          err.statusCode = 403;
          throw err;
        }
      }
    } catch (e) {
      if (e.code !== 'ENOENT') throw e;
    }

    return {
      resolved: resolvedPath,
      relative: segments.join('/'),
      workspace: normWorkspace,
    };
  },

  /**
   * Recursively lists all text/code files in the selected workspace, ignoring build/modules dirs.
   */
  listFiles: async () => {
    if (!currentWorkspace) {
      const err = new Error('No workspace currently selected. Please select a workspace first.');
      err.statusCode = 400;
      throw err;
    }

    const workspaceRoot = path.resolve(currentWorkspace.path);
    const files = [];

    const walk = async (dir) => {
      let entries;
      try {
        entries = await fs.readdir(dir, { withFileTypes: true });
      } catch (err) {
        console.warn(`[Workspace] Cannot read directory ${dir}: ${err.message}`);
        return;
      }

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          if (IGNORED_DIRECTORIES.has(entry.name)) {
            continue;
          }
          await walk(fullPath);
        } else if (entry.isSymbolicLink()) {
          try {
            const real = await fs.realpath(fullPath);
            // Ignore symlinks pointing outside workspace
            if (!real.startsWith(workspaceRoot + path.sep) && real !== workspaceRoot) {
              continue;
            }
            const stat = await fs.stat(fullPath);
            if (stat.isDirectory()) {
              if (IGNORED_DIRECTORIES.has(entry.name)) continue;
              await walk(fullPath);
            } else if (stat.isFile()) {
              const rel = path.relative(workspaceRoot, fullPath).replace(/\\/g, '/');
              files.push(rel);
            }
          } catch {
            // Broken symlink; skip safely
            continue;
          }
        } else if (entry.isFile()) {
          const rel = path.relative(workspaceRoot, fullPath).replace(/\\/g, '/');
          files.push(rel);
        }
      }
    };

    await walk(workspaceRoot);
    files.sort((a, b) => a.localeCompare(b));

    return {
      workspace: workspaceRoot,
      count: files.length,
      files,
    };
  },

  /**
   * Reads the UTF-8 text content of a file within the workspace.
   */
  readFile: async (relativePath) => {
    const { resolved, relative } = await workspaceService.resolveSafePath(relativePath);

    let stat;
    try {
      stat = await fs.stat(resolved);
    } catch (e) {
      if (e.code === 'ENOENT') {
        const err = new Error(`File not found: ${relative}`);
        err.statusCode = 404;
        throw err;
      }
      throw e;
    }

    if (stat.isDirectory()) {
      const err = new Error(`Specified path is a directory, not a file: ${relative}`);
      err.statusCode = 400;
      throw err;
    }

    const content = await fs.readFile(resolved, 'utf8');

    return {
      path: relative,
      content,
      sizeBytes: stat.size,
      updatedAt: stat.mtime.toISOString(),
    };
  },

  /**
   * Writes UTF-8 text content to a file, creating parent directories if needed.
   * Prevents writing through symbolic links.
   */
  writeFile: async (relativePath, content) => {
    if (typeof content !== 'string') {
      const err = new Error('File content is required and must be a string');
      err.statusCode = 400;
      throw err;
    }

    const { resolved, relative } = await workspaceService.resolveSafePath(relativePath);

    // Prevent writing through symbolic links
    try {
      const lstat = await fs.lstat(resolved);
      if (lstat.isSymbolicLink()) {
        const err = new Error('Writing through symbolic links is strictly prohibited');
        err.statusCode = 403;
        throw err;
      }
    } catch (e) {
      if (e.code !== 'ENOENT') throw e;
    }

    // Ensure parent directory exists
    const parentDir = path.dirname(resolved);
    await fs.mkdir(parentDir, { recursive: true });

    // Write file content atomically / directly
    await fs.writeFile(resolved, content, 'utf8');

    const stat = await fs.stat(resolved);

    return {
      success: true,
      message: 'File written successfully',
      path: relative,
      sizeBytes: stat.size,
      updatedAt: stat.mtime.toISOString(),
    };
  },
};

