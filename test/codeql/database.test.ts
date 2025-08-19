import { exec } from '@actions/exec';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CodeQLDatabase } from '../../src/codeql/database';
import * as PackageJsonUtils from '../../src/codeql/utils/package-json-utils';
import { FileUtils } from '../../src/utils/file-utils';
import { Logger } from '../../src/utils/logger';

vi.mock('@actions/exec');
vi.mock('../../src/utils/file-utils');
vi.mock('../../src/utils/logger');
vi.mock('node:process', () => ({
  cwd: vi.fn(() => '/test/workspace'),
}));
// Mock the new helper utilities to avoid touching fs in database tests
vi.mock('../../src/codeql/utils/package-json-utils');

const mockExec = vi.mocked(exec);
const mockFileUtils = vi.mocked(FileUtils);
const mockLogger = vi.mocked(Logger);
const mockPackageUtils = vi.mocked(PackageJsonUtils);

describe('codeQLDatabase', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockFileUtils.joinPath.mockImplementation((...paths) => paths.join('/'));

    // Default the package-json helper mocks to no-op (no renames)
    mockPackageUtils.temporarilyRenamePackageJsonIfTypeModule?.mockReturnValue(false);
    mockPackageUtils.restorePackageJson?.mockImplementation(() => undefined);
  });

  describe('createDatabase', () => {
    it('should create database with correct parameters', async () => {
      const codeqlPath = '/path/to/codeql';
      const filteredPath = '/path/to/filtered';
      const language = 'javascript';

      await CodeQLDatabase.createDatabase(codeqlPath, filteredPath, language);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Creating CodeQL database from filtered files...',
      );
      expect(mockExec).toHaveBeenCalledWith(codeqlPath, [
        'database',
        'create',
        '/test/workspace/codeql-db',
        '--language=javascript',
        '--source-root=/path/to/filtered',
      ]);
    });

    it('should use language from config if provided', async () => {
      const codeqlPath = '/path/to/codeql';
      const filteredPath = '/path/to/filtered';
      const language = 'javascript';
      const config = { languages: 'python' };

      await CodeQLDatabase.createDatabase(codeqlPath, filteredPath, language, config);

      expect(mockExec).toHaveBeenCalledWith(codeqlPath, [
        'database',
        'create',
        '/test/workspace/codeql-db',
        '--language=python',
        '--source-root=/path/to/filtered',
      ]);
    });

    it('should use input language when config has no language', async () => {
      const codeqlPath = '/path/to/codeql';
      const filteredPath = '/path/to/filtered';
      const language = 'java';
      const config = { paths: ['src/**'] }; // No language in config

      await CodeQLDatabase.createDatabase(codeqlPath, filteredPath, language, config);

      expect(mockExec).toHaveBeenCalledWith(codeqlPath, [
        'database',
        'create',
        '/test/workspace/codeql-db',
        '--language=java',
        '--source-root=/path/to/filtered',
      ]);
    });

    it('should handle different languages', async () => {
      const testCases = ['javascript', 'python', 'java', 'csharp', 'cpp', 'go'];

      for (const lang of testCases) {
        mockExec.mockClear();

        await CodeQLDatabase.createDatabase('/codeql', '/filtered', lang);

        expect(mockExec).toHaveBeenCalledWith('/codeql', [
          'database',
          'create',
          '/test/workspace/codeql-db',
          `--language=${lang}`,
          '--source-root=/filtered',
        ]);
      }
    });

    it('should propagate exec errors', async () => {
      const error = new Error('Database creation failed');
      mockExec.mockRejectedValue(error);

      await expect(
        CodeQLDatabase.createDatabase('/codeql', '/filtered', 'javascript'),
      ).rejects.toThrow('Database creation failed');
    });

    it('should use FileUtils.joinPath for database path', async () => {
      mockExec.mockResolvedValue(0); // Reset to successful execution

      await CodeQLDatabase.createDatabase('/codeql', '/filtered', 'javascript');

      expect(mockFileUtils.joinPath).toHaveBeenCalledWith('/test/workspace', 'codeql-db');
    });
  });

  describe('getDatabasePath', () => {
    it('should return correct database path', () => {
      const result = CodeQLDatabase.getDatabasePath();

      expect(result).toBe('/test/workspace/codeql-db');
      expect(mockFileUtils.joinPath).toHaveBeenCalledWith('/test/workspace', 'codeql-db');
    });

    it('should use current working directory', () => {
      const result = CodeQLDatabase.getDatabasePath();

      expect(result).toBe('/test/workspace/codeql-db');
    });
  });
});
