import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, ref } from 'vue';

const mocks = vi.hoisted(() => ({
  execute: vi.fn(),
  toastAdd: vi.fn(),
}));

vi.mock('@/composables/axios', () => ({
  useDataApi: () => ({
    execute: mocks.execute,
    isLoading: { value: false },
    error: { value: null },
  }),
  decamelizeKeys: vi.fn((data: unknown) => JSON.stringify(data)),
}));

vi.mock('primevue/usetoast', () => ({
  useToast: () => ({ add: mocks.toastAdd }),
}));

import { useSuggestionRunPoller } from '../useDashboardSuggestions';

function response(status: string, completedCells: number, id = status) {
  return {
    data: {
      value: {
        data: {
          id,
          status,
          plannedCalls: 2,
          completedCells,
          failedCells: 0,
        },
      },
    },
  };
}

describe('useSuggestionRunPoller', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts polling active runs, stops on terminal status, and fires toast', async () => {
    const onPoll = vi.fn();
    mocks.execute
      .mockResolvedValueOnce(response('running', 1, 'run-1'))
      .mockResolvedValueOnce(response('completed', 2, 'run-1'));

    const scope = effectScope();
    const poller = scope.run(() =>
      useSuggestionRunPoller(ref('ssp-1'), onPoll),
    );

    await poller?.pollLatest();
    expect(poller?.isPolling.value).toBe(true);

    await vi.advanceTimersByTimeAsync(3000);

    expect(mocks.execute).toHaveBeenCalledTimes(2);
    expect(onPoll).toHaveBeenCalledTimes(2);
    expect(poller?.isPolling.value).toBe(false);
    expect(mocks.toastAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'success',
        summary: 'Suggestions ready',
      }),
    );

    scope.stop();
  });

  it('surfaces failure details when a completed run reports failed cells', async () => {
    mocks.execute.mockResolvedValueOnce({
      data: {
        value: {
          data: {
            id: 'run-1',
            status: 'completed',
            plannedCalls: 2,
            completedCells: 1,
            failedCells: 1,
            stats: {
              failedCells: [{ cellIndex: 2, error: 'model timed out' }],
            },
          },
        },
      },
    });

    const scope = effectScope();
    const poller = scope.run(() => useSuggestionRunPoller(ref('ssp-1')));

    await poller?.pollLatest();

    expect(mocks.toastAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'warn',
        summary: '1 suggestion failed',
        detail: 'Cell 2: model timed out',
      }),
    );
    expect(mocks.toastAdd).not.toHaveBeenCalledWith(
      expect.objectContaining({ summary: 'Suggestions ready' }),
    );

    scope.stop();
  });

  it('keeps polling after a transient poll error', async () => {
    mocks.execute
      .mockRejectedValueOnce(new Error('temporary outage'))
      .mockResolvedValueOnce(response('completed', 2, 'run-1'));

    const scope = effectScope();
    const poller = scope.run(() => useSuggestionRunPoller(ref('ssp-1')));

    poller?.start();
    await vi.advanceTimersByTimeAsync(3000);
    await vi.advanceTimersByTimeAsync(3000);

    expect(mocks.execute).toHaveBeenCalledTimes(2);

    scope.stop();
  });
});
