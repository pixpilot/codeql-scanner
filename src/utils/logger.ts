import * as core from '@actions/core';

export class Logger {
  private static errorCount = 0;
  private static failed = false;

  static info(message: string): void {
    core.info(message);
  }

  static warning(message: string): void {
    core.warning(message);
  }

  static error(message: string): void {
    Logger.errorCount++;
    core.error(message);
  }

  static debug(message: string): void {
    core.debug(message);
  }

  static setFailed(message: string): void {
    Logger.errorCount++;
    Logger.failed = true;
    core.setFailed(message);
  }

  /** Number of errors logged so far. Used to fail the job even when an error was handled locally. */
  static getErrorCount(): number {
    return Logger.errorCount;
  }

  static hasFailed(): boolean {
    return Logger.failed;
  }

  static reset(): void {
    Logger.errorCount = 0;
    Logger.failed = false;
  }
}
