import { parse } from 'yaml';

export function safeParseYaml(content: string): Record<string, unknown> | null {
  try {
    // eslint-disable-next-line ts/no-unsafe-assignment
    const result = parse(content);
    return Boolean(result) && typeof result === 'object' && !Array.isArray(result)
      ? (result as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}
