import { getPlatformIdentifier } from '../../../src/codeql/utils/platform-utils';

describe('getPlatformIdentifier', () => {
  it("should return 'osx64' for darwin", () => {
    Object.defineProperty(process, 'platform', { value: 'darwin' });
    expect(getPlatformIdentifier()).toBe('osx64');
  });
  it("should return 'win64' for win32", () => {
    Object.defineProperty(process, 'platform', { value: 'win32' });
    expect(getPlatformIdentifier()).toBe('win64');
  });
  it("should return 'linux64' for linux", () => {
    Object.defineProperty(process, 'platform', { value: 'linux' });
    expect(getPlatformIdentifier()).toBe('linux64');
  });
  it("should default to 'linux64' for unknown platform", () => {
    Object.defineProperty(process, 'platform', { value: 'unknown' });
    expect(getPlatformIdentifier()).toBe('linux64');
  });
});
