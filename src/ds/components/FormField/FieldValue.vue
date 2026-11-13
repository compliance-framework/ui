<script setup lang="ts">
/** A field's value shown as text for read-only users (F-19 AC2); an empty value reads "Not set". */
defineProps<{ value?: string }>();
</script>

<template>
  <p class="field-value" :class="{ 'field-value--empty': !value }">
    {{ value || 'Not set' }}
  </p>
</template>

<style scoped>
.field-value {
  font-size: var(--font-size-body);
  line-height: var(--leading-body);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.field-value--empty {
  color: var(--color-text-secondary);
}
</style>
