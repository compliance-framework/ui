<script setup lang="ts">
import { ref } from 'vue';
import ModalPanel from '../Dialog/ModalPanel.vue';

/**
 * A modal full-height side sheet with the same contract as Dialog (F-11, F-18, F-20).
 * `side="left"` is the navigation drawer below 1024px: use `titleHidden` with the title
 * "Navigation". With a hidden title, initial focus goes to the first field or link in the body.
 */
defineOptions({ inheritAttrs: false });
withDefaults(
  defineProps<{
    title: string;
    description?: string;
    side?: 'left' | 'right';
    titleHidden?: boolean;
    dirty?: boolean;
  }>(),
  { description: undefined, side: 'right', titleHidden: false, dirty: false },
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
    :placement="side"
    :title-hidden="titleHidden"
    :dirty="dirty"
  >
    <template #default="scope"><slot v-bind="scope" /></template>
    <template v-if="$slots.footer" #footer="scope"
      ><slot name="footer" v-bind="scope"
    /></template>
  </ModalPanel>
</template>
