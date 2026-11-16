<script setup lang="ts">
import { computed } from 'vue';
import type {
  AgentInstanceSummary,
  RemoteConfigDoc,
} from '@/types/agent-config';
import type { InstanceUiState } from '@/utils/agent-config/instance-status';
import InfoTip from '@/ds/components/InfoTip/InfoTip.vue';
import InlineMessage from '@/ds/components/InlineMessage/InlineMessage.vue';
import Tag from '@/ds/components/Tag/Tag.vue';
import Text from '@/ds/components/Text/Text.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Panel from '@/ds/components/layout/Panel.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import CodeLabel from './CodeLabel.vue';
import InstanceStatusChip from './InstanceStatusChip.vue';
import {
  APPLY_REASON_LABELS,
  CHANGE_REASON_LABELS,
  FIELD_ERROR_CODE_LABELS,
  MODE_TEXT,
  NOT_REPORTED_TEXT,
} from './constants';

const props = defineProps<{
  instance: AgentInstanceSummary | null;
  state: InstanceUiState | null;
}>();

// R29 defaults when keys are absent.
const rc = computed<RemoteConfigDoc>(() => props.instance?.remoteConfig ?? {});
const trusted = computed(() => rc.value.trusted_sources ?? []);
const overridable = computed(() => rc.value.overridable_config_flags ?? []);
const isUnsafeRow = computed(
  () =>
    props.state?.state === 'rejected-unsafe' ||
    props.state?.state === 'rejected-forbidden',
);
</script>

<template>
  <Panel
    v-if="instance && state"
    :title="instance.hostname || instance.instanceId"
    dense
    data-test="mode-notice"
  >
    <Stack gap="3">
      <Cluster gap="2">
        <Tag
          v-if="instance.mode"
          :label="instance.mode"
          data-test="mode-badge"
        />
        <InstanceStatusChip :state="state" />
        <Cluster
          v-for="badge in state.badges"
          :key="badge.key"
          as="span"
          gap="1"
          :data-badge="badge.key"
        >
          <Tag :label="badge.label" />
          <InfoTip v-if="badge.tooltip" :text="badge.tooltip" />
        </Cluster>
        <Text v-if="instance.agentVersion" as="span" variant="caption">
          agent {{ instance.agentVersion }}
        </Text>
      </Cluster>

      <!-- Mode explanation (§6.1) -->
      <Text v-if="state.state === 'not-reported'" variant="secondary">
        {{ NOT_REPORTED_TEXT }}
      </Text>
      <Text v-else-if="instance.mode === 'report'" variant="secondary">
        {{ MODE_TEXT.report }}
      </Text>
      <template v-else-if="instance.mode === 'apply_safe'">
        <Text variant="secondary">{{ MODE_TEXT.apply_safe }}</Text>
        <Cluster gap="1" data-test="trusted-sources">
          <Text as="span" variant="caption">Trusted sources:</Text>
          <Text v-if="!trusted.length" as="span" variant="caption">none</Text>
          <Tag v-for="src in trusted" :key="src" :label="src" />
        </Cluster>
        <Cluster gap="1" data-test="overridable-flags">
          <Text as="span" variant="caption">Overridable config keys:</Text>
          <Text v-if="!overridable.length" as="span" variant="caption"
            >none</Text
          >
          <Tag v-for="flag in overridable" :key="flag" :label="flag" />
        </Cluster>
      </template>
      <template v-else-if="instance.mode === 'apply_all'">
        <Text variant="secondary">{{ MODE_TEXT.apply_all }}</Text>
        <Text v-if="rc.allow_local_sources" variant="secondary">
          Local sources allowed.
        </Text>
      </template>

      <!-- Status details (U1.3 table) -->
      <Text v-if="state.state === 'pending'">
        Picks up changes within its poll interval (<Text
          as="code"
          variant="code"
          >remote_config.poll_interval</Text
        >, {{ rc.poll_interval ?? 'default 60 s' }}).
      </Text>
      <InlineMessage
        v-if="state.problem"
        tone="error"
        data-test="rejection-details"
      >
        <Stack gap="2">
          <Text v-if="state.state === 'rejected-forbidden'">
            Forbidden changes are rejected in every mode.
          </Text>
          <Text v-if="instance.reason && !isUnsafeRow">
            <CodeLabel :labels="APPLY_REASON_LABELS" :code="instance.reason" />
          </Text>
          <Text v-if="instance.error" as="code" variant="code">{{
            instance.error
          }}</Text>
          <Stack v-if="isUnsafeRow && instance.unsafe.length" as="ul" gap="1">
            <Cluster
              v-for="c in instance.unsafe"
              :key="`${c.path}|${c.reason}|${c.value ?? ''}`"
              as="li"
              gap="2"
            >
              <Text as="code" variant="code">{{ c.path }}</Text>
              <CodeLabel :labels="CHANGE_REASON_LABELS" :code="c.reason" />
              <Text v-if="c.value" as="code" variant="code">{{ c.value }}</Text>
            </Cluster>
          </Stack>
          <Text
            v-if="
              instance.appliedRevision !== null &&
              state.state !== 'rejected-invalid'
            "
            variant="caption"
          >
            Running r{{ instance.appliedRevision }}
          </Text>
        </Stack>
      </InlineMessage>

      <!-- R41 file warnings -->
      <InlineMessage
        v-if="instance.warnings?.length"
        tone="warning"
        title="Problems in this agent's local file (tolerated; the affected plugins are skipped)"
        data-test="file-warnings"
      >
        <Stack as="ul" gap="1">
          <Cluster v-for="(w, i) in instance.warnings" :key="i" as="li" gap="2">
            <Text as="code" variant="code">{{ w.path || '/' }}</Text>
            <CodeLabel
              v-if="w.code"
              :labels="FIELD_ERROR_CODE_LABELS"
              :code="w.code"
            />
            <Text as="span">{{ w.message }}</Text>
          </Cluster>
        </Stack>
      </InlineMessage>
    </Stack>
  </Panel>
</template>
