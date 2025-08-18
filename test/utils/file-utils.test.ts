import * as fs from 'node:fs';
import * as path from 'node:path';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FileUtils } from '../../src/utils/file-utils';

vi.mock('node:fs');

const mockFs = vi.mocked(fs);

describe('fileUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ensureDirectoryExists', () => {
    it('should create directory if it does not exist', async () => {
      const dirPath = '/test/directory';
      mockFs.existsSync.mockReturnValue(false);

      await FileUtils.ensureDirectoryExists(dirPath);

      expect(mockFs.mkdirSync).toHaveBeenCalledWith(dirPath, { recursive: true });
    });

    it('should not create directory if it already exists', async () => {
      const dirPath = '/test/directory';
      mockFs.existsSync.mockReturnValue(true);

      await FileUtils.ensureDirectoryExists(dirPath);

      expect(mockFs.mkdirSync).not.toHaveBeenCalled();
    });
  });

  describe('exists', () => {
    it('should return true if file exists', () => {
      mockFs.existsSync.mockReturnValue(true);

      const result = FileUtils.exists('/test/file.txt');

      expect(result).toBe(true);
      expect(mockFs.existsSync).toHaveBeenCalledWith('/test/file.txt');
    });

    it('should return false if file does not exist', () => {
      mockFs.existsSync.mockReturnValue(false);

      const result = FileUtils.exists('/test/file.txt');

      expect(result).toBe(false);
    });
  });

  describe('readFile', () => {
    it('should read file content as utf8', () => {
      const content = 'test file content';
      mockFs.readFileSync.mockReturnValue(content);

      const result = FileUtils.readFile('/test/file.txt');

      expect(result).toBe(content);
      expect(mockFs.readFileSync).toHaveBeenCalledWith('/test/file.txt', 'utf8');
    });
  });

  describe('writeFile', () => {
    it('should write file content as utf8', () => {
      const content = 'test content';
      const filePath = '/test/file.txt';

      FileUtils.writeFile(filePath, content);

      expect(mockFs.writeFileSync).toHaveBeenCalledWith(filePath, content, 'utf8');
    });
  });

  describe('isDirectory', () => {
    it('should return true for directories', () => {
      const mockLstat = { isDirectory: vi.fn().mockReturnValue(true) };
      mockFs.lstatSync.mockReturnValue(mockLstat as any);

      const result = FileUtils.isDirectory('/test/dir');

      expect(result).toBe(true);
      expect(mockFs.lstatSync).toHaveBeenCalledWith('/test/dir');
    });

    it('should return false for files', () => {
      const mockLstat = { isDirectory: vi.fn().mockReturnValue(false) };
      mockFs.lstatSync.mockReturnValue(mockLstat as any);

      const result = FileUtils.isDirectory('/test/file.txt');

      expect(result).toBe(false);
    });
  });

  describe('getFileStats', () => {
    it('should return file stats', () => {
      const mockStats = { size: 100, mtime: new Date() } as fs.Stats;
      mockFs.statSync.mockReturnValue(mockStats);

      const result = FileUtils.getFileStats('/test/file.txt');

      expect(result).toBe(mockStats);
      expect(mockFs.statSync).toHaveBeenCalledWith('/test/file.txt');
    });
  });

  describe('copyFile', () => {
    it('should ensure destination directory exists and copy file', async () => {
      const source = '/test/source.txt';
      const destination = '/test/dest/target.txt';
      mockFs.existsSync.mockReturnValue(false);

      await FileUtils.copyFile(source, destination);

      expect(mockFs.mkdirSync).toHaveBeenCalledWith('/test/dest', { recursive: true });
      expect(mockFs.copyFileSync).toHaveBeenCalledWith(source, destination);
    });
  });

  describe('getRelativePath', () => {
    it('should return relative path', () => {
      const from = '/test/from';
      const to = '/test/from/subdir/file.txt';

      const result = FileUtils.getRelativePath(from, to);

      expect(result).toBe(path.relative(from, to));
    });
  });

  describe('joinPath', () => {
    it('should join paths correctly', () => {
      const result = FileUtils.joinPath('test', 'subdir', 'file.txt');

      expect(result).toBe(path.join('test', 'subdir', 'file.txt'));
    });

    it('should handle empty paths', () => {
      const result = FileUtils.joinPath();

      expect(result).toBe(path.join());
    });
  });
});
