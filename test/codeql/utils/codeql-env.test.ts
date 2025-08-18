import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getCodeQLEnvPath } from '../../../src/codeql/utils/codeql-env';
import { FileUtils } from '../../../src/utils/file-utils';

beforeEach(() => {
  vi.resetAllMocks();
});
describe('getCodeQLEnvPath', () => {
  it('returns path if CODEQL_CLI is set and exists', () => {
    process.env.CODEQL_CLI = 'mock/path';
    vi.spyOn(FileUtils, 'exists').mockReturnValue(true);
    expect(getCodeQLEnvPath()).toBe('mock/path');
  });
  it('returns undefined if CODEQL_CLI is not set', () => {
    delete process.env.CODEQL_CLI;
    expect(getCodeQLEnvPath()).toBeUndefined();
  });
  it('returns undefined if CODEQL_CLI path does not exist', () => {
    process.env.CODEQL_CLI = 'mock/path';
    vi.spyOn(FileUtils, 'exists').mockReturnValue(false);
    expect(getCodeQLEnvPath()).toBeUndefined();
  });
});
