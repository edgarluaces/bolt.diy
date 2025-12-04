import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('stream-recovery');

export interface StreamRecoveryOptions {
  maxRetries?: number;
  timeout?: number;
  onTimeout?: () => void;
  onRecovery?: () => void;
}

export class StreamRecoveryManager {
  private _retryCount = 0;
  private _timeoutHandle: NodeJS.Timeout | null = null;
  private _lastActivity: number = Date.now();
  private _isActive = true;
  private _activityCount = 0;

  constructor(private _options: StreamRecoveryOptions = {}) {
    this._options = {
      maxRetries: 3,
      timeout: 120000, // 120 seconds default (2 minutes) - increased for large file generation
      ..._options,
    };
    logger.debug(
      `StreamRecoveryManager initialized with timeout: ${this._options.timeout}ms, maxRetries: ${this._options.maxRetries}`,
    );
  }

  startMonitoring() {
    this._resetTimeout();
  }

  updateActivity() {
    this._lastActivity = Date.now();
    this._activityCount++;

    // Log activity every 100 chunks for debugging
    if (this._activityCount % 100 === 0) {
      logger.debug(`Stream activity: ${this._activityCount} chunks processed, ${this._retryCount} retries so far`);
    }

    // Warn if processing an unusually high number of chunks (possible infinite loop)
    if (this._activityCount === 2000) {
      logger.warn(`⚠️  Stream has processed 2000+ chunks - possible infinite continuation loop detected`);
    }

    if (this._activityCount > 3000) {
      logger.error(`🔴 Stream exceeded 3000 chunks - forcing stop to prevent infinite loop`);
      this.stop();

      return;
    }

    this._resetTimeout();
  }

  private _resetTimeout() {
    if (this._timeoutHandle) {
      clearTimeout(this._timeoutHandle);
    }

    if (!this._isActive) {
      return;
    }

    this._timeoutHandle = setTimeout(() => {
      if (this._isActive) {
        logger.warn('Stream timeout detected');
        this._handleTimeout();
      }
    }, this._options.timeout);
  }

  private _handleTimeout() {
    const timeSinceActivity = Date.now() - this._lastActivity;
    logger.warn(
      `⏱️  Stream inactivity detected: ${Math.round(timeSinceActivity / 1000)}s since last activity (${this._activityCount} chunks total)`,
    );

    if (this._retryCount >= (this._options.maxRetries || 3)) {
      logger.error(
        `❌ Max retries (${this._options.maxRetries}) reached for stream recovery. Total chunks processed: ${this._activityCount}`,
      );
      this.stop();

      return;
    }

    this._retryCount++;
    logger.info(`🔄 Attempting stream recovery (attempt ${this._retryCount}/${this._options.maxRetries})`);

    if (this._options.onTimeout) {
      this._options.onTimeout();
    }

    // Reset monitoring after recovery attempt
    this._resetTimeout();

    if (this._options.onRecovery) {
      this._options.onRecovery();
    }
  }

  stop() {
    this._isActive = false;

    if (this._timeoutHandle) {
      clearTimeout(this._timeoutHandle);
      this._timeoutHandle = null;
    }
  }

  getStatus() {
    return {
      isActive: this._isActive,
      retryCount: this._retryCount,
      activityCount: this._activityCount,
      lastActivity: this._lastActivity,
      timeSinceLastActivity: Date.now() - this._lastActivity,
      timeoutMs: this._options.timeout,
      maxRetries: this._options.maxRetries,
    };
  }

  forceRecovery() {
    logger.warn('🔧 Force recovery requested by user');
    this._handleTimeout();
  }
}
