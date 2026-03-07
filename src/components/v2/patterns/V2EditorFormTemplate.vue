<script setup lang="ts">
import { computed } from 'vue';
import V2LucideIcon from '@/components/v2/primitives/V2LucideIcon.vue';

interface Props {
  errorSummary?: string | string[];
  footerNote?: string;
}

const props = withDefaults(defineProps<Props>(), {
  errorSummary: '',
  footerNote: '',
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
    <section
      v-if="normalizedErrors.length"
      class="ui-v2-radius-none border border-[var(--ui-v2-error)] bg-[var(--ui-v2-error-tint-10)] p-4"
      role="alert"
      aria-live="polite"
    >
      <p class="ui-v2-label text-[var(--ui-v2-error)]">
        Please fix the following:
      </p>
      <ul
        class="ui-v2-body mt-3 list-disc space-y-1.5 pl-5 text-[var(--ui-v2-foreground)]"
      >
        <li v-for="message in normalizedErrors" :key="message">
          {{ message }}
        </li>
      </ul>
    </section>

    <section class="ssp-editor-form-stack">
      <slot />
    </section>

    <section
      v-if="footerNote"
      class="flex items-start gap-1.5 pt-3 text-[var(--ui-v2-tertiary-foreground)]"
    >
      <V2LucideIcon class="mt-px shrink-0" name="info" :size="12" />
      <p
        class="font-[var(--ui-v2-font-secondary)] text-[9px] font-medium leading-[1.45] tracking-[0.3px]"
      >
        {{ footerNote }}
      </p>
    </section>
  </div>
</template>

<style scoped>
.ssp-editor-form-stack {
  display: flex;
  flex-direction: column;
  gap: 24px;
}
</style>
