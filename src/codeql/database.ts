import type { CodeQLConfig } from '../types';
import * as fs from 'node:fs';
import * as process from 'node:process';
import { exec } from '@actions/exec';
import { FileUtils } from '../utils/file-utils';
import { Logger } from '../utils/logger';

export class CodeQLDatabase {
  static async createDatabase(
    codeqlPath: string,
    filteredPath: string,
    language: string,
    config?: CodeQLConfig,
  ): Promise<void> {
    Logger.info('Creating CodeQL database from filtered files...');

    const dbPath = FileUtils.joinPath(process.cwd(), 'codeql-db');
    const effectiveLanguage = config?.languages ?? language;
    const languages = effectiveLanguage
      .split(',')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    const isMultiLanguage = languages.length > 1;

    Logger.info(`Languages to analyze: ${languages.join(', ')}`);
    Logger.info(`Multi-language analysis: ${isMultiLanguage}`);

    // --- START: ADDED CODE FOR THE FIX ---
    const packageJsonPath = FileUtils.joinPath(filteredPath, 'package.json');
    const packageJsonBackupPath = FileUtils.joinPath(filteredPath, 'package.json.bak');
    const rootPackageJsonPath = FileUtils.joinPath(process.cwd(), 'package.json');
    const rootPackageJsonBackupPath = FileUtils.joinPath(
      process.cwd(),
      'package.json.bak',
    );
    let needsCleanup = false;
    let needsRootCleanup = false;
    // --- END: ADDED CODE FOR THE FIX ---

    try {
      // --- START: ADDED CODE FOR THE FIX ---
      // Check if package.json exists and contains "type": "module"
      Logger.info(`Looking for package.json in filtered path: ${packageJsonPath}`);

      if (FileUtils.exists(packageJsonPath)) {
        Logger.info('package.json found. Reading file content.');
        const packageJsonContent = FileUtils.readFile(packageJsonPath);
        try {
          const parsed = JSON.parse(packageJsonContent) as unknown;
          if (typeof parsed === 'object' && parsed !== null && 'type' in parsed) {
            const packageJson = parsed as { type?: unknown };
            Logger.info(`Detected package.json.type = ${String(packageJson.type)}`);
            if (packageJson.type === 'module') {
              Logger.info(
                'Temporarily renaming package.json to avoid ESM/CJS conflict with CodeQL extractor.',
              );
              fs.renameSync(packageJsonPath, packageJsonBackupPath);
              needsCleanup = true;
              Logger.info('package.json was renamed to package.json.bak');
            } else {
              Logger.info('package.json.type is not "module". No rename necessary.');
            }
          } else {
            Logger.info(
              'package.json does not contain a "type" field. No rename necessary.',
            );
          }
        } catch (e) {
          Logger.warning(
            `Could not parse package.json. Skipping temporary rename. Error: ${e instanceof Error ? e.message : String(e)}`,
          );
        }
      } else {
        Logger.info('No package.json found in filtered path.');
      }

      // Also check for package.json in the root directory (where CodeQL might also look)
      Logger.info(`Looking for package.json in root path: ${rootPackageJsonPath}`);
      if (FileUtils.exists(rootPackageJsonPath)) {
        Logger.info('Root package.json found. Reading file content.');
        const rootPackageJsonContent = FileUtils.readFile(rootPackageJsonPath);
        try {
          const parsed = JSON.parse(rootPackageJsonContent) as unknown;
          if (typeof parsed === 'object' && parsed !== null && 'type' in parsed) {
            const packageJson = parsed as { type?: unknown };
            Logger.info(`Detected root package.json.type = ${String(packageJson.type)}`);
            if (packageJson.type === 'module') {
              Logger.info(
                'Temporarily renaming root package.json to avoid ESM/CJS conflict with CodeQL extractor.',
              );
              fs.renameSync(rootPackageJsonPath, rootPackageJsonBackupPath);
              needsRootCleanup = true;
              Logger.info('Root package.json was renamed to package.json.bak');
            } else {
              Logger.info('Root package.json.type is not "module". No rename necessary.');
            }
          } else {
            Logger.info(
              'Root package.json does not contain a "type" field. No rename necessary.',
            );
          }
        } catch (e) {
          Logger.warning(
            `Could not parse root package.json. Skipping temporary rename. Error: ${e instanceof Error ? e.message : String(e)}`,
          );
        }
      } else {
        Logger.info('No package.json found in root path.');
      }
      // --- END: ADDED CODE FOR THE FIX ---

      const args = ['database', 'create', dbPath];

      if (isMultiLanguage) {
        args.push('--db-cluster');
        languages.forEach((lang) => {
          args.push(`--language=${lang}`);
        });
      } else {
        args.push(`--language=${languages[0]}`);
      }

      args.push(`--source-root=${filteredPath}`);
      await exec(codeqlPath, args);
    } finally {
      // --- START: ADDED CODE FOR THE FIX ---
      // Ensure package.json is restored even if exec fails
      if (needsCleanup) {
        Logger.info('Restoring original package.json.');
        fs.renameSync(packageJsonBackupPath, packageJsonPath);
      }
      if (needsRootCleanup) {
        Logger.info('Restoring original root package.json.');
        fs.renameSync(rootPackageJsonBackupPath, rootPackageJsonPath);
      }
      // --- END: ADDED CODE FOR THE FIX ---
    }
  }

  static getDatabasePath(): string {
    return FileUtils.joinPath(process.cwd(), 'codeql-db');
  }
}
