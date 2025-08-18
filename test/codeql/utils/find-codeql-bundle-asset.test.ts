import type { GitHubAsset } from '../../../src/codeql/types';

import { describe, expect, it } from 'vitest';

import { findCodeQLBundleAsset } from '../../../src/codeql/utils/find-codeql-bundle-asset';

describe('findCodeQLBundleAsset', () => {
  it('should return gz asset when available', () => {
    const assets: GitHubAsset[] = [
      {
        name: 'codeql-bundle-linux64.tar.gz',
        size: 1000,
        browser_download_url: 'http://example.com/gz',
      },
      {
        name: 'codeql-bundle-linux64.tar.zst',
        size: 800,
        browser_download_url: 'http://example.com/zst',
      },
      {
        name: 'other-file.txt',
        size: 100,
        browser_download_url: 'http://example.com/other',
      },
    ];

    const result = findCodeQLBundleAsset(assets, 'linux64');

    expect(result).toEqual({
      name: 'codeql-bundle-linux64.tar.gz',
      size: 1000,
      browser_download_url: 'http://example.com/gz',
    });
  });

  it('should return zst asset when gz is not available', () => {
    const assets: GitHubAsset[] = [
      {
        name: 'codeql-bundle-linux64.tar.zst',
        size: 800,
        browser_download_url: 'http://example.com/zst',
      },
      {
        name: 'other-file.txt',
        size: 100,
        browser_download_url: 'http://example.com/other',
      },
    ];

    const result = findCodeQLBundleAsset(assets, 'linux64');

    expect(result).toEqual({
      name: 'codeql-bundle-linux64.tar.zst',
      size: 800,
      browser_download_url: 'http://example.com/zst',
    });
  });

  it('should return null when no matching asset is found', () => {
    const assets: GitHubAsset[] = [
      {
        name: 'codeql-bundle-win64.tar.gz',
        size: 1000,
        browser_download_url: 'http://example.com/win',
      },
      {
        name: 'other-file.txt',
        size: 100,
        browser_download_url: 'http://example.com/other',
      },
    ];

    const result = findCodeQLBundleAsset(assets, 'linux64');

    expect(result).toBeNull();
  });

  it('should return null for empty assets array', () => {
    const result = findCodeQLBundleAsset([], 'linux64');

    expect(result).toBeNull();
  });

  it('should handle different platforms', () => {
    const assets: GitHubAsset[] = [
      {
        name: 'codeql-bundle-win64.tar.gz',
        size: 1000,
        browser_download_url: 'http://example.com/win',
      },
      {
        name: 'codeql-bundle-osx64.tar.gz',
        size: 1100,
        browser_download_url: 'http://example.com/osx',
      },
      {
        name: 'codeql-bundle-linux64.tar.gz',
        size: 1200,
        browser_download_url: 'http://example.com/linux',
      },
    ];

    expect(findCodeQLBundleAsset(assets, 'win64')).toEqual({
      name: 'codeql-bundle-win64.tar.gz',
      size: 1000,
      browser_download_url: 'http://example.com/win',
    });

    expect(findCodeQLBundleAsset(assets, 'osx64')).toEqual({
      name: 'codeql-bundle-osx64.tar.gz',
      size: 1100,
      browser_download_url: 'http://example.com/osx',
    });

    expect(findCodeQLBundleAsset(assets, 'linux64')).toEqual({
      name: 'codeql-bundle-linux64.tar.gz',
      size: 1200,
      browser_download_url: 'http://example.com/linux',
    });
  });

  it('should prefer gz over zst when both are available', () => {
    const assets: GitHubAsset[] = [
      {
        name: 'codeql-bundle-linux64.tar.zst',
        size: 800,
        browser_download_url: 'http://example.com/zst',
      },
      {
        name: 'codeql-bundle-linux64.tar.gz',
        size: 1000,
        browser_download_url: 'http://example.com/gz',
      },
    ];

    const result = findCodeQLBundleAsset(assets, 'linux64');

    expect(result).toEqual({
      name: 'codeql-bundle-linux64.tar.gz',
      size: 1000,
      browser_download_url: 'http://example.com/gz',
    });
  });

  it('should handle assets with non-string names gracefully', () => {
    const assets = [
      { name: null, size: 100, browser_download_url: 'http://example.com/null' },
      {
        name: undefined,
        size: 200,
        browser_download_url: 'http://example.com/undefined',
      },
      {
        name: 'codeql-bundle-linux64.tar.gz',
        size: 1000,
        browser_download_url: 'http://example.com/valid',
      },
    ] as any;

    const result = findCodeQLBundleAsset(assets, 'linux64');

    expect(result).toEqual({
      name: 'codeql-bundle-linux64.tar.gz',
      size: 1000,
      browser_download_url: 'http://example.com/valid',
    });
  });

  it('should match exact platform names only', () => {
    const assets: GitHubAsset[] = [
      {
        name: 'codeql-bundle-linux64-extra.tar.gz',
        size: 1000,
        browser_download_url: 'http://example.com/extra',
      },
      {
        name: 'prefix-codeql-bundle-linux64.tar.gz',
        size: 1100,
        browser_download_url: 'http://example.com/prefix',
      },
      {
        name: 'codeql-bundle-linux6.tar.gz',
        size: 1200,
        browser_download_url: 'http://example.com/partial',
      },
    ];

    const result = findCodeQLBundleAsset(assets, 'linux64');

    expect(result).toBeNull();
  });
});
