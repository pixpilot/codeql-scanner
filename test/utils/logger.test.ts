import * as core from '@actions/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Logger } from '../../src/utils/logger';

vi.mock('@actions/core');

const mockCore = vi.mocked(core);

describe('logger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Logger.reset();
  });

  it('should call core.info for info messages', () => {
    const message = 'Test info message';

    Logger.info(message);

    expect(mockCore.info).toHaveBeenCalledWith(message);
  });

  it('should call core.warning for warning messages', () => {
    const message = 'Test warning message';

    Logger.warning(message);

    expect(mockCore.warning).toHaveBeenCalledWith(message);
  });

  it('should call core.error for error messages', () => {
    const message = 'Test error message';

    Logger.error(message);

    expect(mockCore.error).toHaveBeenCalledWith(message);
  });

  it('should call core.debug for debug messages', () => {
    const message = 'Test debug message';

    Logger.debug(message);

    expect(mockCore.debug).toHaveBeenCalledWith(message);
  });

  it('should call core.setFailed for failed messages', () => {
    const message = 'Test failed message';

    Logger.setFailed(message);

    expect(mockCore.setFailed).toHaveBeenCalledWith(message);
  });

  it('should count logged errors', () => {
    expect(Logger.getErrorCount()).toBe(0);

    Logger.error('first');
    Logger.error('second');

    expect(Logger.getErrorCount()).toBe(2);
  });

  it('should not count info, warning or debug messages as errors', () => {
    Logger.info('info');
    Logger.warning('warning');
    Logger.debug('debug');

    expect(Logger.getErrorCount()).toBe(0);
    expect(Logger.hasFailed()).toBe(false);
  });

  it('should track that the run has failed once setFailed is called', () => {
    expect(Logger.hasFailed()).toBe(false);

    Logger.setFailed('boom');

    expect(Logger.hasFailed()).toBe(true);
    expect(Logger.getErrorCount()).toBe(1);
  });

  it('should reset the error state', () => {
    Logger.error('boom');
    Logger.setFailed('boom');

    Logger.reset();

    expect(Logger.getErrorCount()).toBe(0);
    expect(Logger.hasFailed()).toBe(false);
  });
});
