<script setup lang="ts">
import { computed } from 'vue';
import Button from '@/ds/components/Button/Button.vue';
import DataState from '@/ds/components/DataState/DataState.vue';
import DataTable from '@/ds/components/DataTable/DataTable.vue';
import type { DataTableColumn } from '@/ds/components/DataTable/types';
import InlineMessage from '@/ds/components/InlineMessage/InlineMessage.vue';
import MetricTile from '@/ds/components/MetricTile/MetricTile.vue';
import StatusBadge from '@/ds/components/StatusBadge/StatusBadge.vue';
import Text from '@/ds/components/Text/Text.vue';
import Grid from '@/ds/components/layout/Grid.vue';
import Panel from '@/ds/components/layout/Panel.vue';
import PanelSection from '@/ds/components/layout/PanelSection.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import {
  formatDate,
  formatLabel,
  formatNotificationName,
  getProviderLabel,
  statusBadge,
  type NotificationHealthNotification,
  type NotificationHealthQueue,
  type NotificationHealthResponse,
  type NotificationHealthSchedule,
  type NotificationHealthWarning,
  type NotificationProviderInfo,
} from './notificationDiagnostics';

/**
 * Diagnostics > Notifications > Health: warnings, worker mode, provider readiness, queues,
 * subscribers and scheduled runs. Read-only; a schedule's last job opens Deliveries filtered to it.
 */
const props = defineProps<{
  loading: boolean;
  error: string | null;
  health: NotificationHealthResponse | null;
  workerModeLabel: string;
  providers: NotificationProviderInfo[];
  queues: NotificationHealthQueue[];
  notifications: NotificationHealthNotification[];
  schedules: NotificationHealthSchedule[];
  warnings: NotificationHealthWarning[];
}>();
const emit = defineEmits<{ refresh: []; openDeliveries: [filter: string] }>();

const staleJobs = computed(() =>
  props.queues.reduce((total, queue) => total + (queue.staleCount ?? 0), 0),
);
const oldestWaiting = computed(() =>
  formatDate(
    props.queues
      .map((queue) => queue.oldestAvailableAt)
      .filter(Boolean)
      .sort()[0] ?? null,
  ),
);
const upcomingRuns = computed(
  () =>
    props.schedules.filter((schedule) => schedule.enabled && schedule.nextRunAt)
      .length,
);

const providerColumns: DataTableColumn[] = [
  { key: 'name', label: 'Provider' },
  { key: 'status', label: 'Status', nowrap: true },
  { key: 'description', label: 'Description', minWidth: 'md' },
];
const queueColumns: DataTableColumn[] = [
  { key: 'name', label: 'Queue' },
  { key: 'maxWorkers', label: 'Workers', align: 'end' },
  { key: 'available', label: 'Available', align: 'end' },
  { key: 'retryable', label: 'Retryable', align: 'end' },
  { key: 'running', label: 'Running', align: 'end' },
  { key: 'scheduled', label: 'Scheduled', align: 'end' },
  { key: 'completed24H', label: 'Completed 24h', align: 'end' },
  { key: 'discarded24H', label: 'Discarded 24h', align: 'end' },
  { key: 'staleCount', label: 'Stale', align: 'end' },
  { key: 'oldestAvailableAt', label: 'Oldest waiting', nowrap: true },
];
const subscriberColumns: DataTableColumn[] = [
  { key: 'name', label: 'Notification', minWidth: 'sm' },
  { key: 'email', label: 'Email', align: 'end' },
  { key: 'slack', label: 'Slack', align: 'end' },
  { key: 'totalUsers', label: 'Users', align: 'end' },
  { key: 'destinations', label: 'System destinations', align: 'end' },
];
const scheduleColumns: DataTableColumn[] = [
  { key: 'name', label: 'Notification', minWidth: 'sm' },
  { key: 'jobKind', label: 'Kind' },
  { key: 'queue', label: 'Queue' },
  { key: 'nextRunAt', label: 'Next run', nowrap: true },
  { key: 'lastJob', label: 'Last job', nowrap: true },
];

/** Counts as numbers, with zero for a queue the API didn't report. */
const queueRows = computed(() =>
  props.queues.map((queue) => ({
    name: queue.name,
    maxWorkers: queue.maxWorkers ?? 0,
    available: queue.available ?? 0,
    retryable: queue.retryable ?? 0,
    running: queue.running ?? 0,
    scheduled: queue.scheduled ?? 0,
    completed24H: queue.completed24H ?? 0,
    discarded24H: queue.discarded24H ?? 0,
    staleCount: queue.staleCount ?? 0,
    oldestAvailableAt: formatDate(queue.oldestAvailableAt),
  })),
);
const subscriberRows = computed(() =>
  props.notifications.map((notification) => ({
    id: notification.name,
    name: formatNotificationName(notification.name),
    email: notification.subscriberCounts?.email ?? 0,
    slack: notification.subscriberCounts?.slack ?? 0,
    totalUsers: notification.subscriberCounts?.totalUsers ?? 0,
    destinations: notification.configuredDestinations?.length ?? 0,
  })),
);
</script>

<template>
  <Panel
    title="Health"
    description="Readiness, queue state, subscribers, destinations, and scheduled runs."
  >
    <template #actions>
      <Button icon="refresh" :loading="loading" @click="emit('refresh')"
        >Refresh</Button
      >
    </template>
    <DataState
      :status="error ? 'error' : loading ? 'loading' : 'ready'"
      subject="notification health"
      :error-message="error ?? undefined"
      skeleton="panel"
      :heading-level="3"
      @retry="emit('refresh')"
    >
      <Stack gap="section">
        <InlineMessage
          v-if="warnings.length > 0"
          tone="warning"
          :title="`${warnings.length} notification health ${warnings.length === 1 ? 'warning' : 'warnings'}`"
        >
          <ul>
            <li
              v-for="warning in warnings"
              :key="`${warning.code}-${warning.target ?? ''}`"
            >
              {{ formatLabel(warning.severity) }}: {{ warning.message }}
              <template v-if="warning.target">({{ warning.target }})</template>
            </li>
          </ul>
        </InlineMessage>

        <Grid min="sm" gap="3">
          <MetricTile
            label="Worker mode"
            :value="workerModeLabel"
            :description="`Worker ${health?.worker?.enabled ? 'enabled' : 'disabled or unknown'}`"
          />
          <MetricTile
            label="Stale jobs"
            :value="String(staleJobs)"
            :description="`Oldest waiting: ${oldestWaiting}`"
          />
          <MetricTile
            label="Upcoming runs"
            :value="String(upcomingRuns)"
            description="Enabled schedules with a next run."
          />
        </Grid>

        <PanelSection title="Provider readiness">
          <DataTable
            v-if="providers.length > 0"
            caption="Providers"
            caption-hidden
            :columns="providerColumns"
            :rows="providers"
            :row-key="(provider) => provider.providerType"
          >
            <template #cell-name="{ row }">{{
              row.displayName || getProviderLabel(row.providerType)
            }}</template>
            <template #cell-status="{ row }">
              <StatusBadge
                :status="row.enabled ? 'provider-enabled' : 'provider-disabled'"
              />
            </template>
          </DataTable>
          <Text v-else variant="secondary"
            >No provider readiness returned.</Text
          >
        </PanelSection>

        <PanelSection title="Queue summary">
          <DataTable
            v-if="queueRows.length > 0"
            caption="Queues"
            caption-hidden
            :columns="queueColumns"
            :rows="queueRows"
            :row-key="(queue) => queue.name"
          />
          <Text v-else variant="secondary">No queue health returned.</Text>
        </PanelSection>

        <PanelSection title="Subscribers and destinations">
          <DataTable
            v-if="subscriberRows.length > 0"
            caption="Subscribers by notification"
            caption-hidden
            :columns="subscriberColumns"
            :rows="subscriberRows"
            :row-key="(row) => row.id"
          />
          <Text v-else variant="secondary"
            >No notification health returned.</Text
          >
        </PanelSection>

        <PanelSection title="Upcoming scheduled runs">
          <DataTable
            v-if="schedules.length > 0"
            caption="Scheduled runs"
            caption-hidden
            :columns="scheduleColumns"
            :rows="schedules"
            :row-key="(schedule) => `${schedule.name}-${schedule.jobKind}`"
          >
            <template #cell-name="{ row }">{{
              formatNotificationName(row.name)
            }}</template>
            <template #cell-nextRunAt="{ row }">{{
              formatDate(row.nextRunAt)
            }}</template>
            <template #cell-lastJob="{ row }">
              <Stack v-if="row.lastJob?.id" gap="1" align="start">
                <Button
                  variant="tertiary"
                  size="sm"
                  :aria-label="`Show deliveries for job ${row.lastJob.id}`"
                  @click="emit('openDeliveries', String(row.lastJob.id))"
                  >{{ row.lastJob.id }}</Button
                >
                <StatusBadge v-bind="statusBadge(row.lastJob.state)" />
              </Stack>
              <template v-else>None</template>
            </template>
          </DataTable>
          <Text v-else variant="secondary"
            >No scheduled notification runs returned.</Text
          >
        </PanelSection>
      </Stack>
    </DataState>
  </Panel>
</template>
