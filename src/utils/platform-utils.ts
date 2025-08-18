import * as process from 'node:process';

/**
 * Utility to check if the current platform is Windows.
 */
export function isWindowsPlatform(): boolean {
  return process.platform === 'win32';
}
