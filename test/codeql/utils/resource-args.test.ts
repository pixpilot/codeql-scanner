import { buildResourceArgs } from '../../../src/codeql/utils/resource-args';

describe('buildResourceArgs', () => {
  it('returns no flags when no resources are given', () => {
    expect(buildResourceArgs()).toEqual([]);
    expect(buildResourceArgs({})).toEqual([]);
  });

  it('ignores blank and whitespace-only inputs', () => {
    // core.getInput returns '' for an unset input, which must not become --ram=.
    expect(buildResourceArgs({ ram: '', threads: '   ' })).toEqual([]);
  });

  it('forwards ram when set', () => {
    expect(buildResourceArgs({ ram: '8000' })).toEqual(['--ram=8000']);
  });

  it('forwards threads when set', () => {
    expect(buildResourceArgs({ threads: '4' })).toEqual(['--threads=4']);
  });

  it('forwards both and trims surrounding whitespace', () => {
    expect(buildResourceArgs({ ram: ' 8000 ', threads: ' 2 ' })).toEqual([
      '--ram=8000',
      '--threads=2',
    ]);
  });
});
