<script setup lang="ts">
import Button from '@/volt/Button.vue';
import Message from '@/volt/Message.vue';
import type { SuggestedComponent } from './component-suggestions';

defineProps<{
  statementReady: boolean;
  sspReady: boolean;
  suggestionsLoading: boolean;
  suggestionsError: string;
  displayedSuggestions: SuggestedComponent[];
  unappliedSuggestions: SuggestedComponent[];
  allSuggestionsApplied: boolean;
  applyingAllSuggestions: boolean;
  isSuggestionApplied: (componentUuid: string) => boolean;
  isSuggestionApplying: (componentUuid: string) => boolean;
  formatRelevanceScore: (score: number | undefined) => string;
}>();

const emit = defineEmits<{
  applyAll: [];
  applySuggestion: [suggestion: SuggestedComponent];
}>();
</script>

<template>
  <div class="mb-6">
    <div class="flex items-center justify-between gap-4 mb-3">
      <h4 class="m-0 font-medium text-base">Suggested Components</h4>
      <Button
        type="button"
        severity="secondary"
        :disabled="
          !statementReady ||
          !sspReady ||
          applyingAllSuggestions ||
          suggestionsLoading ||
          unappliedSuggestions.length === 0
        "
        :label="
          applyingAllSuggestions ? 'Applying...' : 'Apply All Suggestions'
        "
        @click="emit('applyAll')"
      />
    </div>

    <Message v-if="suggestionsLoading" severity="info" variant="simple">
      <span class="flex items-center gap-2">
        <i class="pi pi-spin pi-spinner"></i>
        Loading suggested components...
      </span>
    </Message>
    <Message v-else-if="suggestionsError" severity="error">
      Failed to load suggestions. You can still add components manually.
    </Message>
    <Message v-else-if="displayedSuggestions.length === 0" severity="secondary">
      No suggestions available for this statement.
    </Message>
    <div v-else class="space-y-3">
      <div class="flex flex-wrap gap-2">
        <Button
          v-for="suggestion in displayedSuggestions"
          :key="suggestion.componentUuid"
          type="button"
          size="small"
          class="!text-left"
          severity="secondary"
          :outlined="!isSuggestionApplied(suggestion.componentUuid)"
          :disabled="
            !statementReady ||
            !sspReady ||
            isSuggestionApplied(suggestion.componentUuid) ||
            isSuggestionApplying(suggestion.componentUuid) ||
            applyingAllSuggestions
          "
          @click="emit('applySuggestion', suggestion)"
        >
          <div class="flex flex-col items-start gap-1">
            <span class="text-xs font-semibold">{{ suggestion.title }}</span>
            <span class="text-xs text-gray-500">{{ suggestion.type }}</span>
            <span
              v-if="formatRelevanceScore(suggestion.relevanceScore)"
              class="text-xs text-gray-500"
            >
              Relevance: {{ formatRelevanceScore(suggestion.relevanceScore) }}
            </span>
            <span
              v-if="isSuggestionApplied(suggestion.componentUuid)"
              class="text-xs text-green-600"
            >
              Added
            </span>
          </div>
        </Button>
      </div>

      <Message v-if="allSuggestionsApplied" severity="success" variant="simple">
        All suggestions applied.
      </Message>
    </div>
  </div>
</template>
