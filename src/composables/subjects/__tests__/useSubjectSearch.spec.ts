import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AxiosError, AxiosHeaders } from 'axios';
import { useSubjectSearch } from '../useSubjectSearch';

const { getMock } = vi.hoisted(() => ({ getMock: vi.fn() }));

vi.mock('@/composables/axios', () => ({
  useAuthenticatedInstance: () => ({ get: getMock }),
}));

function notFound() {
  return new AxiosError('Not Found', '404', undefined, undefined, {
    status: 404,
    statusText: 'Not Found',
    headers: {},
    config: { headers: new AxiosHeaders() },
    data: {},
  });
}

describe('useSubjectSearch', () => {
  beforeEach(() => {
    getMock.mockReset();
  });

  it('searches subjects by title', async () => {
    const subject = {
      subjectUuid: 's-1',
      type: 'component',
      kind: 'defined-component',
      title: 'GitHub Organization: acme',
    };
    getMock.mockResolvedValue({ data: { data: [subject] } });
    const { suggestions, search } = useSubjectSearch();

    await search('  acme ');

    expect(getMock).toHaveBeenCalledWith('/api/subjects', {
      params: { search: 'acme', ssp: undefined, limit: 20 },
    });
    expect(suggestions.value).toEqual([subject]);
  });

  it('lists the first subjects for an empty search', async () => {
    getMock.mockResolvedValue({ data: { data: [] } });
    const { search } = useSubjectSearch();

    await search('');

    expect(getMock).toHaveBeenCalledWith('/api/subjects', {
      params: { search: undefined, ssp: undefined, limit: 20 },
    });
  });

  it('reports an API without subjects as unsupported', async () => {
    getMock.mockRejectedValue(notFound());
    const { suggestions, unsupported, search } = useSubjectSearch();

    await search('acme');

    expect(unsupported.value).toBe(true);
    expect(suggestions.value).toEqual([]);
  });

  it('keeps the latest search when an earlier one resolves after it', async () => {
    const pay = { subjectUuid: 's-1', title: 'pay' };
    const payments = { subjectUuid: 's-2', title: 'payments' };
    let resolvePay!: (value: unknown) => void;
    getMock
      .mockReturnValueOnce(new Promise((resolve) => (resolvePay = resolve)))
      .mockResolvedValueOnce({ data: { data: [payments] } });
    const { suggestions, search } = useSubjectSearch();

    const first = search('pay');
    await search('payments');
    resolvePay({ data: { data: [pay] } });
    await first;

    expect(suggestions.value).toEqual([payments]);
  });

  it('narrows system components to an SSP', async () => {
    getMock.mockResolvedValue({ data: { data: [] } });
    const { search } = useSubjectSearch();

    await search('firewall', { ssp: 'ssp-1' });

    expect(getMock).toHaveBeenCalledWith('/api/subjects', {
      params: { search: 'firewall', ssp: 'ssp-1', limit: 20 },
    });
  });

  it('looks subjects up by ID', async () => {
    getMock.mockResolvedValue({ data: { data: [{ subjectUuid: 's-1' }] } });
    const { lookup } = useSubjectSearch();

    const found = await lookup(['s-1', 's-2']);

    expect(getMock).toHaveBeenCalledWith('/api/subjects', {
      params: { ids: 's-1,s-2', limit: 2 },
    });
    expect(found).toEqual([{ subjectUuid: 's-1' }]);
  });

  it('returns no subjects when a lookup fails or there is nothing to look up', async () => {
    getMock.mockRejectedValue(notFound());
    const { lookup } = useSubjectSearch();

    expect(await lookup(['s-1'])).toEqual([]);
    expect(await lookup([])).toEqual([]);
    expect(getMock).toHaveBeenCalledTimes(1);
  });
});
