<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterLink } from 'vue-router';
import Chip from '@/volt/Chip.vue';
import Message from '@/volt/Message.vue';
import type {
  ControlSuggestionResult,
  DashboardSuggestion,
} from '@/views/dashboard/partials/dashboard-suggestions';
import { formatVisibleLabelSet } from '@/views/dashboard/partials/dashboard-suggestions';

const props = defineProps<{
  controlId?: string;
  sspId?: string;
  suggestions: DashboardSuggestion[];
  result?: ControlSuggestionResult;
  loading?: boolean;
}>();

const expandedReasoning = ref(new Set<string>());

const reviewRoute = computed(() => ({
  name: 'dashboards.suggestions',
  params: { sspId: props.sspId },
}));

const hasSuggestions = computed(() => props.suggestions.length > 0);
const noMatch = computed(
  () => !hasSuggestions.value && props.result?.outcome === 'no_match',
);
const matchedWithoutPending = computed(
  () => !hasSuggestions.value && props.result?.outcome === 'matched',
);

function suggestionKey(suggestion: DashboardSuggestion, index: number): string {
  return suggestion.id ?? suggestion.uuid ?? `${suggestion.controlId}-${index}`;
}

function confidenceLabel(confidence: number | undefined): string {
  if (confidence === undefined || confidence === null) {
    return 'Confidence unavailable';
  }
  return `${Math.round(confidence * 100)}% confidence`;
}

function filterName(suggestion: DashboardSuggestion): string {
  return (
    suggestion.proposedFilterName ??
    suggestion.targetFilterName ??
    'Proposed dashboard filter'
  );
}

function visibleLabels(suggestion: DashboardSuggestion): string[] {
  return formatVisibleLabelSet(suggestion.proposedFilterLabelSet ?? {});
}

function formatEvaluatedAt(value?: string): string {
  if (!value) {
    return '';
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

function isReasoningExpanded(key: string): boolean {
  return expandedReasoning.value.has(key);
}

function toggleReasoning(key: string) {
  const next = new Set(expandedReasoning.value);
  if (next.has(key)) {
    next.delete(key);
  } else {
    next.add(key);
  }
  expandedReasoning.value = next;
}
</script>

<template>
  <section class="mb-6" data-testid="control-implementation-suggestions">
    <div class="mb-3 flex items-center justify-between gap-4">
      <h4 class="m-0 text-base font-medium">AI dashboard suggestions</h4>
      <RouterLink
        v-if="hasSuggestions && sspId"
        :to="reviewRoute"
        class="text-sm font-medium text-blue-600 underline dark:text-blue-300"
      >
        Review in dashboard suggestions
      </RouterLink>
    </div>

    <Message v-if="loading" severity="info" variant="simple">
      <span class="flex items-center gap-2">
        <i class="pi pi-spin pi-spinner"></i>
        Loading AI dashboard suggestions...
      </span>
    </Message>

    <div v-else-if="hasSuggestions" class="space-y-3">
      <div
        v-for="(suggestion, index) in suggestions"
        :key="suggestionKey(suggestion, index)"
        class="rounded-md border border-zinc-200 p-3 dark:border-slate-700"
      >
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="font-semibold text-zinc-800 dark:text-slate-100">
              {{ filterName(suggestion) }}
            </p>
            <p class="mt-1 text-sm text-zinc-500">
              {{ confidenceLabel(suggestion.confidence) }}
            </p>
          </div>
        </div>

        <div
          v-if="visibleLabels(suggestion).length"
          class="mt-3 flex flex-wrap gap-2"
        >
          <Chip
            v-for="label in visibleLabels(suggestion)"
            :key="label"
            :label="label"
          />
        </div>

        <div v-if="suggestion.reasoning" class="mt-3 text-sm">
          <p
            class="text-zinc-600 dark:text-slate-300"
            :class="
              isReasoningExpanded(suggestionKey(suggestion, index))
                ? ''
                : 'max-h-10 overflow-hidden'
            "
          >
            {{ suggestion.reasoning }}
          </p>
          <button
            type="button"
            class="mt-1 text-sm font-medium text-blue-600 underline dark:text-blue-300"
            @click="toggleReasoning(suggestionKey(suggestion, index))"
          >
            {{
              isReasoningExpanded(suggestionKey(suggestion, index))
                ? 'Show less'
                : 'Show more'
            }}
          </button>
        </div>
      </div>
    </div>

    <Message v-else-if="noMatch" severity="info" variant="outlined">
      AI reviewed this control and found no matching dashboard filter<span
        v-if="formatEvaluatedAt(result?.evaluatedAt)"
      >
        on {{ formatEvaluatedAt(result?.evaluatedAt) }}</span
      >.
    </Message>

    <p v-else class="text-sm text-zinc-500 dark:text-slate-400">
      {{
        matchedWithoutPending
          ? 'No pending AI dashboard suggestions for this control.'
          : "AI hasn't evaluated this control yet."
      }}
    </p>
  </section>
</template>
