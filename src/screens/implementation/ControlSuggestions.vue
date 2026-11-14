<script setup lang="ts">
/**
 * The AI evidence-filter suggestions for one control, in the Implementation drawer: each pending
 * suggestion with its filter name, confidence, labels (system labels hidden) and reasoning, and a
 * link to review them; otherwise whether AI found no match, has nothing pending, or hasn't looked.
 */
import { computed } from 'vue';
import type {
  ControlSuggestionResult,
  DashboardSuggestion,
} from '@/views/dashboard/partials/dashboard-suggestions';
import { formatVisibleLabelSet } from '@/views/dashboard/partials/dashboard-suggestions';
import { formatDateTime } from '@/ds/format';
import InlineMessage from '@/ds/components/InlineMessage/InlineMessage.vue';
import Tag from '@/ds/components/Tag/Tag.vue';
import Text from '@/ds/components/Text/Text.vue';
import TextLink from '@/ds/components/TextLink/TextLink.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Panel from '@/ds/components/layout/Panel.vue';
import Stack from '@/ds/components/layout/Stack.vue';

const props = defineProps<{
  sspId?: string;
  suggestions: DashboardSuggestion[];
  result?: ControlSuggestionResult;
  loading?: boolean;
}>();

const hasSuggestions = computed(() => props.suggestions.length > 0);

const emptyText = computed(() => {
  if (props.result?.outcome === 'no_match') {
    const at = props.result.evaluatedAt;
    return `AI reviewed this control and found no matching evidence filter${
      at && !Number.isNaN(Date.parse(at)) ? ` on ${formatDateTime(at)}` : ''
    }.`;
  }
  return props.result?.outcome === 'matched'
    ? 'No pending AI evidence filter suggestions for this control.'
    : "AI hasn't evaluated this control yet.";
});

const key = (suggestion: DashboardSuggestion, index: number) =>
  suggestion.id ?? suggestion.uuid ?? `${suggestion.controlId}-${index}`;
const name = (suggestion: DashboardSuggestion) =>
  suggestion.proposedFilterName ??
  suggestion.targetFilterName ??
  'Proposed evidence filter';
const confidence = (suggestion: DashboardSuggestion) =>
  suggestion.confidence === undefined || suggestion.confidence === null
    ? 'Confidence unavailable'
    : `${Math.round(suggestion.confidence * 100)}% confidence`;
const labels = (suggestion: DashboardSuggestion) =>
  formatVisibleLabelSet(suggestion.proposedFilterLabelSet ?? {});
</script>

<template>
  <Stack gap="3">
    <Cluster justify="between" gap="2">
      <Text variant="label">AI evidence filter suggestions</Text>
      <TextLink
        v-if="hasSuggestions && sspId"
        :to="{ name: 'dashboards.suggestions', params: { sspId } }"
        >Review suggestions</TextLink
      >
    </Cluster>
    <Text v-if="loading" variant="secondary"
      >Loading AI evidence filter suggestions…</Text
    >
    <template v-else-if="hasSuggestions">
      <Panel
        v-for="(suggestion, index) in suggestions"
        :key="key(suggestion, index)"
        :title="name(suggestion)"
        :description="confidence(suggestion)"
        :level="3"
      >
        <Stack gap="2">
          <Cluster v-if="labels(suggestion).length" gap="1">
            <Tag
              v-for="label in labels(suggestion)"
              :key="label"
              :label="label"
            />
          </Cluster>
          <Text v-if="suggestion.reasoning" variant="secondary">{{
            suggestion.reasoning
          }}</Text>
        </Stack>
      </Panel>
    </template>
    <InlineMessage
      v-else-if="result?.outcome === 'no_match'"
      tone="info"
      :title="emptyText"
    />
    <Text v-else variant="secondary">{{ emptyText }}</Text>
  </Stack>
</template>
