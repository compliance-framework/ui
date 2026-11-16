<script setup lang="ts">
// The "Pending" marker of a field with a pending change in the draft, and its Undo button.
import { computed } from 'vue';
import IconButton from '@/ds/components/IconButton/IconButton.vue';
import Tag from '@/ds/components/Tag/Tag.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';

const props = defineProps<{
  /** Accessible name of the undo button, e.g. "Undo the pending change to schedule". */
  undoLabel: string;
  /** The pending value, shown after "Pending:". */
  text?: string;
  testId: string;
  undoTestId: string;
  /** Kept for callers in dense rows (policy_data tree); the marker is the same size. */
  compact?: boolean;
}>();
defineEmits<{ undo: [] }>();

const label = computed(() =>
  props.text ? `Pending: ${props.text}` : 'Pending',
);
</script>

<template>
  <Cluster gap="1" as="span">
    <Tag :label="label" :data-test="testId" />
    <IconButton
      icon="undo"
      size="sm"
      :label="undoLabel"
      :data-test="undoTestId"
      @click="$emit('undo')"
    />
  </Cluster>
</template>
