import type { ResourceOptions } from '../../types';

/**
 * Builds the `--ram` / `--threads` flags for the CodeQL CLI from the action inputs.
 * Only values the user actually set are forwarded, so leaving an input blank keeps
 * CodeQL's own default behaviour.
 */
export function buildResourceArgs(resources?: ResourceOptions): string[] {
  const args: string[] = [];

  const ram = resources?.ram?.trim();
  if (ram !== undefined && ram !== '') {
    args.push(`--ram=${ram}`);
  }

  const threads = resources?.threads?.trim();
  if (threads !== undefined && threads !== '') {
    args.push(`--threads=${threads}`);
  }

  return args;
}
