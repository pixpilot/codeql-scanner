import * as core from '@actions/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getInputs } from '../../src/config/get-inputs';

vi.mock('@actions/core');
const mockCore = vi.mocked(core);

describe('getInputs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCore.getInput.mockImplementation((name: string) => {
      const inputs: Record<string, string> = {
        languages: 'typescript',
        'source-root': 'src',
        ram: '4096',
        threads: '2',
        debug: 'true',
        config: 'paths:\n  - src/**',
        'config-file': '',
        'qls-profile': 'security-and-quality',
        token: 'test-token',
      };
      return inputs[name] || '';
    });
    mockCore.getBooleanInput.mockImplementation((name: string) => name === 'debug');
  });

  it('should parse and return all inputs correctly', () => {
    const inputs = getInputs();
    expect(inputs.languages).toBe('typescript');
    expect(inputs.sourceRoot).toBe('src');
    expect(inputs.ram).toBe('4096');
    expect(inputs.threads).toBe('2');
    expect(inputs.debug).toBe(true);
    expect(inputs.config).toBe('paths:\n  - src/**');
    expect(inputs.configFile).toBe('');
    expect(inputs.qlsProfile).toBe('security-and-quality');
    expect(inputs.token).toBe('test-token');
  });

  it('should use default values when inputs are missing', () => {
    mockCore.getInput.mockImplementation(() => '');
    mockCore.getBooleanInput.mockImplementation(() => false);
    const inputs = getInputs();
    expect(inputs.languages).toBe('javascript');
    expect(inputs.qlsProfile).toBe('security-and-quality');
    expect(inputs.debug).toBe(false);
  });

  it('should handle comma-separated qls-profile', () => {
    mockCore.getInput.mockImplementation((name: string) => {
      if (name === 'qls-profile') return 'security-and-quality,security-extended';
      if (name === 'token') return 'test-token';
      return '';
    });
    mockCore.getBooleanInput.mockImplementation(() => false);

    const inputs = getInputs();
    expect(inputs.qlsProfile).toBe('security-and-quality,security-extended');
  });

  it('should handle matrix language expressions', () => {
    // eslint-disable-next-line no-template-curly-in-string
    const matrixExpression = '${{ matrix.language }}';
    mockCore.getInput.mockImplementation((name: string) => {
      if (name === 'languages') return matrixExpression;
      if (name === 'token') return 'test-token';
      return '';
    });
    mockCore.getBooleanInput.mockImplementation(() => false);

    const inputs = getInputs();
    expect(inputs.languages).toBe(matrixExpression);
  });
});
