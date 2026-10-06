<template>
  <section
    v-if="instance && state"
    class="space-y-3 rounded-md border border-ccf-300 p-4 text-sm dark:border-slate-700"
    data-test="mode-notice"
  >
    <div class="flex flex-wrap items-center gap-2">
      <span class="font-medium text-gray-900 dark:text-slate-200">
        {{ instance.hostname || instance.instanceId }}
      </span>
      <ConfigPill v-if="instance.mode" severity="info" data-test="mode-badge">
        {{ instance.mode }}
      </ConfigPill>
      <InstanceStatusChip :state="state" />
      <ConfigPill
        v-for="badge in state.badges"
        :key="badge.key"
        v-tooltip.top="badge.tooltip"
        :severity="badge.severity"
        :data-badge="badge.key"
      >
        {{ badge.label }}
      </ConfigPill>
      <span
        v-if="instance.agentVersion"
        class="text-xs text-gray-500 dark:text-slate-400"
      >
        agent {{ instance.agentVersion }}
      </span>
    </div>

    <!-- Mode explanation (§6.1) -->
    <p
      v-if="state.state === 'not-reported'"
      class="text-gray-600 dark:text-slate-400"
    >
      {{ NOT_REPORTED_TEXT }}
    </p>
    <p
      v-else-if="instance.mode === 'report'"
      class="text-gray-600 dark:text-slate-400"
    >
      {{ MODE_TEXT.report }}
    </p>
    <template v-else-if="instance.mode === 'apply_safe'">
      <p class="text-gray-600 dark:text-slate-400">
        {{ MODE_TEXT.apply_safe }}
      </p>
      <div
        class="flex flex-wrap items-center gap-1"
        data-test="trusted-sources"
      >
        <span class="text-xs text-gray-500 dark:text-slate-400"
          >Trusted sources:</span
        >
        <span
          v-if="!trusted.length"
          class="text-xs text-gray-500 dark:text-slate-400"
          >none</span
        >
        <code
          v-for="s in trusted"
          :key="s"
          class="rounded bg-slate-200 px-1.5 text-xs dark:bg-slate-700"
          >{{ s }}</code
        >
      </div>
      <div
        class="flex flex-wrap items-center gap-1"
        data-test="overridable-flags"
      >
        <span class="text-xs text-gray-500 dark:text-slate-400"
          >Overridable config keys:</span
        >
        <span
          v-if="!overridable.length"
          class="text-xs text-gray-500 dark:text-slate-400"
          >none</span
        >
        <code
          v-for="s in overridable"
          :key="s"
          class="rounded bg-slate-200 px-1.5 text-xs dark:bg-slate-700"
          >{{ s }}</code
        >
      </div>
    </template>
    <template v-else-if="instance.mode === 'apply_all'">
      <p class="text-gray-600 dark:text-slate-400">{{ MODE_TEXT.apply_all }}</p>
      <p
        v-if="rc.allow_local_sources"
        class="text-gray-600 dark:text-slate-400"
      >
        Local sources allowed.
      </p>
    </template>

    <!-- Status details (U1.3 table) -->
    <p
      v-if="state.state === 'pending'"
      class="text-amber-700 dark:text-amber-300"
    >
      Picks up changes within its poll interval
      (<code>remote_config.poll_interval</code>,
      {{ rc.poll_interval ?? 'default 60 s' }}).
    </p>
    <div
      v-if="state.problem"
      class="space-y-2 rounded-md bg-red-50 p-3 dark:bg-red-500/10"
      data-test="rejection-details"
    >
      <p
        v-if="state.state === 'rejected-forbidden'"
        class="text-red-700 dark:text-red-300"
      >
        Forbidden changes are rejected in every mode.
      </p>
      <p
        v-if="instance.reason && !isUnsafeRow"
        class="text-red-700 dark:text-red-300"
      >
        <CodeLabel :labels="APPLY_REASON_LABELS" :code="instance.reason" />
      </p>
      <p
        v-if="instance.error"
        class="font-mono text-xs break-all text-red-700 dark:text-red-300"
      >
        {{ instance.error }}
      </p>
      <ul v-if="isUnsafeRow && instance.unsafe.length" class="space-y-1">
        <li
          v-for="c in instance.unsafe"
          :key="`${c.path}|${c.reason}|${c.value ?? ''}`"
          class="flex flex-wrap gap-2 text-xs"
        >
          <code class="font-mono">{{ c.path }}</code>
          <span>·</span>
          <CodeLabel :labels="CHANGE_REASON_LABELS" :code="c.reason" />
          <template v-if="c.value">
            <span>·</span><code class="font-mono break-all">{{ c.value }}</code>
          </template>
        </li>
      </ul>
      <p
        v-if="
          instance.appliedRevision !== null &&
          state.state !== 'rejected-invalid'
        "
        class="text-xs text-gray-600 dark:text-slate-400"
      >
        running r{{ instance.appliedRevision }}
      </p>
    </div>

    <!-- R41 file warnings -->
    <div
      v-if="instance.warnings?.length"
      class="rounded-md bg-amber-50 p-3 dark:bg-amber-500/10"
      data-test="file-warnings"
    >
      <p class="mb-1 text-xs font-medium text-amber-800 dark:text-amber-300">
        Problems in this agent's local file (tolerated; the affected plugins are
        skipped)
      </p>
      <ul class="space-y-1 text-xs">
        <li
          v-for="(w, i) in instance.warnings"
          :key="i"
          class="flex flex-wrap gap-2"
        >
          <code class="font-mono">{{ w.path || '/' }}</code>
          <span v-if="w.code" class="text-gray-500 dark:text-slate-400">
            <CodeLabel :labels="FIELD_ERROR_CODE_LABELS" :code="w.code" />
          </span>
          <span>{{ w.message }}</span>
        </li>
      </ul>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type {
  AgentInstanceSummary,
  RemoteConfigDoc,
} from '@/types/agent-config';
import type { InstanceUiState } from '@/utils/agent-config/instance-status';
import ConfigPill from './ConfigPill.vue';
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
