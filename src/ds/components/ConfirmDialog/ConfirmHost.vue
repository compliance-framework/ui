<script setup lang="ts">
import { computed, watch } from 'vue';
import { TooltipProvider } from 'reka-ui';
import { confirmRequest as current } from '../../confirm';
import Text from '../Text/Text.vue';
import ConfirmDialog from './ConfirmDialog.vue';

/**
 * Shows the confirmation raised through `useConfirm().require(...)` (`@/ds/confirm`) as a
 * ConfirmDialog. Mounted once in App. Templates use ConfirmDialog directly.
 */
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

// Closing clears the request before ConfirmDialog emits cancel, so the open request is kept
// apart until it settles one way or the other.
let pending: typeof current.value;
watch(
  current,
  (request) => {
    if (request) pending = request;
  },
  { flush: 'sync' },
);
function settle(answer: 'accept' | 'reject'): void {
  const request = pending;
  pending = undefined;
  void request?.[answer]?.();
}
const confirm = () => settle('accept');
const cancel = () => settle('reject');
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
