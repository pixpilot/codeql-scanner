import * as core from '@actions/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Logger } from '../../src/utils/logger';

vi.mock('@actions/core');

const mockCore = vi.mocked(core);

describe('logger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});
