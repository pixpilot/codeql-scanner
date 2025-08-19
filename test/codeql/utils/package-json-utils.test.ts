import * as fs from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as PackageJsonUtils from '../../../src/codeql/utils/package-json-utils';
import { FileUtils } from '../../../src/utils/file-utils';
import { Logger } from '../../../src/utils/logger';

vi.mock('node:fs', () => ({
  renameSync: vi.fn(),
}));

vi.mock('../../../src/utils/file-utils');
vi.mock('../../../src/utils/logger');

const mockFileUtils = vi.mocked(FileUtils);
const mockLogger = vi.mocked(Logger);

describe('package-json-utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('temporarilyRenamePackageJsonIfTypeModule', () => {
    it('should return false if package.json does not exist', () => {
      mockFileUtils.exists.mockReturnValue(false);

      const result = PackageJsonUtils.temporarilyRenamePackageJsonIfTypeModule(
        '/path/package.json',
        '/path/package.json.bak',
        'test path',
      );

      expect(result).toBe(false);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Looking for package.json in test path: /path/package.json',
      );
      expect(mockLogger.info).toHaveBeenCalledWith('No package.json found in test path.');
    });

    it('should not rename when type is not module', () => {
      mockFileUtils.exists.mockReturnValue(true);
      mockFileUtils.readFile.mockReturnValue(JSON.stringify({ type: 'commonjs' }));

      const result = PackageJsonUtils.temporarilyRenamePackageJsonIfTypeModule(
        '/path/package.json',
        '/path/package.json.bak',
        'test path',
      );

      expect(result).toBe(false);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'package.json found. Reading file content.',
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Detected package.json.type = commonjs',
      );
    });

    it('should rename when type is module', () => {
      mockFileUtils.exists.mockReturnValue(true);
      mockFileUtils.readFile.mockReturnValue(JSON.stringify({ type: 'module' }));
      (fs.renameSync as any).mockImplementation(() => undefined);
      const result = PackageJsonUtils.temporarilyRenamePackageJsonIfTypeModule(
        '/path/package.json',
        '/path/package.json.bak',
        'test path',
      );

      expect(result).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith(
        '⚠️ Temporarily changing package.json type in test path to avoid ESM/CJS conflict with CodeQL extractor (typescript-parser-wrapper).',
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'package.json was renamed to package.json.bak',
      );
    });

    it('should handle invalid JSON gracefully', () => {
      mockFileUtils.exists.mockReturnValue(true);
      mockFileUtils.readFile.mockReturnValue('not-a-json');

      const result = PackageJsonUtils.temporarilyRenamePackageJsonIfTypeModule(
        '/path/package.json',
        '/path/package.json.bak',
        'test path',
      );

      expect(result).toBe(false);
      expect(mockLogger.warning).toHaveBeenCalled();
    });
  });

  describe('restorePackageJson', () => {
    it('should warn if backup does not exist', () => {
      mockFileUtils.exists.mockReturnValue(false);

      PackageJsonUtils.restorePackageJson(
        '/path/package.json.bak',
        '/path/package.json',
        'test path',
      );

      expect(mockLogger.warning).toHaveBeenCalledWith(
        'Backup package.json not found for test path: /path/package.json.bak. Skipping restore.',
      );
    });

    it('should restore when backup exists', () => {
      mockFileUtils.exists.mockReturnValue(true);
      (fs.renameSync as any).mockImplementation(() => undefined);
      PackageJsonUtils.restorePackageJson(
        '/path/package.json.bak',
        '/path/package.json',
        'test path',
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Restoring original package.json for test path.',
      );
    });
  });
});
