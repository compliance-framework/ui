import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import { useSspScope } from '../useSspScope';

const api = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  decamelizeKeys: vi.fn(),
}));

vi.mock('@/composables/axios', () => ({
  useAuthenticatedInstance: () => ({
    get: api.get,
    post: api.post,
    put: api.put,
    delete: api.delete,
  }),
  decamelizeKeys: api.decamelizeKeys,
}));

const scope = {
  autoFilters: false,
  entries: [
    {
      id: 'e-1',
      labels: [{ key: 'repo', value: 'a' }],
      origin: 'manual',
      createdAt: '2026-10-19T10:00:00Z',
    },
  ],
  exceptions: [],
};

describe('useSspScope', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue({ data: { data: scope } });
    api.post.mockResolvedValue({ data: { data: { id: 'new' } } });
    api.put.mockResolvedValue({ data: {} });
    api.delete.mockResolvedValue({ data: {} });
  });

  it('loads the scope of the given SSP', async () => {
    const { scope: loaded, load } = useSspScope(ref('ssp-1'));

    await load();

    expect(api.get).toHaveBeenCalledWith(
      '/api/oscal/system-security-plans/ssp-1/scope',
    );
    expect(loaded.value).toEqual(scope);
  });

  it('does not call the API without an SSP', async () => {
    const { scope: loaded, load } = useSspScope(ref(undefined));

    await load();

    expect(api.get).not.toHaveBeenCalled();
    expect(loaded.value).toBeUndefined();
  });

  it('posts a new entry kebab-cased and reloads the scope', async () => {
    const { addEntry } = useSspScope(ref('ssp-1'));
    const labels = [{ key: 'repo', value: 'b' }];

    await addEntry(labels);

    expect(api.post).toHaveBeenCalledWith(
      '/api/oscal/system-security-plans/ssp-1/scope/entries',
      { labels },
      { transformRequest: [api.decamelizeKeys] },
    );
    expect(api.get).toHaveBeenCalledTimes(1);
  });

  it('removes an entry by posting an exception with its labels', async () => {
    const { addException } = useSspScope(ref('ssp-1'));
    const labels = [{ key: 'repo', value: 'a' }];

    await addException(labels);

    expect(api.post).toHaveBeenCalledWith(
      '/api/oscal/system-security-plans/ssp-1/scope/exceptions',
      { labels },
      { transformRequest: [api.decamelizeKeys] },
    );
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('deletes an exception by id', async () => {
    const { deleteException } = useSspScope(ref('ssp-1'));

    await deleteException('x-1');

    expect(api.delete).toHaveBeenCalledWith(
      '/api/oscal/system-security-plans/ssp-1/scope/exceptions/x-1',
    );
  });

  it('turns automatic filters on through PUT scope', async () => {
    const { setAutoFilters } = useSspScope(ref('ssp-1'));

    await setAutoFilters(true);

    expect(api.put).toHaveBeenCalledWith(
      '/api/oscal/system-security-plans/ssp-1/scope',
      { autoFilters: true },
      { transformRequest: [api.decamelizeKeys] },
    );
  });

  it('throws the API error to the caller and does not reload', async () => {
    const conflict = Object.assign(new Error('conflict'), {
      response: { status: 409 },
    });
    api.post.mockRejectedValueOnce(conflict);
    const { addException } = useSspScope(ref('ssp-1'));

    await expect(addException([{ key: 'repo', value: 'a' }])).rejects.toBe(
      conflict,
    );
    expect(api.get).not.toHaveBeenCalled();
  });
});
