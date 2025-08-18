import type { CodeQLConfig } from '../../../src/types';
import { ConfigParser } from '../../../src/config/parser';
import { loadConfig } from '../../../src/config/utils/load-config';

vi.mock('../../../src/config/parser');
vi.mock('../../../src/utils/logger', () => ({
  Logger: { info: vi.fn(), error: vi.fn() },
}));

describe('loadConfig', () => {
  const fileConfig: CodeQLConfig = {
    paths: ['src'],
    'paths-ignore': ['test'],
    'query-filters': [{ exclude: { id: 'foo' } }],
    languages: 'javascript',
  };
  const stringConfig: CodeQLConfig = {
    paths: ['lib'],
    'paths-ignore': ['spec'],
    'query-filters': [{ exclude: { id: 'bar' } }],
    languages: 'typescript',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (ConfigParser.parseConfigString as any).mockResolvedValue(stringConfig);
    (ConfigParser.parseConfigFile as any).mockResolvedValue(fileConfig);
  });

  it('loads config from YAML string', async () => {
    (ConfigParser.parseConfigFile as any).mockResolvedValue(null);
    const result = await loadConfig({ config: 'yaml-string' });
    expect(result).toEqual(stringConfig);
    expect(ConfigParser.parseConfigString).toHaveBeenCalledWith('yaml-string');
  });

  it('loads config from file', async () => {
    (ConfigParser.parseConfigString as any).mockResolvedValue(null);
    const result = await loadConfig({ configFile: 'file.yml' });
    expect(result).toEqual(fileConfig);
    expect(ConfigParser.parseConfigFile).toHaveBeenCalledWith('file.yml');
  });

  it('returns config from file only', async () => {
    (ConfigParser.parseConfigString as any).mockResolvedValue(null);
    const result = await loadConfig({ configFile: 'file.yml' });
    expect(result).toEqual(fileConfig);
  });

  it('returns config from string only', async () => {
    (ConfigParser.parseConfigFile as any).mockResolvedValue(null);
    const result = await loadConfig({ config: 'yaml-string' });
    expect(result).toEqual(stringConfig);
  });

  it('merges configFile and config, config overrides', async () => {
    const result = await loadConfig({ config: 'yaml-string', configFile: 'file.yml' });
    expect(result).toEqual({ ...fileConfig, ...stringConfig });
  });

  it('returns null if no config is provided', async () => {
    (ConfigParser.parseConfigString as any).mockResolvedValue(null);
    (ConfigParser.parseConfigFile as any).mockResolvedValue(null);
    const result = await loadConfig({});
    expect(result).toBeNull();
  });
});
