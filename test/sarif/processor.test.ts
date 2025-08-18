import type { SarifReport } from '../../src/types';
import { vi } from 'vitest';
import { SarifProcessor } from '../../src/sarif/processor';
import { FileUtils } from '../../src/utils/file-utils';

// Mock the FileUtils and Logger
vi.mock('../../src/utils/file-utils', () => ({
  FileUtils: {
    exists: vi.fn(),
    readFile: vi.fn(),
  },
}));

vi.mock('../../src/utils/logger', () => ({
  Logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

const mockFileUtils = FileUtils as typeof FileUtils & {
  exists: ReturnType<typeof vi.fn>;
  readFile: ReturnType<typeof vi.fn>;
};

describe('sarifProcessor', () => {
  describe('processSarifFile', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should return null if SARIF file does not exist', () => {
      mockFileUtils.exists.mockReturnValue(false);

      const result = SarifProcessor.processSarifFile('nonexistent.sarif');

      expect(result).toBeNull();
    });

    it('should return null if SARIF file has no runs', () => {
      const mockSarif = { runs: [] };
      mockFileUtils.exists.mockReturnValue(true);
      mockFileUtils.readFile.mockReturnValue(JSON.stringify(mockSarif));

      const result = SarifProcessor.processSarifFile('empty.sarif');

      expect(result).toBeNull();
    });

    it('should return parsed SARIF file with runs', () => {
      const mockSarif: SarifReport = {
        runs: [
          {
            results: [
              {
                ruleId: 'test-rule',
                message: { text: 'Test message' },
                locations: [],
              },
            ],
          },
        ],
      };

      mockFileUtils.exists.mockReturnValue(true);
      mockFileUtils.readFile.mockReturnValue(JSON.stringify(mockSarif));

      const result = SarifProcessor.processSarifFile('valid.sarif');

      expect(result).toEqual(mockSarif);
    });

    it('should throw error for invalid JSON', () => {
      mockFileUtils.exists.mockReturnValue(true);
      mockFileUtils.readFile.mockReturnValue('invalid json');

      expect(() => SarifProcessor.processSarifFile('invalid.sarif')).toThrow();
    });
  });

  describe('validateSarif', () => {
    it('should return true for valid SARIF with runs', () => {
      const mockSarif: SarifReport = {
        runs: [{ results: [] }],
      };

      const result = SarifProcessor.validateSarif(mockSarif);

      expect(result).toBe(true);
    });

    it('should return false for SARIF without runs', () => {
      const mockSarif: SarifReport = {};

      const result = SarifProcessor.validateSarif(mockSarif);

      expect(result).toBe(false);
    });

    it('should return false for SARIF with empty runs array', () => {
      const mockSarif: SarifReport = { runs: [] };

      const result = SarifProcessor.validateSarif(mockSarif);

      expect(result).toBe(false);
    });
  });

  describe('getTotalResultsCount', () => {
    it('should return 0 for SARIF without runs', () => {
      const mockSarif: SarifReport = {};

      const result = SarifProcessor.getTotalResultsCount(mockSarif);

      expect(result).toBe(0);
    });

    it('should return correct count for SARIF with results', () => {
      const mockSarif: SarifReport = {
        runs: [
          { results: [{ ruleId: 'rule1', message: { text: 'msg1' } }] },
          {
            results: [
              { ruleId: 'rule2', message: { text: 'msg2' } },
              { ruleId: 'rule3', message: { text: 'msg3' } },
            ],
          },
          { results: [] },
        ],
      };

      const result = SarifProcessor.getTotalResultsCount(mockSarif);

      expect(result).toBe(3);
    });
  });
});
