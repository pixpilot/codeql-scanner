import { filterValidQueryFilters } from '../../../src/config/utils/filter-valid-query-filters';

describe('filterValidQueryFilters', () => {
  it('returns empty array for non-array input', () => {
    expect(filterValidQueryFilters(null)).toEqual([]);
    expect(filterValidQueryFilters(undefined)).toEqual([]);
    expect(filterValidQueryFilters({})).toEqual([]);
  });

  it('filters valid QueryFilter objects', () => {
    const valid = [{ exclude: { id: 'foo' } }];
    expect(filterValidQueryFilters(valid)).toEqual(valid);
  });

  it('filters out invalid objects', () => {
    const arr = [
      { exclude: { id: 123 } },
      { exclude: null },
      { exclude: {} },
      { notExclude: { id: 'bar' } },
      null,
      undefined,
      42,
    ];
    expect(filterValidQueryFilters(arr)).toEqual([]);
  });
});
