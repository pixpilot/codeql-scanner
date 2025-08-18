import * as glob from '@actions/glob';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FileFilter } from '../../src/file-filtering/filter';
import { FileUtils } from '../../src/utils/file-utils';
import { Logger } from '../../src/utils/logger';

vi.mock('@actions/glob');
vi.mock('../../src/utils/file-utils');
vi.mock('../../src/utils/logger');
vi.mock('node:process', () => ({
  cwd: vi.fn(() => '/test/workspace'),
}));

const mockGlob = vi.mocked(glob);
const mockFileUtils = vi.mocked(FileUtils);
const mockLogger = vi.mocked(Logger);

describe('fileFilter', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mocks
    const mockGlobber = {
      glob: vi.fn().mockResolvedValue(['/test/file1.js', '/test/file2.ts', '/test/dir']),
    };
    mockGlob.create.mockResolvedValue(mockGlobber as any);

    mockFileUtils.joinPath.mockImplementation((...paths) => paths.join('/'));
    mockFileUtils.getRelativePath.mockImplementation((from, to) =>
      to.replace(`${from}/`, ''),
    );
    mockFileUtils.isDirectory.mockImplementation((path) => path.endsWith('/dir'));
    mockFileUtils.ensureDirectoryExists.mockResolvedValue();
    mockFileUtils.copyFile.mockResolvedValue();
  });

  describe('filterFiles', () => {
    it('should create filtered-repo directory', async () => {
      await FileFilter.filterFiles();

      expect(mockFileUtils.ensureDirectoryExists).toHaveBeenCalledWith(
        '/test/workspace/filtered-repo',
      );
    });

    it('should create globber with correct pattern', async () => {
      await FileFilter.filterFiles();

      expect(mockGlob.create).toHaveBeenCalledWith('**/*', {
        implicitDescendants: false,
        followSymbolicLinks: false,
      });
    });

    it('should return filtered repo path', async () => {
      const result = await FileFilter.filterFiles();

      expect(result).toBe('/test/workspace/filtered-repo');
    });

    it('should handle config-based filtering', async () => {
      const config = {
        paths: ['src'],
        'paths-ignore': ['test/**'],
      };

      const result = await FileFilter.filterFiles(config);

      expect(typeof result).toBe('string');
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Total files after filtering'),
      );
    });

    it('should handle config with paths filter', async () => {
      const config = {
        paths: ['src'],
      };

      const result = await FileFilter.filterFiles(config);

      expect(typeof result).toBe('string');
    });

    it('should handle config with paths-ignore filter', async () => {
      const config = {
        'paths-ignore': ['**/*.test.js', 'src/node_modules'],
      };

      const result = await FileFilter.filterFiles(config);

      expect(typeof result).toBe('string');
    });

    it('should filter files based on exact config patterns', async () => {
      // Mock files that match our test scenario
      const mockGlobber = {
        glob: vi
          .fn()
          .mockResolvedValue([
            '/test/workspace/src/index.js',
            '/test/workspace/src/utils.js',
            '/test/workspace/src/node_modules/package.json',
            '/test/workspace/src/test.test.js',
            '/test/workspace/docs/readme.md',
            '/test/workspace/tests/unit.test.js',
          ]),
      };
      mockGlob.create.mockResolvedValue(mockGlobber as any);

      // Mock the shouldIncludeFile behavior
      mockFileUtils.getRelativePath.mockImplementation((from, to) =>
        to.replace('/test/workspace/', ''),
      );

      const config = {
        paths: ['src'],
        'paths-ignore': ['src/node_modules', '**/*.test.js'],
      };

      await FileFilter.filterFiles(config);

      // Should be called for each non-directory file
      expect(mockFileUtils.copyFile).toHaveBeenCalledTimes(2); // src/index.js and src/utils.js
    });

    it('should properly filter test files with glob patterns', async () => {
      // Test the specific patterns mentioned by the user
      const mockGlobber = {
        glob: vi
          .fn()
          .mockResolvedValue([
            '/test/workspace/src/main.js',
            '/test/workspace/src/helper.test.ts',
            '/test/workspace/src/utils/formatter.js',
            '/test/workspace/src/utils/validator.test.ts',
            '/test/workspace/actions/codeql-scanner /test/utils/pattern-matcher.test.ts',
            '/test/workspace/actions/codeql-scanner /test/utils/logger.test.ts',
            '/test/workspace/src/node_modules/lib/index.js',
            '/test/workspace/docs/readme.md',
          ]),
      };
      mockGlob.create.mockResolvedValue(mockGlobber as any);

      mockFileUtils.getRelativePath.mockImplementation((from, to) =>
        to.replace('/test/workspace/', ''),
      );

      const config = {
        paths: ['src'],
        'paths-ignore': ['**/*.test.ts', '**/test/**/*', '**/node_modules/**/*'],
      };

      await FileFilter.filterFiles(config);

      // Should copy src/main.js and src/utils/formatter.js (2 files)
      // Should exclude:
      // - docs/readme.md (not in src)
      // - src/helper.test.ts and src/utils/validator.test.ts (matches **/*.test.ts)
      // - src/node_modules/lib/index.js (matches **/node_modules/**/*)
      // - actions/codeql-scanner /test/utils/*.test.ts (matches **/test/**/* and **/*.test.ts)
      expect(mockFileUtils.copyFile).toHaveBeenCalledTimes(2);
    });

    it('should log filtering results', async () => {
      await FileFilter.filterFiles();

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Total files after filtering'),
      );
    });

    it('should handle empty file list', async () => {
      const mockGlobber = {
        glob: vi.fn().mockResolvedValue([]),
      };
      mockGlob.create.mockResolvedValue(mockGlobber as any);

      const result = await FileFilter.filterFiles();

      expect(typeof result).toBe('string');
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('0 included, 0 excluded'),
      );
    });

    it('should filter files with glob patterns in paths', async () => {
      // Test the specific glob pattern from the user's config
      const mockGlobber = {
        glob: vi
          .fn()
          .mockResolvedValue([
            '/test/workspace/actions/codeql-scanner /src/action.ts',
            '/test/workspace/actions/codeql-scanner /src/types.ts',
            '/test/workspace/actions/codeql-scanner /test/action.test.ts',
            '/test/workspace/src/main.js',
            '/test/workspace/docs/readme.md',
          ]),
      };
      mockGlob.create.mockResolvedValue(mockGlobber as any);

      mockFileUtils.getRelativePath.mockImplementation((from, to) =>
        to.replace('/test/workspace/', ''),
      );

      const config = {
        paths: ['actions/codeql-scanner /**/*.ts'],
      };

      await FileFilter.filterFiles(config);

      // Should include action.ts, types.ts, and action.test.ts (3 files)
      // Should exclude src/main.js and docs/readme.md (not matching pattern)
      expect(mockFileUtils.copyFile).toHaveBeenCalledTimes(3);
    });

    it('should filter files with multiple glob patterns in paths', async () => {
      const mockGlobber = {
        glob: vi
          .fn()
          .mockResolvedValue([
            '/test/workspace/actions/codeql-scanner /src/action.ts',
            '/test/workspace/tooling/eslint/base.js',
            '/test/workspace/src/main.js',
            '/test/workspace/docs/readme.md',
          ]),
      };
      mockGlob.create.mockResolvedValue(mockGlobber as any);

      mockFileUtils.getRelativePath.mockImplementation((from, to) =>
        to.replace('/test/workspace/', ''),
      );

      const config = {
        paths: ['actions/**/*.ts', 'tooling/**/*.js'],
      };

      await FileFilter.filterFiles(config);

      // Should include action.ts and base.js (2 files)
      // Should exclude src/main.js and docs/readme.md (not matching patterns)
      expect(mockFileUtils.copyFile).toHaveBeenCalledTimes(2);
    });

    it('should handle mixed directory and glob patterns in paths', async () => {
      const mockGlobber = {
        glob: vi
          .fn()
          .mockResolvedValue([
            '/test/workspace/src/main.js',
            '/test/workspace/src/utils/helper.js',
            '/test/workspace/actions/codeql-scanner /src/action.ts',
            '/test/workspace/docs/readme.md',
          ]),
      };
      mockGlob.create.mockResolvedValue(mockGlobber as any);

      mockFileUtils.getRelativePath.mockImplementation((from, to) =>
        to.replace('/test/workspace/', ''),
      );

      const config = {
        paths: ['src', 'actions/**/*.ts'], // Mix of directory and glob pattern
      };

      await FileFilter.filterFiles(config);

      // Should include src/main.js, src/utils/helper.js, and action.ts (3 files)
      // Should exclude docs/readme.md (not matching patterns)
      expect(mockFileUtils.copyFile).toHaveBeenCalledTimes(3);
    });

    it('should skip system files (.git, .github, node_modules)', async () => {
      const mockGlobber = {
        glob: vi
          .fn()
          .mockResolvedValue([
            '/test/workspace/src/main.js',
            '/test/workspace/.git/config',
            '/test/workspace/.github/workflows/ci.yml',
            '/test/workspace/node_modules/package/index.js',
          ]),
      };
      mockGlob.create.mockResolvedValue(mockGlobber as any);

      mockFileUtils.getRelativePath.mockImplementation((from, to) =>
        to.replace('/test/workspace/', ''),
      );

      await FileFilter.filterFiles();

      // Should only copy src/main.js (1 file)
      // Should skip .git/config, .github/workflows/ci.yml, node_modules/package/index.js
      expect(mockFileUtils.copyFile).toHaveBeenCalledTimes(1);
    });

    it('should skip directories', async () => {
      const mockGlobber = {
        glob: vi
          .fn()
          .mockResolvedValue([
            '/test/workspace/src/main.js',
            '/test/workspace/src',
            '/test/workspace/docs',
          ]),
      };
      mockGlob.create.mockResolvedValue(mockGlobber as any);

      mockFileUtils.getRelativePath.mockImplementation((from, to) =>
        to.replace('/test/workspace/', ''),
      );
      mockFileUtils.isDirectory.mockImplementation(
        (path) => path.endsWith('/src') || path.endsWith('/docs'),
      );

      await FileFilter.filterFiles();

      // Should only copy src/main.js (1 file)
      // Should skip src and docs directories
      expect(mockFileUtils.copyFile).toHaveBeenCalledTimes(1);
    });

    it('should handle complex ignore patterns', async () => {
      const mockGlobber = {
        glob: vi
          .fn()
          .mockResolvedValue([
            '/test/workspace/src/main.js',
            '/test/workspace/src/component.test.js',
            '/test/workspace/src/utils/helper.spec.js',
            '/test/workspace/test/unit/validator.test.js',
            '/test/workspace/spec/integration/api.spec.js',
          ]),
      };
      mockGlob.create.mockResolvedValue(mockGlobber as any);

      mockFileUtils.getRelativePath.mockImplementation((from, to) =>
        to.replace('/test/workspace/', ''),
      );

      const config = {
        'paths-ignore': ['**/*.test.js', '**/*.spec.js', '**/test/**/*', '**/spec/**/*'],
      };

      await FileFilter.filterFiles(config);

      // Should only copy src/main.js (1 file)
      // Should exclude all test/spec files and directories
      expect(mockFileUtils.copyFile).toHaveBeenCalledTimes(1);
    });

    it('should handle exact file matches in ignore patterns', async () => {
      const mockGlobber = {
        glob: vi
          .fn()
          .mockResolvedValue([
            '/test/workspace/src/main.js',
            '/test/workspace/package.json',
            '/test/workspace/README.md',
          ]),
      };
      mockGlob.create.mockResolvedValue(mockGlobber as any);

      mockFileUtils.getRelativePath.mockImplementation((from, to) =>
        to.replace('/test/workspace/', ''),
      );

      const config = {
        'paths-ignore': ['package.json', 'README.md'],
      };

      await FileFilter.filterFiles(config);

      // Should only copy src/main.js (1 file)
      // Should exclude package.json and README.md
      expect(mockFileUtils.copyFile).toHaveBeenCalledTimes(1);
    });

    it('should log debug information for inclusions and exclusions', async () => {
      const mockGlobber = {
        glob: vi
          .fn()
          .mockResolvedValue([
            '/test/workspace/src/main.js',
            '/test/workspace/src/test.test.js',
          ]),
      };
      mockGlob.create.mockResolvedValue(mockGlobber as any);

      mockFileUtils.getRelativePath.mockImplementation((from, to) =>
        to.replace('/test/workspace/', ''),
      );

      const config = {
        paths: ['src'],
        'paths-ignore': ['**/*.test.js'],
      };

      await FileFilter.filterFiles(config);

      // Should log debug messages for both included and excluded files
      expect(mockLogger.debug).toHaveBeenCalledWith('Including: src/main.js');
      expect(mockLogger.debug).toHaveBeenCalledWith('Excluding: src/test.test.js');
      expect(mockLogger.info).toHaveBeenCalledWith('Sample exclusion: src/test.test.js');
    });

    it('should handle empty paths and paths-ignore configs', async () => {
      const mockGlobber = {
        glob: vi
          .fn()
          .mockResolvedValue([
            '/test/workspace/src/main.js',
            '/test/workspace/docs/readme.md',
          ]),
      };
      mockGlob.create.mockResolvedValue(mockGlobber as any);

      mockFileUtils.getRelativePath.mockImplementation((from, to) =>
        to.replace('/test/workspace/', ''),
      );

      const config = {
        paths: [],
        'paths-ignore': [],
      };

      await FileFilter.filterFiles(config);

      // Should include all files when no patterns are specified
      expect(mockFileUtils.copyFile).toHaveBeenCalledTimes(2);
    });

    it('should handle config with only paths specified', async () => {
      const mockGlobber = {
        glob: vi
          .fn()
          .mockResolvedValue([
            '/test/workspace/src/main.js',
            '/test/workspace/docs/readme.md',
          ]),
      };
      mockGlob.create.mockResolvedValue(mockGlobber as any);

      mockFileUtils.getRelativePath.mockImplementation((from, to) =>
        to.replace('/test/workspace/', ''),
      );

      const config = {
        paths: ['src'],
      };

      await FileFilter.filterFiles(config);

      // Should only include files from src directory
      expect(mockFileUtils.copyFile).toHaveBeenCalledTimes(1);
    });

    it('should handle config with only paths-ignore specified', async () => {
      const mockGlobber = {
        glob: vi
          .fn()
          .mockResolvedValue([
            '/test/workspace/src/main.js',
            '/test/workspace/src/test.test.js',
          ]),
      };
      mockGlob.create.mockResolvedValue(mockGlobber as any);

      mockFileUtils.getRelativePath.mockImplementation((from, to) =>
        to.replace('/test/workspace/', ''),
      );

      const config = {
        'paths-ignore': ['**/*.test.js'],
      };

      await FileFilter.filterFiles(config);

      // Should include src/main.js but exclude src/test.test.js
      expect(mockFileUtils.copyFile).toHaveBeenCalledTimes(1);
    });
  });
});
