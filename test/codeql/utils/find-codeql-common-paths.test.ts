import { findCodeQLInCommonPaths } from '../../../src/codeql/utils/find-codeql-common-paths';
import { FileUtils } from '../../../src/utils/file-utils';

vi.mock('../../../src/utils/file-utils');
vi.mock('../../../src/utils/logger', () => ({
  Logger: {
    info: vi.fn(),
  },
}));

const realPlatform = process.platform;
function setPlatform(value: string): void {
  Object.defineProperty(process, 'platform', { value, configurable: true });
}

describe('findCodeQLInCommonPaths', () => {
  let existsSpy: any;
  let listSpy: any;
  let isDirectorySpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    existsSpy = vi.spyOn(FileUtils, 'exists');
    listSpy = vi.spyOn(FileUtils, 'listDirectory');
    isDirectorySpy = vi.spyOn(FileUtils, 'isDirectory');
    setPlatform('linux');
    // Default: nothing on disk, and any hit is a plain file.
    existsSpy.mockReturnValue(false);
    isDirectorySpy.mockReturnValue(false);
    listSpy.mockImplementation(() => {
      throw new Error('ENOENT');
    });
  });

  afterEach(() => {
    setPlatform(realPlatform);
  });

  it('returns null if no path is found', () => {
    expect(findCodeQLInCommonPaths()).toBeNull();
  });

  it('finds the CodeQL binary inside the tool cache by expanding the version glob', () => {
    listSpy.mockReturnValue(['2.15.5']);
    existsSpy.mockImplementation(
      (p: string) => p === '/opt/hostedtoolcache/CodeQL/2.15.5/x64/codeql/codeql',
    );

    expect(findCodeQLInCommonPaths()).toBe(
      '/opt/hostedtoolcache/CodeQL/2.15.5/x64/codeql/codeql',
    );
    expect(listSpy).toHaveBeenCalledWith('/opt/hostedtoolcache/CodeQL');
  });

  it('never returns the codeql directory that sits beside the binary', () => {
    // Regression: the tool cache holds <version>/x64/codeql/ as a directory, and
    // fs.existsSync says true for it. Returning it makes exec fail with
    // "Unable to locate executable file".
    listSpy.mockReturnValue(['2.26.0']);
    existsSpy.mockReturnValue(true);
    isDirectorySpy.mockImplementation(
      (p: string) => p === '/opt/hostedtoolcache/CodeQL/2.26.0/x64/codeql',
    );

    expect(findCodeQLInCommonPaths()).not.toBe(
      '/opt/hostedtoolcache/CodeQL/2.26.0/x64/codeql',
    );
    expect(findCodeQLInCommonPaths()).toBe(
      '/opt/hostedtoolcache/CodeQL/2.26.0/x64/codeql/codeql',
    );
  });

  it('keeps searching when a candidate exists but is a directory', () => {
    listSpy.mockReturnValue(['2.26.0']);
    existsSpy.mockReturnValue(true);
    // Everything in the tool cache is a directory: fall through to a real binary.
    isDirectorySpy.mockImplementation((p: string) =>
      p.startsWith('/opt/hostedtoolcache'),
    );

    expect(findCodeQLInCommonPaths()).toBe('/home/runner/codeql/codeql');
  });

  it('prefers the newest version when the tool cache holds several', () => {
    // Deliberately unsorted, and including versions that sort wrong lexically (9 vs 10).
    listSpy.mockReturnValue(['2.9.4', '2.16.0', '2.10.1']);
    existsSpy.mockReturnValue(true);

    expect(findCodeQLInCommonPaths()).toBe(
      '/opt/hostedtoolcache/CodeQL/2.16.0/x64/codeql/codeql',
    );
  });

  it('falls back to literal paths when the tool cache is absent', () => {
    existsSpy.mockImplementation((p: string) => p === '/home/runner/codeql/codeql');

    expect(findCodeQLInCommonPaths()).toBe('/home/runner/codeql/codeql');
  });

  it('skips paths that throw errors', () => {
    existsSpy.mockImplementation((p: string) => {
      if (p === '/home/runner/codeql/codeql') throw new Error('fail');
      return p === './codeql/codeql';
    });

    expect(findCodeQLInCommonPaths()).toBe('./codeql/codeql');
  });

  it('expands the tool cache glob on Windows too', () => {
    setPlatform('win32');
    listSpy.mockReturnValue(['2.16.0']);
    existsSpy.mockReturnValue(true);

    const result = findCodeQLInCommonPaths();

    expect(listSpy).toHaveBeenCalledWith('C:\\hostedtoolcache\\windows\\CodeQL');
    expect(result).toContain('2.16.0');
    expect(result).toContain('codeql.exe');
  });
});
