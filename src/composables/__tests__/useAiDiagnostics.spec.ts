import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import { useDataApi } from '@/composables/axios';
import { useAiDiagnostics } from '@/composables/useAiDiagnostics';

vi.mock('@/composables/axios', () => ({
  useDataApi: vi.fn(),
}));

function mockDataApi(partial: {
  execute: ReturnType<typeof vi.fn>;
  isLoading?: ReturnType<typeof ref<boolean>>;
  error?: ReturnType<typeof ref<unknown>>;
}) {
  return {
    execute: partial.execute,
    isLoading: partial.isLoading ?? ref(false),
    error: partial.error ?? ref<unknown>(null),
  } as unknown as ReturnType<typeof useDataApi>;
}

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
      .mockReturnValueOnce(
        mockDataApi({
          execute: summaryRequest,
          isLoading: ref(false),
          error: ref<unknown>(null),
        }),
      )
      .mockReturnValueOnce(
        mockDataApi({
          execute: runsRequest,
          isLoading: ref(false),
          error: ref<unknown>(null),
        }),
      )
      .mockReturnValueOnce(
        mockDataApi({
          execute: runsPageRequest,
          isLoading: ref(true),
          error: ref<unknown>(null),
        }),
      )
      .mockReturnValueOnce(
        mockDataApi({
          execute: runDetailRequest,
          isLoading: ref(false),
          error: ref<unknown>(null),
        }),
      );

    const diagnostics = useAiDiagnostics();
    await diagnostics.refreshRuns();
    diagnostics.paginationError.value = 'previous pagination error';

    await diagnostics.loadMoreRuns();

    expect(runsPageRequest).not.toHaveBeenCalled();
    expect(diagnostics.paginationError.value).toBe('previous pagination error');
    expect(diagnostics.runs.value).toHaveLength(1);
    expect(diagnostics.nextCursor.value).toBe('cursor-2');
  });
});
