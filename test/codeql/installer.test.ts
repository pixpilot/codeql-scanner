import { findCodeQLBundleAsset } from '../../src/codeql/utils/find-codeql-bundle-asset';
import { getPlatformIdentifier } from '../../src/codeql/utils/platform-utils';

describe('codeQLInstaller', () => {
  describe('getPlatformIdentifier', () => {
    it('should return correct platform identifiers', () => {
      expect(() => {
        const platform = getPlatformIdentifier();
        expect(typeof platform).toBe('string');
        expect(['linux64', 'osx64', 'win64']).toContain(platform);
      }).not.toThrow();
    });
  });

  describe('findCodeQLBundleAsset', () => {
    it('should prefer .tar.gz over .tar.zst', () => {
      const mockAssets = [
        {
          name: 'codeql-bundle-linux64.tar.zst',
          size: 1000,
          browser_download_url: 'test-zst-url',
        },
        {
          name: 'codeql-bundle-linux64.tar.gz',
          size: 2000,
          browser_download_url: 'test-gz-url',
        },
      ];

      const result = findCodeQLBundleAsset(mockAssets, 'linux64');
      expect(result).toBeDefined();
      expect(result!.name).toBe('codeql-bundle-linux64.tar.gz');
    });

    it('should return .tar.zst if .tar.gz is not available', () => {
      const mockAssets = [
        {
          name: 'codeql-bundle-linux64.tar.zst',
          size: 1000,
          browser_download_url: 'test-zst-url',
        },
      ];

      const result = findCodeQLBundleAsset(mockAssets, 'linux64');
      expect(result).toBeDefined();
      expect(result!.name).toBe('codeql-bundle-linux64.tar.zst');
    });

    it('should return null if no matching bundle is found', () => {
      const mockAssets = [
        {
          name: 'some-other-file.tar.gz',
          size: 1000,
          browser_download_url: 'test-url',
        },
      ];

      const result = findCodeQLBundleAsset(mockAssets, 'linux64');
      expect(result).toBeNull();
    });
  });
});
