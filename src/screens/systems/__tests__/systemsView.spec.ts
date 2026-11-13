import { describe, expect, it } from 'vitest';
import { readView, sortLabel, sortRows, viewQuery } from '../systemsView';

const row = (name: string, version = '1.0.0', lastModified = '2026-01-01') => ({
  name,
  version,
  lastModified,
});

describe('systemsView', () => {
  it('reads defaults from an empty query and keeps them out of the URL', () => {
    const view = readView({});
    expect(view).toEqual({ q: '', sort: 'name', dir: 'ascending' });
    expect(viewQuery(view)).toEqual({});
  });

  it('round-trips search and sort through the query', () => {
    const view = readView({
      q: ' pay ',
      sort: 'lastModified',
      dir: 'descending',
    });
    expect(view).toEqual({ q: 'pay', sort: 'lastModified', dir: 'descending' });
    expect(viewQuery(view)).toEqual({
      q: 'pay',
      sort: 'lastModified',
      dir: 'descending',
    });
  });

  it('ignores unknown sort keys and directions', () => {
    expect(readView({ sort: 'evil', dir: 'sideways' })).toEqual({
      q: '',
      sort: 'name',
      dir: 'ascending',
    });
  });

  it('sorts naturally and falls back to the name on ties', () => {
    const rows = [
      row('System 10', '2.0'),
      row('System 2', '1.0'),
      row('Alpha', '2.0'),
    ];
    expect(sortRows(rows, 'name', 'ascending').map((r) => r.name)).toEqual([
      'Alpha',
      'System 2',
      'System 10',
    ]);
    expect(sortRows(rows, 'version', 'descending').map((r) => r.name)).toEqual([
      'Alpha',
      'System 10',
      'System 2',
    ]);
  });

  it('describes the sort for the table caption', () => {
    expect(sortLabel('lastModified', 'descending')).toBe(
      'last modified, newest first',
    );
  });
});
