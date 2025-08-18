/**
 * This file is used to mock the `@actions/core` module in tests.
 */
import { vi } from 'vitest';

export const debug = vi.fn() as ReturnType<typeof vi.mocked<(message: string) => void>>;
export const error = vi.fn() as ReturnType<
  typeof vi.mocked<(message: string | Error) => void>
>;
export const info = vi.fn() as ReturnType<typeof vi.mocked<(message: string) => void>>;
export const getInput = vi.fn() as ReturnType<
  typeof vi.mocked<(name: string, options?: object) => string>
>;
export const setOutput = vi.fn() as ReturnType<
  typeof vi.mocked<(name: string, value: string | number | boolean) => void>
>;
export const setFailed = vi.fn() as ReturnType<
  typeof vi.mocked<(message: string | Error) => void>
>;
export const warning = vi.fn() as ReturnType<
  typeof vi.mocked<(message: string | Error) => void>
>;
