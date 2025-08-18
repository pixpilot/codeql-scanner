import type { CodeQLConfig, FilterOptions } from '../types';
import * as process from 'node:process';

import * as glob from '@actions/glob';
import { FileUtils } from '../utils/file-utils';
import { Logger } from '../utils/logger';
import { PatternMatcher } from '../utils/pattern-matcher';

export class FileFilter {
  static async filterFiles(config?: CodeQLConfig): Promise<string> {
    const filteredRepoPath = FileUtils.joinPath(process.cwd(), 'filtered-repo');

    // Create filtered-repo directory
    await FileUtils.ensureDirectoryExists(filteredRepoPath);

    Logger.info(
      `File filtering config: ${config ? JSON.stringify(config, undefined, '  ') : 'none'}`,
    );

    // Get all files
    const globber = await glob.create('**/*', {
      implicitDescendants: false,
      followSymbolicLinks: false,
    });

    const allFiles = await globber.glob();
    let includedCount = 0;
    let excludedCount = 0;

    const copyPromises: Promise<void>[] = [];

    for (const file of allFiles) {
      const relativePath = FileUtils.getRelativePath(process.cwd(), file);

      // Skip directories and certain system files
      if (FileUtils.isDirectory(file)) {
        // Skip directories
      } else if (this.isSystemFile(relativePath)) {
        // Skip system files
      } else {
        const shouldInclude = this.shouldIncludeFile(relativePath, { config });

        if (shouldInclude) {
          copyPromises.push(
            this.copyFileToFiltered(file, relativePath, filteredRepoPath),
          );
          includedCount++;
          Logger.debug(`Including: ${relativePath}`);
        } else {
          excludedCount++;
          Logger.debug(`Excluding: ${relativePath}`);
          // Add more specific debugging for the first few exclusions
          const MAX_SAMPLE_EXCLUSIONS = 5;
          if (excludedCount <= MAX_SAMPLE_EXCLUSIONS) {
            Logger.info(`Sample exclusion: ${relativePath}`);
          }
        }
      }
    }

    // Wait for all file copies to complete
    await Promise.all(copyPromises);

    Logger.info(
      `Total files after filtering: ${includedCount} included, ${excludedCount} excluded`,
    );
    return filteredRepoPath;
  }

  private static isSystemFile(relativePath: string): boolean {
    return (
      relativePath.startsWith('.git/') ||
      relativePath.startsWith('.github/') ||
      relativePath.startsWith('node_modules/')
    );
  }

  private static shouldIncludeFile(
    relativePath: string,
    options: FilterOptions,
  ): boolean {
    const { config } = options;

    // If config is provided, use config-based filtering logic
    if (config) {
      // Check if file should be included based on paths
      if (config.paths && config.paths.length > 0) {
        const matchesIncludePath = config.paths.some((configPath) => {
          // Handle different types of include patterns
          if (configPath.includes('*')) {
            // For glob patterns like actions/codeql-scanner /**/*.ts, use PatternMatcher directly
            return PatternMatcher.matchesPattern(relativePath, configPath);
          }
          // For directory patterns like src, check if file is in that directory or subdirectories
          return (
            relativePath.startsWith(`${configPath}/`) ||
            relativePath === configPath ||
            PatternMatcher.matchesPattern(relativePath, [`${configPath}/**`])
          );
        });
        if (!matchesIncludePath) {
          return false;
        }
      }

      // Check if file should be excluded based on paths-ignore
      if (config['paths-ignore'] && config['paths-ignore'].length > 0) {
        const matchesIgnorePath = config['paths-ignore'].some((ignorePath) => {
          // Handle different types of ignore patterns
          if (ignorePath.includes('*')) {
            // For glob patterns like **/*.test.ts, use PatternMatcher directly
            return PatternMatcher.matchesPattern(relativePath, ignorePath);
          }
          // For directory patterns like node_modules, check if file is in that directory
          return relativePath.startsWith(`${ignorePath}/`) || relativePath === ignorePath;
        });
        if (matchesIgnorePath) {
          return false;
        }
      }
    }

    return true;
  }

  private static async copyFileToFiltered(
    file: string,
    relativePath: string,
    filteredRepoPath: string,
  ): Promise<void> {
    const destPath = FileUtils.joinPath(filteredRepoPath, relativePath);
    await FileUtils.copyFile(file, destPath);
  }
}
