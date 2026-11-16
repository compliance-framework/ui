<script setup lang="ts">
import { computed } from 'vue';
import CodeBlock from '@/ds/components/CodeBlock/CodeBlock.vue';
import DescriptionList from '@/ds/components/DescriptionList/DescriptionList.vue';
import InlineMessage from '@/ds/components/InlineMessage/InlineMessage.vue';
import StatusBadge from '@/ds/components/StatusBadge/StatusBadge.vue';
import Text from '@/ds/components/Text/Text.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import PanelSection from '@/ds/components/layout/PanelSection.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import {
  formatDate,
  sanitizePayload,
  statusBadge,
  stringifyPayload,
  type NotificationJobDetail,
} from './notificationDiagnostics';

/**
 * One notification delivery job, read-only: its timeline, source and correlation, and its
 * arguments and metadata with secrets and message bodies removed.
 */
const props = defineProps<{ job: NotificationJobDetail }>();

const args = computed(() =>
  stringifyPayload(sanitizePayload(props.job.args ?? {})),
);
const metadata = computed(() =>
  stringifyPayload(sanitizePayload(props.job.metadata ?? {})),
);

const facts = computed(() => {
  const job = props.job;
  const sourceKind = job.sourceJobKind ?? job.metadata?.sourceJobKind ?? 'None';
  const sourceId = job.sourceJobId ?? job.metadata?.sourceJobId ?? '';

  return [
    { key: 'created', label: 'Created', value: formatDate(job.createdAt) },
    {
      key: 'scheduled',
      label: 'Scheduled',
      value: formatDate(job.scheduledAt),
    },
    {
      key: 'attempted',
      label: 'Attempted',
      value: formatDate(job.attemptedAt),
    },
    {
      key: 'finalized',
      label: 'Finalized',
      value: formatDate(job.finalizedAt),
    },
    {
      key: 'source',
      label: 'Source job',
      value: `${String(sourceKind)} ${String(sourceId)}`.trim(),
    },
    {
      key: 'correlation',
      label: 'Correlation',
      value: String(job.correlationId ?? job.metadata?.correlationId ?? 'None'),
    },
  ];
});
</script>

<template>
  <Stack gap="5">
    <Stack gap="2">
      <Cluster gap="2">
        <Text as="strong">Job {{ job.id }}</Text>
        <StatusBadge v-bind="statusBadge(job.state)" />
      </Cluster>
      <Text variant="secondary"
        >Read-only delivery details. Queue mutation controls are intentionally
        unavailable.</Text
      >
    </Stack>

    <DescriptionList :items="facts" />

    <PanelSection title="Sanitized arguments">
      <CodeBlock :code="args" label="Sanitized arguments" />
    </PanelSection>

    <PanelSection title="Sanitized metadata">
      <CodeBlock :code="metadata" label="Sanitized metadata" />
    </PanelSection>

    <PanelSection title="Errors">
      <Stack gap="2">
        <InlineMessage
          v-for="error in job.errors"
          :key="`${error.at}-${error.attempt}`"
          tone="error"
          :title="`Attempt ${error.attempt ?? 'unknown'} · ${formatDate(error.at)}`"
        >
          {{ error.error }}
        </InlineMessage>
        <Text v-if="(job.errors ?? []).length === 0" variant="secondary"
          >No job errors returned.</Text
        >
      </Stack>
    </PanelSection>
  </Stack>
</template>
