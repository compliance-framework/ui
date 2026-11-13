<script setup lang="ts">
import { watch } from 'vue';
import Button from '../Button/Button.vue';
import Dialog from '../Dialog/Dialog.vue';

/**
 * Confirms a destructive or irreversible action (F-16 AC1–3, P4). The title is a question
 * ("Delete risk?"), the confirm button names the verb and object ("Delete risk"), and the
 * default slot states the consequence and holds any extra field, e.g. a required reason.
 * Focus starts on Cancel. `confirmDisabledReason` blocks confirm until the reason is resolved.
 * Emits `confirm` and then closes; any other close (Cancel, Escape, overlay, close button) emits `cancel`.
 */
const props = withDefaults(
  defineProps<{
    title: string;
    confirmLabel: string;
    cancelLabel?: string;
    tone?: 'danger' | 'primary';
    confirmDisabledReason?: string;
  }>(),
  { tone: 'danger', confirmDisabledReason: undefined, cancelLabel: 'Cancel' },
);
const open = defineModel<boolean>('open', { default: false });
const emit = defineEmits<{ confirm: []; cancel: [] }>();

let confirmed = false;

function onConfirm(): void {
  if (props.confirmDisabledReason) return;
  confirmed = true;
  emit('confirm');
  open.value = false;
}

watch(open, (isOpen, wasOpen) => {
  if (isOpen || !wasOpen) return;
  if (!confirmed) emit('cancel');
  confirmed = false;
});
</script>

<template>
  <Dialog v-model:open="open" :title="title" size="s" role="alertdialog">
    <slot />
    <template #footer>
      <Button variant="tertiary" data-autofocus @click="open = false">{{
        cancelLabel
      }}</Button>
      <Button
        :variant="tone"
        :disabled-reason="confirmDisabledReason"
        @click="onConfirm"
        >{{ confirmLabel }}</Button
      >
    </template>
  </Dialog>
</template>
