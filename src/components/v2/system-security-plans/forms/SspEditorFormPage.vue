<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router';
import type { V2FormError } from '@/components/v2/forms/V2FormErrorSummary.vue';
import V2FormErrorSummary from '@/components/v2/forms/V2FormErrorSummary.vue';

export interface SspEditorBreadcrumbItem {
  label: string;
  to?: RouteLocationRaw;
}

const props = withDefaults(
  defineProps<{
    breadcrumbs: SspEditorBreadcrumbItem[];
    title: string;
    description?: string;
    formId: string;
    backTo: RouteLocationRaw;
    submitLabel: string;
    submitting?: boolean;
    submitDisabled?: boolean;
    errors?: V2FormError[];
    requiredHint?: string;
  }>(),
  {
    description: '',
    submitting: false,
    submitDisabled: false,
    errors: () => [],
    requiredHint: '* Required fields',
  },
);

const emit = defineEmits<{
  submit: [];
}>();
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div class="min-w-0 space-y-2">
        <h2
          class="font-[var(--ui-v2-font-primary)] text-[clamp(2rem,1.75rem+0.6vw,2.75rem)] font-bold tracking-[-0.01em] text-[var(--ui-v2-foreground)]"
        >
          {{ title }}
        </h2>

        <p
          v-if="description"
          class="max-w-[72ch] font-[var(--ui-v2-font-secondary)] text-[12px] font-semibold tracking-[0.5px] text-[var(--ui-v2-muted-foreground)]"
        >
          {{ description }}
        </p>

        <p class="ui-v2-meta text-[var(--ui-v2-tertiary-foreground)]">
          {{ requiredHint }}
        </p>
      </div>

      <button
        type="submit"
        :form="formId"
        :disabled="submitDisabled || submitting"
        class="ui-v2-nav inline-flex h-10 items-center justify-center border border-[var(--ui-v2-primary)] bg-[var(--ui-v2-primary)] px-5 font-bold text-[var(--ui-v2-primary-foreground)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {{ submitting ? 'SAVING...' : submitLabel }}
      </button>
    </div>

    <V2FormErrorSummary :errors="props.errors" />

    <form :id="formId" class="space-y-4" @submit.prevent="emit('submit')">
      <slot />
    </form>
  </div>
</template>
