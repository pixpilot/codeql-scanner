import process from 'node:process';
import { FileUtils } from '../../utils/file-utils';
import { Logger } from '../../utils/logger';

/**
 * Expands a single `*` segment by listing the directory that stands in its place and
 * substituting each entry back into the pattern. `fs.existsSync` does not expand globs,
 * so a pattern must be resolved to real paths before it is probed. Matches are ordered
 * newest-first so the most recent CodeQL version in the tool cache wins.
 *
 * Substituting into the pattern keeps its own separators; `path.join` would rewrite them
 * to the host's, which is wrong for any pattern not built for the host platform.
 */
function expandVersionGlob(pattern: string): string[] {
  const starIndex = pattern.indexOf('*');
  if (starIndex === -1) return [pattern];

  const prefix = pattern.slice(0, starIndex);
  const suffix = pattern.slice(starIndex + 1);
  const baseDir = prefix.replace(/[\\/]$/u, '');

  let entries: string[];
  try {
    entries = FileUtils.listDirectory(baseDir);
  } catch {
    // The tool cache directory does not exist on this runner.
    return [];
  }

  return [...entries]
    .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))
    .map((entry) => `${prefix}${entry}${suffix}`);
}

/**
 * True only for a path that exists and is a file. `fs.existsSync` also returns true for
 * directories, and the CodeQL tool cache has a `codeql` directory sitting next to the
 * `codeql` binary, so an existence check alone can return something exec cannot run.
 */
function isExecutableFile(candidate: string): boolean {
  if (!FileUtils.exists(candidate)) return false;

  try {
    return !FileUtils.isDirectory(candidate);
  } catch {
    return false;
  }
}

/**
 * Searches for CodeQL in common locations used by GitHub Actions and local setups.
 * @returns The path to CodeQL if found, otherwise null.
 */
export function findCodeQLInCommonPaths(): string | null {
  const isWindows = process.platform === 'win32';

  const commonPaths = isWindows
    ? [
        'C:\\hostedtoolcache\\windows\\CodeQL\\*\\x64\\codeql\\codeql.exe',
        'D:\\a\\_temp\\codeql-runner\\codeql.exe',
        '.\\codeql\\codeql.exe',
      ]
    : [
        // The tool cache holds the extracted bundle, so the CLI sits inside a `codeql`
        // directory: <version>/x64/codeql/codeql. Pointing at the directory itself hands
        // exec something it cannot run.
        '/opt/hostedtoolcache/CodeQL/*/x64/codeql/codeql',
        '/home/runner/codeql/codeql',
        './codeql/codeql',
      ];

  for (const pattern of commonPaths) {
    for (const candidate of expandVersionGlob(pattern)) {
      try {
        if (isExecutableFile(candidate)) {
          Logger.info(`Found CodeQL at: ${candidate}`);
          return candidate;
        }
      } catch {
        // Continue searching
      }
    }
  }
  return null;
}
