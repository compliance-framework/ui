<template>
  <span
    class="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 text-sky-800 dark:bg-sky-500/15 dark:text-sky-200"
    :class="compact ? 'text-[0.7rem]' : 'py-0.5 text-xs'"
    :data-test="testId"
  >
    pending<template v-if="text">: {{ text }}</template>
    <button
      type="button"
      class="ml-0.5"
      :aria-label="undoLabel"
      :data-test="undoTestId"
      @click="$emit('undo')"
    >
      ↺
    </button>
  </span>
</template>

<script setup lang="ts">
// The "pending" pill of a field with a pending change in the draft, and its ↺ undo button.
defineProps<{
  /** Accessible name of the undo button, e.g. "Undo the pending change to schedule". */
  undoLabel: string;
  /** The pending value, shown after "pending:". */
  text?: string;
  testId: string;
  undoTestId: string;
  /** Smaller, for policy_data tree rows. */
  compact?: boolean;
}>();
defineEmits<{ undo: [] }>();
</script>
