<script setup lang="ts">
import { ref } from 'vue';
import ModalPanel from './ModalPanel.vue';

/**
 * A modal dialog with a named title, S/M/L widths and a sticky footer (F-11, F-18, F-20).
 * Focus goes to the first form field, else the title, and returns to the trigger on close; with
 * `dirty`, every way of closing asks "Discard unsaved changes?" first. Footer convention: Cancel
 * first (tertiary, calling `requestClose`), the primary action last. `requestClose` is passed to
 * both slots and exposed.
 */
defineOptions({ inheritAttrs: false });
withDefaults(
  defineProps<{
    title: string;
    description?: string;
    size?: 's' | 'm' | 'l';
    dirty?: boolean;
  }>(),
  {
    description: undefined,
    size: 'm',
    dirty: false,
  },
);
const open = defineModel<boolean>('open', { default: false });
const panel = ref<InstanceType<typeof ModalPanel>>();
defineExpose({ requestClose: () => panel.value?.requestClose() });
</script>

<template>
  <ModalPanel
    ref="panel"
    v-model:open="open"
    v-bind="$attrs"
    :title="title"
    :description="description"
    :size="size"
    :dirty="dirty"
    placement="center"
  >
    <template v-if="$slots.filters" #filters><slot name="filters" /></template>
    <template #default="scope"><slot v-bind="scope" /></template>
    <template v-if="$slots.footer" #footer="scope"
      ><slot name="footer" v-bind="scope"
    /></template>
  </ModalPanel>
</template>
