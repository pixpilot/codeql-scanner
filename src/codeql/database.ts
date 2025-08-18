import type { CodeQLConfig } from '../types';

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

    // Use language from config if available, otherwise use input parameter
    const effectiveLanguage = config?.languages ?? language;

    // Check if multiple languages are specified
    const languages = effectiveLanguage
      .split(',')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    const isMultiLanguage = languages.length > 1;

    Logger.info(`Languages to analyze: ${languages.join(', ')}`);
    Logger.info(`Multi-language analysis: ${isMultiLanguage}`);

    const args = ['database', 'create', dbPath];

    if (isMultiLanguage) {
      // Use db-cluster for multiple languages
      args.push('--db-cluster');
      // Add each language separately
      languages.forEach((lang) => {
        args.push(`--language=${lang}`);
      });
    } else {
      // Single language
      args.push(`--language=${languages[0]}`);
    }

    args.push(`--source-root=${filteredPath}`);

    // Change to filtered directory and create database
    await exec(codeqlPath, args);
  }

  static getDatabasePath(): string {
    return FileUtils.joinPath(process.cwd(), 'codeql-db');
  }
}
