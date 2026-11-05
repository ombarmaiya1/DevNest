import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { workspaceService } from '../workspace/workspace.service.js';

/**
 * Whitelist of permitted executable commands.
 */
const ALLOWED_COMMANDS = new Set(['npm', 'node']);

/**
 * Forbidden characters in arguments to prevent command chaining and injection.
 */
const FORBIDDEN_ARG_CHARS = /[;&|`$()<>\n\r\0]/;

/**
 * Regular expression to detect dev server preview URLs from output.
 * Matches formats like:
 *   http://localhost:5173/
 *   http://127.0.0.1:3000
 *   http://0.0.0.0:8080/
 */
const PREVIEW_URL_REGEX = /(https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0)(?::\d+)?(?:\/[^\s"']*)?)/i;

/**
 * Maximum log entries preserved in memory.
 */
const MAX_LOG_BUFFER_SIZE = 1000;

/**
 * In-memory state of the current active process and log buffer.
 */
let currentProcess = null;
let logBuffer = [];

/**
 * Helper to sanitize process details for client responses.
 */
const formatProcessInfo = (proc) => {
  if (!proc) return null;
  return {
    id: proc.id,
    pid: proc.pid,
    command: proc.command,
    args: proc.args,
    status: proc.status,
    startTime: proc.startTime,
    exitCode: proc.exitCode,
    previewUrl: proc.previewUrl,
  };
};

export const processService = {
  /**
   * Validates command and arguments against security whitelist and constraints.
   */
  validateCommand: (command, args = [], workspacePath) => {
    if (!command || typeof command !== 'string') {
      const err = new Error('Command is required and must be a string');
      err.statusCode = 400;
      throw err;
    }

    const normalizedCmd = command.trim().toLowerCase();
    if (!ALLOWED_COMMANDS.has(normalizedCmd)) {
      const err = new Error(`Unauthorized command '${command}'. Only 'npm' and 'node' commands are permitted.`);
      err.statusCode = 400;
      throw err;
    }

    if (!Array.isArray(args)) {
      const err = new Error('Arguments must be provided as an array of strings');
      err.statusCode = 400;
      throw err;
    }

    for (const arg of args) {
      if (typeof arg !== 'string') {
        const err = new Error('All command arguments must be strings');
        err.statusCode = 400;
        throw err;
      }

      if (FORBIDDEN_ARG_CHARS.test(arg)) {
        const err = new Error(`Argument contains forbidden characters: '${arg}'`);
        err.statusCode = 400;
        throw err;
      }

      if (arg.length > 500) {
        const err = new Error('Command argument exceeds maximum permitted length');
        err.statusCode = 400;
        throw err;
      }

      // If invoking node, ensure any script target file stays within the workspace
      if (normalizedCmd === 'node' && (arg.endsWith('.js') || arg.endsWith('.mjs') || arg.endsWith('.cjs'))) {
        if (path.isAbsolute(arg)) {
          const err = new Error(`Absolute script paths are not permitted: '${arg}'`);
          err.statusCode = 400;
          throw err;
        }

        if (arg.includes('..')) {
          const err = new Error(`Directory traversal in script arguments is not permitted: '${arg}'`);
          err.statusCode = 400;
          throw err;
        }

        const resolvedScript = path.resolve(workspacePath, arg);
        const resolvedWorkspace = path.resolve(workspacePath);
        if (!resolvedScript.startsWith(resolvedWorkspace)) {
          const err = new Error(`Script target escapes workspace boundary: '${arg}'`);
          err.statusCode = 400;
          throw err;
        }
      }
    }

    return { command: normalizedCmd, args };
  },

  /**
   * Starts a new process in the active workspace.
   */
  startProcess: async ({ command, args = [] }) => {
    const workspace = workspaceService.getWorkspace();
    if (!workspace || !workspace.path) {
      const err = new Error('No workspace selected. Please select a workspace first.');
      err.statusCode = 400;
      throw err;
    }

    // Prevent duplicate processes for the workspace
    if (currentProcess && currentProcess.status === 'running') {
      const err = new Error(
        `A process is already running for this workspace (ID: ${currentProcess.id}, PID: ${currentProcess.pid}). Stop it before starting a new one.`
      );
      err.statusCode = 409;
      throw err;
    }

    // Validate inputs
    const validated = processService.validateCommand(command, args, workspace.path);

    // Resolve binary path cross-platform while enforcing shell: false
    const isWin = process.platform === 'win32';
    let execBinary = validated.command;
    let spawnArgs = [...validated.args];

    if (validated.command === 'node') {
      // Use the exact running Node runtime binary
      execBinary = process.execPath;
    } else if (validated.command === 'npm') {
      const nodeDir = path.dirname(process.execPath);
      const npmCli = path.join(nodeDir, 'node_modules/npm/bin/npm-cli.js');
      if (fs.existsSync(npmCli)) {
        // Execute npm directly via Node runtime without shell or batch wrapper
        execBinary = process.execPath;
        spawnArgs = [npmCli, ...validated.args];
      } else if (isWin) {
        execBinary = 'npm.cmd';
      }
    }

    // Clear previous logs on new process start
    logBuffer = [];

    const procId = `proc_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const startTime = new Date().toISOString();

    const procState = {
      id: procId,
      pid: null,
      command: validated.command,
      args: validated.args,
      status: 'running',
      startTime,
      exitCode: null,
      previewUrl: null,
      child: null,
    };

    currentProcess = procState;

    // Helper to process and buffer stream data
    const appendLog = (chunk, stream) => {
      const text = chunk.toString('utf-8');
      const lines = text.split(/\r?\n/);

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line && i === lines.length - 1) continue;

        logBuffer.push({
          timestamp: new Date().toISOString(),
          stream,
          text: line,
        });

        if (logBuffer.length > MAX_LOG_BUFFER_SIZE) {
          logBuffer.shift();
        }

        // Preview URL extraction
        if (!procState.previewUrl) {
          const match = line.match(PREVIEW_URL_REGEX);
          if (match) {
            let detectedUrl = match[1].replace(/[.,;)]+$/, ''); // Trim trailing punctuation
            if (detectedUrl.includes('0.0.0.0')) {
              detectedUrl = detectedUrl.replace('0.0.0.0', 'localhost');
            }
            procState.previewUrl = detectedUrl;
          }
        }
      }
    };

    // Spawn the child process strictly without shell
    let child;
    try {
      child = spawn(execBinary, spawnArgs, {
        cwd: workspace.path,
        shell: false,
        env: {
          ...process.env,
          FORCE_COLOR: '0',
          CI: 'true',
        },
      });
    } catch (err) {
      currentProcess.status = 'stopped';
      currentProcess.exitCode = -1;
      const spawnErr = new Error(`Failed to spawn process: ${err.message}`);
      spawnErr.statusCode = 500;
      throw spawnErr;
    }

    procState.child = child;
    procState.pid = child.pid;

    if (child.stdout) {
      child.stdout.on('data', (data) => appendLog(data, 'stdout'));
    }

    if (child.stderr) {
      child.stderr.on('data', (data) => appendLog(data, 'stderr'));
    }

    child.on('error', (err) => {
      appendLog(`[Process Error] ${err.message}`, 'stderr');
      procState.status = 'stopped';
      procState.exitCode = -1;
    });

    child.on('close', (code, signal) => {
      procState.status = 'stopped';
      procState.exitCode = code !== null ? code : (signal ? 1 : 0);
      appendLog(`[Process Exited] Code: ${procState.exitCode}${signal ? ` Signal: ${signal}` : ''}`, 'stdout');
    });

    // Provide a brief 100ms window to catch immediate startup logs or URLs
    await new Promise((resolve) => setTimeout(resolve, 100));

    return formatProcessInfo(procState);
  },

  /**
   * Stops the currently running process safely.
   */
  stopProcess: async () => {
    if (!currentProcess || currentProcess.status !== 'running') {
      return {
        stopped: false,
        message: 'No running process to stop',
        process: currentProcess ? formatProcessInfo(currentProcess) : null,
      };
    }

    const procToStop = currentProcess;
    const child = procToStop.child;
    const isWin = process.platform === 'win32';

    return new Promise((resolve) => {
      let resolved = false;

      const finish = () => {
        if (resolved) return;
        resolved = true;
        procToStop.status = 'stopped';
        resolve({
          stopped: true,
          message: 'Process stopped successfully',
          process: formatProcessInfo(procToStop),
        });
      };

      if (!child || child.killed || procToStop.status === 'stopped') {
        return finish();
      }

      // If process exits naturally
      child.once('close', finish);
      child.once('exit', finish);

      // On Windows, use taskkill tree kill to terminate any child node processes spawned by npm
      if (isWin && procToStop.pid) {
        try {
          const killer = spawn('taskkill', ['/pid', String(procToStop.pid), '/T', '/F'], {
            shell: false,
          });
          killer.on('close', () => {
            finish();
          });
          killer.on('error', () => {
            try {
              child.kill('SIGTERM');
            } catch {}
          });
        } catch {
          try {
            child.kill('SIGTERM');
          } catch {}
        }
      } else {
        try {
          child.kill('SIGTERM');
        } catch {}
      }

      // Safety timeout in case kill hangs
      setTimeout(() => {
        if (!resolved) {
          try {
            child.kill('SIGKILL');
          } catch {}
          finish();
        }
      }, 1500);
    });
  },

  /**
   * Returns current process status.
   */
  getStatus: () => {
    return formatProcessInfo(currentProcess);
  },

  /**
   * Returns recent log entries from the in-memory buffer.
   */
  getLogs: (limit = 100) => {
    const parsedLimit = Math.max(1, Math.min(Number(limit) || 100, MAX_LOG_BUFFER_SIZE));
    const recent = logBuffer.slice(-parsedLimit);
    const raw = recent.map((e) => e.text).join('\n');

    return {
      logs: recent,
      raw,
      total: logBuffer.length,
    };
  },

  /**
   * Resets process state and logs (used for testing or clean slate).
   */
  resetState: async () => {
    if (currentProcess && currentProcess.status === 'running') {
      await processService.stopProcess();
    }
    currentProcess = null;
    logBuffer = [];
  },
};
