<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  title: string;
  description?: string;
  requiredHint?: string;
  errorSummary?: string | string[];
  submitLabel?: string;
  cancelLabel?: string;
  submitting?: boolean;
  disableSubmit?: boolean;
  showDefaultActions?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  description: '',
  requiredHint: '* Required fields',
  errorSummary: '',
  submitLabel: 'Save',
  cancelLabel: 'Cancel',
  submitting: false,
  disableSubmit: false,
  showDefaultActions: true,
});

const emit = defineEmits<{
  cancel: [];
  submit: [];
}>();

const normalizedErrors = computed(() => {
  if (Array.isArray(props.errorSummary)) {
    return props.errorSummary.filter((message) => message.trim().length > 0);
  }

  if (
    typeof props.errorSummary === 'string' &&
    props.errorSummary.trim().length > 0
  ) {
    return [props.errorSummary];
  }

  return [];
});
</script>

<template>
  <div class="space-y-4">
    <header>
      <h3 class="ui-v2-section-title text-[var(--ui-v2-foreground)]">
        {{ title }}
      </h3>
      <p v-if="description" class="mt-2 text-[var(--ui-v2-muted-foreground)]">
        {{ description }}
      </p>
      <p
        v-if="requiredHint"
        class="ui-v2-meta mt-2 text-[var(--ui-v2-tertiary-foreground)]"
      >
        {{ requiredHint }}
      </p>
    </header>

    <section
      v-if="normalizedErrors.length"
      class="ui-v2-radius-none border border-[var(--ui-v2-error)] bg-[var(--ui-v2-error-tint-10)] p-3"
      role="alert"
      aria-live="polite"
    >
      <p class="ui-v2-label text-[var(--ui-v2-error)]">
        Please fix the following:
      </p>
      <ul class="mt-2 list-disc space-y-1 pl-5 text-[var(--ui-v2-foreground)]">
        <li v-for="message in normalizedErrors" :key="message">
          {{ message }}
        </li>
      </ul>
    </section>

    <section class="ui-v2-surface-base p-4">
      <slot />
    </section>

    <footer
      v-if="$slots.actions || showDefaultActions"
      class="flex justify-end gap-2"
    >
      <slot name="actions">
        <button
          type="button"
          class="ui-v2-nav ui-v2-interactive px-4 py-2"
          :disabled="submitting"
          @click="emit('cancel')"
        >
          {{ cancelLabel }}
        </button>
        <button
          type="button"
          class="ui-v2-nav border border-[var(--ui-v2-primary)] bg-[var(--ui-v2-primary)] px-4 py-2 font-semibold text-[var(--ui-v2-primary-foreground)] disabled:opacity-60"
          :disabled="disableSubmit || submitting"
          @click="emit('submit')"
        >
          {{ submitting ? 'Saving...' : submitLabel }}
        </button>
      </slot>
    </footer>
  </div>
</template>
