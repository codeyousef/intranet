/**
 * Newsletter Logger
 * 
 * A specialized logging utility for the newsletter component that provides
 * comprehensive logging capabilities for debugging newsletter fetching issues.
 */

// Log levels
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

// Log categories
export enum LogCategory {
  INIT = 'INIT',
  STORAGE = 'STORAGE',
  FETCH = 'FETCH',
  RESPONSE = 'RESPONSE',
  ERROR = 'ERROR',
  STATE = 'STATE',
  RESET = 'RESET',
  PERIODIC = 'PERIODIC'
}

// Interface for log context
interface LogContext {
  userId?: string;
  email?: string;
  component?: string;
  state?: string;
  [key: string]: any;
}

/**
 * Newsletter Logger class
 */
export class NewsletterLogger {
  private static instance: NewsletterLogger;
  private logLevel: LogLevel = LogLevel.INFO;
  private enabled: boolean = true;
  private defaultContext: LogContext = {};

  private constructor() {
    // Private constructor to enforce singleton pattern
    // Check if we should enable debug logging based on URL parameter
    if (typeof window !== 'undefined') {
      const debugMode = new URLSearchParams(window.location.search).get('debug_newsletter') === 'true';
      if (debugMode) {
        this.logLevel = LogLevel.DEBUG;
        this.debug('INIT', 'Debug logging enabled via URL parameter');
      }
    }
  }

  /**
   * Get the singleton instance of the logger
   */
  public static getInstance(): NewsletterLogger {
    if (!NewsletterLogger.instance) {
      NewsletterLogger.instance = new NewsletterLogger();
    }
    return NewsletterLogger.instance;
  }

  /**
   * Set the default context for all logs
   */
  public setDefaultContext(context: LogContext): void {
    this.defaultContext = { ...this.defaultContext, ...context };
  }

  /**
   * Set the log level
   */
  public setLogLevel(level: LogLevel): void {
    this.logLevel = level;
    this.info('INIT', `Log level set to ${LogLevel[level]}`);
  }

  /**
   * Enable or disable logging
   */
  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (enabled) {
      this.info('INIT', 'Logging enabled');
    }
  }

  /**
   * Log a debug message
   */
  public debug(category: LogCategory | string, message: string, context: LogContext = {}, ...args: any[]): void {
    this.log(LogLevel.DEBUG, category, message, context, ...args);
  }

  /**
   * Log an info message
   */
  public info(category: LogCategory | string, message: string, context: LogContext = {}, ...args: any[]): void {
    this.log(LogLevel.INFO, category, message, context, ...args);
  }

  /**
   * Log a warning message
   */
  public warn(category: LogCategory | string, message: string, context: LogContext = {}, ...args: any[]): void {
    this.log(LogLevel.WARN, category, message, context, ...args);
  }

  /**
   * Log an error message
   */
  public error(category: LogCategory | string, message: string, context: LogContext = {}, ...args: any[]): void {
    this.log(LogLevel.ERROR, category, message, context, ...args);
  }

  /**
   * Internal log method
   */
  private log(level: LogLevel, category: LogCategory | string, message: string, context: LogContext = {}, ...args: any[]): void {
    if (!this.enabled || level < this.logLevel) {
      return;
    }

    const timestamp = new Date().toISOString();
    const levelName = LogLevel[level];
    const mergedContext = { ...this.defaultContext, ...context };
    const contextStr = Object.keys(mergedContext).length > 0 
      ? ` | ${JSON.stringify(mergedContext)}`
      : '';

    const logPrefix = `[NEWSLETTER-${levelName}][${category}][${timestamp}]`;
    
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(`${logPrefix} ${message}${contextStr}`, ...args);
        break;
      case LogLevel.INFO:
        console.log(`${logPrefix} ${message}${contextStr}`, ...args);
        break;
      case LogLevel.WARN:
        console.warn(`${logPrefix} ${message}${contextStr}`, ...args);
        break;
      case LogLevel.ERROR:
        console.error(`${logPrefix} ${message}${contextStr}`, ...args);
        break;
    }
  }

  /**
   * Log the start of a process
   */
  public logStart(category: LogCategory | string, process: string, context: LogContext = {}): void {
    this.info(category, `Starting: ${process}`, context);
  }

  /**
   * Log the end of a process
   */
  public logEnd(category: LogCategory | string, process: string, context: LogContext = {}): void {
    this.info(category, `Completed: ${process}`, context);
  }

  /**
   * Log a state change
   */
  public logStateChange(from: string, to: string, context: LogContext = {}): void {
    this.info(LogCategory.STATE, `State change: ${from} -> ${to}`, context);
  }

  /**
   * Log an API request
   */
  public logApiRequest(url: string, method: string = 'GET', context: LogContext = {}): void {
    this.debug(LogCategory.FETCH, `API Request: ${method} ${url}`, context);
  }

  /**
   * Log an API response
   */
  public logApiResponse(url: string, status: number, success: boolean, context: LogContext = {}): void {
    const level = success ? LogLevel.DEBUG : LogLevel.WARN;
    this.log(level, LogCategory.RESPONSE, `API Response: ${status} from ${url}`, {
      ...context,
      status,
      success
    });
  }

  /**
   * Log data being stored
   */
  public logStorage(action: 'get' | 'set' | 'remove', key: string, success: boolean, context: LogContext = {}): void {
    this.debug(LogCategory.STORAGE, `Storage ${action}: ${key} (${success ? 'success' : 'failed'})`, context);
  }
}

// Export a singleton instance
export const newsletterLogger = NewsletterLogger.getInstance();

// Export a convenience function to get the logger
export function getNewsletterLogger(): NewsletterLogger {
  return NewsletterLogger.getInstance();
}