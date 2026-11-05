import crypto from 'node:crypto';
import { z } from 'zod';
import * as fileModel from './file.model.js';
import { findByIdAndUserId as findProjectByIdAndUserId } from '../projects/project.model.js';

const BUCKET_NAME = 'project-files';

const uuidSchema = z.string().uuid('Invalid ID format. Must be a valid UUID');

/**
 * Validates and normalizes relative file paths.
 * Enforces relative pathing, prevents directory traversal, and blocks invalid characters.
 */
export const validateFilePath = (filePath) => {
  if (typeof filePath !== 'string') {
    return { valid: false, error: 'File path must be a string' };
  }

  const trimmed = filePath.trim();
  if (!trimmed) {
    return { valid: false, error: 'File path must not be empty' };
  }

  // Reject absolute paths (Unix absolute or Windows drive letters)
  if (trimmed.startsWith('/') || trimmed.startsWith('\\') || /^[a-zA-Z]:/.test(trimmed)) {
    return { valid: false, error: 'File path must be a relative path' };
  }

  // Reject trailing slashes (cannot be a directory)
  if (trimmed.endsWith('/') || trimmed.endsWith('\\')) {
    return { valid: false, error: 'File path must specify a file, not a directory' };
  }

  // Normalize backslashes to forward slashes
  const normalized = trimmed.replace(/\\/g, '/');

  // Split into path segments and validate each component
  const segments = normalized.split('/');
  for (const segment of segments) {
    if (!segment || segment === '.' || segment === '..') {
      return { valid: false, error: 'File path contains invalid traversal or empty segments' };
    }
    // Check for illegal path characters
    if (/[<>:"|?*\x00-\x1F]/.test(segment)) {
      return { valid: false, error: `File path segment contains invalid characters: ${segment}` };
    }
  }

  return { valid: true, path: segments.join('/') };
};

/**
 * Lists all file metadata for a specific project.
 */
export const listFiles = async (supabase, projectId, userId) => {
  const idResult = uuidSchema.safeParse(projectId);
  if (!idResult.success) {
    const error = new Error('Invalid project ID format. Must be a valid UUID');
    error.statusCode = 400;
    throw error;
  }

  // Verify project exists and belongs to the authenticated user
  const project = await findProjectByIdAndUserId(supabase, idResult.data, userId);
  if (!project) {
    const error = new Error('Project not found');
    error.statusCode = 404;
    throw error;
  }

  try {
    return await fileModel.findByProjectIdAndUserId(supabase, idResult.data, userId);
  } catch (err) {
    console.error('Database error listing project files:', err.message || err);
    const error = new Error('Failed to retrieve project files');
    error.statusCode = 500;
    throw error;
  }
};

/**
 * Creates a file by uploading text content to Supabase Storage and saving metadata in PostgreSQL.
 */
export const createFile = async (supabase, projectId, userId, body) => {
  const idResult = uuidSchema.safeParse(projectId);
  if (!idResult.success) {
    const error = new Error('Invalid project ID format. Must be a valid UUID');
    error.statusCode = 400;
    throw error;
  }

  // Verify project exists and belongs to the authenticated user
  const project = await findProjectByIdAndUserId(supabase, idResult.data, userId);
  if (!project) {
    const error = new Error('Project not found');
    error.statusCode = 404;
    throw error;
  }

  // Validate file path
  const pathResult = validateFilePath(body?.filePath);
  if (!pathResult.valid) {
    const error = new Error(pathResult.error);
    error.statusCode = 400;
    throw error;
  }
  const filePath = pathResult.path;

  // Validate content
  if (typeof body?.content !== 'string') {
    const error = new Error('Content is required and must be a string');
    error.statusCode = 400;
    throw error;
  }
  const content = body.content;
  const mimeType = (typeof body?.mimeType === 'string' && body.mimeType.trim()) || 'text/plain';

  // Check if file already exists in this project
  const existingFile = await fileModel.findByPath(supabase, idResult.data, userId, filePath);
  if (existingFile) {
    const error = new Error(`File '${filePath}' already exists in this project`);
    error.statusCode = 409;
    throw error;
  }

  // Construct storage path: userId/projectId/filePath
  const storagePath = `${userId}/${idResult.data}/${filePath}`;
  const buffer = Buffer.from(content, 'utf8');
  const contentHash = crypto.createHash('sha256').update(buffer).digest('hex');
  const sizeBytes = buffer.byteLength;

  // 1. Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, buffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (uploadError) {
    console.error('Storage upload error:', uploadError.message || uploadError);
    const error = new Error('Failed to upload file content to storage');
    error.statusCode = 500;
    throw error;
  }

  // 2. Insert metadata in PostgreSQL (with automatic rollback on failure)
  try {
    return await fileModel.create(supabase, {
      projectId: idResult.data,
      userId,
      filePath,
      storagePath,
      contentHash,
      sizeBytes,
      mimeType,
    });
  } catch (dbError) {
    console.error('Metadata creation failed, cleaning up storage object:', dbError.message || dbError);
    try {
      await supabase.storage.from(BUCKET_NAME).remove([storagePath]);
    } catch (cleanupError) {
      console.error('Failed to cleanup storage object during rollback:', cleanupError);
    }
    const error = new Error('Failed to save file metadata');
    error.statusCode = 500;
    throw error;
  }
};

/**
 * Reads a file by fetching metadata and downloading content from Supabase Storage.
 */
export const getFile = async (supabase, fileId, userId) => {
  const idResult = uuidSchema.safeParse(fileId);
  if (!idResult.success) {
    const error = new Error('Invalid file ID format. Must be a valid UUID');
    error.statusCode = 400;
    throw error;
  }

  const file = await fileModel.findByIdAndUserId(supabase, idResult.data, userId);
  if (!file) {
    const error = new Error('File not found');
    error.statusCode = 404;
    throw error;
  }

  // Download content from Supabase Storage
  const { data: blob, error: downloadError } = await supabase.storage
    .from(BUCKET_NAME)
    .download(file.storage_path);

  if (downloadError || !blob) {
    console.error('Storage download error:', downloadError?.message || downloadError);
    const error = new Error('Failed to retrieve file content from storage');
    error.statusCode = 500;
    throw error;
  }

  const content = await blob.text();

  return {
    ...file,
    content,
  };
};

/**
 * Updates a file by replacing its Storage content and updating its metadata.
 */
export const updateFile = async (supabase, fileId, userId, body) => {
  const idResult = uuidSchema.safeParse(fileId);
  if (!idResult.success) {
    const error = new Error('Invalid file ID format. Must be a valid UUID');
    error.statusCode = 400;
    throw error;
  }

  if (typeof body?.content !== 'string') {
    const error = new Error('Content is required and must be a string');
    error.statusCode = 400;
    throw error;
  }

  const file = await fileModel.findByIdAndUserId(supabase, idResult.data, userId);
  if (!file) {
    const error = new Error('File not found');
    error.statusCode = 404;
    throw error;
  }

  const content = body.content;
  const mimeType = (typeof body?.mimeType === 'string' && body.mimeType.trim()) || file.mime_type || 'text/plain';
  const buffer = Buffer.from(content, 'utf8');
  const contentHash = crypto.createHash('sha256').update(buffer).digest('hex');
  const sizeBytes = buffer.byteLength;

  // Replace file content in Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(file.storage_path, buffer, {
      contentType: mimeType,
      upsert: true,
    });

  if (uploadError) {
    console.error('Storage replace error:', uploadError.message || uploadError);
    const error = new Error('Failed to update file content in storage');
    error.statusCode = 500;
    throw error;
  }

  // Update metadata in PostgreSQL
  try {
    return await fileModel.updateMetadata(supabase, idResult.data, userId, {
      contentHash,
      sizeBytes,
      mimeType,
      version: (file.version || 1) + 1,
    });
  } catch (dbError) {
    console.error('Database error updating file metadata:', dbError.message || dbError);
    const error = new Error('Failed to update file metadata');
    error.statusCode = 500;
    throw error;
  }
};

/**
 * Deletes a file's metadata and its corresponding Supabase Storage object.
 */
export const deleteFile = async (supabase, fileId, userId) => {
  const idResult = uuidSchema.safeParse(fileId);
  if (!idResult.success) {
    const error = new Error('Invalid file ID format. Must be a valid UUID');
    error.statusCode = 400;
    throw error;
  }

  const file = await fileModel.findByIdAndUserId(supabase, idResult.data, userId);
  if (!file) {
    const error = new Error('File not found');
    error.statusCode = 404;
    throw error;
  }

  // Delete metadata from PostgreSQL
  try {
    await fileModel.deleteById(supabase, idResult.data, userId);
  } catch (dbError) {
    console.error('Database error deleting file metadata:', dbError.message || dbError);
    const error = new Error('Failed to delete file metadata');
    error.statusCode = 500;
    throw error;
  }

  // Clean up object from Supabase Storage
  try {
    await supabase.storage.from(BUCKET_NAME).remove([file.storage_path]);
  } catch (storageError) {
    console.error('Storage cleanup error during file deletion:', storageError.message || storageError);
  }

  return { message: 'File deleted successfully' };
};

