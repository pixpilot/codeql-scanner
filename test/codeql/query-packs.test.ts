import type { CodeQLConfig } from '../../src/types';

import { exec } from '@actions/exec';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { QueryPackManager } from '../../src/codeql/query-packs';
import { Logger } from '../../src/utils/logger';

vi.mock('@actions/exec');
vi.mock('../../src/utils/logger');

const mockExec = vi.mocked(exec);
const mockLogger = vi.mocked(Logger);

describe('queryPackManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('downloadQueryPacks', () => {
    it('should skip download if packs are already available', async () => {
      mockExec.mockResolvedValueOnce(0); // resolve packs succeeds

      await QueryPackManager.downloadQueryPacks('/path/to/codeql');

      expect(mockExec).toHaveBeenCalledWith('/path/to/codeql', ['resolve', 'packs'], {
        silent: true,
      });
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Query packs are already available from CodeQL bundle',
      );

      // Should not attempt to download packs
      expect(mockExec).toHaveBeenCalledTimes(1);
    });

    it('should download query packs if not available in bundle', async () => {
      mockExec.mockRejectedValueOnce(new Error('Not found')); // resolve packs fails
      mockExec.mockResolvedValue(0); // download commands succeed

      await QueryPackManager.downloadQueryPacks('/path/to/codeql');

      expect(mockExec).toHaveBeenCalledWith('/path/to/codeql', ['resolve', 'packs'], {
        silent: true,
      });
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Query packs not found in bundle, downloading...',
      );

      // Should attempt to download all query packs
      expect(mockExec).toHaveBeenCalledWith(
        '/path/to/codeql',
        ['pack', 'download', 'codeql/javascript-queries'],
        {
          silent: true,
          ignoreReturnCode: true,
        },
      );
      expect(mockExec).toHaveBeenCalledWith(
        '/path/to/codeql',
        ['pack', 'download', 'codeql/python-queries'],
        {
          silent: true,
          ignoreReturnCode: true,
        },
      );
      expect(mockExec).toHaveBeenCalledWith(
        '/path/to/codeql',
        ['pack', 'download', 'codeql/java-queries'],
        {
          silent: true,
          ignoreReturnCode: true,
        },
      );
    });

    it('should handle individual pack download failures gracefully', async () => {
      mockExec.mockRejectedValueOnce(new Error('Not found')); // resolve packs fails
      mockExec.mockRejectedValue(new Error('Download failed')); // all downloads fail

      await QueryPackManager.downloadQueryPacks('/path/to/codeql');

      expect(mockLogger.info).toHaveBeenCalledWith('Query pack download completed');
      // Should not throw error even if downloads fail
    });

    it('should log download progress', async () => {
      mockExec.mockRejectedValueOnce(new Error('Not found')); // resolve packs fails
      mockExec.mockResolvedValue(0); // downloads succeed

      await QueryPackManager.downloadQueryPacks('/path/to/codeql');

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Checking CodeQL query packs availability...',
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Query packs not found in bundle, downloading...',
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Downloading query pack: codeql/javascript-queries',
      );
      expect(mockLogger.info).toHaveBeenCalledWith('Query pack download completed');
    });
  });

  describe('getQueryPack', () => {
    it('should return correct query pack for javascript security-and-quality', () => {
      const result = QueryPackManager.getQueryPack('javascript', 'security-and-quality');

      expect(result).toBe(
        'codeql/javascript-queries:codeql-suites/javascript-security-and-quality.qls',
      );
    });

    it('should return correct query pack for python security-extended', () => {
      const result = QueryPackManager.getQueryPack('python', 'security-extended');

      expect(result).toBe(
        'codeql/python-queries:codeql-suites/python-security-extended.qls',
      );
    });

    it('should return correct query pack for typescript (mapped to javascript)', () => {
      const result = QueryPackManager.getQueryPack('typescript', 'security-and-quality');

      expect(result).toBe(
        'codeql/javascript-queries:codeql-suites/javascript-security-and-quality.qls',
      );
    });

    it('should fallback to security-and-quality for unknown profile', () => {
      const result = QueryPackManager.getQueryPack('javascript', 'unknown-profile');

      expect(result).toBe(
        'codeql/javascript-queries:codeql-suites/javascript-security-and-quality.qls',
      );
    });

    it('should handle java language', () => {
      const result = QueryPackManager.getQueryPack('java', 'security-and-quality');

      expect(result).toBe(
        'codeql/java-queries:codeql-suites/java-security-and-quality.qls',
      );
    });

    it('should handle csharp language', () => {
      const result = QueryPackManager.getQueryPack('csharp', 'security-and-quality');

      expect(result).toBe(
        'codeql/csharp-queries:codeql-suites/csharp-security-and-quality.qls',
      );
    });

    it('should handle cpp language', () => {
      const result = QueryPackManager.getQueryPack('cpp', 'security-and-quality');

      expect(result).toBe(
        'codeql/cpp-queries:codeql-suites/cpp-security-and-quality.qls',
      );
    });

    it('should handle go language', () => {
      const result = QueryPackManager.getQueryPack('go', 'security-and-quality');

      expect(result).toBe('codeql/go-queries:codeql-suites/go-security-and-quality.qls');
    });

    it('should handle unknown language with fallback', () => {
      const result = QueryPackManager.getQueryPack('unknown', 'security-and-quality');

      expect(result).toBe(
        'codeql/unknown-queries:codeql-suites/unknown-security-and-quality.qls',
      );
    });

    it('should handle C language (mapped to cpp)', () => {
      const result = QueryPackManager.getQueryPack('c', 'security-extended');

      expect(result).toBe('codeql/cpp-queries:codeql-suites/cpp-security-extended.qls');
    });
  });

  describe('getQueryPacks', () => {
    it('should return custom packs from config when available', () => {
      const config: CodeQLConfig = {
        packs: [
          'codeql/javascript-queries:codeql-suites/javascript-security-extended.qls',
          'codeql/python-queries:codeql-suites/python-security-and-quality.qls',
        ],
      };

      const result = QueryPackManager.getQueryPacks(
        'javascript',
        ['security-and-quality'],
        config,
      );

      expect(result).toEqual(config.packs);
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Using custom packs from configuration: ${JSON.stringify(config.packs)}`,
      );
    });

    it('should generate packs based on language and profiles when no config packs', () => {
      const result = QueryPackManager.getQueryPacks('python', [
        'security-and-quality',
        'security-extended',
      ]);

      expect(result).toEqual([
        'codeql/python-queries:codeql-suites/python-security-and-quality.qls',
        'codeql/python-queries:codeql-suites/python-security-extended.qls',
      ]);
    });

    it('should deduplicate identical packs', () => {
      const result = QueryPackManager.getQueryPacks('javascript', [
        'security',
        'security-and-quality',
      ]);

      // Both profiles map to the same pack, should only include once
      expect(result).toEqual([
        'codeql/javascript-queries:codeql-suites/javascript-security-and-quality.qls',
      ]);
    });

    it('should handle empty config packs', () => {
      const config: CodeQLConfig = {
        packs: [],
      };

      const result = QueryPackManager.getQueryPacks(
        'javascript',
        ['security-and-quality'],
        config,
      );

      expect(result).toEqual([
        'codeql/javascript-queries:codeql-suites/javascript-security-and-quality.qls',
      ]);
    });
  });

  describe('parseProfiles', () => {
    it('should parse comma-separated profiles', () => {
      const result = QueryPackManager.parseProfiles(
        'security-and-quality,security-extended',
      );

      expect(result).toEqual(['security-and-quality', 'security-extended']);
    });

    it('should trim whitespace', () => {
      const result = QueryPackManager.parseProfiles(
        '  security-and-quality  ,  security-extended  ',
      );

      expect(result).toEqual(['security-and-quality', 'security-extended']);
    });

    it('should return default for empty string', () => {
      const result = QueryPackManager.parseProfiles('');

      expect(result).toEqual(['security-and-quality']);
    });

    it('should filter empty profiles', () => {
      const result = QueryPackManager.parseProfiles(
        'security-and-quality,,security-extended,',
      );

      expect(result).toEqual(['security-and-quality', 'security-extended']);
    });
  });

  describe('parseLanguages', () => {
    it('should parse comma-separated languages', () => {
      const result = QueryPackManager.parseLanguages('javascript,python,java');

      expect(result).toEqual(['javascript', 'python', 'java']);
    });

    it('should handle matrix expressions', () => {
      // eslint-disable-next-line no-template-curly-in-string
      const matrixExpression = '${{ matrix.language }}';
      const result = QueryPackManager.parseLanguages(matrixExpression);

      expect(result).toEqual([matrixExpression]);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Detected matrix expression in languages, will resolve at runtime',
      );
    });

    it('should trim whitespace', () => {
      const result = QueryPackManager.parseLanguages('  javascript  ,  python  ');

      expect(result).toEqual(['javascript', 'python']);
    });

    it('should return default for empty string', () => {
      const result = QueryPackManager.parseLanguages('');

      expect(result).toEqual(['javascript']);
    });

    it('should filter empty languages', () => {
      const result = QueryPackManager.parseLanguages('javascript,,python,');

      expect(result).toEqual(['javascript', 'python']);
    });
  });
});
