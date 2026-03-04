<script setup lang="ts">
import { computed } from 'vue';

type SkeletonVariant = 'table' | 'detail' | 'cards' | 'form';

interface Props {
  variant?: SkeletonVariant;
  rows?: number;
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'table',
  rows: 4,
});

const resolvedRows = computed(() => Math.max(props.rows, 1));

const containerClass = computed(() => {
  if (props.variant === 'cards') {
    return 'grid gap-4 md:grid-cols-2 xl:grid-cols-4';
  }

  if (props.variant === 'form') {
    return 'space-y-4';
  }

  return 'space-y-3';
});
</script>

<template>
  <div :class="containerClass" aria-hidden="true">
    <template v-if="variant === 'cards'">
      <div
        v-for="index in resolvedRows"
        :key="`card-${index}`"
        class="animate-pulse border border-[var(--ui-v2-border)] bg-[var(--ui-v2-card)] p-4"
      >
        <div class="h-3 w-24 bg-[var(--ui-v2-surface)]" />
        <div class="mt-3 h-8 w-16 bg-[var(--ui-v2-surface)]" />
        <div class="mt-3 h-2 w-28 bg-[var(--ui-v2-surface)]" />
      </div>
    </template>

    <template v-else-if="variant === 'form'">
      <div
        v-for="index in resolvedRows"
        :key="`form-${index}`"
        class="animate-pulse border border-[var(--ui-v2-border)] bg-[var(--ui-v2-card)] p-4"
      >
        <div class="h-3 w-20 bg-[var(--ui-v2-surface)]" />
        <div class="mt-2 h-10 w-full bg-[var(--ui-v2-surface)]" />
      </div>
    </template>

    <template v-else-if="variant === 'detail'">
      <div
        class="animate-pulse border border-[var(--ui-v2-border)] bg-[var(--ui-v2-card)] p-5 lg:p-6"
      >
        <div class="h-4 w-32 bg-[var(--ui-v2-surface)]" />
        <div class="mt-3 h-3 w-full bg-[var(--ui-v2-surface)]" />
        <div class="mt-2 h-3 w-[90%] bg-[var(--ui-v2-surface)]" />
        <div class="mt-2 h-3 w-[75%] bg-[var(--ui-v2-surface)]" />

        <div class="mt-6 grid gap-4 md:grid-cols-2">
          <div
            v-for="index in resolvedRows"
            :key="`detail-${index}`"
            class="h-20 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-background)]"
          />
        </div>
      </div>
    </template>

    <template v-else>
      <div
        class="overflow-hidden border border-[var(--ui-v2-border)] bg-[var(--ui-v2-card)]"
      >
        <div
          class="h-11 border-b border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)]"
        />
        <div
          v-for="index in resolvedRows"
          :key="`row-${index}`"
          class="animate-pulse border-b border-[var(--ui-v2-border)] p-4 last:border-b-0"
        >
          <div class="h-3 w-2/5 bg-[var(--ui-v2-surface)]" />
          <div class="mt-2 h-2 w-1/3 bg-[var(--ui-v2-surface)]" />
        </div>
      </div>
    </template>
  </div>
</template>
