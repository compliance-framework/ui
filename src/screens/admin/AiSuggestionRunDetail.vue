<script setup lang="ts">
import { computed } from 'vue';
import DataTable from '@/ds/components/DataTable/DataTable.vue';
import type { DataTableColumn } from '@/ds/components/DataTable/types';
import DescriptionList from '@/ds/components/DescriptionList/DescriptionList.vue';
import InlineMessage from '@/ds/components/InlineMessage/InlineMessage.vue';
import StatusBadge from '@/ds/components/StatusBadge/StatusBadge.vue';
import Text from '@/ds/components/Text/Text.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import PanelSection from '@/ds/components/layout/PanelSection.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import {
  formatDate,
  formatDuration,
  formatLabelSet,
  formatNumber,
  formatPercent,
  formatScopeList,
  runStatusKey,
  type AiDiagnosticsRunDetail,
} from './aiDiagnostics';

/** One AI suggestion run: totals, scope, failed cells, every cell, and the run's events. */
const props = defineProps<{ run: AiDiagnosticsRunDetail }>();

const failedCells = computed(() =>
  props.run.cells.filter((cell) => cell.status === 'failed' || cell.error),
);

const totals = computed(() => [
  {
    key: 'cells',
    label: 'Cells',
    value: `${formatNumber(props.run.completedCells)}/${formatNumber(props.run.plannedCalls)} complete · ${formatNumber(props.run.failedCells)} failed`,
  },
  {
    key: 'tokens',
    label: 'Tokens',
    value: `${formatNumber(props.run.inputTokens)} in / ${formatNumber(props.run.outputTokens)} out`,
  },
  {
    key: 'cache',
    label: 'Cache',
    value: `${formatPercent(props.run.cacheHitRatio)} hit · ${formatNumber(props.run.cacheReadInputTokens)} read`,
  },
]);

const scope = computed(() => [
  {
    key: 'controls',
    label: 'Controls',
    value: formatScopeList(props.run.scope?.controlKeys),
  },
  {
    key: 'hashes',
    label: 'Label set hashes',
    value: formatScopeList(props.run.scope?.labelSetHashes),
  },
]);

const cellColumns: DataTableColumn[] = [
  { key: 'cellIndex', label: 'Cell', align: 'end' },
  { key: 'status', label: 'Status', nowrap: true },
  { key: 'controlKeys', label: 'Controls', minWidth: 'sm' },
  { key: 'labelSetHashes', label: 'Label sets', minWidth: 'sm' },
  { key: 'tokens', label: 'Tokens', nowrap: true },
  { key: 'cache', label: 'Cache', nowrap: true },
  { key: 'rateLimitedCount', label: 'Rate limits', align: 'end' },
  { key: 'mappings', label: 'Mappings', nowrap: true },
  { key: 'error', label: 'Error', minWidth: 'md' },
];
</script>

<template>
  <Stack gap="5">
    <Stack gap="2">
      <Cluster gap="2">
        <Text as="strong">{{ run.sspName || run.id }}</Text>
        <StatusBadge :status="runStatusKey(run.status)" />
      </Cluster>
      <Text variant="secondary"
        >{{ run.model ?? 'N/A' }} · prompt {{ run.promptVersion ?? 'N/A' }} ·
        {{ formatDuration(run.durationMs) }}</Text
      >
    </Stack>

    <DescriptionList :items="totals" />

    <PanelSection title="Scope">
      <Stack gap="3">
        <DescriptionList :items="scope" layout="stacked" />
        <Stack v-if="run.scope?.labelSets?.length" gap="1">
          <Text variant="label">Label sets</Text>
          <ul>
            <li v-for="(labelSet, index) in run.scope.labelSets" :key="index">
              {{ formatLabelSet(labelSet) }}
            </li>
          </ul>
        </Stack>
      </Stack>
    </PanelSection>

    <InlineMessage
      v-if="failedCells.length"
      tone="warning"
      title="Failed cells"
    >
      <ul>
        <li v-for="cell in failedCells" :key="cell.cellIndex">
          Cell {{ cell.cellIndex }}:
          {{ cell.error ?? 'Failed without an error message.' }}
        </li>
      </ul>
    </InlineMessage>

    <PanelSection title="Cells">
      <DataTable
        caption="Cells"
        caption-hidden
        :columns="cellColumns"
        :rows="run.cells"
        :row-key="(cell) => String(cell.cellIndex)"
      >
        <template #cell-status="{ row }">
          <StatusBadge :status="runStatusKey(row.status)" />
        </template>
        <template #cell-controlKeys="{ row }">{{
          formatScopeList(row.controlKeys)
        }}</template>
        <template #cell-labelSetHashes="{ row }">{{
          formatScopeList(row.labelSetHashes)
        }}</template>
        <template #cell-tokens="{ row }"
          >{{ formatNumber(row.inputTokens) }} /
          {{ formatNumber(row.outputTokens) }}</template
        >
        <template #cell-cache="{ row }"
          >{{ formatNumber(row.cacheReadInputTokens) }} read /
          {{ formatNumber(row.cacheCreationInputTokens) }} created</template
        >
        <template #cell-rateLimitedCount="{ row }">{{
          formatNumber(row.rateLimitedCount)
        }}</template>
        <template #cell-mappings="{ row }"
          >{{ formatNumber(row.mappingsReturned) }} returned /
          {{ formatNumber(row.mappingsRejected) }} rejected</template
        >
        <template #cell-error="{ row }">{{ row.error ?? 'None' }}</template>
      </DataTable>
    </PanelSection>

    <PanelSection title="Events">
      <Text v-if="!run.events.length" variant="secondary"
        >No run events found.</Text
      >
      <ol v-else>
        <li
          v-for="event in run.events"
          :key="event.id ?? event.uuid ?? `${event.action}-${event.createdAt}`"
        >
          <Stack gap="1">
            <Text as="strong">{{ event.action ?? 'event' }}</Text>
            <Text variant="caption"
              >{{ event.actor ?? 'Unknown actor' }} ·
              {{ formatDate(event.createdAt) }}</Text
            >
            <Text v-if="event.message">{{ event.message }}</Text>
            <Text v-if="event.reasoning">{{ event.reasoning }}</Text>
          </Stack>
        </li>
      </ol>
    </PanelSection>
  </Stack>
</template>
