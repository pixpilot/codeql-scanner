import { vi } from 'vitest';
import { ConfigParser } from '../../src/config/parser';
import { FileUtils } from '../../src/utils/file-utils';

// Mock the FileUtils
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

const mockFileUtils = vi.mocked(FileUtils);

describe('configParser', () => {
  describe('parseConfigFile', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should throw error if config file does not exist', async () => {
      mockFileUtils.exists.mockReturnValue(false);

      await expect(ConfigParser.parseConfigFile('nonexistent.yml')).rejects.toThrow(
        'Configuration file not found: nonexistent.yml',
      );
    });

    it('should parse basic YAML configuration', async () => {
      const mockYamlContent = `
paths:
  - src/**
  - lib/**
paths-ignore:
  - test/**
  - node_modules/**
languages: javascript
query-filters:
  - exclude:
      id: js/unused-local-variable
`;

      mockFileUtils.exists.mockReturnValue(true);
      mockFileUtils.readFile.mockReturnValue(mockYamlContent);

      const result = await ConfigParser.parseConfigFile('test.yml');

      expect(result).toEqual({
        paths: ['src/**', 'lib/**'],
        'paths-ignore': ['test/**', 'node_modules/**'],
        languages: 'javascript',
        packs: [],
        'query-filters': [
          {
            exclude: {
              id: 'js/unused-local-variable',
            },
          },
        ],
      });
    });

    it('should handle empty configuration file', async () => {
      const mockYamlContent = `# Empty config file
# Just comments`;

      mockFileUtils.exists.mockReturnValue(true);
      mockFileUtils.readFile.mockReturnValue(mockYamlContent);

      const result = await ConfigParser.parseConfigFile('empty.yml');

      expect(result).toEqual({
        paths: [],
        'paths-ignore': [],
        'query-filters': [],
        packs: [],
      });
    });

    it('should ignore comments and empty lines', async () => {
      const mockYamlContent = `
# This is a comment
paths:
  - src/**
  # Another comment

paths-ignore:
  - test/**
`;

      mockFileUtils.exists.mockReturnValue(true);
      mockFileUtils.readFile.mockReturnValue(mockYamlContent);

      const result = await ConfigParser.parseConfigFile('test.yml');

      expect(result.paths).toEqual(['src/**']);
      expect(result['paths-ignore']).toEqual(['test/**']);
    });

    it('should handle multiple query filters', async () => {
      const mockYamlContent = `
query-filters:
  - exclude:
      id: js/unused-local-variable
  - exclude:
      id: js/unreachable-statement
`;

      mockFileUtils.exists.mockReturnValue(true);
      mockFileUtils.readFile.mockReturnValue(mockYamlContent);

      const result = await ConfigParser.parseConfigFile('test.yml');

      expect(result['query-filters']).toEqual([
        { exclude: { id: 'js/unused-local-variable' } },
        { exclude: { id: 'js/unreachable-statement' } },
      ]);
    });

    it('should handle malformed configuration gracefully', async () => {
      const mockYamlContent = `
paths:
  invalid structure
  - src/**
`;

      mockFileUtils.exists.mockReturnValue(true);
      mockFileUtils.readFile.mockReturnValue(mockYamlContent);

      const result = await ConfigParser.parseConfigFile('test.yml');

      expect(result.paths).toEqual(['src/**']);
    });
  });

  describe('parseConfigString', () => {
    it('should parse basic YAML configuration string', async () => {
      const configString = `
paths:
  - src/**
  - lib/**
paths-ignore:
  - test/**
  - node_modules/**
languages: javascript
query-filters:
  - exclude:
      id: js/unused-local-variable
`;
      const result = await ConfigParser.parseConfigString(configString);
      expect(result).toEqual({
        paths: ['src/**', 'lib/**'],
        'paths-ignore': ['test/**', 'node_modules/**'],
        languages: 'javascript',
        packs: [],
        'query-filters': [
          {
            exclude: {
              id: 'js/unused-local-variable',
            },
          },
        ],
      });
    });

    it('should handle empty configuration string', async () => {
      const configString = `# Empty config\n# Just comments`;
      const result = await ConfigParser.parseConfigString(configString);
      expect(result).toEqual({
        paths: [],
        'paths-ignore': [],
        'query-filters': [],
        packs: [],
      });
    });

    it('should ignore comments and empty lines in string', async () => {
      const configString = `
# This is a comment
paths:
  - src/**
  # Another comment

paths-ignore:
  - test/**
`;
      const result = await ConfigParser.parseConfigString(configString);
      expect(result.paths).toEqual(['src/**']);
      expect(result['paths-ignore']).toEqual(['test/**']);
    });

    it('should handle multiple query filters in string', async () => {
      const configString = `
query-filters:
  - exclude:
      id: js/unused-local-variable
  - exclude:
      id: js/unreachable-statement
`;
      const result = await ConfigParser.parseConfigString(configString);
      expect(result['query-filters']).toEqual([
        { exclude: { id: 'js/unused-local-variable' } },
        { exclude: { id: 'js/unreachable-statement' } },
      ]);
    });

    it('should handle malformed configuration string gracefully', async () => {
      const configString = `
paths:
  invalid structure
  - src/**
`;
      const result = await ConfigParser.parseConfigString(configString);
      expect(result.paths).toEqual(['src/**']);
    });
  });

  it('parses languages as array', async () => {
    const configString = `
languages:
  - python
  - javascript
`;
    const result = await ConfigParser.parseConfigString(configString);
    expect(result.languages).toBe('python,javascript');
  });

  it('parses languages as string', async () => {
    const configString = `
languages: python
`;
    const result = await ConfigParser.parseConfigString(configString);
    expect(result.languages).toBe('python');
  });

  it('parses languages as array format', async () => {
    const configString = `
languages:
  - python
  - javascript
`;
    const result = await ConfigParser.parseConfigString(configString);
    expect(result.languages).toBe('python,javascript');
  });

  it('parses languages as string format', async () => {
    const configString = `
languages: python
`;
    const result = await ConfigParser.parseConfigString(configString);
    expect(result.languages).toBe('python');
  });

  it('handles single language in array', async () => {
    const configString = `
languages:
  - python
`;
    const result = await ConfigParser.parseConfigString(configString);
    expect(result.languages).toBe('python');
  });

  it('handles missing languages field', async () => {
    const configString = `
paths:
  - src/**
`;
    const result = await ConfigParser.parseConfigString(configString);
    expect(result.languages).toBeUndefined();
  });

  it('parses packs configuration', async () => {
    const configString = `
packs:
  - codeql/javascript-queries:codeql-suites/javascript-security-extended.qls
  - codeql/python-queries:codeql-suites/python-security-and-quality.qls
`;
    const result = await ConfigParser.parseConfigString(configString);
    expect(result.packs).toEqual([
      'codeql/javascript-queries:codeql-suites/javascript-security-extended.qls',
      'codeql/python-queries:codeql-suites/python-security-and-quality.qls',
    ]);
  });

  it('handles empty packs configuration', async () => {
    const configString = `
packs: []
`;
    const result = await ConfigParser.parseConfigString(configString);
    expect(result.packs).toEqual([]);
  });

  it('parses JavaScript security packs configuration (user format)', async () => {
    const configString = `
packs:
  - codeql/javascript-queries:codeql-suites/javascript-security-extended.qls
  - codeql/javascript-queries:codeql-suites/javascript-security-and-quality.qls
`;
    const result = await ConfigParser.parseConfigString(configString);
    expect(result.packs).toEqual([
      'codeql/javascript-queries:codeql-suites/javascript-security-extended.qls',
      'codeql/javascript-queries:codeql-suites/javascript-security-and-quality.qls',
    ]);
  });

  it('handles missing packs field', async () => {
    const configString = `
paths:
  - src/**
`;
    const result = await ConfigParser.parseConfigString(configString);
    expect(result.packs).toEqual([]);
  });
});
