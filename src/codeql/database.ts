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
    let needsCleanup = false;
    // --- END: ADDED CODE FOR THE FIX ---
    Logger.info(`packageJsonPath: ${packageJsonPath}`);

    try {
      // --- START: ADDED CODE FOR THE FIX ---
      // Check if package.json exists and contains "type": "module"
      if (FileUtils.exists(packageJsonPath)) {
        const packageJsonContent = FileUtils.readFile(packageJsonPath);
        try {
          const parsed = JSON.parse(packageJsonContent) as unknown;
          if (typeof parsed === 'object' && parsed !== null && 'type' in parsed) {
            const packageJson = parsed as { type?: unknown };
            if (packageJson.type === 'module') {
              Logger.info(
                'Temporarily renaming package.json to avoid ESM/CJS conflict with CodeQL extractor.',
              );
              fs.renameSync(packageJsonPath, packageJsonBackupPath);
              needsCleanup = true;
            }
          }
        } catch {
          Logger.warning('Could not parse package.json. Skipping temporary rename.');
        }
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
      // --- END: ADDED CODE FOR THE FIX ---
    }
  }

  static getDatabasePath(): string {
    return FileUtils.joinPath(process.cwd(), 'codeql-db');
  }
}
