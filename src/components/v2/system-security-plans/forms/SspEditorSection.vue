<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string;
    description?: string;
  }>(),
  {
    description: '',
  },
);
</script>

<template>
  <section
    class="space-y-4 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-card)] p-5"
  >
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="min-w-0">
        <h2
          class="font-[var(--ui-v2-font-primary)] text-[18px] font-bold tracking-[0.5px] text-[var(--ui-v2-foreground)]"
        >
          {{ title }}
        </h2>
        <p
          v-if="description"
          class="mt-1 max-w-[72ch] font-[var(--ui-v2-font-secondary)] text-[12px] font-semibold tracking-[0.5px] text-[var(--ui-v2-muted-foreground)]"
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
