import { computed, onUnmounted, ref, shallowRef } from 'vue';
import { useDataApi } from '@/composables/axios';
import {
  buildAiDiagnosticsRunDetailEndpoint,
  buildAiDiagnosticsRunsEndpoint,
  buildAiDiagnosticsSummaryEndpoint,
  type AiDiagnosticsRun,
  type AiDiagnosticsRunDetail,
  type AiDiagnosticsRunsFilters,
  type AiDiagnosticsRunsResponse,
  type AiDiagnosticsSummary,
} from '@/views/admin/partials/ai-diagnostics';

const labelKeyStopPaths = [
  'data.scope.labelSets',
  'data.cells.labelSets',
  'data.events.metadata',
];

function unavailableMessage(fallback: string, error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

export function useAiDiagnostics() {
  const summary = shallowRef<AiDiagnosticsSummary | null>(null);
  const runs = shallowRef<AiDiagnosticsRun[]>([]);
  const nextCursor = ref<string | null>(null);
  const runsError = ref<string | null>(null);
  const paginationError = ref<string | null>(null);
  const summaryError = ref<string | null>(null);
  const selectedRunDetail = shallowRef<AiDiagnosticsRunDetail | null>(null);
  const runDetailError = ref<string | null>(null);
  const pollTimer = ref<number>();

  const {
    execute: summaryRequest,
    isLoading: summaryLoading,
    error: summaryRequestError,
  } = useDataApi<AiDiagnosticsSummary>(null, {}, { immediate: false });

  const {
    execute: runsRequest,
    isLoading: runsLoading,
    error: runsRequestError,
  } = useDataApi<AiDiagnosticsRun[]>(null, {}, { immediate: false });

  const { execute: runsPageRequest } = useDataApi<AiDiagnosticsRun[]>(
    null,
    {},
    { immediate: false },
  );

  const { execute: runDetailRequest, isLoading: runDetailLoading } =
    useDataApi<AiDiagnosticsRunDetail>(null, {}, { immediate: false });

  async function refreshSummary() {
    summaryError.value = null;

    try {
      const response = await summaryRequest(
        buildAiDiagnosticsSummaryEndpoint(),
      );
      summary.value = response?.data.value?.data ?? null;
    } catch (error) {
      summary.value = null;
      summaryError.value = unavailableMessage(
        'AI diagnostics summary is unavailable.',
        error,
      );
    }
  }

  async function refreshRuns(filters: AiDiagnosticsRunsFilters = {}) {
    runsError.value = null;
    paginationError.value = null;
    nextCursor.value = null;

    try {
      const response = await runsRequest(
        buildAiDiagnosticsRunsEndpoint(filters),
        { camelcaseStopPaths: labelKeyStopPaths },
      );
      const payload = response?.data.value as
        | AiDiagnosticsRunsResponse
        | undefined;

      runs.value = payload?.data ?? [];
      nextCursor.value = payload?.meta?.nextCursor ?? null;
    } catch (error) {
      runs.value = [];
      runsError.value = unavailableMessage(
        'AI diagnostics runs are unavailable.',
        error,
      );
    }
  }

  async function loadMoreRuns(filters: AiDiagnosticsRunsFilters = {}) {
    if (!nextCursor.value) {
      return;
    }

    paginationError.value = null;

    try {
      const response = await runsPageRequest(
        buildAiDiagnosticsRunsEndpoint({
          ...filters,
          cursor: nextCursor.value,
        }),
        { camelcaseStopPaths: labelKeyStopPaths },
      );
      const payload = response?.data.value as
        | AiDiagnosticsRunsResponse
        | undefined;

      runs.value = [...runs.value, ...(payload?.data ?? [])];
      nextCursor.value = payload?.meta?.nextCursor ?? null;
    } catch (error) {
      paginationError.value = unavailableMessage(
        'More AI diagnostics runs are unavailable.',
        error,
      );
    }
  }

  async function fetchRunDetail(runId: string) {
    runDetailError.value = null;
    selectedRunDetail.value = null;

    try {
      const response = await runDetailRequest(
        buildAiDiagnosticsRunDetailEndpoint(runId),
        { camelcaseStopPaths: labelKeyStopPaths },
      );
      selectedRunDetail.value = response?.data.value?.data ?? null;
    } catch (error) {
      runDetailError.value = unavailableMessage(
        'AI diagnostics run details are unavailable.',
        error,
      );
    }

    return selectedRunDetail.value;
  }

  function stopPolling() {
    if (!pollTimer.value) {
      return;
    }

    window.clearInterval(pollTimer.value);
    pollTimer.value = undefined;
  }

  function pollWhileActive(callback: () => Promise<void> | void) {
    if (pollTimer.value) {
      return;
    }

    pollTimer.value = window.setInterval(() => {
      void callback();
    }, 30000);
  }

  onUnmounted(stopPolling);

  return {
    summary,
    runs,
    nextCursor,
    selectedRunDetail,
    summaryLoading,
    runsLoading,
    runDetailLoading,
    summaryError: computed(
      () =>
        summaryError.value ??
        (summaryRequestError.value
          ? unavailableMessage(
              'AI diagnostics summary is unavailable.',
              summaryRequestError.value,
            )
          : null),
    ),
    runsError: computed(
      () =>
        runsError.value ??
        (runsRequestError.value
          ? unavailableMessage(
              'AI diagnostics runs are unavailable.',
              runsRequestError.value,
            )
          : null),
    ),
    paginationError,
    runDetailError,
    refreshSummary,
    refreshRuns,
    loadMoreRuns,
    fetchRunDetail,
    pollWhileActive,
    stopPolling,
  };
}
