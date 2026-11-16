<script setup lang="ts">
import { useId } from 'vue';
import IconButton from '../IconButton/IconButton.vue';
import Icon from '../Icon/Icon.vue';

/**
 * One item of a disclosure tree: nested lists, each item with a real toggle button
 * (aria-expanded, aria-controls) beside its row when it has children, and its children indented
 * below while open. Put items in a `<ul>`; the `children` slot holds the next level's items (the
 * list element is provided). `label` names the toggle ("Expand Access control"). Items without
 * children keep the toggle's space, so rows line up.
 */
withDefaults(
  defineProps<{
    label: string;
    expandable?: boolean;
    /** The children are loading: the toggle shows a spinner. */
    loading?: boolean;
  }>(),
  { expandable: false, loading: false },
);
const open = defineModel<boolean>('open', { default: false });
const childrenId = useId();
</script>

<template>
  <li class="tree-item">
    <div class="tree-item__row">
      <IconButton
        v-if="expandable"
        size="sm"
        :icon="loading ? 'loading' : open ? 'expand' : 'next'"
        :label="`${open ? 'Collapse' : 'Expand'} ${label}`"
        :expanded="open"
        :controls="childrenId"
        @click="open = !open"
      />
      <span v-else class="tree-item__spacer" aria-hidden="true"
        ><Icon name="next" class="tree-item__leaf"
      /></span>
      <div class="tree-item__content"><slot /></div>
    </div>
    <ul v-if="expandable && open" :id="childrenId" class="tree-item__children">
      <slot name="children" />
    </ul>
  </li>
</template>

<style scoped>
.tree-item {
  list-style: none;
}
.tree-item__row {
  display: flex;
  align-items: flex-start;
  gap: var(--ds-space-2);
  padding: var(--ds-space-2) 0;
  border-bottom: var(--ds-border-width) solid var(--ds-color-border-subtle);
}
.tree-item__spacer {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: var(--ds-size-control-sm);
  height: var(--ds-size-control-sm);
}
.tree-item__leaf {
  visibility: hidden;
}
.tree-item__content {
  flex: 1;
  min-width: 0;
  padding-top: var(--ds-space-1);
}
.tree-item__children {
  margin: 0;
  padding: 0 0 0 var(--ds-space-6);
  border-left: var(--ds-border-width) solid var(--ds-color-border-subtle);
  margin-left: calc(var(--ds-size-control-sm) / 2);
}
</style>
