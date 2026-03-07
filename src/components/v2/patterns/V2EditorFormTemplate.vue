<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  description?: string;
  requiredHint?: string;
  errorSummary?: string | string[];
}

const props = withDefaults(defineProps<Props>(), {
  description: '',
  requiredHint: '* Required fields',
  errorSummary: '',
});

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
  <div class="space-y-6">
    <section v-if="description || requiredHint" class="space-y-2">
      <p
        v-if="description"
        class="ui-v2-body max-w-[72ch] text-[var(--ui-v2-muted-foreground)]"
      >
        {{ description }}
      </p>
      <p
        v-if="requiredHint"
        class="ui-v2-meta font-semibold tracking-[0.2px] text-[var(--ui-v2-tertiary-foreground)]"
      >
        {{ requiredHint }}
      </p>
    </section>

    <section
      v-if="normalizedErrors.length"
      class="ui-v2-radius-none border border-[var(--ui-v2-error)] bg-[var(--ui-v2-error-tint-10)] p-3"
      role="alert"
      aria-live="polite"
    >
      <p class="ui-v2-label text-[var(--ui-v2-error)]">
        Please fix the following:
      </p>
      <ul
        class="ui-v2-body mt-2 list-disc space-y-1 pl-5 text-[var(--ui-v2-foreground)]"
      >
        <li v-for="message in normalizedErrors" :key="message">
          {{ message }}
        </li>
      </ul>
    </section>

    <section>
      <slot />
    </section>
  </div>
</template>
