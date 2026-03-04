<script setup lang="ts">
interface Props {
  title: string;
  eyebrow?: string;
  description?: string;
}

withDefaults(defineProps<Props>(), {
  eyebrow: '',
  description: '',
});
</script>

<template>
  <header class="space-y-4">
    <slot name="breadcrumbs">
      <p
        v-if="eyebrow"
        class="ui-v2-label text-[var(--ui-v2-secondary-foreground)]"
      >
        {{ eyebrow }}
      </p>
    </slot>

    <div class="flex flex-wrap items-start justify-between gap-4">
      <div class="min-w-0">
        <h1 class="ui-v2-title text-[var(--ui-v2-foreground)]">
          {{ title }}
        </h1>

        <p
          v-if="description"
          class="mt-2 max-w-[72ch] text-[var(--ui-v2-muted-foreground)]"
        >
          {{ description }}
        </p>

        <div v-if="$slots.metadata" class="mt-3">
          <slot name="metadata" />
        </div>
      </div>

      <div v-if="$slots.actions" class="shrink-0">
        <slot name="actions" />
      </div>
    </div>
  </header>
</template>
