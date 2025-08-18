import type { QueryFilter } from '../../types';

export function filterValidQueryFilters(arr: unknown): QueryFilter[] {
  if (!Array.isArray(arr)) return [];
  return arr.filter(
    (item): item is QueryFilter =>
      typeof item === 'object' &&
      item !== null &&
      'exclude' in item &&
      typeof (item as { exclude?: unknown }).exclude === 'object' &&
      (item as { exclude?: unknown }).exclude !== null &&
      'id' in ((item as { exclude?: { id?: unknown } }).exclude ?? {}) &&
      typeof ((item as { exclude: { id?: unknown } }).exclude as { id?: unknown })?.id ===
        'string',
  );
}
