import { describe, expect, it, vi } from 'vitest';
import { getLatestCodeQLRelease } from '../../../src/codeql/utils/github-release-utils';

vi.mock('@actions/exec');
vi.mock('node:fs/promises', () => ({
  readFile: vi.fn().mockResolvedValue('{"assets":[]}'),
  unlink: vi.fn().mockResolvedValue(undefined),
}));

describe('getLatestCodeQLRelease', () => {
  it('should fetch latest release info (mocked)', async () => {
    const release = await getLatestCodeQLRelease();
    expect(release).toHaveProperty('assets');
    expect(Array.isArray(release.assets)).toBe(true);
  });
});
