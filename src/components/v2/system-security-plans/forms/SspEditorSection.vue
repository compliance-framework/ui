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
  <section
    :class="[
      'space-y-4',
      props.variant === 'card'
        ? 'border border-[var(--ui-v2-border)] bg-[var(--ui-v2-card)] p-5'
        : 'pb-1',
    ]"
  >
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="min-w-0">
        <h2 class="ui-v2-section-title text-[var(--ui-v2-foreground)]">
          {{ title }}
        </h2>
        <p
          v-if="description"
          class="ui-v2-meta mt-1 max-w-[72ch] text-[var(--ui-v2-muted-foreground)]"
        >
          {{ description }}
        </p>
      </div>

      <div v-if="$slots.actions" class="shrink-0">
        <slot name="actions" />
      </div>
    </div>

    <slot />
  </section>
</template>
