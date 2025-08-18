import * as process from 'node:process';
import { FileUtils } from '../../utils/file-utils';
import { Logger } from '../../utils/logger';

/**
 * Searches for CodeQL in common locations used by GitHub Actions and local setups.
 * @returns The path to CodeQL if found, otherwise null.
 */
export function findCodeQLInCommonPaths(): string | null {
  const isWindows = process.platform === 'win32';

  const commonPaths = isWindows
    ? [
        'C:\\hostedtoolcache\\windows\\CodeQL\\*\\x64\\codeql\\codeql.exe',
        'D:\\a\\_temp\\codeql-runner\\codeql.exe',
        '.\\codeql\\codeql.exe',
      ]
    : [
        '/opt/hostedtoolcache/CodeQL/*/x64/codeql',
        '/home/runner/codeql/codeql',
        './codeql/codeql',
      ];

  for (const commonPath of commonPaths) {
    try {
      if (FileUtils.exists(commonPath)) {
        Logger.info(`Found CodeQL at: ${commonPath}`);
        return commonPath;
      }
    } catch {
      // Continue searching
    }
  }
  return null;
}
