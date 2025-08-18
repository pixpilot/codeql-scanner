import * as core from '@actions/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CodeQLAnalyzer } from '../src/codeql/analyzer';
import { CodeQLDatabase } from '../src/codeql/database';
import { CodeQLInstaller } from '../src/codeql/installer';
import { QueryPackManager } from '../src/codeql/query-packs';
import * as getInputsModule from '../src/config/get-inputs';
import { loadConfig } from '../src/config/utils/load-config';
import { FileFilter } from '../src/file-filtering/filter';
import { IssueCreator } from '../src/github/issue-creator';
import { run } from '../src/index';
import { SarifProcessor } from '../src/sarif/processor';

// Mock all dependencies
vi.mock('@actions/core');
vi.mock('../src/codeql/analyzer');
vi.mock('../src/codeql/database');
vi.mock('../src/codeql/installer');
vi.mock('../src/codeql/query-packs');
vi.mock('../src/config/utils/load-config');
vi.mock('../src/file-filtering/filter');
vi.mock('../src/github/issue-creator');
vi.mock('../src/sarif/processor');

const mockCore = vi.mocked(core);
const mockCodeQLAnalyzer = vi.mocked(CodeQLAnalyzer);
const mockCodeQLDatabase = vi.mocked(CodeQLDatabase);
const mockCodeQLInstaller = vi.mocked(CodeQLInstaller);
const mockQueryPackManager = vi.mocked(QueryPackManager);
const mockLoadConfig = vi.mocked(loadConfig);
const mockFileFilter = vi.mocked(FileFilter);
const mockIssueCreator = vi.mocked(IssueCreator);
const mockSarifProcessor = vi.mocked(SarifProcessor);

describe('action', () => {
  let getInputsSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    getInputsSpy = vi.spyOn(getInputsModule, 'getInputs').mockImplementation(() => ({
      languages: 'javascript',
      sourceRoot: '',
      ram: '',
      threads: '',
      debug: false,
      config: '',
      configFile: '',
      qlsProfile: 'security-and-quality',
      token: 'test-token',
    }));

    // Setup default mock implementations
    mockCodeQLInstaller.initializeCodeQL.mockResolvedValue('/path/to/codeql');
    mockFileFilter.filterFiles.mockResolvedValue('/path/to/filtered');
    mockQueryPackManager.downloadQueryPacks.mockResolvedValue();
    mockQueryPackManager.parseLanguages.mockImplementation((lang) => lang.split(','));
    mockCodeQLDatabase.createDatabase.mockResolvedValue();
    mockCodeQLAnalyzer.analyzeWithCodeQL.mockResolvedValue();
    mockCodeQLAnalyzer.getResultsPath.mockReturnValue('/path/to/results.sarif');
    mockSarifProcessor.processSarifFile.mockReturnValue({
      runs: [{ results: [] }],
    });
    mockIssueCreator.createIssuesFromSarif.mockResolvedValue();
  });

  it('should run successfully with default inputs', async () => {
    await run();

    expect(mockCodeQLInstaller.initializeCodeQL).toHaveBeenCalledWith('javascript');
    expect(mockFileFilter.filterFiles).toHaveBeenCalled();
    expect(mockQueryPackManager.downloadQueryPacks).toHaveBeenCalled();
    expect(mockCodeQLDatabase.createDatabase).toHaveBeenCalled();
    expect(mockCodeQLAnalyzer.analyzeWithCodeQL).toHaveBeenCalledWith(
      '/path/to/codeql',
      'javascript',
      'security-and-quality',
      undefined,
    );
    expect(mockSarifProcessor.processSarifFile).toHaveBeenCalled();
    expect(mockIssueCreator.createIssuesFromSarif).toHaveBeenCalled();
  });

  it('should handle multiple languages by using the first one', async () => {
    getInputsSpy.mockImplementation(() => ({
      languages: 'javascript,python,java',
      sourceRoot: '',
      ram: '',
      threads: '',
      debug: false,
      config: '',
      configFile: '',
      qlsProfile: 'security-and-quality',
      token: 'test-token',
    }));

    await run();

    expect(mockCodeQLInstaller.initializeCodeQL).toHaveBeenCalledWith('javascript');
    expect(mockCodeQLAnalyzer.analyzeWithCodeQL).toHaveBeenCalledWith(
      '/path/to/codeql',
      'javascript,python,java',
      'security-and-quality',
      undefined,
    );
  });

  it('should handle config file input', async () => {
    const mockConfig = { paths: ['src/**'], 'paths-ignore': ['test/**'] };
    mockLoadConfig.mockResolvedValue(mockConfig);

    getInputsSpy.mockImplementation(() => ({
      languages: 'javascript',
      sourceRoot: '',
      ram: '',
      threads: '',
      debug: false,
      config: '',
      configFile: '.github/codeql-config.yml',
      qlsProfile: 'security-and-quality',
      token: 'test-token',
    }));

    await run();

    expect(mockLoadConfig).toHaveBeenCalledWith({
      languages: 'javascript',
      sourceRoot: '',
      ram: '',
      threads: '',
      debug: false,
      config: '',
      configFile: '.github/codeql-config.yml',
      qlsProfile: 'security-and-quality',
      token: 'test-token',
    });
    expect(mockFileFilter.filterFiles).toHaveBeenCalledWith(mockConfig);
  });

  it('should handle config string input (takes precedence over config file)', async () => {
    const mockConfig = { paths: ['src/**'], 'paths-ignore': ['test/**'] };
    mockLoadConfig.mockResolvedValue(mockConfig);

    getInputsSpy.mockImplementation(() => ({
      languages: 'javascript',
      sourceRoot: '',
      ram: '',
      threads: '',
      debug: false,
      config: 'paths:\n  - src/**\npaths-ignore:\n  - test/**',
      configFile: '.github/codeql-config.yml',
      qlsProfile: 'security-and-quality',
      token: 'test-token',
    }));

    await run();

    expect(mockLoadConfig).toHaveBeenCalledWith({
      languages: 'javascript',
      sourceRoot: '',
      ram: '',
      threads: '',
      debug: false,
      config: 'paths:\n  - src/**\npaths-ignore:\n  - test/**',
      configFile: '.github/codeql-config.yml',
      qlsProfile: 'security-and-quality',
      token: 'test-token',
    });
  });

  it('should handle debug mode', async () => {
    getInputsSpy.mockImplementation(() => ({
      languages: 'javascript',
      sourceRoot: '',
      ram: '',
      threads: '',
      debug: true,
      config: '',
      configFile: '',
      qlsProfile: 'security-and-quality',
      token: 'test-token',
    }));

    await run();
  });

  it('should handle errors gracefully', async () => {
    const error = new Error('Test error');

    // Setup the getInputs mock to return proper values
    getInputsSpy.mockImplementation(() => ({
      languages: 'javascript',
      sourceRoot: '',
      ram: '',
      threads: '',
      debug: false,
      config: '',
      configFile: '',
      qlsProfile: 'security-and-quality',
      token: 'test-token',
    }));

    // Make sure parseLanguages returns a proper array
    mockQueryPackManager.parseLanguages.mockReturnValue(['javascript']);

    // Make initializeCodeQL fail to trigger the error handling
    mockCodeQLInstaller.initializeCodeQL.mockRejectedValue(error);

    await run();

    expect(mockCore.setFailed).toHaveBeenCalledWith('Action failed: Test error');
  });

  it('should handle SARIF processing with no results', async () => {
    mockSarifProcessor.processSarifFile.mockReturnValue(null);

    await run();

    expect(mockIssueCreator.createIssuesFromSarif).not.toHaveBeenCalled();
  });
});
