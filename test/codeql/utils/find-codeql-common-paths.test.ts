import { findCodeQLInCommonPaths } from '../../../src/codeql/utils/find-codeql-common-paths';
import { FileUtils } from '../../../src/utils/file-utils';

vi.mock('../../../src/utils/file-utils');

describe('findCodeQLInCommonPaths', () => {
  let existsSpy: any;

  beforeEach(() => {
    existsSpy = vi.spyOn(FileUtils, 'exists');
    vi.clearAllMocks();
  });

  it('returns the first found path', () => {
    existsSpy.mockImplementation((path: unknown) => path === null);
    expect(findCodeQLInCommonPaths()).toBeNull();
  });

  it('returns null if no path is found', () => {
    existsSpy.mockReturnValue(false);
    expect(findCodeQLInCommonPaths()).toBeNull();
  });

  it('skips paths that throw errors', () => {
    existsSpy.mockImplementation((path: unknown) => {
      if (path === '/opt/hostedtoolcache/CodeQL/*/x64/codeql') throw new Error('fail');
      return path === null;
    });
    expect(findCodeQLInCommonPaths()).toBeNull();
  });
});
