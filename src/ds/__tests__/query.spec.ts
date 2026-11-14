import { describe, expect, it, vi } from 'vitest';
import { nextTick, ref } from 'vue';
import { useApiQuery } from '../query';

const api = vi.hoisted(() => ({
  state: {} as {
    data: unknown;
    error: unknown;
    isLoading: boolean;
    isFinished: boolean;
    response?: unknown;
  },
  execute: vi.fn(() => Promise.resolve()),
}));

vi.mock('@/composables/axios', () => ({
  useDataApi: () => ({
    data: ref(api.state.data),
    error: ref(api.state.error),
    isLoading: ref(api.state.isLoading),
    isFinished: ref(api.state.isFinished),
    response: ref(api.state.response),
    execute: api.execute,
  }),
}));

function statusFor(
  state: Partial<typeof api.state>,
  isEmpty?: (data: number[]) => boolean,
) {
  api.state = {
    data: undefined,
    error: undefined,
    isLoading: false,
    isFinished: true,
    ...state,
  };
  return useApiQuery<number[]>('/api/things', { isEmpty }).status.value;
}

describe('useApiQuery', () => {
  it('is loading until the request finishes', () => {
    expect(statusFor({ isLoading: true, isFinished: false })).toBe('loading');
  });

  it('is ready with data, and empty when the caller says so', () => {
    expect(statusFor({ data: [1] }, (d) => d.length === 0)).toBe('ready');
    expect(statusFor({ data: [] }, (d) => d.length === 0)).toBe('empty');
  });

  it('maps a 403 to forbidden and other failures to error', () => {
    expect(statusFor({ error: { response: { status: 403 } } })).toBe(
      'forbidden',
    );
    expect(statusFor({ error: { response: { status: 500 } } })).toBe('error');
  });

  it('maps a 404 to empty only when the caller says nothing yet is a 404', () => {
    const notFound = { error: { response: { status: 404 } } };
    expect(statusFor(notFound)).toBe('error');
    api.state = { ...api.state, ...notFound };
    expect(
      useApiQuery('/api/things', { notFoundIsEmpty: true }).status.value,
    ).toBe('empty');
  });

  it('treats a missing envelope as an error', () => {
    expect(statusFor({ data: undefined })).toBe('error');
  });

  it('treats an enveloped null (an empty Go slice) as empty', () => {
    expect(
      statusFor({ data: undefined, response: { data: { data: null } } }),
    ).toBe('empty');
  });

  it('retries by re-executing the request', () => {
    api.state = {
      data: [1],
      error: undefined,
      isLoading: false,
      isFinished: true,
    };
    useApiQuery<number[]>('/api/things').retry();
    expect(api.execute).toHaveBeenCalledWith('/api/things');
  });

  it('fetches a reactive url again when it changes, and retries the current one', async () => {
    api.execute.mockClear();
    const url = ref('/api/things?type=a');
    const query = useApiQuery<number[]>(url);
    url.value = '/api/things?type=b';
    await nextTick();
    expect(api.execute).toHaveBeenCalledWith('/api/things?type=b');
    query.retry();
    expect(api.execute).toHaveBeenLastCalledWith('/api/things?type=b');
  });
});
