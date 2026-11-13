import { describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import { useApiQuery } from '../query';

const api = vi.hoisted(() => ({
  state: {} as {
    data: unknown;
    error: unknown;
    isLoading: boolean;
    isFinished: boolean;
  },
  execute: vi.fn(() => Promise.resolve()),
}));

vi.mock('@/composables/axios', () => ({
  useDataApi: () => ({
    data: ref(api.state.data),
    error: ref(api.state.error),
    isLoading: ref(api.state.isLoading),
    isFinished: ref(api.state.isFinished),
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

  it('treats a missing envelope as an error', () => {
    expect(statusFor({ data: undefined })).toBe('error');
  });

  it('retries by re-executing the request', () => {
    api.state = {
      data: [1],
      error: undefined,
      isLoading: false,
      isFinished: true,
    };
    useApiQuery<number[]>('/api/things').retry();
    expect(api.execute).toHaveBeenCalled();
  });
});
