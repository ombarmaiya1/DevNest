import * as projectService from './project.service.js';

export const createProject = async (req, res, next) => {
  try {
    const project = await projectService.createProject(
      req.supabase,
      req.user.id,
      req.body
    );
    return res.status(201).json({
      success: true,
      data: project,
    });
  } catch (error) {
    next(error);
  }
};

export const listProjects = async (req, res, next) => {
  try {
    const projects = await projectService.listProjects(
      req.supabase,
      req.user.id
    );
    return res.status(200).json({
      success: true,
      data: projects,
    });
  } catch (error) {
    next(error);
  }
};

export const getProject = async (req, res, next) => {
  try {
    const project = await projectService.getProject(
      req.supabase,
      req.params.id,
      req.user.id
    );
    return res.status(200).json({
      success: true,
      data: project,
    });
  } catch (error) {
    next(error);
  }
};

export const renameProject = async (req, res, next) => {
  try {
    const project = await projectService.renameProject(
      req.supabase,
      req.params.id,
      req.user.id,
      req.body
    );
    return res.status(200).json({
      success: true,
      data: project,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteProject = async (req, res, next) => {
  try {
    const result = await projectService.deleteProject(
      req.supabase,
      req.params.id,
      req.user.id
    );
    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

