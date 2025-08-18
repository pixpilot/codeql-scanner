import { safeParseYaml } from '../../../src/config/utils/safe-parse-yaml';

describe('safeParseYaml', () => {
  it('parses valid YAML object', () => {
    const yaml = 'foo: bar\nbaz: 42';
    expect(safeParseYaml(yaml)).toEqual({ foo: 'bar', baz: 42 });
  });

  it('returns null for invalid YAML', () => {
    expect(safeParseYaml('foo: [')).toBeNull();
  });

  it('returns null for YAML array', () => {
    expect(safeParseYaml('- foo\n- bar')).toBeNull();
  });

  it('returns null for non-object YAML', () => {
    expect(safeParseYaml('42')).toBeNull();
    expect(safeParseYaml('true')).toBeNull();
  });
});
