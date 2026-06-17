import {
  computed,
  onMounted,
  onUnmounted,
  ref,
  shallowRef,
  toValue,
  watch,
  type MaybeRef,
  type Ref,
} from 'vue';
import { useToast } from 'primevue/usetoast';
import { decamelizeKeys, useDataApi } from '@/composables/axios';
import {
  buildAcceptDashboardSuggestionsEndpoint,
  buildDashboardSuggestionEventsEndpoint,
  buildDashboardSuggestionLabelSetsEndpoint,
  buildDashboardSuggestionsEndpoint,
  buildGenerateDashboardSuggestionsEndpoint,
  buildLatestDashboardSuggestionRunEndpoint,
  buildRejectDashboardSuggestionsEndpoint,
  type DashboardSuggestion,
  type DashboardSuggestionEvent,
  type DashboardSuggestionLabelSet,
  type GenerateDashboardSuggestionsPayload,
  type SuggestionRun,
  isRunActive,
  runCellFailures,
} from '@/views/dashboard/partials/dashboard-suggestions';

export function useDashboardSuggestions(
  sspId: Ref<string>,
  enabled: MaybeRef<boolean> = true,
) {
  const {
    data: pendingSuggestions,
    execute: fetchPendingSuggestions,
    isLoading: pendingSuggestionsLoading,
  } = useDataApi<DashboardSuggestion[]>(null, {}, { immediate: false });
  const historySuggestions = shallowRef<DashboardSuggestion[]>([]);
  const { execute: fetchHistoryRequest, isLoading: historySuggestionsLoading } =
    useDataApi<DashboardSuggestion[]>(null, {}, { immediate: false });
  const {
    data: labelSets,
    execute: fetchLabelSets,
    isLoading: labelSetsLoading,
  } = useDataApi<DashboardSuggestionLabelSet[]>(null, {}, { immediate: false });

  const { execute: generateRequest, isLoading: generating } =
    useDataApi<SuggestionRun>(null, {}, { immediate: false });
  const { execute: acceptRequest, isLoading: accepting } = useDataApi<void>(
    null,
    {},
    { immediate: false },
  );
  const { execute: rejectRequest, isLoading: rejecting } = useDataApi<void>(
    null,
    {},
    { immediate: false },
  );
  const { execute: eventsRequest, isLoading: loadingEvents } = useDataApi<
    DashboardSuggestionEvent[]
  >(null, {}, { immediate: false });

  function canFetchSuggestions() {
    return Boolean(toValue(enabled) && sspId.value);
  }

  async function refreshPendingSuggestions() {
    if (!canFetchSuggestions()) {
      return;
    }

    return fetchPendingSuggestions(
      buildDashboardSuggestionsEndpoint(sspId.value, 'pending'),
      // Preserve raw label keys (e.g. `_policy`) on both the originating label
      // set and the proposed filter; otherwise camelcase conversion strips `_`.
      {
        camelcaseStopPaths: ['data.labelSet', 'data.proposedFilterLabelSet'],
      },
    );
  }

  async function refreshLabelSets() {
    if (!canFetchSuggestions()) {
      return;
    }

    return fetchLabelSets(
      buildDashboardSuggestionLabelSetsEndpoint(sspId.value),
      // Preserve raw label keys (e.g. `_agent`, `_plugin`) so the UI can filter
      // out internal labels; otherwise camelcase conversion strips the `_`.
      { camelcaseStopPaths: ['data.labels'] },
    );
  }

  async function generateSuggestions(
    payload: GenerateDashboardSuggestionsPayload,
  ) {
    if (!canFetchSuggestions()) {
      return;
    }

    return generateRequest(
      buildGenerateDashboardSuggestionsEndpoint(sspId.value),
      {
        method: 'POST',
        data: payload,
        transformRequest: [decamelizeKeys],
      },
    );
  }

  async function acceptSuggestions(ids: string[]) {
    if (!canFetchSuggestions()) {
      return;
    }

    await acceptRequest(buildAcceptDashboardSuggestionsEndpoint(sspId.value), {
      method: 'POST',
      data: { ids },
      transformRequest: [decamelizeKeys],
    });
    await refreshPendingSuggestions();
    await refreshHistorySuggestions();
  }

  async function refreshHistorySuggestions() {
    if (!canFetchSuggestions()) {
      historySuggestions.value = [];
      return;
    }

    const statuses = ['accepted', 'rejected', 'superseded'];
    const collected: DashboardSuggestion[] = [];

    for (const status of statuses) {
      const response = await fetchHistoryRequest(
        buildDashboardSuggestionsEndpoint(sspId.value, status),
        {
          camelcaseStopPaths: ['data.labelSet', 'data.proposedFilterLabelSet'],
        },
      );
      collected.push(...(response?.data.value?.data ?? []));
    }

    historySuggestions.value = collected;
  }

  async function rejectSuggestions(ids: string[], reason?: string) {
    if (!canFetchSuggestions()) {
      return;
    }

    await rejectRequest(buildRejectDashboardSuggestionsEndpoint(sspId.value), {
      method: 'POST',
      data: { ids, reason },
      transformRequest: [decamelizeKeys],
    });
    await refreshPendingSuggestions();
    await refreshHistorySuggestions();
  }

  async function fetchSuggestionEvents(suggestionId: string) {
    if (!canFetchSuggestions()) {
      return [];
    }

    const response = await eventsRequest(
      buildDashboardSuggestionEventsEndpoint(sspId.value, suggestionId),
    );
    return response?.data.value?.data ?? [];
  }

  onMounted(() => {
    if (canFetchSuggestions()) {
      void refreshHistorySuggestions();
    }
  });

  return {
    pendingSuggestions,
    historySuggestions,
    labelSets,
    pendingSuggestionsLoading,
    historySuggestionsLoading,
    labelSetsLoading,
    generating,
    accepting,
    rejecting,
    loadingEvents,
    refreshPendingSuggestions,
    refreshHistorySuggestions,
    refreshLabelSets,
    generateSuggestions,
    acceptSuggestions,
    rejectSuggestions,
    fetchSuggestionEvents,
  };
}

// Builds a human-readable detail string for a run that reported failures,
// preferring per-cell error messages (from `stats.failedCells`) over the
// generic top-level error.
function formatRunFailureDetail(run: SuggestionRun): string {
  const failures = runCellFailures(run);
  if (failures.length === 0) {
    return run.error ?? 'Dashboard suggestion generation failed.';
  }

  const shown = failures.slice(0, 3).map((failure) => {
    const label =
      failure.cellIndex === undefined ? 'Cell' : `Cell ${failure.cellIndex}`;
    return `${label}: ${failure.error ?? 'Failed'}`;
  });

  const remaining = failures.length - shown.length;
  if (remaining > 0) {
    shown.push(`and ${remaining} more`);
  }
  return shown.join('; ');
}

interface SuggestionRunPollerOptions {
  stopOnPollError?: boolean;
}

export function useSuggestionRunPoller(
  sspId: Ref<string>,
  onPoll?: () => Promise<void> | void,
  options: SuggestionRunPollerOptions = {},
) {
  const toast = useToast();
  const run = ref<SuggestionRun>();
  const timer = ref<number>();
  const terminalToastShownFor = ref<string>();

  const { execute, isLoading, error } = useDataApi<SuggestionRun>(
    null,
    {},
    { immediate: false },
  );

  const progressPercent = computed(() => {
    if (!run.value?.plannedCalls) {
      return 0;
    }
    return Math.min(
      100,
      Math.round((run.value.completedCells / run.value.plannedCalls) * 100),
    );
  });

  function stop() {
    if (timer.value) {
      window.clearInterval(timer.value);
      timer.value = undefined;
    }
  }

  async function pollLatest() {
    if (!sspId.value) {
      return;
    }

    try {
      const response = await execute(
        buildLatestDashboardSuggestionRunEndpoint(sspId.value),
      );
      const latestRun = response?.data.value?.data;
      if (!latestRun) {
        return;
      }
      run.value = latestRun;
      await onPoll?.();

      if (isRunActive(latestRun)) {
        start();
        return;
      }

      stop();
      const runKey = latestRun.uuid ?? latestRun.id ?? latestRun.updatedAt;
      if (runKey && terminalToastShownFor.value === runKey) {
        return;
      }
      terminalToastShownFor.value = runKey;

      const hasFailures =
        latestRun.status === 'failed' || (latestRun.failedCells ?? 0) > 0;

      if (hasFailures) {
        toast.add({
          severity: latestRun.status === 'failed' ? 'error' : 'warn',
          summary:
            latestRun.status === 'failed'
              ? 'Generation failed'
              : `${latestRun.failedCells} suggestion${latestRun.failedCells === 1 ? '' : 's'} failed`,
          detail: formatRunFailureDetail(latestRun),
          life: 8000,
        });
      } else if (latestRun.status === 'completed') {
        toast.add({
          severity: 'success',
          summary: 'Suggestions ready',
          detail: `${latestRun.completedCells} cells completed`,
          life: 3000,
        });
      }
    } catch {
      if (options.stopOnPollError) {
        stop();
      }
    }
  }

  function start() {
    if (timer.value) {
      return;
    }
    timer.value = window.setInterval(() => {
      void pollLatest();
    }, 3000);
  }

  watch(
    run,
    (nextRun) => {
      if (isRunActive(nextRun)) {
        start();
      } else {
        stop();
      }
    },
    { immediate: true },
  );

  onUnmounted(stop);

  return {
    run,
    isPolling: computed(() => Boolean(timer.value)),
    isLoading,
    error,
    progressPercent,
    pollLatest,
    start,
    stop,
  };
}
