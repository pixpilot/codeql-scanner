import type { GitHubAsset } from '../types';

/**
 * Finds the best CodeQL bundle asset for the given platform.
 * Prefers .tar.gz over .tar.zst for compatibility.
 * @param assets List of GitHub assets
 * @param platform Platform identifier
 * @returns The best matching asset or null
 */
export function findCodeQLBundleAsset(
  assets: GitHubAsset[],
  platform: string,
): GitHubAsset | null {
  const gzAsset = assets.find(
    (asset: GitHubAsset) =>
      typeof asset.name === 'string' && asset.name === `codeql-bundle-${platform}.tar.gz`,
  );
  if (gzAsset !== undefined && gzAsset !== null) {
    return gzAsset;
  }
  const zstAsset = assets.find(
    (asset: GitHubAsset) =>
      typeof asset.name === 'string' &&
      asset.name === `codeql-bundle-${platform}.tar.zst`,
  );
  if (zstAsset !== undefined && zstAsset !== null) {
    return zstAsset;
  }
  return null;
}
