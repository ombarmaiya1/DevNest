import * as fileService from './file.service.js';

export const listFiles = async (req, res, next) => {
  try {
    const files = await fileService.listFiles(
      req.supabase,
      req.params.projectId,
      req.user.id
    );
    return res.status(200).json({
      success: true,
      data: files,
    });
  } catch (error) {
    next(error);
  }
};

export const createFile = async (req, res, next) => {
  try {
    const file = await fileService.createFile(
      req.supabase,
      req.params.projectId,
      req.user.id,
      req.body
    );
    return res.status(201).json({
      success: true,
      data: file,
    });
  } catch (error) {
    next(error);
  }
};

export const getFile = async (req, res, next) => {
  try {
    const file = await fileService.getFile(
      req.supabase,
      req.params.fileId,
      req.user.id
    );
    return res.status(200).json({
      success: true,
      data: file,
    });
  } catch (error) {
    next(error);
  }
};

export const updateFile = async (req, res, next) => {
  try {
    const file = await fileService.updateFile(
      req.supabase,
      req.params.fileId,
      req.user.id,
      req.body
    );
    return res.status(200).json({
      success: true,
      data: file,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteFile = async (req, res, next) => {
  try {
    const result = await fileService.deleteFile(
      req.supabase,
      req.params.fileId,
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

