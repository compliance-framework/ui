<script setup lang="ts">
import Message from '@/volt/Message.vue';

const props = withDefaults(
  defineProps<{
    severity?: 'info' | 'success' | 'warn' | 'error' | 'secondary';
    title?: string;
    message: string;
  }>(),
  {
    severity: 'info',
    title: undefined,
  },
);
</script>

<template>
  <Message :severity="props.severity">
    <div class="flex flex-col gap-1">
      <p
        v-if="props.title"
        class="font-[var(--ui-v2-font-secondary)] text-[11px] font-bold uppercase tracking-[1px] text-[var(--ui-v2-foreground)]"
      >
        {{ props.title }}
      </p>
      <p
        class="font-[var(--ui-v2-font-secondary)] text-[12px] font-normal leading-[1.6] text-[var(--ui-v2-muted-foreground)]"
      >
        {{ props.message }}
      </p>
    </div>
  </Message>
</template>
