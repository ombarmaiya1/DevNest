import { getLanguageFromPath } from '../utils/editorLanguage.js';

const DB_NAME = 'devnest-db';
const DB_VERSION = 1;
const STORE_PROJECTS = 'projects';
const STORE_FILES = 'files';

/**
 * Validates a relative file path:
 * - Must be non-empty string
 * - Must not start with / or drive letters
 * - Must not contain .. (path traversal)
 * - Must not end with / (must be a file, not folder)
 */
export const validatePath = (filePath) => {
  if (!filePath || typeof filePath !== 'string') {
    throw new Error('File path must be a non-empty string');
  }
  const normalized = filePath.replace(/\\/g, '/').trim();
  if (!normalized) {
    throw new Error('File path cannot be empty');
  }
  if (normalized.startsWith('/') || /^[a-zA-Z]:/.test(normalized)) {
    throw new Error('File path must be relative');
  }
  if (normalized.endsWith('/')) {
    throw new Error('Path must specify a file, not a directory');
  }
  const parts = normalized.split('/');
  for (const part of parts) {
    if (!part || part === '.' || part === '..') {
      throw new Error('File path contains invalid traversal or empty segments');
    }
  }
  return normalized;
};

// ---------------------------------------------------------------------------
// In-Memory Fallback for Node.js / Environments without native window.indexedDB
// ---------------------------------------------------------------------------
class MemoryRequest {
  constructor(getValue) {
    this._getValue = typeof getValue === 'function' ? getValue : () => getValue;
    this.result = undefined;
    this.error = null;
    try {
      this.result = this._getValue();
    } catch (err) {
      this.error = err;
    }
    this._onsuccess = null;
    this._onerror = null;
  }

  set onsuccess(fn) {
    this._onsuccess = fn;
    if (fn && !this.error) {
      fn({ target: this });
    }
  }

  get onsuccess() {
    return this._onsuccess;
  }

  set onerror(fn) {
    this._onerror = fn;
  }

  get onerror() {
    return this._onerror;
  }
}

class MemoryObjectStore {
  constructor(name, keyPath, indexes = {}) {
    this.name = name;
    this.keyPath = keyPath;
    this.records = new Map();
    this.indexDefs = indexes;
  }

  _get(key) {
    const val = this.records.get(key);
    return val ? JSON.parse(JSON.stringify(val)) : undefined;
  }

  get(key) {
    return new MemoryRequest(() => this._get(key));
  }

  _put(value) {
    const key = value[this.keyPath];
    this.records.set(key, JSON.parse(JSON.stringify(value)));
    return key;
  }

  put(value) {
    return new MemoryRequest(() => this._put(value));
  }

  _delete(key) {
    this.records.delete(key);
  }

  delete(key) {
    return new MemoryRequest(() => this._delete(key));
  }

  _getAll() {
    return Array.from(this.records.values()).map((v) => JSON.parse(JSON.stringify(v)));
  }

  getAll() {
    return new MemoryRequest(() => this._getAll());
  }

  index(indexName) {
    const def = this.indexDefs[indexName];
    if (!def) throw new Error(`Index ${indexName} not found`);

    return {
      get: (key) =>
        new MemoryRequest(() => {
          for (const record of this.records.values()) {
            if (Array.isArray(def.keyPath)) {
              const matches = def.keyPath.every((k, i) => record[k] === key[i]);
              if (matches) return JSON.parse(JSON.stringify(record));
            } else if (record[def.keyPath] === key) {
              return JSON.parse(JSON.stringify(record));
            }
          }
          return undefined;
        }),
      getAll: (key) =>
        new MemoryRequest(() => {
          const results = [];
          for (const record of this.records.values()) {
            if (key === undefined) {
              results.push(JSON.parse(JSON.stringify(record)));
            } else if (Array.isArray(def.keyPath)) {
              const matches = def.keyPath.every((k, i) => record[k] === key[i]);
              if (matches) results.push(JSON.parse(JSON.stringify(record)));
            } else if (record[def.keyPath] === key) {
              results.push(JSON.parse(JSON.stringify(record)));
            }
          }
          return results;
        }),
    };
  }
}

class MemoryDatabase {
  constructor() {
    this.stores = new Map([
      [STORE_PROJECTS, new MemoryObjectStore(STORE_PROJECTS, 'id')],
      [
        STORE_FILES,
        new MemoryObjectStore(STORE_FILES, 'id', {
          by_project_path: { keyPath: ['projectId', 'path'], unique: true },
          by_project: { keyPath: 'projectId', unique: false },
          by_sync_status: { keyPath: 'syncStatus', unique: false },
        }),
      ],
    ]);
  }

  transaction(storeNames, mode) {
    const self = this;
    const tx = {
      objectStore: (name) => self.stores.get(name),
      _oncomplete: null,
      _onerror: null,
      abort: () => {},
      set oncomplete(fn) {
        this._oncomplete = fn;
        if (fn) {
          queueMicrotask(() => {
            fn({ target: this });
          });
        }
      },
      get oncomplete() {
        return this._oncomplete;
      },
      set onerror(fn) {
        this._onerror = fn;
      },
      get onerror() {
        return this._onerror;
      },
    };

    return tx;
  }
}

const memoryDbInstance = new MemoryDatabase();

// ---------------------------------------------------------------------------
// Native IndexedDB Connection
// ---------------------------------------------------------------------------
let dbPromise = null;

const getIDBFactory = () => {
  if (typeof globalThis !== 'undefined' && globalThis.indexedDB) {
    return globalThis.indexedDB;
  }
  return null;
};

/**
 * Opens or initializes the devnest-db IndexedDB database.
 */
export const openDatabase = () => {
  if (dbPromise) return dbPromise;

  const idb = getIDBFactory();
  if (!idb) {
    // In-memory fallback for testing / non-browser environments
    dbPromise = Promise.resolve(memoryDbInstance);
    return dbPromise;
  }

  dbPromise = new Promise((resolve, reject) => {
    let req;
    try {
      req = idb.open(DB_NAME, DB_VERSION);
    } catch (err) {
      // Fallback on security/quota failure
      dbPromise = Promise.resolve(memoryDbInstance);
      resolve(memoryDbInstance);
      return;
    }

    req.onupgradeneeded = (event) => {
      const db = event.target.result;

      // 1. Projects Store: { id, name, updatedAt }
      if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
        db.createObjectStore(STORE_PROJECTS, { keyPath: 'id' });
      }

      // 2. Files Store: { id, projectId, path, name, content, language, createdAt, updatedAt, cloudUpdatedAt, syncStatus }
      if (!db.objectStoreNames.contains(STORE_FILES)) {
        const fileStore = db.createObjectStore(STORE_FILES, { keyPath: 'id' });
        // Unique compound index on projectId + path
        fileStore.createIndex('by_project_path', ['projectId', 'path'], { unique: true });
        // Query indexes
        fileStore.createIndex('by_project', 'projectId', { unique: false });
        fileStore.createIndex('by_sync_status', 'syncStatus', { unique: false });
      }
    };

    req.onsuccess = () => {
      resolve(req.result);
    };

    req.onerror = () => {
      // If native IDB fails (e.g. private browsing restrictions), fallback to memory
      console.warn('Native IndexedDB open failed, falling back to memory store:', req.error);
      dbPromise = Promise.resolve(memoryDbInstance);
      resolve(memoryDbInstance);
    };

    req.onblocked = () => {
      console.warn('IndexedDB blocked by another open tab');
    };
  });

  return dbPromise;
};

// ---------------------------------------------------------------------------
// IndexedDB Reusable Service
// ---------------------------------------------------------------------------
export const indexedDBService = {
  /**
   * Directly get the database instance
   */
  getDB: openDatabase,

  /**
   * Save or update project metadata in the 'projects' store.
   */
  saveProject: async ({ id, name, updatedAt = new Date().toISOString() }) => {
    if (!id) throw new Error('Project id is required');
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_PROJECTS], 'readwrite');
      const store = tx.objectStore(STORE_PROJECTS);
      const record = { id, name: name || 'Untitled Project', updatedAt };
      store.put(record);

      tx.oncomplete = () => resolve(record);
      tx.onerror = (e) => reject(e.target?.error || new Error('Failed to save project'));
    });
  },

  /**
   * Get project metadata by id.
   */
  getProject: async (projectId) => {
    if (!projectId) return null;
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_PROJECTS], 'readonly');
      const store = tx.objectStore(STORE_PROJECTS);
      const req = store.get(projectId);

      tx.oncomplete = () => resolve(req.result || null);
      tx.onerror = (e) => reject(e.target?.error || new Error('Failed to read project'));
    });
  },

  /**
   * Create a new file record locally in IndexedDB.
   * Folders are derived from file paths.
   */
  createFile: async (projectId, {
    path: rawPath,
    content = '',
    language,
    id,
    cloudId = null,
    syncStatus = 'created',
    createdAt,
    updatedAt,
    cloudUpdatedAt = null,
  }) => {
    if (!projectId) throw new Error('Project ID is required');
    const validPath = validatePath(rawPath);
    const fileName = validPath.split('/').pop();
    const resolvedLanguage = language || getLanguageFromPath(validPath);
    const now = new Date().toISOString();
    const fileId = id || cloudId || `local_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_FILES], 'readwrite');
      const store = tx.objectStore(STORE_FILES);
      const index = store.index('by_project_path');
      const getReq = index.get([projectId, validPath]);

      getReq.onsuccess = () => {
        const existing = getReq.result;
        if (existing && existing.syncStatus !== 'deleted') {
          return reject(new Error(`File '${validPath}' already exists in this project`));
        }

        const record = {
          id: existing ? existing.id : fileId,
          projectId,
          path: validPath,
          name: fileName,
          content: content || '',
          language: resolvedLanguage,
          createdAt: existing?.createdAt || createdAt || now,
          updatedAt: updatedAt || now,
          cloudUpdatedAt: cloudUpdatedAt || null,
          syncStatus,
          cloudId: existing?.cloudId || cloudId || null,
          oldPath: null,
          lastSyncError: null,
        };

        store.put(record);
      };

      tx.oncomplete = () => {
        // Fetch saved record to return complete object
        resolve({
          id: fileId,
          projectId,
          path: validPath,
          name: fileName,
          content: content || '',
          language: resolvedLanguage,
          createdAt: createdAt || now,
          updatedAt: updatedAt || now,
          cloudUpdatedAt: cloudUpdatedAt || null,
          syncStatus,
          cloudId,
          oldPath: null,
        });
      };

      tx.onerror = (e) => reject(e.target?.error || new Error('Failed to create file in IndexedDB'));
    });
  },

  /**
   * Read a file by id or relative path.
   */
  readFile: async (projectId, pathOrId) => {
    if (!projectId || !pathOrId) return null;
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_FILES], 'readonly');
      const store = tx.objectStore(STORE_FILES);

      // Check if pathOrId is a path or id
      if (pathOrId.includes('/') || pathOrId.includes('.')) {
        const index = store.index('by_project_path');
        const req = index.get([projectId, pathOrId]);
        tx.oncomplete = () => {
          const res = req.result;
          if (res && res.syncStatus !== 'deleted') {
            resolve(res);
          } else {
            resolve(null);
          }
        };
      } else {
        const req = store.get(pathOrId);
        tx.oncomplete = () => {
          const res = req.result;
          if (res && res.projectId === projectId && res.syncStatus !== 'deleted') {
            resolve(res);
          } else {
            resolve(null);
          }
        };
      }

      tx.onerror = (e) => reject(e.target?.error || new Error('Failed to read file from IndexedDB'));
    });
  },

  /**
   * Update a file's content or metadata locally in IndexedDB.
   */
  updateFile: async (projectId, pathOrId, {
    content,
    syncStatus,
    cloudUpdatedAt,
    cloudId,
    language,
  }) => {
    if (!projectId || !pathOrId) throw new Error('projectId and pathOrId are required');
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_FILES], 'readwrite');
      const store = tx.objectStore(STORE_FILES);
      let fetchReq;

      if (pathOrId.includes('/') || pathOrId.includes('.')) {
        fetchReq = store.index('by_project_path').get([projectId, pathOrId]);
      } else {
        fetchReq = store.get(pathOrId);
      }

      let updatedRecord = null;

      fetchReq.onsuccess = () => {
        const file = fetchReq.result;
        if (!file || file.syncStatus === 'deleted') {
          return reject(new Error(`File not found: ${pathOrId}`));
        }

        const now = new Date().toISOString();
        let nextSyncStatus = file.syncStatus;

        if (syncStatus) {
          nextSyncStatus = syncStatus;
        } else if (file.syncStatus === 'synced') {
          nextSyncStatus = 'modified';
        }

        updatedRecord = {
          ...file,
          ...(content !== undefined ? { content } : {}),
          ...(language ? { language } : {}),
          ...(cloudId ? { cloudId } : {}),
          ...(cloudUpdatedAt ? { cloudUpdatedAt } : {}),
          syncStatus: nextSyncStatus,
          updatedAt: now,
          lastSyncError: null,
        };

        store.put(updatedRecord);
      };

      tx.oncomplete = () => resolve(updatedRecord);
      tx.onerror = (e) => reject(e.target?.error || new Error('Failed to update file in IndexedDB'));
    });
  },

  /**
   * Delete a file locally.
   * If file was only created locally and not synced to cloud, permanently remove it.
   * If file was synced to cloud, mark syncStatus = 'deleted' so user can push deletion on save.
   */
  deleteFile: async (projectId, pathOrId) => {
    if (!projectId || !pathOrId) throw new Error('projectId and pathOrId are required');
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_FILES], 'readwrite');
      const store = tx.objectStore(STORE_FILES);
      let fetchReq;

      if (pathOrId.includes('/') || pathOrId.includes('.')) {
        fetchReq = store.index('by_project_path').get([projectId, pathOrId]);
      } else {
        fetchReq = store.get(pathOrId);
      }

      fetchReq.onsuccess = () => {
        const file = fetchReq.result;
        if (!file) {
          return; // Already deleted
        }

        // If file was never uploaded to cloud (only created locally)
        if (file.syncStatus === 'created' && !file.cloudId) {
          store.delete(file.id);
        } else {
          // File exists in cloud; mark deleted for cloud save
          store.put({
            ...file,
            syncStatus: 'deleted',
            updatedAt: new Date().toISOString(),
          });
        }
      };

      tx.oncomplete = () => resolve({ success: true });
      tx.onerror = (e) => reject(e.target?.error || new Error('Failed to delete file from IndexedDB'));
    });
  },

  /**
   * Rename a file locally in IndexedDB.
   */
  renameFile: async (projectId, oldPath, newPath) => {
    if (!projectId || !oldPath || !newPath) throw new Error('projectId, oldPath, and newPath are required');
    const validOldPath = validatePath(oldPath);
    const validNewPath = validatePath(newPath);

    if (validOldPath === validNewPath) {
      return indexedDBService.readFile(projectId, validOldPath);
    }

    const newName = validNewPath.split('/').pop();
    const newLang = getLanguageFromPath(validNewPath);
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_FILES], 'readwrite');
      const store = tx.objectStore(STORE_FILES);
      const index = store.index('by_project_path');

      const checkReq = index.get([projectId, validNewPath]);
      let updated = null;

      checkReq.onsuccess = () => {
        const existingAtNew = checkReq.result;
        if (existingAtNew && existingAtNew.syncStatus !== 'deleted') {
          return reject(new Error(`File '${validNewPath}' already exists`));
        }

        const getOldReq = index.get([projectId, validOldPath]);
        getOldReq.onsuccess = () => {
          const oldFile = getOldReq.result;
          if (!oldFile || oldFile.syncStatus === 'deleted') {
            return reject(new Error(`File '${validOldPath}' not found`));
          }

          const now = new Date().toISOString();
          let nextSyncStatus = oldFile.syncStatus;
          let oldPathToKeep = oldFile.oldPath || validOldPath;

          if (oldFile.syncStatus === 'created' && !oldFile.cloudId) {
            nextSyncStatus = 'created';
            oldPathToKeep = null;
          } else {
            nextSyncStatus = 'renamed';
          }

          updated = {
            ...oldFile,
            path: validNewPath,
            name: newName,
            language: newLang,
            oldPath: oldPathToKeep,
            syncStatus: nextSyncStatus,
            updatedAt: now,
            lastSyncError: null,
          };

          store.put(updated);
        };
      };

      tx.oncomplete = () => resolve(updated);
      tx.onerror = (e) => reject(e.target?.error || new Error('Failed to rename file in IndexedDB'));
    });
  },

  /**
   * List all project files (active files, excluding soft-deleted).
   */
  listProjectFiles: async (projectId, includeDeleted = false) => {
    if (!projectId) return [];
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_FILES], 'readonly');
      const store = tx.objectStore(STORE_FILES);
      const index = store.index('by_project');
      const req = index.getAll(projectId);

      tx.oncomplete = () => {
        const all = req.result || [];
        const filtered = includeDeleted ? all : all.filter((f) => f.syncStatus !== 'deleted');
        // Sort alphabetically by path
        filtered.sort((a, b) => a.path.localeCompare(b.path));
        resolve(filtered);
      };

      tx.onerror = (e) => reject(e.target?.error || new Error('Failed to list files from IndexedDB'));
    });
  },

  /**
   * Derive folders through file paths. Does not create empty-folder records.
   */
  createFolders: async (projectId, folderPath) => {
    if (!projectId) throw new Error('projectId is required');
    if (!folderPath || typeof folderPath !== 'string') throw new Error('folderPath is required');
    const normalized = folderPath.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
    return { success: true, folderPath: normalized };
  },

  /**
   * Read all files belonging to a project with full contents.
   */
  readAllProjectFiles: async (projectId) => {
    return indexedDBService.listProjectFiles(projectId, false);
  },

  /**
   * Returns all pending changes for cloud upload.
   * Identifies CREATE, UPDATE, DELETE, and RENAME operations.
   */
  getPendingChanges: async (projectId) => {
    if (!projectId) return [];
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_FILES], 'readonly');
      const store = tx.objectStore(STORE_FILES);
      const index = store.index('by_project');
      const req = index.getAll(projectId);

      tx.oncomplete = () => {
        const all = req.result || [];
        const pending = [];

        for (const file of all) {
          if (file.syncStatus === 'synced') continue;

          let opType = 'UPDATE';
          if (file.syncStatus === 'created') opType = 'CREATE';
          else if (file.syncStatus === 'deleted') opType = 'DELETE';
          else if (file.syncStatus === 'renamed') opType = 'RENAME';
          else if (file.syncStatus === 'modified') opType = 'UPDATE';

          pending.push({
            id: file.id,
            projectId: file.projectId,
            path: file.path,
            name: file.name,
            content: file.content,
            language: file.language,
            syncStatus: file.syncStatus,
            cloudId: file.cloudId,
            oldPath: file.oldPath,
            updatedAt: file.updatedAt,
            lastSyncError: file.lastSyncError,
            type: opType,
          });
        }

        resolve(pending);
      };

      tx.onerror = (e) => reject(e.target?.error || new Error('Failed to get pending changes'));
    });
  },

  /**
   * Marks a file as successfully synchronized with cloud.
   * If the file was updated during upload (updatedAt > uploadStartedAt), keeps it modified.
   */
  markFileAsSynced: async (projectId, fileId, { cloudId, cloudUpdatedAt, uploadStartedAt }) => {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_FILES], 'readwrite');
      const store = tx.objectStore(STORE_FILES);
      const req = store.get(fileId);

      req.onsuccess = () => {
        const file = req.result;
        if (!file) return;

        // If file was deleted, permanently remove it from IndexedDB now that cloud confirmed delete
        if (file.syncStatus === 'deleted') {
          store.delete(file.id);
          return;
        }

        // If edited while upload was in-flight, keep modified!
        const wasEditedDuringUpload =
          uploadStartedAt && file.updatedAt && new Date(file.updatedAt) > new Date(uploadStartedAt);

        if (wasEditedDuringUpload) {
          store.put({
            ...file,
            cloudId: cloudId || file.cloudId,
            syncStatus: 'modified',
            lastSyncError: null,
          });
        } else {
          store.put({
            ...file,
            cloudId: cloudId || file.cloudId,
            cloudUpdatedAt: cloudUpdatedAt || new Date().toISOString(),
            syncStatus: 'synced',
            oldPath: null,
            lastSyncError: null,
          });
        }
      };

      tx.oncomplete = () => resolve(true);
      tx.onerror = (e) => reject(e.target?.error || new Error('Failed to mark file as synced'));
    });
  },

  /**
   * Records a sync failure message on a file while preserving its pending status.
   */
  markFileAsFailed: async (projectId, fileId, errorMessage) => {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_FILES], 'readwrite');
      const store = tx.objectStore(STORE_FILES);
      const req = store.get(fileId);

      req.onsuccess = () => {
        const file = req.result;
        if (file) {
          store.put({
            ...file,
            lastSyncError: errorMessage || 'Sync failed',
          });
        }
      };

      tx.oncomplete = () => resolve(true);
      tx.onerror = (e) => reject(e.target?.error || new Error('Failed to mark file as failed'));
    });
  },

  /**
   * Clear all records for a project (for testing and reset).
   */
  clearProject: async (projectId) => {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_PROJECTS, STORE_FILES], 'readwrite');
      const projectStore = tx.objectStore(STORE_PROJECTS);
      const fileStore = tx.objectStore(STORE_FILES);

      projectStore.delete(projectId);

      const index = fileStore.index('by_project');
      const req = index.getAll(projectId);

      req.onsuccess = () => {
        const files = req.result || [];
        for (const file of files) {
          fileStore.delete(file.id);
        }
      };

      tx.oncomplete = () => resolve(true);
      tx.onerror = (e) => reject(e.target?.error || new Error('Failed to clear project'));
    });
  },
};
