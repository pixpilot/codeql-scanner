/**
 * This file is used to mock the `@actions/core` module in tests.
 */
import { jest } from '@jest/globals';

export const debug: jest.MockedFunction<(message: string) => void> = jest.fn();
export const error: jest.MockedFunction<(message: string | Error) => void> = jest.fn();
export const info: jest.MockedFunction<(message: string) => void> = jest.fn();
export const getInput: jest.MockedFunction<(name: string, options?: object) => string> =
  jest.fn();
export const setOutput: jest.MockedFunction<
  (name: string, value: string | number | boolean) => void
> = jest.fn();
export const setFailed: jest.MockedFunction<(message: string | Error) => void> =
  jest.fn();
export const warning: jest.MockedFunction<(message: string | Error) => void> = jest.fn();
