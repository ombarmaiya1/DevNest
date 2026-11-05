import { processService } from './process.service.js';

export const processController = {
  /**
   * Start a new process in the workspace.
   * POST /api/process/start
   */
  start: async (req, res, next) => {
    try {
      const { command, args } = req.body || {};
      const processInfo = await processService.startProcess({ command, args });
      return res.status(200).json({
        success: true,
        process: processInfo,
      });
    } catch (err) {
      return next(err);
    }
  },

  /**
   * Stop the running process.
   * POST /api/process/stop
   */
  stop: async (req, res, next) => {
    try {
      const result = await processService.stopProcess();
      return res.status(200).json({
        success: true,
        stopped: result.stopped,
        message: result.message,
        process: result.process,
      });
    } catch (err) {
      return next(err);
    }
  },

  /**
   * Get process status.
   * GET /api/process/status
   */
  getStatus: (req, res, next) => {
    try {
      const processInfo = processService.getStatus();
      return res.status(200).json({
        success: true,
        process: processInfo,
      });
    } catch (err) {
      return next(err);
    }
  },

  /**
   * Get recent logs.
   * GET /api/process/logs
   */
  getLogs: (req, res, next) => {
    try {
      const limit = req.query.limit;
      const logData = processService.getLogs(limit);
      return res.status(200).json({
        success: true,
        logs: logData.logs,
        raw: logData.raw,
        total: logData.total,
      });
    } catch (err) {
      return next(err);
    }
  },
};

