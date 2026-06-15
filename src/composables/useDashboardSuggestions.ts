import {
  computed,
  onMounted,
  onUnmounted,
  ref,
  shallowRef,
  watch,
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
} from '@/views/dashboard/partials/dashboard-suggestions';

export function useDashboardSuggestions(sspId: Ref<string>) {
  const pendingEndpoint = computed(() =>
    sspId.value
      ? buildDashboardSuggestionsEndpoint(sspId.value, 'pending')
      : '',
  );
  const labelSetsEndpoint = computed(() =>
    sspId.value ? buildDashboardSuggestionLabelSetsEndpoint(sspId.value) : '',
  );

  const {
    data: pendingSuggestions,
    execute: refreshPendingSuggestions,
    isLoading: pendingSuggestionsLoading,
  } = useDataApi<DashboardSuggestion[]>(pendingEndpoint);
  const historySuggestions = shallowRef<DashboardSuggestion[]>([]);
  const { execute: fetchHistoryRequest, isLoading: historySuggestionsLoading } =
    useDataApi<DashboardSuggestion[]>(null, {}, { immediate: false });
  const {
    data: labelSets,
    execute: refreshLabelSets,
    isLoading: labelSetsLoading,
  } = useDataApi<DashboardSuggestionLabelSet[]>(labelSetsEndpoint);

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

  async function generateSuggestions(
    payload: GenerateDashboardSuggestionsPayload,
  ) {
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
    await acceptRequest(buildAcceptDashboardSuggestionsEndpoint(sspId.value), {
      method: 'POST',
      data: { ids },
      transformRequest: [decamelizeKeys],
    });
    await refreshPendingSuggestions();
    await refreshHistorySuggestions();
  }

  async function refreshHistorySuggestions() {
    if (!sspId.value) {
      historySuggestions.value = [];
      return;
    }

    const statuses = ['accepted', 'rejected', 'superseded'];
    const responses = await Promise.all(
      statuses.map((status) =>
        fetchHistoryRequest(
          buildDashboardSuggestionsEndpoint(sspId.value, status),
        ),
      ),
    );
    historySuggestions.value = responses.flatMap(
      (response) => response?.data.value?.data ?? [],
    );
  }

  async function rejectSuggestions(ids: string[], reason?: string) {
    await rejectRequest(buildRejectDashboardSuggestionsEndpoint(sspId.value), {
      method: 'POST',
      data: { ids, reason },
      transformRequest: [decamelizeKeys],
    });
    await refreshPendingSuggestions();
    await refreshHistorySuggestions();
  }

  async function fetchSuggestionEvents(suggestionId: string) {
    const response = await eventsRequest(
      buildDashboardSuggestionEventsEndpoint(sspId.value, suggestionId),
    );
    return response?.data.value?.data ?? [];
  }

  onMounted(() => {
    void refreshHistorySuggestions();
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

export function useSuggestionRunPoller(
  sspId: Ref<string>,
  onPoll?: () => Promise<void> | void,
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

      if (latestRun.status === 'completed') {
        toast.add({
          severity: 'success',
          summary: 'Suggestions ready',
          detail: `${latestRun.completedCells} cells completed`,
          life: 3000,
        });
      } else if (latestRun.status === 'failed') {
        toast.add({
          severity: 'error',
          summary: 'Generation failed',
          detail: latestRun.error ?? 'Dashboard suggestion generation failed.',
          life: 5000,
        });
      }
    } catch {
      stop();
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
