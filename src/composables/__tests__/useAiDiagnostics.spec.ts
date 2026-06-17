import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import { useDataApi } from '@/composables/axios';
import { useAiDiagnostics } from '@/composables/useAiDiagnostics';

vi.mock('@/composables/axios', () => ({
  useDataApi: vi.fn(),
}));

describe('useAiDiagnostics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not start a pagination request while one is already loading', async () => {
    const summaryRequest = vi.fn();
    const runsRequest = vi.fn(async () => ({
      data: {
        value: {
          data: [
            {
              id: 'run-1',
              status: 'completed',
            },
          ],
          meta: {
            nextCursor: 'cursor-2',
          },
        },
      },
    }));
    const runsPageRequest = vi.fn();
    const runDetailRequest = vi.fn();

    vi.mocked(useDataApi)
      .mockReturnValueOnce({
        execute: summaryRequest,
        isLoading: ref(false),
        error: ref(null),
      } as ReturnType<typeof useDataApi>)
      .mockReturnValueOnce({
        execute: runsRequest,
        isLoading: ref(false),
        error: ref(null),
      } as ReturnType<typeof useDataApi>)
      .mockReturnValueOnce({
        execute: runsPageRequest,
        isLoading: ref(true),
        error: ref(null),
      } as ReturnType<typeof useDataApi>)
      .mockReturnValueOnce({
        execute: runDetailRequest,
        isLoading: ref(false),
        error: ref(null),
      } as ReturnType<typeof useDataApi>);

    const diagnostics = useAiDiagnostics();
    await diagnostics.refreshRuns();
    diagnostics.paginationError.value = 'previous pagination error';

    await diagnostics.loadMoreRuns();

    expect(runsPageRequest).not.toHaveBeenCalled();
    expect(diagnostics.paginationError.value).toBe(
      'previous pagination error',
    );
    expect(diagnostics.runs.value).toHaveLength(1);
    expect(diagnostics.nextCursor.value).toBe('cursor-2');
  });
});
