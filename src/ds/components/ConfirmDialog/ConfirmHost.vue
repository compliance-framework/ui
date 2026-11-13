<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { TooltipProvider } from 'reka-ui';
import ConfirmationEventBus from 'primevue/confirmationeventbus';
import Text from '../Text/Text.vue';
import ConfirmDialog from './ConfirmDialog.vue';

/**
 * Shows confirmations raised through PrimeVue's `useConfirm().require(...)` (classic pages and
 * shared composables) as design-system ConfirmDialogs, so those call sites don't change. Mounted
 * once in App, replacing PrimeVue's global ConfirmDialog. New screens use ConfirmDialog directly.
 */
interface ButtonProps {
  label?: string;
  severity?: string;
}
interface Confirmation {
  header?: string;
  message?: string;
  acceptLabel?: string;
  rejectLabel?: string;
  acceptProps?: ButtonProps;
  rejectProps?: ButtonProps;
  accept?: () => unknown;
  reject?: () => unknown;
}

const current = ref<Confirmation>();
const open = computed({
  get: () => Boolean(current.value),
  set: (isOpen: boolean) => {
    if (!isOpen) current.value = undefined;
  },
});

const confirmLabel = computed(
  () =>
    current.value?.acceptProps?.label ??
    current.value?.acceptLabel ??
    'Confirm',
);
/** Deletions and danger-styled confirms read as destructive; everything else as primary. */
const tone = computed(() => {
  const c = current.value;
  return c?.acceptProps?.severity === 'danger' ||
    /delet|remov/i.test(`${c?.header ?? ''} ${confirmLabel.value}`)
    ? 'danger'
    : 'primary';
});

// Closing clears `current` before ConfirmDialog emits cancel, so the open request is kept apart
// until it settles one way or the other.
let pending: Confirmation | undefined;
function show(options: Confirmation): void {
  pending = options;
  current.value = options;
}
function confirm(): void {
  const request = pending;
  pending = undefined;
  void request?.accept?.();
}
function cancel(): void {
  const request = pending;
  pending = undefined;
  void request?.reject?.();
}
const close = () => {
  pending = undefined;
  current.value = undefined;
};

onMounted(() => {
  ConfirmationEventBus.on('confirm', show);
  ConfirmationEventBus.on('close', close);
});
onBeforeUnmount(() => {
  ConfirmationEventBus.off('confirm', show);
  ConfirmationEventBus.off('close', close);
});
</script>

<template>
  <!-- Outside AppShell, so it provides tooltips for the dialog's buttons itself. -->
  <TooltipProvider>
    <ConfirmDialog
      v-model:open="open"
      :title="current?.header ?? 'Are you sure?'"
      :confirm-label="confirmLabel"
      :cancel-label="
        current?.rejectProps?.label ?? current?.rejectLabel ?? 'Cancel'
      "
      :tone="tone"
      @confirm="confirm"
      @cancel="cancel"
    >
      <Text v-if="current?.message">{{ current.message }}</Text>
    </ConfirmDialog>
  </TooltipProvider>
</template>
