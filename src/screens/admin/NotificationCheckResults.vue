<script setup lang="ts">
import Button from '@/ds/components/Button/Button.vue';
import DataTable from '@/ds/components/DataTable/DataTable.vue';
import type { DataTableColumn } from '@/ds/components/DataTable/types';
import InlineMessage from '@/ds/components/InlineMessage/InlineMessage.vue';
import StatusBadge from '@/ds/components/StatusBadge/StatusBadge.vue';
import Tag from '@/ds/components/Tag/Tag.vue';
import Text from '@/ds/components/Text/Text.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Grid from '@/ds/components/layout/Grid.vue';
import Panel from '@/ds/components/layout/Panel.vue';
import PanelSection from '@/ds/components/layout/PanelSection.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import {
  formatLabel,
  formatNotificationName,
  getProviderLabel,
  statusBadge,
  type NotificationDestinationResponse,
  type NotificationDiagnosticsResponse,
} from './notificationDiagnostics';

/**
 * The result of a notification diagnostics run: overall status, each check (with links to the
 * deliveries it names), subscribers and destinations, and recommended actions.
 */
defineProps<{
  diagnostics: NotificationDiagnosticsResponse;
  subscriberCounts: Record<string, number>;
  destinations: NotificationDestinationResponse[];
}>();
const emit = defineEmits<{ openDeliveries: [filter: string] }>();

const checkColumns: DataTableColumn[] = [
  { key: 'label', label: 'Check', minWidth: 'sm' },
  { key: 'status', label: 'Status', nowrap: true },
  { key: 'message', label: 'Result', minWidth: 'md' },
];
</script>

<template>
  <Stack gap="section">
    <Panel
      :title="formatNotificationName(diagnostics.notificationName)"
      description="Overall status"
    >
      <template #actions>
        <StatusBadge v-bind="statusBadge(diagnostics.status)" />
      </template>
      <PanelSection title="Checks">
        <DataTable
          caption="Checks"
          caption-hidden
          :columns="checkColumns"
          :rows="diagnostics.checks"
          :row-key="(check) => check.code"
        >
          <template #cell-status="{ row }">
            <StatusBadge v-bind="statusBadge(row.status)" />
          </template>
          <template #actions="{ row }">
            <Cluster gap="2" justify="end">
              <Button
                v-if="row.jobId"
                variant="tertiary"
                size="sm"
                :aria-label="`Show deliveries for job ${row.jobId}`"
                @click="emit('openDeliveries', String(row.jobId))"
                >Job {{ row.jobId }}</Button
              >
              <Button
                v-if="row.correlationId"
                variant="tertiary"
                size="sm"
                :aria-label="`Show deliveries for correlation ${row.correlationId}`"
                @click="emit('openDeliveries', row.correlationId)"
                >Correlation</Button
              >
            </Cluster>
          </template>
        </DataTable>
      </PanelSection>
    </Panel>

    <Grid min="md" gap="4">
      <Panel title="Subscribers and destinations">
        <Stack gap="3">
          <Cluster v-if="Object.keys(subscriberCounts).length > 0" gap="2">
            <Tag
              v-for="(count, channel) in subscriberCounts"
              :key="channel"
              :label="`${formatLabel(String(channel))}: ${count}`"
            />
          </Cluster>
          <Text v-else variant="secondary">No subscriber counts returned.</Text>
          <Stack v-if="destinations.length > 0" gap="2">
            <Cluster
              v-for="destination in destinations"
              :key="`${destination.providerType}-${destination.destinationTarget}`"
              gap="2"
            >
              <Tag :label="getProviderLabel(destination.providerType)" />
              <Text as="span">{{ destination.destinationTarget }}</Text>
            </Cluster>
          </Stack>
          <Text v-else variant="secondary"
            >No system destinations returned.</Text
          >
        </Stack>
      </Panel>

      <Panel title="Recommended actions">
        <InlineMessage
          v-if="diagnostics.recommendedActions?.length"
          tone="warning"
        >
          <ul>
            <li v-for="action in diagnostics.recommendedActions" :key="action">
              {{ action }}
            </li>
          </ul>
        </InlineMessage>
        <Text v-else variant="secondary"
          >No recommended actions. Review the checks above for details.</Text
        >
      </Panel>
    </Grid>
  </Stack>
</template>
