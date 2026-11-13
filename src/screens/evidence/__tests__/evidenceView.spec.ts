import { describe, expect, it } from 'vitest';
import {
  readView,
  searchError,
  searchRequest,
  viewQuery,
} from '../evidenceView';

describe('evidenceView', () => {
  it('reads defaults and keeps them out of the URL', () => {
    const view = readView({});
    expect(view).toEqual({
      filter: '',
      page: 1,
      sortBy: 'lastSeenAt',
      sortDirection: 'desc',
      subject: '',
    });
    expect(viewQuery(view)).toEqual({});
  });

  it("round-trips the classic page's parameter names", () => {
    const query = {
      filter: 'provider=aws',
      page: '3',
      sortBy: 'name',
      sortDirection: 'asc',
      subject: 'abc',
    };
    expect(viewQuery(readView(query))).toEqual(query);
  });

  it('ignores invalid pages and sorts', () => {
    expect(
      readView({ page: '-2', sortBy: 'evil', sortDirection: 'up' }),
    ).toEqual(
      expect.objectContaining({
        page: 1,
        sortBy: 'lastSeenAt',
        sortDirection: 'desc',
      }),
    );
  });

  it('validates searches like the classic page', () => {
    expect(searchError('')).toBeUndefined();
    expect(searchError('ab')).toBe(
      'Title searches need at least 3 characters.',
    );
    expect(searchError('backup')).toBeUndefined();
    expect(searchError('provider=')).toBe('Finish the condition with a value.');
    expect(searchError('provider=aws AND (env=prod')).toMatch(
      /^Check the query/,
    );
    expect(searchError('provider=aws AND env!=test')).toBeUndefined();
  });

  it('sends title searches as a name parameter and label queries as a filter', () => {
    const title = searchRequest(readView({ filter: 'backup' }));
    expect(title.params).toEqual(
      expect.objectContaining({ name: 'backup', page: '1', limit: '50' }),
    );

    const label = searchRequest(
      readView({ filter: 'provider=aws', subject: 's1' }),
    );
    expect(label.params.name).toBeUndefined();
    expect(label.params.subjectUuid).toBe('s1');
    expect(JSON.stringify(label.body.filter)).toContain('provider');
  });
});
