<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';
import { focusFirstInvalidField } from '@/composables/v2/useV2FormValidation';

export type V2FormError = {
  fieldId?: string;
  message: string;
};

const props = withDefaults(
  defineProps<{
    title?: string;
    errors: V2FormError[];
    autofocus?: boolean;
  }>(),
  {
    title: 'Please correct the following errors:',
    autofocus: true,
  },
);

const summaryRef = ref<HTMLElement | null>(null);

function focusSummary() {
  summaryRef.value?.focus();
}

function focusField(fieldId?: string) {
  if (!fieldId || typeof document === 'undefined') {
    return;
  }

  const target = document.getElementById(fieldId);
  if (!target) {
    return;
  }

  if (!target.hasAttribute('tabindex')) {
    target.setAttribute('tabindex', '-1');
  }

  target.focus();
}

watch(
  () => props.errors,
  async (errors) => {
    if (!props.autofocus || errors.length === 0) {
      return;
    }

    await nextTick();
    focusSummary();

    const firstErrorWithField = errors.find((error) => error.fieldId);
    if (!firstErrorWithField) {
      focusFirstInvalidField();
    }
  },
  { deep: true, immediate: true },
);

defineExpose({
  focusSummary,
});
</script>

<template>
  <section
    v-if="errors.length"
    ref="summaryRef"
    tabindex="-1"
    class="ui-v2-radius-none border border-[var(--ui-v2-error)] bg-[var(--ui-v2-error-tint-10)] p-4"
    role="alert"
    aria-live="assertive"
  >
    <h3 class="ui-v2-label text-[var(--ui-v2-error)]">{{ title }}</h3>
    <ul class="mt-2 space-y-1">
      <li
        v-for="error in errors"
        :key="`${error.fieldId ?? 'summary'}-${error.message}`"
      >
        <button
          v-if="error.fieldId"
          type="button"
          class="ui-v2-meta text-left text-[var(--ui-v2-error)] underline underline-offset-2"
          @click="focusField(error.fieldId)"
        >
          {{ error.message }}
        </button>
        <span v-else class="ui-v2-meta text-[var(--ui-v2-error)]">{{
          error.message
        }}</span>
      </li>
    </ul>
  </section>
</template>
