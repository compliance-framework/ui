<script setup lang="ts">
import { ref } from 'vue';
import type { RouteLocationRaw } from 'vue-router';
import ModalPanel from '../Dialog/ModalPanel.vue';

/**
 * A modal full-height side sheet with the same contract as Dialog (F-11, F-18, F-20).
 * `side="left"` is the navigation drawer below 1024px: use `titleHidden` with the title
 * "Navigation". With a hidden title, initial focus goes to the first field or link in the body.
 * `size="wide"` covers nearly all of the page, leaving a strip of it in view, for focusing on one
 * record in depth (e.g. a control and everything that implements it). `titlePrefix`, `titleCode`
 * and `titleLink` make a record's title, as in ModalPanel.
 */
defineOptions({ inheritAttrs: false });
withDefaults(
  defineProps<{
    title: string;
    titlePrefix?: string;
    titleCode?: string;
    titleLink?: { to: RouteLocationRaw; label: string };
    description?: string;
    side?: 'left' | 'right';
    titleHidden?: boolean;
    dirty?: boolean;
    size?: 'default' | 'wide';
  }>(),
  {
    titlePrefix: undefined,
    titleCode: undefined,
    titleLink: undefined,
    description: undefined,
    side: 'right',
    titleHidden: false,
    dirty: false,
    size: 'default',
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
    :title-prefix="titlePrefix"
    :title-code="titleCode"
    :title-link="titleLink"
    :description="description"
    :placement="side"
    :wide="size === 'wide'"
    :title-hidden="titleHidden"
    :dirty="dirty"
  >
    <template #default="scope"><slot v-bind="scope" /></template>
    <template v-if="$slots.footer" #footer="scope"
      ><slot name="footer" v-bind="scope"
    /></template>
  </ModalPanel>
</template>
