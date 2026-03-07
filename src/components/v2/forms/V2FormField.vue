<script setup lang="ts">
import { computed } from 'vue';
import V2FieldError from './V2FieldError.vue';

const props = withDefaults(
  defineProps<{
    inputId?: string;
    label: string;
    showLabel?: boolean;
    required?: boolean;
    helperText?: string;
    error?: string;
  }>(),
  {
    inputId: undefined,
    showLabel: true,
    required: false,
    helperText: undefined,
    error: undefined,
  },
);

const normalizedId = computed(() => {
  if (props.inputId) {
    return props.inputId;
  }

  return props.label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
});

const helperId = computed(() => `${normalizedId.value}-hint`);
const errorId = computed(() => `${normalizedId.value}-error`);

const describedBy = computed(() => {
  const ids: string[] = [];

  if (props.helperText) {
    ids.push(helperId.value);
  }

  if (props.error) {
    ids.push(errorId.value);
  }

  return ids.join(' ') || undefined;
});
</script>

<template>
  <div class="space-y-2.5">
    <label
      :for="normalizedId"
      :class="[
        'ui-v2-label inline-flex items-center gap-1 text-[var(--ui-v2-secondary-foreground)]',
        !props.showLabel && 'sr-only',
      ]"
    >
      <span>{{ label }}</span>
      <span
        v-if="required"
        class="text-[var(--ui-v2-error)]"
        aria-hidden="true"
      >
        *
      </span>
      <slot name="labelSuffix" />
    </label>

    <slot
      :inputId="normalizedId"
      :describedBy="describedBy"
      :invalid="Boolean(error)"
    />

    <p
      v-if="helperText"
      :id="helperId"
      class="ui-v2-meta text-[var(--ui-v2-muted-foreground)]"
    >
      {{ helperText }}
    </p>

    <V2FieldError :id="errorId" :message="error" />
  </div>
</template>
