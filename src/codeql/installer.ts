import type { GitHubAsset } from './types';
import * as process from 'node:process';

import { exec } from '@actions/exec';
import { FileUtils } from '../utils/file-utils';
import { Logger } from '../utils/logger';
import { getCodeQLEnvPath } from './utils/codeql-env';
import { getCodeQLPathFromSystem } from './utils/codeql-path';
import { findCodeQLBundleAsset } from './utils/find-codeql-bundle-asset';
import { findCodeQLInCommonPaths } from './utils/find-codeql-common-paths';
import { getLatestCodeQLRelease } from './utils/github-release-utils';
import { getPlatformIdentifier } from './utils/platform-utils';

interface GitHubRelease {
  assets: GitHubAsset[];
}

export class CodeQLInstaller {
  static async initializeCodeQL(_language: string): Promise<string> {
    // Check if CodeQL is available from GitHub Actions setup
    const codeqlEnv = getCodeQLEnvPath();
    if (codeqlEnv !== undefined && codeqlEnv !== null && codeqlEnv !== '') {
      return codeqlEnv;
    }

    // Try to find CodeQL in system PATH
    const codeqlPath = await getCodeQLPathFromSystem();
    if (codeqlPath !== undefined && codeqlPath !== null && codeqlPath !== '') {
      return codeqlPath;
    }

    Logger.info('CodeQL not found in PATH');

    // Try to find CodeQL in common GitHub Actions locations
    const foundCommonPath = findCodeQLInCommonPaths();
    if (
      foundCommonPath !== undefined &&
      foundCommonPath !== null &&
      foundCommonPath !== ''
    ) {
      return foundCommonPath;
    }

    // As last resort, download CodeQL
    Logger.info('CodeQL not found, attempting to download...');
    try {
      await this.downloadCodeQL();
      const isWindows = process.platform === 'win32';
      const downloadedCodeQLPath = FileUtils.joinPath(
        process.cwd(),
        'codeql',
        isWindows ? 'codeql.exe' : 'codeql',
      );

      // Verify the downloaded path exists
      if (!FileUtils.exists(downloadedCodeQLPath)) {
        throw new Error(
          `Downloaded CodeQL binary not found at expected path: ${downloadedCodeQLPath}`,
        );
      }

      return downloadedCodeQLPath;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to initialize CodeQL: ${errorMessage}`);
    }
  }

  private static async downloadCodeQL(): Promise<void> {
    Logger.info('Fetching latest CodeQL bundle information from GitHub API...');

    try {
      // Get the latest CodeQL bundle release information
      const apiResponse = await getLatestCodeQLRelease();
      const platform = getPlatformIdentifier();
      const bundleAsset = findCodeQLBundleAsset(apiResponse.assets, platform);

      if (!bundleAsset) {
        throw new Error(`No CodeQL bundle found for platform: ${platform}`);
      }

      Logger.info(
        `Downloading CodeQL bundle: ${bundleAsset.name} (${bundleAsset.size} bytes)`,
      );

      // Download the bundle
      await exec('curl', [
        '-L', // Follow redirects
        '-f', // Fail silently on HTTP errors
        '--retry',
        '3', // Retry up to 3 times
        '--retry-delay',
        '2', // Wait 2 seconds between retries
        bundleAsset.browser_download_url,
        '-o',
        bundleAsset.name,
      ]);

      // Verify the download was successful
      const stats = FileUtils.getFileStats(bundleAsset.name);
      const MIN_FILE_SIZE = 1000000; // Minimum expected file size in bytes (1MB)
      if (stats.size < MIN_FILE_SIZE) {
        throw new Error(`Download failed: file too small (${stats.size} bytes)`);
      }

      Logger.info(`Downloaded ${stats.size} bytes`);

      // Extract the tar.gz archive
      await this.extractCodeQLBundle(bundleAsset, apiResponse, platform);

      // Make the CodeQL binary executable
      const codeqlBinary =
        process.platform === 'win32' ? 'codeql/codeql.exe' : 'codeql/codeql';
      if (process.platform !== 'win32') {
        await exec('chmod', ['+x', codeqlBinary]);
      }

      // Verify extraction was successful
      if (!FileUtils.exists(codeqlBinary)) {
        throw new Error(`CodeQL binary not found after extraction: ${codeqlBinary}`);
      }

      Logger.info('CodeQL bundle downloaded and extracted successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Logger.error(`Failed to download CodeQL: ${errorMessage}`);
      throw new Error(`CodeQL download failed: ${errorMessage}`);
    }
  }

  private static async extractCodeQLBundle(
    bundleAsset: GitHubAsset,
    apiResponse: GitHubRelease,
    platform: string,
  ): Promise<void> {
    if (bundleAsset.name.endsWith('.tar.gz')) {
      await exec('tar', ['-xzf', bundleAsset.name]);
    } else if (bundleAsset.name.endsWith('.tar.zst')) {
      // For .tar.zst files, we need zstd tool which might not be available
      // Fall back to .tar.gz if zstd is not available
      Logger.info(
        'Zstandard format detected, but falling back to tar.gz for compatibility',
      );
      // Re-download the .tar.gz version
      const gzAsset = apiResponse.assets.find(
        (asset: GitHubAsset) => asset.name === `codeql-bundle-${platform}.tar.gz`,
      );
      if (gzAsset) {
        Logger.info(`Re-downloading .tar.gz version: ${gzAsset.name}`);
        await exec('curl', [
          '-L',
          '-f',
          '--retry',
          '3',
          '--retry-delay',
          '2',
          gzAsset.browser_download_url,
          '-o',
          gzAsset.name,
        ]);
        await exec('tar', ['-xzf', gzAsset.name]);
      } else {
        throw new Error('No .tar.gz alternative found for bundle');
      }
    } else {
      throw new Error(`Unsupported archive format: ${bundleAsset.name}`);
    }
  }
}
