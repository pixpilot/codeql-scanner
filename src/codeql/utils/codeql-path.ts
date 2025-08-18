import { exec } from '@actions/exec';
import { Logger } from '../../utils/logger';
import { isWindowsPlatform } from '../../utils/platform-utils';

/**
 * Checks if CodeQL is available in the system PATH.
 * @returns The path to the CodeQL CLI if found, otherwise undefined.
 */
export async function getCodeQLPathFromSystem(): Promise<string | undefined> {
  const isWindows = isWindowsPlatform();
  const codeqlPath = isWindows ? 'codeql.exe' : 'codeql';
  const whichCommand = isWindows ? 'where' : 'which';

  try {
    await exec(whichCommand, [isWindows ? 'codeql' : 'codeql'], { silent: true });
    Logger.info('CodeQL found in system PATH');
    return codeqlPath;
  } catch {
    Logger.info('CodeQL not found in PATH');
    return undefined;
  }
}
