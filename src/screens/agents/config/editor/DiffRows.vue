<script setup lang="ts">
// The review's change table: each changed path with its value before and after (long values
// truncated, with Show / Hide), or a "View diff" for multi-line text, and its safety on this
// instance.
import { computed, reactive } from 'vue';
import Button from '@/ds/components/Button/Button.vue';
import DataTable from '@/ds/components/DataTable/DataTable.vue';
import type { DataTableColumn } from '@/ds/components/DataTable/types';
import StatusBadge from '@/ds/components/StatusBadge/StatusBadge.vue';
import type { StatusKey } from '@/ds/components/StatusBadge/statuses';
import Text from '@/ds/components/Text/Text.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import type { ConfigChange } from '@/types/agent-config';
import type { DiffEntry } from '@/utils/agent-config/config-diff';
import {
  safetyForRow,
  truncate,
  type SafetyTagKind,
} from '@/utils/agent-config/review';

const props = defineProps<{
  rows: DiffEntry[];
  changes: ConfigChange[];
  hideTags?: boolean;
}>();
defineEmits<{ 'open-diff': [row: DiffEntry] }>();

const columns = computed<DataTableColumn[]>(() => [
  { key: 'path', label: 'Path', minWidth: 'md' },
  { key: 'change', label: 'Change', minWidth: 'md' },
  ...(props.hideTags
    ? []
    : [{ key: 'safety', label: 'On this instance', nowrap: true }]),
]);

const SAFETY: Record<SafetyTagKind, StatusKey> = {
  safe: 'change-safe',
  unsafe: 'change-unsafe',
  forbidden: 'change-forbidden',
  'no-effect': 'change-no-effect',
};

/** Values shown in full (`<path>:before` / `<path>:after`). */
const shownInFull = reactive(new Set<string>());
function toggle(key: string): void {
  if (shownInFull.has(key)) shownInFull.delete(key);
  else shownInFull.add(key);
}
function side(row: DiffEntry, which: 'before' | 'after') {
  const missing =
    which === 'before' ? row.kind === 'added' : row.kind === 'removed';
  const value = row[which];
  const key = `${row.path}:${which}`;
  const short = truncate(value);
  return {
    key,
    missing,
    truncated: short.truncated,
    text: shownInFull.has(key)
      ? truncate(value, Number.MAX_SAFE_INTEGER).text
      : short.text,
    open: shownInFull.has(key),
  };
}
</script>

<template>
  <Text v-if="!rows.length" variant="secondary" data-test="diff-rows"
    >No differences.</Text
  >
  <DataTable
    v-else
    caption="Changes"
    caption-hidden
    :columns="columns"
    :rows="rows"
    :row-key="(row) => row.path"
    data-test="diff-rows"
  >
    <template #cell-path="{ row }">
      <Text as="code" variant="code" :data-path="row.path">{{ row.path }}</Text>
    </template>
    <template #cell-change="{ row }">
      <Button
        v-if="row.multiline"
        variant="tertiary"
        size="sm"
        data-test="view-diff"
        @click="$emit('open-diff', row)"
        >View diff</Button
      >
      <Cluster v-else gap="1">
        <template
          v-for="(value, index) in [side(row, 'before'), side(row, 'after')]"
          :key="value.key"
        >
          <Text v-if="index === 1" as="span" variant="secondary">→</Text>
          <Text v-if="value.missing" as="span" variant="secondary">absent</Text>
          <template v-else>
            <Text as="code" variant="code">{{ value.text }}</Text>
            <Button
              v-if="value.truncated"
              variant="tertiary"
              size="sm"
              @click="toggle(value.key)"
              >{{ value.open ? 'Hide' : 'Show' }}</Button
            >
          </template>
        </template>
      </Cluster>
    </template>
    <template #cell-safety="{ row }">
      <StatusBadge
        :status="SAFETY[safetyForRow(row.path, changes)]"
        :data-safety="safetyForRow(row.path, changes)"
      />
    </template>
  </DataTable>
</template>
