<script setup lang="ts">
import Button from '@/ds/components/Button/Button.vue';
import IconButton from '@/ds/components/IconButton/IconButton.vue';
import Tag from '@/ds/components/Tag/Tag.vue';
import Text from '@/ds/components/Text/Text.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Panel from '@/ds/components/layout/Panel.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import type { AgentConfigRevision } from '@/types/agent-config';
import type { SyncSummary } from '@/utils/agent-config/instance-status';
import { formatAbsolute, formatRelative } from '@/utils/agent-config/display';

withDefaults(
  defineProps<{
    config: AgentConfigRevision | null;
    syncSummary: SyncSummary;
    /** Every instance of the agent (the API's count), loaded or not. */
    instanceCount: number;
    loading?: boolean;
  }>(),
  { loading: false },
);

defineEmits<{ refresh: []; 'select-instance': [id: string] }>();
</script>

<template>
  <Panel aria-label="Configuration status" dense data-test="config-header">
    <Cluster justify="between" align="start" gap="4">
      <Stack gap="1">
        <Text v-if="!config || config.revision === 0">
          No overlay saved: agents run their local configuration.
        </Text>
        <Cluster v-else gap="1" data-test="desired-revision">
          <Text as="span"
            >Desired revision <strong>r{{ config.revision }}</strong>
            <template v-if="config.createdBy">
              · by {{ config.createdBy }}</template
            >
            <template v-if="config.createdAt">
              ·
              <time
                :datetime="config.createdAt"
                :title="formatAbsolute(config.createdAt)"
                >{{ formatRelative(config.createdAt) }}</time
              >
            </template>
            <template v-if="config.comment">
              · “{{ config.comment }}”</template
            ></Text
          >
          <Tag
            v-if="config.revertOf"
            :label="`Revert of r${config.revertOf}`"
          />
        </Cluster>
        <Text v-if="instanceCount === 0" variant="secondary">
          No instances have connected yet.
        </Text>
        <Cluster v-else gap="3" data-test="sync-summary">
          <Text as="strong">
            In sync: {{ syncSummary.inSync }}/{{ syncSummary.expected }}
            instances
            <template v-if="syncSummary.partial">
              (incl. stale, from the API's fleet counts)</template
            >
          </Text>
          <Text v-if="syncSummary.reportOnly" as="span" variant="secondary">
            {{ syncSummary.reportOnly }} report-only
          </Text>
          <Text v-if="syncSummary.notReported" as="span" variant="secondary">
            {{ syncSummary.notReported }} not reporting
          </Text>
          <Text v-if="syncSummary.stale" as="span" variant="secondary">
            {{ syncSummary.stale }} stale
          </Text>
          <Text v-if="syncSummary.partial" as="span" data-test="partial-fleet">
            Showing {{ syncSummary.loaded }} of {{ syncSummary.total }}
            instances: the list and problems below cover only those
          </Text>
          <Button
            v-for="p in syncSummary.problems"
            :key="p.instanceId"
            variant="tertiary"
            size="sm"
            icon="warning"
            wrap
            data-test="problem-chip"
            @click="$emit('select-instance', p.instanceId)"
          >
            {{ p.hostname || p.instanceId.slice(0, 8) }}: {{ p.label }}
          </Button>
        </Cluster>
      </Stack>
      <Cluster gap="2">
        <IconButton
          icon="refresh"
          label="Refresh configuration"
          variant="secondary"
          size="sm"
          :disabled-reason="loading ? 'Refreshing…' : undefined"
          data-test="refresh"
          @click="$emit('refresh')"
        />
        <slot name="actions" />
      </Cluster>
    </Cluster>
  </Panel>
</template>
