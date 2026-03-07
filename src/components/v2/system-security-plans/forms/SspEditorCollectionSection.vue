<script setup lang="ts">
defineProps<{
  title: string;
}>();
</script>

<template>
  <section class="space-y-2">
    <p class="ui-v2-label text-[var(--ui-v2-secondary-foreground)]">
      {{ title }}
    </p>

    <div class="border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)]">
      <slot />

      <div
        v-if="$slots.footer"
        class="border-t border-[var(--ui-v2-border)] px-3 py-2.5"
      >
        <slot name="footer" />
      </div>
    </div>
  </section>
</template>
