import { jest } from '@jest/globals';

export const wait: jest.MockedFunction<(milliseconds: number) => Promise<string>> =
  jest.fn();
