<script setup lang="ts">
import type { ByComponent, Statement } from '@/oscal';
import IconButton from '@/ds/components/IconButton/IconButton.vue';
import Text from '@/ds/components/Text/Text.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import ComponentStatements from './ComponentStatements.vue';
import PartEditor from './PartEditor.vue';

/**
 * What implements one clause of a control (or the whole control): the statement's remarks, then
 * each component's statement, with an edit button before them (on the left, where it is seen) that
 * turns the whole block, remarks and components, into one form in place. The
 * control's view decides which clause is being edited, one at a time.
 */
defineProps<{
  controlId: string;
  /** The part's ID; none for the whole control. */
  partId?: string;
  statement?: Statement;
  /** What the statement (or, for the whole control, the implementation) says beyond its components. */
  remarks?: string;
  byComponents: ByComponent[];
  /** What to say when no component implements it. */
  emptyText: string;
  editLabel: string;
  editing: boolean;
  editDenied?: string;
}>();
const emit = defineEmits<{ edit: []; done: [] }>();
</script>

<template>
  <Cluster v-if="!editing" :wrap="false" grow="last" align="start" gap="2">
    <IconButton
      icon="edit"
      size="inline"
      :label="editLabel"
      :disabled-reason="editDenied"
      @click="emit('edit')"
    />
    <Stack gap="3">
      <Text v-if="remarks" variant="secondary" italic preserve-whitespace>{{
        remarks
      }}</Text>
      <ComponentStatements
        v-if="byComponents.length"
        :control-id="controlId"
        :by-components="byComponents"
      />
      <Text v-else-if="emptyText" variant="secondary">{{ emptyText }}</Text>
    </Stack>
  </Cluster>
  <PartEditor
    v-else
    :control-id="controlId"
    :part-id="partId"
    :statement="statement"
    :remarks="remarks"
    :by-components="byComponents"
    @done="emit('done')"
  />
</template>
