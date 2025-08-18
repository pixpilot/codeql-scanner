import { exec } from '@actions/exec';

export interface GitHubAsset {
  name: string;
  size: number;
  browser_download_url: string;
}

export interface GitHubRelease {
  assets: GitHubAsset[];
}

/**
 * Fetches the latest CodeQL release information from GitHub API.
 * @returns {Promise<GitHubRelease>} The latest release info.
 */
export async function getLatestCodeQLRelease(): Promise<GitHubRelease> {
  const tempFile = 'codeql-release-info.json';

  try {
    await exec('curl', [
      '-L',
      '-f',
      '--retry',
      '3',
      'https://api.github.com/repos/github/codeql-action/releases/latest',
      '-o',
      tempFile,
    ]);

    const fs = await import('node:fs/promises');
    const releaseData = await fs.readFile(tempFile, 'utf8');
    const release = JSON.parse(releaseData) as GitHubRelease;

    await fs.unlink(tempFile).catch(() => {
      // Ignore cleanup errors
    });

    return release;
  } catch (error) {
    throw new Error(`Failed to fetch latest CodeQL release: ${String(error)}`);
  }
}
