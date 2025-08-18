import * as ExecModule from '@actions/exec';
import { CodeQLAnalyzer } from '../../src/codeql/analyzer';
import * as FileUtilsModule from '../../src/utils/file-utils';

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
      // eslint-disable-next-line antfu/consistent-chaining
      .mock.calls.find((call) => call[1].includes('keep-this'));
    expect(writeCall).toBeTruthy();
    if (writeCall) {
      const writtenSarif = JSON.parse(writeCall[1]);
      expect(writtenSarif.runs[0].results).toHaveLength(1);
      expect(writtenSarif.runs[0].results[0].ruleId).toBe('keep-this');
    }
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
