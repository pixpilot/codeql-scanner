import { exec } from '@actions/exec';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@actions/exec');
const mockedExec = exec as unknown as ReturnType<typeof vi.fn>;

describe('getCodeQLPathFromSystem', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("should return 'codeql.exe' if found in PATH (mocked, Windows)", async () => {
    vi.doMock('../../../src/utils/platform-utils', () => ({
      isWindowsPlatform: () => true,
    }));
    const { getCodeQLPathFromSystem } = await import(
      '../../../src/codeql/utils/codeql-path'
    );
    mockedExec.mockResolvedValue(undefined);
    const result = await getCodeQLPathFromSystem();
    expect(result).toBe('codeql.exe');
  });

  it("should return 'codeql' if found in PATH (mocked, Linux)", async () => {
    vi.doMock('../../../src/utils/platform-utils', () => ({
      isWindowsPlatform: () => false,
    }));
    const { getCodeQLPathFromSystem } = await import(
      '../../../src/codeql/utils/codeql-path'
    );
    mockedExec.mockResolvedValue(undefined);
    const result = await getCodeQLPathFromSystem();
    expect(result).toBe('codeql');
  });

  it('should return undefined if not found in PATH (mocked)', async () => {
    vi.doMock('../../../src/utils/platform-utils', () => ({
      isWindowsPlatform: () => true,
    }));
    const { getCodeQLPathFromSystem } = await import(
      '../../../src/codeql/utils/codeql-path'
    );
    mockedExec.mockRejectedValue(new Error('not found'));
    const result = await getCodeQLPathFromSystem();
    expect(result).toBeUndefined();
  });
});
