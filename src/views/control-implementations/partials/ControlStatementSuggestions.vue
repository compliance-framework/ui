<script setup lang="ts">
/** A statement's suggested components, each with Add, and Apply all suggestions. */
import { computed } from 'vue';
import Button from '@/ds/components/Button/Button.vue';
import InlineMessage from '@/ds/components/InlineMessage/InlineMessage.vue';
import Text from '@/ds/components/Text/Text.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import type { SuggestedComponent } from './component-suggestions';

const props = defineProps<{
  statementReady: boolean;
  sspReady: boolean;
  suggestionsLoading: boolean;
  suggestionsError: string;
  displayedSuggestions: SuggestedComponent[];
  unappliedSuggestions: SuggestedComponent[];
  allSuggestionsApplied: boolean;
  applyingAllSuggestions: boolean;
  appliedUuids: ReadonlySet<string>;
  applyingUuids: ReadonlySet<string>;
}>();

const emit = defineEmits<{
  applyAll: [];
  applySuggestion: [suggestion: SuggestedComponent];
}>();

function formatRelevanceScore(score: number | undefined): string {
  if (typeof score !== 'number' || Number.isNaN(score)) {
    return '';
  }
  return score.toFixed(2);
}

// Why a button can't be used yet, or undefined when it can.
const notReady = () =>
  !props.statementReady
    ? 'The statement is still being created.'
    : !props.sspReady
      ? 'Choose a system first.'
      : undefined;
const applyAllDenied = computed(
  () =>
    notReady() ??
    (props.suggestionsLoading
      ? 'Suggestions are loading.'
      : props.unappliedSuggestions.length === 0
        ? 'Every suggestion is applied.'
        : undefined),
);
const addDenied = (suggestion: SuggestedComponent) =>
  props.appliedUuids.has(suggestion.componentUuid)
    ? 'Already added.'
    : props.applyingUuids.has(suggestion.componentUuid)
      ? 'Being added.'
      : props.applyingAllSuggestions
        ? 'Applying all suggestions.'
        : notReady();
</script>

<template>
  <Stack gap="3">
    <Cluster justify="between" gap="2">
      <Text as="span" variant="label">Suggested components</Text>
      <Button
        :loading="applyingAllSuggestions"
        :disabled-reason="applyAllDenied"
        @click="emit('applyAll')"
        >Apply all suggestions</Button
      >
    </Cluster>
    <Text v-if="suggestionsLoading" variant="caption"
      >Loading suggested components…</Text
    >
    <InlineMessage
      v-else-if="suggestionsError"
      tone="error"
      title="Suggestions not loaded"
      ><p>You can still add components yourself.</p></InlineMessage
    >
    <Text v-else-if="displayedSuggestions.length === 0" variant="caption"
      >No suggestions for this statement.</Text
    >
    <Stack v-else gap="2" as="ul">
      <li
        v-for="suggestion in displayedSuggestions"
        :key="suggestion.componentUuid"
      >
        <Cluster justify="between" gap="2">
          <Stack gap="1">
            <Text as="span">{{ suggestion.title }}</Text>
            <Text as="span" variant="caption"
              >{{ suggestion.type
              }}<template
                v-if="
                  typeof suggestion.relevanceScore === 'number' &&
                  !Number.isNaN(suggestion.relevanceScore)
                "
              >
                · Relevance
                {{ formatRelevanceScore(suggestion.relevanceScore) }}</template
              ></Text
            >
          </Stack>
          <Button
            :disabled-reason="addDenied(suggestion)"
            @click="emit('applySuggestion', suggestion)"
            >{{
              appliedUuids.has(suggestion.componentUuid) ? 'Added' : 'Add'
            }}</Button
          >
        </Cluster>
      </li>
    </Stack>
    <Text v-if="allSuggestionsApplied" variant="caption"
      >All suggestions applied.</Text
    >
  </Stack>
</template>
