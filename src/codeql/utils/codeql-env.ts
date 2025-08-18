import process from 'node:process';
import { FileUtils } from '../../utils/file-utils';
import { Logger } from '../../utils/logger';

/**
 * Checks for the CODEQL_CLI environment variable and verifies the path exists.
 * @returns The path to the CodeQL CLI if set and exists, otherwise undefined.
 */
export function getCodeQLEnvPath(): string | undefined {
  const codeqlEnv = process.env.CODEQL_CLI;
  if (codeqlEnv !== undefined && codeqlEnv.length > 0 && FileUtils.exists(codeqlEnv)) {
    Logger.info(`Using CodeQL from environment: ${codeqlEnv}`);
    return codeqlEnv;
  }
  return undefined;
}
