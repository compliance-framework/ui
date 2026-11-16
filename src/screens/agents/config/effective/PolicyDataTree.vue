<script setup lang="ts">
// Structured view of a plugin's policy_data: nested objects as collapsible key/value groups,
// arrays as lists. With a PolicyDataTreeContext provided (PolicyDataSection) every key and
// item is editable on its own; without one it only displays. Keys are used verbatim.
import { computed, inject } from 'vue';
import Text from '@/ds/components/Text/Text.vue';
import Tree from '@/ds/components/TreeItem/Tree.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import type { PlainObject } from '@/utils/agent-config/merge-patch';
import { escapeToken } from '@/utils/agent-config/json-pointer';
import PolicyDataNode from './PolicyDataNode.vue';
import PolicyDataAddForm from './PolicyDataAddForm.vue';
import { POLICY_DATA_TREE_KEY } from './policyDataContext';

const props = withDefaults(
  defineProps<{
    value: PlainObject;
    /** The policy_data pointer the keys live under. */
    ptr: string;
    label?: string;
    testId?: string;
  }>(),
  { label: 'Policy data', testId: 'policy-data-tree' },
);

const tree = inject(POLICY_DATA_TREE_KEY, null);
const entries = computed(() => Object.entries(props.value));
</script>

<template>
  <Stack gap="2" :data-test="testId">
    <Tree v-if="entries.length" :label="label">
      <PolicyDataNode
        v-for="[key, value] in entries"
        :key="key"
        :label="key"
        :value="value"
        :ptr="`${ptr}/${escapeToken(key)}`"
        :depth="0"
        :in-array="false"
        @set="(p, v) => tree?.set(p, v)"
        @remove="(p) => tree?.remove(p)"
      />
    </Tree>
    <Text v-else variant="secondary">No keys.</Text>
    <PolicyDataAddForm
      v-if="tree?.canEdit(ptr)"
      :in-array="false"
      :item-type="null"
      :existing="entries.map(([k]) => k)"
      :where="label"
      test-key="root"
      @add="(k, v) => tree?.set(`${ptr}/${escapeToken(k ?? '')}`, v)"
    />
  </Stack>
</template>
