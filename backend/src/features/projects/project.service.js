import { z } from 'zod';
import * as projectModel from './project.model.js';

const createProjectSchema = z.object({
  name: z
    .string({ required_error: 'Project name is required' })
    .trim()
    .min(1, 'Project name must not be empty')
    .max(100, 'Project name must be 100 characters or less'),
  stack: z.literal('MERN', {
    errorMap: () => ({ message: "Stack must be 'MERN'" }),
  }),
});

const renameProjectSchema = z.object({
  name: z
    .string({ required_error: 'Project name is required' })
    .trim()
    .min(1, 'Project name must not be empty')
    .max(100, 'Project name must be 100 characters or less'),
});

const projectIdSchema = z
  .string({ required_error: 'Project ID is required' })
  .uuid('Invalid project ID format. Must be a valid UUID');

export const createProject = async (supabase, userId, body) => {
  const parseResult = createProjectSchema.safeParse(body);
  if (!parseResult.success) {
    const error = new Error(parseResult.error.errors[0].message);
    error.statusCode = 400;
    throw error;
  }

  const { name, stack } = parseResult.data;

  try {
    return await projectModel.create(supabase, { userId, name, stack });
  } catch (err) {
    console.error('Database error creating project:', err.message || err);
    const error = new Error('Failed to create project');
    error.statusCode = 500;
    throw error;
  }
};

export const listProjects = async (supabase, userId) => {
  try {
    return await projectModel.findByUserId(supabase, userId);
  } catch (err) {
    console.error('Database error listing projects:', err.message || err);
    const error = new Error('Failed to retrieve projects');
    error.statusCode = 500;
    throw error;
  }
};

export const getProject = async (supabase, projectId, userId) => {
  const idResult = projectIdSchema.safeParse(projectId);
  if (!idResult.success) {
    const error = new Error(idResult.error.errors[0].message);
    error.statusCode = 400;
    throw error;
  }

  let project;
  try {
    project = await projectModel.findByIdAndUserId(supabase, idResult.data, userId);
  } catch (err) {
    console.error('Database error fetching project:', err.message || err);
    const error = new Error('Failed to fetch project');
    error.statusCode = 500;
    throw error;
  }

  if (!project) {
    const error = new Error('Project not found');
    error.statusCode = 404;
    throw error;
  }

  return project;
};

export const renameProject = async (supabase, projectId, userId, body) => {
  const idResult = projectIdSchema.safeParse(projectId);
  if (!idResult.success) {
    const error = new Error(idResult.error.errors[0].message);
    error.statusCode = 400;
    throw error;
  }

  const bodyResult = renameProjectSchema.safeParse(body);
  if (!bodyResult.success) {
    const error = new Error(bodyResult.error.errors[0].message);
    error.statusCode = 400;
    throw error;
  }

  let updated;
  try {
    updated = await projectModel.updateNameById(
      supabase,
      idResult.data,
      userId,
      bodyResult.data.name
    );
  } catch (err) {
    console.error('Database error renaming project:', err.message || err);
    const error = new Error('Failed to update project');
    error.statusCode = 500;
    throw error;
  }

  if (!updated) {
    const error = new Error('Project not found');
    error.statusCode = 404;
    throw error;
  }

  return updated;
};

export const deleteProject = async (supabase, projectId, userId) => {
  const idResult = projectIdSchema.safeParse(projectId);
  if (!idResult.success) {
    const error = new Error(idResult.error.errors[0].message);
    error.statusCode = 400;
    throw error;
  }

  let deleted;
  try {
    deleted = await projectModel.deleteById(supabase, idResult.data, userId);
  } catch (err) {
    console.error('Database error deleting project:', err.message || err);
    const error = new Error('Failed to delete project');
    error.statusCode = 500;
    throw error;
  }

  if (!deleted) {
    const error = new Error('Project not found');
    error.statusCode = 404;
    throw error;
  }

  return { message: 'Project deleted successfully' };
};

