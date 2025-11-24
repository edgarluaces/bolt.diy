import type { WebContainer } from '@webcontainer/api';
import { path as nodePath } from '~/utils/path';
import { atom, map, type MapStore } from 'nanostores';
import type { ActionAlert, BoltAction, DeployAlert, FileHistory, SupabaseAction, SupabaseAlert } from '~/types/actions';
import { createScopedLogger } from '~/utils/logger';
import { unreachable } from '~/utils/unreachable';
import type { ActionCallbackData } from './message-parser';
import type { BoltShell } from '~/utils/shell';

const logger = createScopedLogger('ActionRunner');

export type ActionStatus = 'pending' | 'running' | 'complete' | 'aborted' | 'failed';

export type BaseActionState = BoltAction & {
  status: Exclude<ActionStatus, 'failed'>;
  abort: () => void;
  executed: boolean;
  abortSignal: AbortSignal;
};

export type FailedActionState = BoltAction &
  Omit<BaseActionState, 'status'> & {
    status: Extract<ActionStatus, 'failed'>;
    error: string;
  };

export type ActionState = BaseActionState | FailedActionState;

type BaseActionUpdate = Partial<Pick<BaseActionState, 'status' | 'abort' | 'executed'>>;

export type ActionStateUpdate =
  | BaseActionUpdate
  | (Omit<BaseActionUpdate, 'status'> & { status: 'failed'; error: string });

type ActionsMap = MapStore<Record<string, ActionState>>;

class ActionCommandError extends Error {
  readonly _output: string;
  readonly _header: string;

  constructor(message: string, output: string) {
    // Create a formatted message that includes both the error message and output
    const formattedMessage = `Failed To Execute Shell Command: ${message}\n\nOutput:\n${output}`;
    super(formattedMessage);

    // Set the output separately so it can be accessed programmatically
    this._header = message;
    this._output = output;

    // Maintain proper prototype chain
    Object.setPrototypeOf(this, ActionCommandError.prototype);

    // Set the name of the error for better debugging
    this.name = 'ActionCommandError';
  }

  // Optional: Add a method to get just the terminal output
  get output() {
    return this._output;
  }
  get header() {
    return this._header;
  }
}

export class ActionRunner {
  #webcontainer: Promise<WebContainer>;
  #currentExecutionPromise: Promise<void> = Promise.resolve();
  #shellTerminal: () => BoltShell;
  #fileCount: number = 0; // Track number of files created
  #maxFiles: number = 5; // Maximum allowed files
  runnerId = atom<string>(`${Date.now()}`);
  actions: ActionsMap = map({});
  onAlert?: (alert: ActionAlert) => void;
  onSupabaseAlert?: (alert: SupabaseAlert) => void;
  onDeployAlert?: (alert: DeployAlert) => void;
  buildOutput?: { path: string; exitCode: number; output: string };

  constructor(
    webcontainerPromise: Promise<WebContainer>,
    getShellTerminal: () => BoltShell,
    onAlert?: (alert: ActionAlert) => void,
    onSupabaseAlert?: (alert: SupabaseAlert) => void,
    onDeployAlert?: (alert: DeployAlert) => void,
  ) {
    this.#webcontainer = webcontainerPromise;
    this.#shellTerminal = getShellTerminal;
    this.onAlert = onAlert;
    this.onSupabaseAlert = onSupabaseAlert;
    this.onDeployAlert = onDeployAlert;
  }

  addAction(data: ActionCallbackData) {
    const { actionId } = data;

    const actions = this.actions.get();
    const action = actions[actionId];

    if (action) {
      // action already added
      return;
    }

    const abortController = new AbortController();

    this.actions.setKey(actionId, {
      ...data.action,
      status: 'pending',
      executed: false,
      abort: () => {
        abortController.abort();
        this.#updateAction(actionId, { status: 'aborted' });
      },
      abortSignal: abortController.signal,
    });

    this.#currentExecutionPromise.then(() => {
      this.#updateAction(actionId, { status: 'running' });
    });
  }

  async runAction(data: ActionCallbackData, isStreaming: boolean = false) {
    const { actionId } = data;
    const action = this.actions.get()[actionId];

    if (!action) {
      unreachable(`Action ${actionId} not found`);
    }

    if (action.executed) {
      return; // No return value here
    }

    if (isStreaming && action.type !== 'file') {
      return; // No return value here
    }

    this.#updateAction(actionId, { ...action, ...data.action, executed: !isStreaming });

    this.#currentExecutionPromise = this.#currentExecutionPromise
      .then(() => {
        return this.#executeAction(actionId, isStreaming);
      })
      .catch((error) => {
        logger.error('Action execution promise failed:', error);
      });

    await this.#currentExecutionPromise;

    return;
  }

  async #executeAction(actionId: string, isStreaming: boolean = false) {
    const action = this.actions.get()[actionId];

    this.#updateAction(actionId, { status: 'running' });

    try {
      switch (action.type) {
        case 'shell': {
          await this.#runShellAction(action);
          break;
        }
        case 'file': {
          await this.#runFileAction(action);
          break;
        }
        case 'supabase': {
          try {
            await this.handleSupabaseAction(action as SupabaseAction);
          } catch (error: any) {
            // Update action status
            this.#updateAction(actionId, {
              status: 'failed',
              error: error instanceof Error ? error.message : 'Supabase action failed',
            });

            // Return early without re-throwing
            return;
          }
          break;
        }
        case 'build': {
          const buildOutput = await this.#runBuildAction(action);

          // Store build output for deployment
          this.buildOutput = buildOutput;
          break;
        }
        case 'start': {
          // making the start app non blocking

          this.#runStartAction(action)
            .then(() => this.#updateAction(actionId, { status: 'complete' }))
            .catch((err: Error) => {
              if (action.abortSignal.aborted) {
                return;
              }

              this.#updateAction(actionId, { status: 'failed', error: 'Action failed' });
              logger.error(`[${action.type}]:Action failed\n\n`, err);

              if (!(err instanceof ActionCommandError)) {
                return;
              }

              this.onAlert?.({
                type: 'error',
                title: 'Dev Server Failed',
                description: err.header,
                content: err.output,
              });
            });

          /*
           * adding a delay to avoid any race condition between 2 start actions
           * i am up for a better approach
           */
          await new Promise((resolve) => setTimeout(resolve, 2000));

          return;
        }
      }

      this.#updateAction(actionId, {
        status: isStreaming ? 'running' : action.abortSignal.aborted ? 'aborted' : 'complete',
      });
    } catch (error) {
      if (action.abortSignal.aborted) {
        return;
      }

      this.#updateAction(actionId, { status: 'failed', error: 'Action failed' });
      logger.error(`[${action.type}]:Action failed\n\n`, error);

      if (!(error instanceof ActionCommandError)) {
        return;
      }

      this.onAlert?.({
        type: 'error',
        title: 'Dev Server Failed',
        description: error.header,
        content: error.output,
      });

      // re-throw the error to be caught in the promise chain
      throw error;
    }
  }

  async #runShellAction(action: ActionState) {
    if (action.type !== 'shell') {
      unreachable('Expected shell action');
    }

    const shell = this.#shellTerminal();
    await shell.ready();

    if (!shell || !shell.terminal || !shell.process) {
      unreachable('Shell terminal not found');
    }

    // Auto-open terminal so user can see command execution in real-time
    const { workbenchStore } = await import('~/lib/stores/workbench');
    workbenchStore.showTerminal.set(true);

    // Pre-validate command for common issues
    const validationResult = await this.#validateShellCommand(action.content);

    if (validationResult.shouldModify && validationResult.modifiedCommand) {
      logger.debug(`Modified command: ${action.content} -> ${validationResult.modifiedCommand}`);
      action.content = validationResult.modifiedCommand;
    }

    // Execute in an isolated process to avoid relying on OSC prompt/exit
    const maxRetries = 2;
    let attempt = 0;
    let resp = undefined as Awaited<ReturnType<typeof shell.executeEphemeral>>;

    // Increase timeout for install/setup commands and compound commands with dev servers
    const isInstallCommand = /npm\s+(install|ci|i)|yarn\s+install|pnpm\s+install/.test(action.content);
    const isCompoundWithDev = /&&.*npm\s+run\s+(dev|start)|&&.*yarn\s+(dev|start)|&&.*pnpm\s+(dev|start)/.test(
      action.content,
    );

    // Reduced timeout to 90s - with minimal deps and optimized flags, install should be much faster
    const inactivityTimeout = isInstallCommand || isCompoundWithDev ? 90000 : 45000; // 1.5min for installs/dev, 45s for others

    // Show initial feedback for install commands
    if (isInstallCommand) {
      shell.terminal?.write('\r\n\x1b[1;36m[Bolt]\x1b[0m Instalando dependencias (optimizado)...\r\n');
      shell.terminal?.write('\x1b[2m(Con dependencias mínimas esto debería ser rápido)\x1b[0m\r\n\r\n');
    }

    while (attempt <= maxRetries) {
      resp = await shell.executeEphemeral(action.content, { inactivityMs: inactivityTimeout });
      logger.debug(`${action.type} Shell Response (attempt ${attempt + 1}): [exit code:${resp?.exitCode}]`);

      // Exit if we have a result that is not inactivity timeout (124)
      if (resp && resp.exitCode !== 124) {
        break;
      }

      // Don't retry install commands on timeout - they likely just take longer
      if ((isInstallCommand || isCompoundWithDev) && resp?.exitCode === 124) {
        logger.warn(`Install/dev command timed out but may have completed - checking output`);

        // If the output suggests success (e.g., "added N packages"), treat as success
        if (resp.output && /added \d+ packages|audited \d+ packages/.test(resp.output)) {
          resp.exitCode = 0;
          break;
        }
      }

      // If inactivity detected or no response, retry if attempts remain
      if (attempt < maxRetries) {
        shell.terminal?.write(`\r\n[bolt] Sin actividad detectada, reintentando (${attempt + 1}/${maxRetries})...\r\n`);
      }

      attempt++;
    }

    if (!resp) {
      throw new ActionCommandError('Command did not produce output', 'No output received from shell execution');
    }

    if (resp.exitCode != 0) {
      const enhancedError = this.#createEnhancedShellError(action.content, resp.exitCode, resp.output);
      throw new ActionCommandError(enhancedError.title, enhancedError.details);
    }

    // Show success feedback for install commands
    if (isInstallCommand && resp.exitCode === 0) {
      shell.terminal?.write('\r\n\x1b[1;32m✓\x1b[0m \x1b[1;36m[Bolt]\x1b[0m Dependencias instaladas correctamente\r\n');
    }
  }

  async #runStartAction(action: ActionState) {
    if (action.type !== 'start') {
      unreachable('Expected shell action');
    }

    if (!this.#shellTerminal) {
      unreachable('Shell terminal not found');
    }

    const shell = this.#shellTerminal();
    await shell.ready();

    if (!shell || !shell.terminal || !shell.process) {
      unreachable('Shell terminal not found');
    }

    // Auto-open terminal so user can see dev server startup
    const { workbenchStore } = await import('~/lib/stores/workbench');
    workbenchStore.showTerminal.set(true);

    // Start the command in background
    const commandPromise = shell.executeCommand(this.runnerId.get(), action.content, () => {
      logger.debug(`[${action.type}]:Aborting Action\n\n`, action);
      action.abort();
    });

    // Wait for server-ready event with timeout
    const webcontainer = await this.#webcontainer;
    const serverReadyPromise = new Promise<void>((resolve, _reject) => {
      let resolved = false;

      const timeout = setTimeout(() => {
        if (resolved) {
          return;
        }

        resolved = true;
        logger.warn('[Start] Server ready timeout - proceeding anyway');
        resolve(); // Don't fail, just proceed
      }, 30000); // 30 second timeout

      const onServerReady = (port: number, url: string) => {
        if (resolved) {
          return;
        }

        resolved = true;
        clearTimeout(timeout);
        logger.info(`[Start] Server ready on port ${port}: ${url}`);
        resolve();
      };

      webcontainer.on('server-ready', onServerReady);

      // Also resolve if command completes successfully
      commandPromise.then((resp) => {
        if (resolved) {
          return;
        }

        if (resp?.exitCode === 0) {
          resolved = true;
          clearTimeout(timeout);
          resolve();
        }
      });
    });

    // Wait for either server ready or command completion
    await Promise.race([serverReadyPromise, commandPromise]);

    const resp = await commandPromise;
    logger.debug(`${action.type} Shell Response: [exit code:${resp?.exitCode}]`);

    if (resp?.exitCode != 0 && resp?.exitCode !== undefined) {
      throw new ActionCommandError('Failed To Start Application', resp?.output || 'No Output Available');
    }

    return resp;
  }

  async #runFileAction(action: ActionState) {
    if (action.type !== 'file') {
      unreachable('Expected file action');
    }

    const webcontainer = await this.#webcontainer;
    const relativePath = nodePath.relative(webcontainer.workdir, action.filePath);

    // VALIDATION 1: Warn about file count (but allow creation)
    if (this.#fileCount >= this.#maxFiles) {
      logger.warn(
        `⚠️ WARNING: File count (${this.#fileCount + 1}) exceeds recommended limit (${this.#maxFiles}): ${relativePath}`,
      );
      logger.warn('💡 Consider consolidating code into fewer files for better performance');
    }

    // VALIDATION 2: Warn about forbidden folder structures (but allow creation)
    const forbiddenFolders = [
      '/components/',
      '/pages/',
      '/data/',
      '/utils/',
      '/helpers/',
      '/hooks/',
      '/lib/',
      '/constants/',
      '/types/',
      '/styles/',
      '/assets/',
    ];

    const normalizedPath = '/' + relativePath.replace(/\\/g, '/');
    const hasForbiddenFolder = forbiddenFolders.some((forbidden) => normalizedPath.includes(forbidden));

    if (hasForbiddenFolder) {
      logger.warn(`⚠️ WARNING: Creating file in discouraged folder structure: ${relativePath}`);
      logger.warn('� Recommended: Keep files in root or /src only. Consolidate components into fewer files.');
    }

    // Increment file counter for tracking
    this.#fileCount++;

    let folder = nodePath.dirname(relativePath);

    // remove trailing slashes
    folder = folder.replace(/\/+$/g, '');

    if (folder !== '.') {
      try {
        await webcontainer.fs.mkdir(folder, { recursive: true });
        logger.debug('Created folder', folder);
      } catch (error) {
        logger.error('Failed to create folder\n\n', error);
      }
    }

    try {
      await webcontainer.fs.writeFile(relativePath, action.content);
      logger.debug(`File written ${relativePath}`);
    } catch (error) {
      logger.error('Failed to write file\n\n', error);
    }
  }

  #updateAction(id: string, newState: ActionStateUpdate) {
    const actions = this.actions.get();

    this.actions.setKey(id, { ...actions[id], ...newState });
  }

  async getFileHistory(filePath: string): Promise<FileHistory | null> {
    try {
      const webcontainer = await this.#webcontainer;
      const historyPath = this.#getHistoryPath(filePath);
      const content = await webcontainer.fs.readFile(historyPath, 'utf-8');

      return JSON.parse(content);
    } catch (error) {
      logger.error('Failed to get file history:', error);
      return null;
    }
  }

  async saveFileHistory(filePath: string, history: FileHistory) {
    // const webcontainer = await this.#webcontainer;
    const historyPath = this.#getHistoryPath(filePath);

    await this.#runFileAction({
      type: 'file',
      filePath: historyPath,
      content: JSON.stringify(history),
      changeSource: 'auto-save',
    } as any);
  }

  #getHistoryPath(filePath: string) {
    return nodePath.join('.history', filePath);
  }

  async #runBuildAction(action: ActionState) {
    if (action.type !== 'build') {
      unreachable('Expected build action');
    }

    // Trigger build started alert
    this.onDeployAlert?.({
      type: 'info',
      title: 'Building Application',
      description: 'Building your application...',
      stage: 'building',
      buildStatus: 'running',
      deployStatus: 'pending',
      source: 'netlify',
    });

    const webcontainer = await this.#webcontainer;

    // Create a new terminal specifically for the build
    const buildProcess = await webcontainer.spawn('npm', ['run', 'build']);

    let output = '';
    buildProcess.output.pipeTo(
      new WritableStream({
        write(data) {
          output += data;
        },
      }),
    );

    const exitCode = await buildProcess.exit;

    if (exitCode !== 0) {
      // Trigger build failed alert
      this.onDeployAlert?.({
        type: 'error',
        title: 'Build Failed',
        description: 'Your application build failed',
        content: output || 'No build output available',
        stage: 'building',
        buildStatus: 'failed',
        deployStatus: 'pending',
        source: 'netlify',
      });

      throw new ActionCommandError('Build Failed', output || 'No Output Available');
    }

    // Trigger build success alert
    this.onDeployAlert?.({
      type: 'success',
      title: 'Build Completed',
      description: 'Your application was built successfully',
      stage: 'deploying',
      buildStatus: 'complete',
      deployStatus: 'running',
      source: 'netlify',
    });

    // Check for common build directories
    const commonBuildDirs = ['dist', 'build', 'out', 'output', '.next', 'public'];

    let buildDir = '';

    // Try to find the first existing build directory
    for (const dir of commonBuildDirs) {
      const dirPath = nodePath.join(webcontainer.workdir, dir);

      try {
        await webcontainer.fs.readdir(dirPath);
        buildDir = dirPath;
        break;
      } catch {
        continue;
      }
    }

    // If no build directory was found, use the default (dist)
    if (!buildDir) {
      buildDir = nodePath.join(webcontainer.workdir, 'dist');
    }

    return {
      path: buildDir,
      exitCode,
      output,
    };
  }
  async handleSupabaseAction(action: SupabaseAction) {
    const { operation, content, filePath } = action;
    logger.debug('[Supabase Action]:', { operation, filePath, content });

    switch (operation) {
      case 'migration':
        if (!filePath) {
          throw new Error('Migration requires a filePath');
        }

        // Show alert for migration action
        this.onSupabaseAlert?.({
          type: 'info',
          title: 'Supabase Migration',
          description: `Create migration file: ${filePath}`,
          content,
          source: 'supabase',
        });

        // Only create the migration file
        await this.#runFileAction({
          type: 'file',
          filePath,
          content,
          changeSource: 'supabase',
        } as any);
        return { success: true };

      case 'query': {
        // Always show the alert and let the SupabaseAlert component handle connection state
        this.onSupabaseAlert?.({
          type: 'info',
          title: 'Supabase Query',
          description: 'Execute database query',
          content,
          source: 'supabase',
        });

        // The actual execution will be triggered from SupabaseChatAlert
        return { pending: true };
      }

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  }

  // Add this method declaration to the class
  handleDeployAction(
    stage: 'building' | 'deploying' | 'complete',
    status: ActionStatus,
    details?: {
      url?: string;
      error?: string;
      source?: 'netlify' | 'vercel' | 'github' | 'gitlab';
    },
  ): void {
    if (!this.onDeployAlert) {
      logger.debug('No deploy alert handler registered');
      return;
    }

    const alertType = status === 'failed' ? 'error' : status === 'complete' ? 'success' : 'info';

    const title =
      stage === 'building'
        ? 'Building Application'
        : stage === 'deploying'
          ? 'Deploying Application'
          : 'Deployment Complete';

    const description =
      status === 'failed'
        ? `${stage === 'building' ? 'Build' : 'Deployment'} failed`
        : status === 'running'
          ? `${stage === 'building' ? 'Building' : 'Deploying'} your application...`
          : status === 'complete'
            ? `${stage === 'building' ? 'Build' : 'Deployment'} completed successfully`
            : `Preparing to ${stage === 'building' ? 'build' : 'deploy'} your application`;

    const buildStatus =
      stage === 'building' ? status : stage === 'deploying' || stage === 'complete' ? 'complete' : 'pending';

    const deployStatus = stage === 'building' ? 'pending' : status;

    this.onDeployAlert({
      type: alertType,
      title,
      description,
      content: details?.error || '',
      url: details?.url,
      stage,
      buildStatus: buildStatus as any,
      deployStatus: deployStatus as any,
      source: details?.source || 'netlify',
    });
  }

  async #validateShellCommand(command: string): Promise<{
    shouldModify: boolean;
    modifiedCommand?: string;
    warning?: string;
  }> {
    const trimmedCommand = command.trim();

    // Handle rm commands that might fail due to missing files
    if (trimmedCommand.startsWith('rm ') && !trimmedCommand.includes(' -f')) {
      const rmMatch = trimmedCommand.match(/^rm\s+(.+)$/);

      if (rmMatch) {
        const filePaths = rmMatch[1].split(/\s+/);

        // Check if any of the files exist using WebContainer
        try {
          const webcontainer = await this.#webcontainer;
          const existingFiles = [];

          for (const filePath of filePaths) {
            if (filePath.startsWith('-')) {
              continue;
            } // Skip flags

            try {
              await webcontainer.fs.readFile(filePath);
              existingFiles.push(filePath);
            } catch {
              // File doesn't exist, skip it
            }
          }

          if (existingFiles.length === 0) {
            // No files exist, modify command to use -f flag to avoid error
            return {
              shouldModify: true,
              modifiedCommand: `rm -f ${filePaths.join(' ')}`,
              warning: 'Added -f flag to rm command as target files do not exist',
            };
          } else if (existingFiles.length < filePaths.length) {
            // Some files don't exist, modify to only remove existing ones with -f for safety
            return {
              shouldModify: true,
              modifiedCommand: `rm -f ${filePaths.join(' ')}`,
              warning: 'Added -f flag to rm command as some target files do not exist',
            };
          }
        } catch (error) {
          logger.debug('Could not validate rm command files:', error);
        }
      }
    }

    // Handle cd commands to non-existent directories
    if (trimmedCommand.startsWith('cd ')) {
      const cdMatch = trimmedCommand.match(/^cd\s+(.+)$/);

      if (cdMatch) {
        const targetDir = cdMatch[1].trim();

        try {
          const webcontainer = await this.#webcontainer;
          await webcontainer.fs.readdir(targetDir);
        } catch {
          return {
            shouldModify: true,
            modifiedCommand: `mkdir -p ${targetDir} && cd ${targetDir}`,
            warning: 'Directory does not exist, created it first',
          };
        }
      }
    }

    // Handle cp/mv commands with missing source files
    if (trimmedCommand.match(/^(cp|mv)\s+/)) {
      const parts = trimmedCommand.split(/\s+/);

      if (parts.length >= 3) {
        const sourceFile = parts[1];

        try {
          const webcontainer = await this.#webcontainer;
          await webcontainer.fs.readFile(sourceFile);
        } catch {
          return {
            shouldModify: false,
            warning: `Source file '${sourceFile}' does not exist`,
          };
        }
      }
    }

    // Normalize and optimize npm install flows
    if (trimmedCommand.startsWith('npm ')) {
      const isInstall = /^npm\s+install(\s|$)/.test(trimmedCommand);
      const isCi = /^npm\s+ci(\s|$)/.test(trimmedCommand);

      if (isInstall && !isCi) {
        try {
          const webcontainer = await this.#webcontainer;

          // Prefer ci if lockfile exists
          let hasLock = false;

          try {
            await webcontainer.fs.readFile('package-lock.json', 'utf-8');
            hasLock = true;
          } catch {}

          // Clean up obsolete Tailwind plugins before install
          await this.#cleanObsoleteTailwindPlugins(webcontainer);

          if (hasLock) {
            // Switch to npm ci (clean install from lockfile)
            return {
              shouldModify: true,
              modifiedCommand: 'npm ci',
              warning: 'Using npm ci because package-lock.json is present',
            };
          }

          // Otherwise, add flags to make install more stable and verbose
          const extraFlags = ['--progress=true', '--foreground-scripts', '--no-fund', '--no-audit'];

          // Avoid duplicating flags if already present
          const existingFlags = new Set(trimmedCommand.split(/\s+/).slice(2));
          const flagsToAdd = extraFlags.filter((f) => !existingFlags.has(f));

          if (flagsToAdd.length > 0) {
            return {
              shouldModify: true,
              modifiedCommand: `${trimmedCommand} ${flagsToAdd.join(' ')}`.trim(),
              warning: 'Added stability flags to npm install',
            };
          }
        } catch (error) {
          logger.debug('npm install normalization skipped due to error:', error);
        }
      }
    }

    return { shouldModify: false };
  }

  async #cleanObsoleteTailwindPlugins(webcontainer: WebContainer) {
    // Check for tailwind.config files
    const configPaths = ['tailwind.config.js', 'tailwind.config.cjs', 'tailwind.config.mjs', 'tailwind.config.ts'];

    const obsoletePlugins = [
      '@tailwindcss/line-clamp', // Integrated in Tailwind v3.3+
      '@tailwindcss/aspect-ratio', // Native aspect-ratio in CSS now
    ];

    for (const configPath of configPaths) {
      try {
        let content = await webcontainer.fs.readFile(configPath, 'utf-8');
        let modified = false;

        // Remove obsolete plugin imports
        for (const plugin of obsoletePlugins) {
          const importRegex = new RegExp(
            `import\\s+\\w+\\s+from\\s+['"]${plugin.replace('/', '\\/')}['"];?\\s*\\n?`,
            'g',
          );
          const requireRegex = new RegExp(`require\\(['"]${plugin.replace('/', '\\/')}['"]\\),?\\s*`, 'g');

          if (importRegex.test(content) || requireRegex.test(content)) {
            content = content.replace(importRegex, '');
            content = content.replace(requireRegex, '');
            modified = true;
            logger.info(`Removed obsolete plugin ${plugin} from ${configPath}`);
          }
        }

        // Also remove from package.json if present
        try {
          const pkgContent = await webcontainer.fs.readFile('package.json', 'utf-8');
          const pkg = JSON.parse(pkgContent);
          let pkgModified = false;

          for (const plugin of obsoletePlugins) {
            if (pkg.dependencies?.[plugin]) {
              delete pkg.dependencies[plugin];
              pkgModified = true;
              logger.info(`Removed ${plugin} from package.json dependencies`);
            }

            if (pkg.devDependencies?.[plugin]) {
              delete pkg.devDependencies[plugin];
              pkgModified = true;
              logger.info(`Removed ${plugin} from package.json devDependencies`);
            }
          }

          if (pkgModified) {
            await webcontainer.fs.writeFile('package.json', JSON.stringify(pkg, null, 2), 'utf-8');
          }
        } catch {
          // package.json might not exist yet
        }

        if (modified) {
          await webcontainer.fs.writeFile(configPath, content, 'utf-8');
        }

        break; // Only process the first config file found
      } catch {
        // Config file doesn't exist, try next
      }
    }
  }

  #createEnhancedShellError(
    command: string,
    exitCode: number | undefined,
    output: string | undefined,
  ): {
    title: string;
    details: string;
  } {
    const trimmedCommand = command.trim();
    const firstWord = trimmedCommand.split(/\s+/)[0];

    // Common error patterns and their explanations
    const errorPatterns = [
      {
        pattern: /cannot remove.*No such file or directory/,
        title: 'File Not Found',
        getMessage: () => {
          const fileMatch = output?.match(/'([^']+)'/);
          const fileName = fileMatch ? fileMatch[1] : 'file';

          return `The file '${fileName}' does not exist and cannot be removed.\n\nSuggestion: Use 'ls' to check what files exist, or use 'rm -f' to ignore missing files.`;
        },
      },
      {
        pattern: /No such file or directory/,
        title: 'File or Directory Not Found',
        getMessage: () => {
          if (trimmedCommand.startsWith('cd ')) {
            const dirMatch = trimmedCommand.match(/cd\s+(.+)/);
            const dirName = dirMatch ? dirMatch[1] : 'directory';

            return `The directory '${dirName}' does not exist.\n\nSuggestion: Use 'mkdir -p ${dirName}' to create it first, or check available directories with 'ls'.`;
          }

          return `The specified file or directory does not exist.\n\nSuggestion: Check the path and use 'ls' to see available files.`;
        },
      },
      {
        pattern: /Permission denied/,
        title: 'Permission Denied',
        getMessage: () =>
          `Permission denied for '${firstWord}'.\n\nSuggestion: The file may not be executable. Try 'chmod +x filename' first.`,
      },
      {
        pattern: /command not found/,
        title: 'Command Not Found',
        getMessage: () =>
          `The command '${firstWord}' is not available in WebContainer.\n\nSuggestion: Check available commands or use a package manager to install it.`,
      },
      {
        pattern: /Is a directory/,
        title: 'Target is a Directory',
        getMessage: () =>
          `Cannot perform this operation - target is a directory.\n\nSuggestion: Use 'ls' to list directory contents or add appropriate flags.`,
      },
      {
        pattern: /File exists/,
        title: 'File Already Exists',
        getMessage: () => `File already exists.\n\nSuggestion: Use a different name or add '-f' flag to overwrite.`,
      },
    ];

    // Try to match known error patterns
    for (const errorPattern of errorPatterns) {
      if (output && errorPattern.pattern.test(output)) {
        return {
          title: errorPattern.title,
          details: errorPattern.getMessage(),
        };
      }
    }

    // Generic error with suggestions based on command type
    let suggestion = '';

    if (trimmedCommand.startsWith('npm ')) {
      suggestion = '\n\nSuggestion: Try running "npm install" first or check package.json.';
    } else if (trimmedCommand.startsWith('git ')) {
      suggestion = "\n\nSuggestion: Check if you're in a git repository or if remote is configured.";
    } else if (trimmedCommand.match(/^(ls|cat|rm|cp|mv)/)) {
      suggestion = '\n\nSuggestion: Check file paths and use "ls" to see available files.';
    }

    return {
      title: `Command Failed (exit code: ${exitCode})`,
      details: `Command: ${trimmedCommand}\n\nOutput: ${output || 'No output available'}${suggestion}`,
    };
  }
}
