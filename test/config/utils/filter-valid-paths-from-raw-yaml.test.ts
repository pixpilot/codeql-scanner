import { filterValidPathsFromRawYaml } from '../../../src/config/utils/filter-valid-paths-from-raw-yaml';

describe('filterValidPathsFromRawYaml', () => {
  it('extracts valid paths from raw YAML', () => {
    const raw = `paths:\n- src/\n- test/\n- docs/`;
    expect(filterValidPathsFromRawYaml(raw)).toEqual(['src/', 'test/', 'docs/']);
  });

  it('returns empty array for no valid entries', () => {
    expect(filterValidPathsFromRawYaml('paths:\n')).toEqual([]);
    expect(filterValidPathsFromRawYaml('')).toEqual([]);
  });

  it('ignores lines not starting with dash', () => {
    const raw = `paths:\nfoo\n- bar\n baz\n- qux`;
    expect(filterValidPathsFromRawYaml(raw)).toEqual(['bar', 'qux']);
  });

  it('removes quotes from values', () => {
    const raw = `paths-ignore:\n- '**/*.test.ts'\n- "**/test/**/*"\n- unquoted-value`;
    expect(filterValidPathsFromRawYaml(raw)).toEqual([
      '**/*.test.ts',
      '**/test/**/*',
      'unquoted-value',
    ]);
  });
});
