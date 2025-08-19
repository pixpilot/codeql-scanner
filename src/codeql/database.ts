import type { CodeQLConfig } from '../types';
import * as process from 'node:process';
import { exec } from '@actions/exec';
import { FileUtils } from '../utils/file-utils';
import { Logger } from '../utils/logger';
import {
  restorePackageJson,
  temporarilyRenamePackageJsonIfTypeModule,
} from './utils/package-json-utils';

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

    const packageJsonPath = FileUtils.joinPath(filteredPath, 'package.json');
    const packageJsonBackupPath = FileUtils.joinPath(filteredPath, 'package.json.bak');
    const rootPackageJsonPath = FileUtils.joinPath(process.cwd(), 'package.json');
    const rootPackageJsonBackupPath = FileUtils.joinPath(
      process.cwd(),
      'package.json.bak',
    );
    let needsCleanup = false;
    let needsRootCleanup = false;

    try {
      // Use helpers to reduce duplication
      needsCleanup = temporarilyRenamePackageJsonIfTypeModule(
        packageJsonPath,
        packageJsonBackupPath,
        'filtered path',
      );

      needsRootCleanup = temporarilyRenamePackageJsonIfTypeModule(
        rootPackageJsonPath,
        rootPackageJsonBackupPath,
        'root path',
      );

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
      try {
        await exec(codeqlPath, args);
      } catch (e) {
        // Log the error clearly, then rethrow so the finally block can restore package.json files
        Logger.error(
          `CodeQL execution failed: ${e instanceof Error ? e.message : String(e)}`,
        );
        throw e;
      }
    } finally {
      // Ensure package.json is restored even if exec fails
      if (needsCleanup) {
        restorePackageJson(packageJsonBackupPath, packageJsonPath, 'filtered path');
      }
      if (needsRootCleanup) {
        restorePackageJson(rootPackageJsonBackupPath, rootPackageJsonPath, 'root path');
      }
    }
  }

  static getDatabasePath(): string {
    return FileUtils.joinPath(process.cwd(), 'codeql-db');
  }
}
