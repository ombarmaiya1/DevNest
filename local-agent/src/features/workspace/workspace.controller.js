import { workspaceService } from './workspace.service.js';

export const workspaceController = {
  selectWorkspace: async (req, res, next) => {
    try {
      const { projectId, path: targetPath } = req.body || {};
      const workspace = projectId
        ? await workspaceService.selectProjectWorkspace(projectId)
        : await workspaceService.selectWorkspace(targetPath);

      return res.status(200).json({
        success: true,
        message: 'Workspace selected successfully',
        workspace,
      });
    } catch (err) {
      next(err);
    }
  },

  getWorkspace: (req, res, next) => {
    try {
      const workspace = workspaceService.getWorkspace();
      return res.status(200).json({
        success: true,
        workspace,
      });
    } catch (err) {
      next(err);
    }
  },

  listFiles: async (req, res, next) => {
    try {
      const result = await workspaceService.listFiles();
      return res.status(200).json({
        success: true,
        ...result,
      });
    } catch (err) {
      next(err);
    }
  },

  readFile: async (req, res, next) => {
    try {
      const filePath = req.query?.path;
      const result = await workspaceService.readFile(filePath);
      return res.status(200).json({
        success: true,
        ...result,
      });
    } catch (err) {
      next(err);
    }
  },

  writeFile: async (req, res, next) => {
    try {
      const filePath = req.body?.path;
      const content = req.body?.content;
      const result = await workspaceService.writeFile(filePath, content);
      return res.status(200).json({
        success: true,
        ...result,
      });
    } catch (err) {
      next(err);
    }
  },
};

