import * as fs from 'node:fs';
import { FileUtils } from '../../utils/file-utils';
import { Logger } from '../../utils/logger';

/**
 * If a package.json exists at the given path and contains "type": "module",
 * rename it to the provided backup path to avoid ESM/CJS conflicts.
 * Returns true if a rename was performed, false otherwise.
 */
export function temporarilyRenamePackageJsonIfTypeModule(
  packageJsonPath: string,
  backupPath: string,
  description = 'path',
): boolean {
  Logger.info(`Looking for package.json in ${description}: ${packageJsonPath}`);

  if (!FileUtils.exists(packageJsonPath)) {
    Logger.info(`No package.json found in ${description}.`);
    return false;
  }

  Logger.info('package.json found. Reading file content.');
  const packageJsonContent = FileUtils.readFile(packageJsonPath);
  try {
    const parsed = JSON.parse(packageJsonContent) as unknown;
    if (typeof parsed === 'object' && parsed !== null && 'type' in parsed) {
      const packageJson = parsed as { type?: unknown };
      Logger.info(`Detected package.json.type = ${String(packageJson.type)}`);
      if (packageJson.type === 'module') {
        Logger.info(
          `⚠️ Temporarily changing package.json type in ${description} to avoid ESM/CJS conflict with CodeQL extractor (typescript-parser-wrapper).`,
        );
        fs.renameSync(packageJsonPath, backupPath);
        Logger.info('package.json was renamed to package.json.bak');
        return true;
      }
      return false;
    }

    return false;
  } catch (e) {
    Logger.warning(
      `Could not parse package.json in ${description}. Skipping temporary rename. Error: ${
        e instanceof Error ? e.message : String(e)
      }`,
    );
    return false;
  }
}

/**
 * Restore a previously renamed package.json by moving backupPath back to packageJsonPath.
 * Logs a warning if the backup does not exist.
 */
export function restorePackageJson(
  backupPath: string,
  packageJsonPath: string,
  description = 'path',
): void {
  if (!FileUtils.exists(backupPath)) {
    Logger.warning(
      `Backup package.json not found for ${description}: ${backupPath}. Skipping restore.`,
    );
    return;
  }

  Logger.info(`Restoring original package.json for ${description}.`);
  fs.renameSync(backupPath, packageJsonPath);
}
