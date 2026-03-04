<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    message?: string;
    id?: string;
  }>(),
  {
    message: undefined,
    id: undefined,
  },
);
</script>

<template>
  <p
    v-if="props.message"
    :id="props.id"
    class="font-[var(--ui-v2-font-secondary)] text-[12px] font-normal leading-[1.4] text-[var(--ui-v2-error)]"
    role="alert"
  >
    {{ props.message }}
  </p>
</template>
