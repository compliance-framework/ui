<template>
  <div class="text-sm" :data-test="testId">
    <ul v-if="entries.length" :aria-label="label">
      <PolicyDataNode
        v-for="[key, value] in entries"
        :key="key"
        :label="key"
        :value="value"
        :path="[key]"
        :depth="0"
        :editable="editable"
        :in-array="false"
        @set="onSet"
        @remove="onRemove"
      />
    </ul>
    <p v-else class="text-xs text-gray-500 dark:text-slate-400">No keys.</p>
    <PolicyDataAddForm
      v-if="editable"
      class="ml-5"
      :in-array="false"
      :existing="entries.map(([k]) => k)"
      :where="label"
      test-key="root"
      @add="(k, v) => onSet([k!], v)"
    />
  </div>
</template>

<script setup lang="ts">
// Structured view (and editor, when `editable`) of a plugin's policy_data: nested objects as
// collapsible key/value groups, arrays as lists, scalars with their type. Every edit emits the
// WHOLE new object (update:modelValue); the caller turns it into the overlay exactly as the
// raw JSON editor does. Keys are used verbatim.
import { computed } from 'vue';
import type { PlainObject } from '@/utils/agent-config/merge-patch';
import {
  removeIn,
  setIn,
  type DataPath,
} from '@/utils/agent-config/policy-data';
import PolicyDataNode from './PolicyDataNode.vue';
import PolicyDataAddForm from './PolicyDataAddForm.vue';

const props = withDefaults(
  defineProps<{
    modelValue: PlainObject;
    editable?: boolean;
    label?: string;
    testId?: string;
  }>(),
  { editable: false, label: 'Policy data', testId: 'policy-data-tree' },
);
const emit = defineEmits<{ 'update:modelValue': [value: PlainObject] }>();

const entries = computed(() => Object.entries(props.modelValue));

function onSet(path: DataPath, value: unknown) {
  emit('update:modelValue', setIn(props.modelValue, path, value));
}
function onRemove(path: DataPath) {
  emit('update:modelValue', removeIn(props.modelValue, path));
}
</script>
