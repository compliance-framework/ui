<script setup lang="ts">
import { onMounted, useId, useTemplateRef } from 'vue';
import Button from '../Button/Button.vue';
import Icon from '../Icon/Icon.vue';

/**
 * The inline dirty-guard confirmation shown in place of a Dialog or Drawer footer (F-20 AC4).
 * Takes focus on "Keep editing", the safe choice. Helper of Dialog and Drawer only.
 */
const emit = defineEmits<{ keep: []; discard: [] }>();
const headingId = useId();
const root = useTemplateRef<HTMLElement>('root');

onMounted(() => root.value?.querySelector('button')?.focus());
</script>

<template>
  <div ref="root" class="discard" role="group" :aria-labelledby="headingId">
    <p :id="headingId" class="discard__message">
      <Icon name="warning" />
      <span>Discard unsaved changes?</span>
    </p>
    <div class="discard__actions">
      <Button variant="tertiary" @click="emit('keep')">Keep editing</Button>
      <Button variant="danger" @click="emit('discard')">Discard changes</Button>
    </div>
  </div>
</template>

<style scoped>
.discard {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-3);
}

.discard__message {
  display: flex;
  align-items: center;
  gap: var(--ds-space-2);
  color: var(--ds-color-status-warning-fg);
  font-weight: var(--ds-font-weight-semibold);
}

.discard__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: var(--ds-space-3);
}
</style>
