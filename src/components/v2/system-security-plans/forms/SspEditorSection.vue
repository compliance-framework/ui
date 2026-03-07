<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    title: string;
    description?: string;
    variant?: 'plain' | 'card';
  }>(),
  {
    description: '',
    variant: 'card',
  },
);
</script>

<template>
  <section :class="['space-y-2']">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="min-w-0">
        <p
          class="ui-v2-label text-[10px] text-[var(--ui-v2-secondary-foreground)]"
        >
          {{ title }}
        </p>
      </div>

      <div v-if="$slots.actions" class="shrink-0">
        <slot name="actions" />
      </div>
    </div>

    <div
      :class="
        props.variant === 'card'
          ? 'space-y-4 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] p-4'
          : 'space-y-4'
      "
    >
      <slot />
    </div>

    <p
      v-if="description"
      class="font-[var(--ui-v2-font-secondary)] text-[9px] font-medium leading-[1.45] tracking-[0.3px] text-[var(--ui-v2-tertiary-foreground)]"
    >
      {{ description }}
    </p>
  </section>
</template>
