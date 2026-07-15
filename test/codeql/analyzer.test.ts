import * as ExecModule from '@actions/exec';
import { CodeQLAnalyzer } from '../../src/codeql/analyzer';
import * as FileUtilsModule from '../../src/utils/file-utils';
import { Logger } from '../../src/utils/logger';

vi.mock('@actions/exec', () => ({
  exec: vi.fn(),
}));
vi.mock('../../src/utils/file-utils', () => ({
  FileUtils: {
    joinPath: vi.fn((...args) => args.join('/')),
    exists: vi.fn(() => true),
    readFile: vi.fn(() => '{}'),
    writeFile: vi.fn(),
  },
}));
vi.mock('../../src/utils/logger', () => ({
  Logger: {
    info: vi.fn(),
    warning: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  },
}));
vi.mock('../../src/codeql/query-packs', () => ({
  QueryPackManager: {
    getQueryPack: vi.fn(() => 'codeql/javascript-queries'),
    parseProfiles: vi.fn((profileString) => profileString.split(',')),
    getQueryPacks: vi.fn(() => ['codeql/javascript-queries']),
  },
}));
vi.mock('../../src/codeql/database', () => ({
  CodeQLDatabase: {
    getDatabasePath: vi.fn(() => '/fake/db'),
  },
}));

const { exec } = ExecModule;
const { FileUtils } = FileUtilsModule;

describe('codeQLAnalyzer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('analyzeWithCodeQL calls exec with correct arguments (success path)', async () => {
    vi.mocked(exec).mockResolvedValue(0);

    await CodeQLAnalyzer.analyzeWithCodeQL('/codeql', 'python', 'security-extended');

    expect(exec).toHaveBeenCalledWith(
      '/codeql',
      expect.arrayContaining([
        'database',
        'analyze',
        '/fake/db',
        '--ram=4000',
        '--format=sarif-latest',
        expect.stringContaining('results.sarif'),
        '--threat-model=local,remote',
        'codeql/javascript-queries',
      ]),
    );
  });

  it('analyzeWithCodeQL retries with fallback query pack on exec error', async () => {
    vi.mocked(exec)
      .mockRejectedValueOnce(new Error('Query pack failed'))
      .mockResolvedValueOnce(0);

    await CodeQLAnalyzer.analyzeWithCodeQL('/codeql', 'python', 'security-extended');

    expect(exec).toHaveBeenCalledTimes(2);
    expect(exec).toHaveBeenNthCalledWith(
      2,
      '/codeql',
      expect.arrayContaining([
        'database',
        'analyze',
        '/fake/db',
        '--ram=4000',
        '--format=sarif-latest',
        expect.stringContaining('results.sarif'),
        '--threat-model=local,remote',
        'codeql/python-queries',
      ]),
    );
  });

  it('analyzeWithCodeQL applies query filters when config is provided', async () => {
    vi.mocked(FileUtils.readFile).mockReturnValue(
      JSON.stringify({
        runs: [
          {
            results: [{ ruleId: 'keep-this' }, { ruleId: 'filter-this' }],
          },
        ],
      }),
    );
    vi.mocked(exec).mockResolvedValue(0);

    const config = {
      languages: 'python',
      'query-filters': [{ exclude: { id: 'filter-this' } }],
    };

    await CodeQLAnalyzer.analyzeWithCodeQL(
      '/codeql',
      'python',
      'security-extended',
      config,
    );

    // Check that the SARIF file was written with filtered results
    expect(FileUtils.writeFile).toHaveBeenCalled();
    const writeCall = vi
      .mocked(FileUtils.writeFile)

      .mock.calls.find((call) => call[1].includes('keep-this'));
    expect(writeCall).toBeTruthy();
    if (writeCall) {
      const writtenSarif = JSON.parse(writeCall[1]);
      expect(writtenSarif.runs[0].results).toHaveLength(1);
      expect(writtenSarif.runs[0].results[0].ruleId).toBe('keep-this');
    }
  });

  it('analyzeWithCodeQL forwards the ram and threads inputs to CodeQL', async () => {
    vi.mocked(exec).mockResolvedValue(0);

    await CodeQLAnalyzer.analyzeWithCodeQL(
      '/codeql',
      'python',
      'security-extended',
      undefined,
      { ram: '8000', threads: '4' },
    );

    const args = vi.mocked(exec).mock.calls[0][1] as string[];
    expect(args).toContain('--ram=8000');
    expect(args).toContain('--threads=4');
    expect(args).not.toContain('--ram=4000');
  });

  it('analyzeWithCodeQL keeps the default ram limit when the input is blank', async () => {
    vi.mocked(exec).mockResolvedValue(0);

    await CodeQLAnalyzer.analyzeWithCodeQL(
      '/codeql',
      'python',
      'security-extended',
      undefined,
      {
        ram: '',
        threads: '',
      },
    );

    const args = vi.mocked(exec).mock.calls[0][1] as string[];
    expect(args).toContain('--ram=4000');
    expect(args.some((arg) => arg.startsWith('--threads='))).toBe(false);
  });

  it('analyzeWithCodeQL throws when every query pack and the fallback fail', async () => {
    vi.mocked(exec).mockRejectedValue(new Error('CodeQL exploded'));

    await expect(
      CodeQLAnalyzer.analyzeWithCodeQL('/codeql', 'python', 'security-extended'),
    ).rejects.toThrow(/none of the 1 query pack\(s\) could be analyzed/u);
  });

  it('analyzeWithCodeQL throws when no database exists for any language', async () => {
    vi.mocked(exec).mockResolvedValue(0);
    vi.mocked(FileUtils.exists).mockReturnValue(false);

    await expect(
      CodeQLAnalyzer.analyzeWithCodeQL('/codeql', 'python', 'security-extended', {
        languages: 'python,javascript',
      }),
    ).rejects.toThrow(/produced no results for any of the requested language/u);

    expect(exec).not.toHaveBeenCalled();
  });

  it('analyzeWithCodeQL reports an error when a SARIF file cannot be parsed during merge', async () => {
    vi.mocked(exec).mockResolvedValue(0);
    vi.mocked(FileUtils.exists).mockReturnValue(true);
    vi.mocked(FileUtils.readFile).mockReturnValue('{ not valid json');

    await CodeQLAnalyzer.analyzeWithCodeQL('/codeql', 'python', 'security-extended', {
      languages: 'python,javascript',
    });

    expect(Logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Findings from this file are missing from the results'),
    );
  });

  it('getResultsPath returns the expected SARIF path', () => {
    const result = CodeQLAnalyzer.getResultsPath();
    expect(result).toContain('results.sarif');
  });

  it('analyzeWithCodeQL handles multi-language analysis with loop approach', async () => {
    vi.mocked(FileUtils.readFile).mockReturnValue(
      JSON.stringify({ runs: [{ results: [] }] }),
    );
    vi.mocked(FileUtils.writeFile).mockClear();
    vi.mocked(ExecModule.exec).mockResolvedValue(0);

    const config = { languages: 'python,javascript' };

    await CodeQLAnalyzer.analyzeWithCodeQL(
      '/codeql',
      'python',
      'security-extended',
      config,
    );

    expect(ExecModule.exec).toHaveBeenCalledTimes(2); // Once for each language
    expect(FileUtilsModule.FileUtils.writeFile).toHaveBeenCalled(); // For merged SARIF
  });

  it('analyzeWithCodeQL handles single language analysis correctly', async () => {
    vi.mocked(exec).mockResolvedValue(0);

    const config = { languages: 'python' };

    await CodeQLAnalyzer.analyzeWithCodeQL(
      '/codeql',
      'python',
      'security-extended',
      config,
    );

    expect(exec).toHaveBeenCalledTimes(1);
    expect(exec).toHaveBeenCalledWith(
      '/codeql',
      expect.arrayContaining([
        'database',
        'analyze',
        '/fake/db',
        '--ram=4000',
        '--format=sarif-latest',
        expect.stringContaining('results.sarif'),
        '--threat-model=local,remote',
        'codeql/javascript-queries',
      ]),
    );
  });

  it('analyzeWithCodeQL skips languages with missing databases', async () => {
    vi.mocked(FileUtils.exists).mockImplementation(
      (path: string) =>
        // Only python database exists
        path.includes('/python') || path === '/fake/db',
    );
    vi.mocked(exec).mockResolvedValue(0);

    const config = { languages: 'python,javascript' };

    await CodeQLAnalyzer.analyzeWithCodeQL(
      '/codeql',
      'python',
      'security-extended',
      config,
    );

    // Should only analyze python since javascript database doesn't exist
    expect(exec).toHaveBeenCalledTimes(1);
  });
});
