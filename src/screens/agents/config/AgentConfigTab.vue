<script setup lang="ts">
import {
  computed,
  defineAsyncComponent,
  onMounted,
  ref,
  toRef,
  watch,
} from 'vue';
import Button from '@/ds/components/Button/Button.vue';
import InlineMessage from '@/ds/components/InlineMessage/InlineMessage.vue';
import RadioGroup from '@/ds/components/RadioGroup/RadioGroup.vue';
import Text from '@/ds/components/Text/Text.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import type { Agent } from '@/types/agents';
import { usePermissions } from '@/composables/usePermissions';
import { useAgentConfigApi } from '@/composables/agent-config/useAgentConfigApi';
import { useAgentConfig } from '@/composables/agent-config/useAgentConfig';
import { useConfigWorkspace } from '@/composables/agent-config/useConfigWorkspace';
import { sanitizeForDisplay } from '@/utils/agent-config/display';
import AgentConfigHeader from './AgentConfigHeader.vue';
import AgentInstancePicker from './AgentInstancePicker.vue';
import InstanceModeNotice from './InstanceModeNotice.vue';
import AgentConfigEffectiveView from './AgentConfigEffectiveView.vue';
import ConfigYamlViewer from './ConfigYamlViewer.vue';
import AgentConfigHistory from './AgentConfigHistory.vue';
import PendingChangesBar from './workspace/PendingChangesBar.vue';
import {
  LOCKED_LEGEND,
  NOT_REPORTED_TEXT,
  OVERLAY_SECRETS_NOTICE,
} from './constants';

// The raw YAML dialog (CodeMirror) loads only when someone opens it.
const RawOverlayDialog = defineAsyncComponent(
  () => import('./workspace/RawOverlayDialog.vue'),
);

const props = defineProps<{ agent: Agent }>();

const api = useAgentConfigApi();
const agentId = toRef(() => props.agent.id);
const state = useAgentConfig(agentId, api);
// R69: the shared pending-changes draft + inline editing.
const ws = useConfigWorkspace(agentId, api, state);
const rawOpen = ref(false);

/** The shown view: effective, file, overlay or history. */
const view = ref('effective');
const viewOptions = [
  { label: 'Effective', value: 'effective' },
  { label: 'File', value: 'file' },
  { label: 'Overlay', value: 'overlay' },
  { label: 'History', value: 'history' },
];
const refreshing = ref(false);

// ---- Editing: agent:configure (U2.7) ----
const { permissionTooltip, RESOURCES, ACTIONS } = usePermissions();
const canEdit = ws.canConfigure;
/** Why the raw YAML editor is unavailable, else undefined. */
const rawBlocked = computed(() => {
  if (!canEdit.value)
    return permissionTooltip(RESOURCES.AGENT, ACTIONS.CONFIGURE);
  if (!ws.ready.value) return 'The configuration is still loading.';
  return undefined;
});
// Validation and the review diff need every reported base: editors load them (≤ 6 at a
// time) in the background once the configuration is there; readers never do.
watch(
  // After the selected instance's own load, so it is not fetched twice.
  () =>
    state.status.value === 'ready' &&
    !state.instanceLoading.value &&
    canEdit.value,
  (go) => {
    if (go && !ws.detailsLoaded.value && !ws.detailsLoading.value)
      ws.loadDetails();
  },
  { immediate: true },
);

const selectedSummary = computed(
  () =>
    state.instances.value.find(
      (i) => i.instanceId === state.selectedInstanceId.value,
    ) ?? null,
);
const reported = computed(
  () =>
    !!state.selectedState.value &&
    state.selectedState.value.state !== 'not-reported',
);
const instanceView = computed(
  () => view.value === 'effective' || view.value === 'file',
);
// While switching instances the previous detail is still loaded: show a placeholder rather
// than one host's config under another host's header.
const instancePending = computed(
  () =>
    !!state.selectedInstanceId.value &&
    !state.selectedInstanceCurrent.value &&
    !state.instanceError.value,
);
// Defence in depth: the file view never shows api.auth.client_secret either.
const fileDoc = computed(() => {
  const base = state.selectedInstance.value?.base;
  return reported.value && base ? sanitizeForDisplay(base) : null;
});
const appliedRevisionNote = computed(() => {
  const inst = state.selectedInstance.value;
  if (!inst || inst.syncStatus === 'in-sync') return null;
  if (inst.appliedRevision === state.desiredRevision.value) return null;
  return inst.appliedRevision ?? 0;
});
const overlayDoc = computed(() => {
  const cfg = state.config.value;
  if (!cfg || cfg.revision === 0) return null;
  return cfg.overlay ?? {};
});

function safeFilePart(s: string): string {
  return s.replace(/[^A-Za-z0-9_.-]+/g, '-');
}
const safeName = computed(() => safeFilePart(props.agent.name));
/** The shown instance in download names: its hostname, else a short instance id. */
const safeHost = computed(() => {
  const host = selectedSummary.value?.hostname;
  if (host) return safeFilePart(host);
  return safeFilePart((state.selectedInstanceId.value ?? '').slice(0, 8));
});

/** The File / Effective views show one instance: name the download after it. */
function instanceFileName(kind: 'file' | 'effective'): string {
  return (
    [safeName.value, safeHost.value, kind].filter(Boolean).join('-') + '.yaml'
  );
}

async function refresh() {
  refreshing.value = true;
  try {
    await state.refresh();
  } finally {
    refreshing.value = false;
  }
}

onMounted(() => {
  state.load();
});

defineExpose({ state, ws });
</script>

<template>
  <Stack gap="4" data-test="agent-config-tab">
    <Text
      v-if="state.status.value === 'loading' || state.status.value === 'idle'"
      variant="secondary"
      role="status"
      data-test="config-loading"
    >
      Loading configuration…
    </Text>
    <InlineMessage
      v-else-if="state.status.value === 'unsupported'"
      tone="info"
      data-test="config-unsupported"
    >
      This CCF API version does not support agent configuration.
    </InlineMessage>
    <InlineMessage
      v-else-if="state.status.value === 'error'"
      tone="error"
      title="The configuration failed to load"
      data-test="config-error"
    >
      <Cluster gap="3">
        <span>{{ state.error.value }}</span>
        <Button size="sm" data-test="config-retry" @click="state.load()"
          >Retry</Button
        >
      </Cluster>
    </InlineMessage>
    <template v-else>
      <AgentConfigHeader
        :config="state.config.value"
        :sync-summary="state.syncSummary.value"
        :instance-count="state.instanceTotal.value"
        :loading="refreshing"
        @refresh="refresh"
        @select-instance="state.selectInstance"
      >
        <template #actions>
          <Button
            size="sm"
            icon="code"
            :disabled-reason="rawBlocked"
            data-test="raw-overlay"
            @click="rawOpen = true"
            >Advanced: raw YAML</Button
          >
        </template>
      </AgentConfigHeader>

      <AgentInstancePicker
        v-if="state.instances.value.length > 1"
        :instances="state.instances.value"
        :states="state.instanceStates.value"
        :selected-id="state.selectedInstanceId.value"
        @select="state.selectInstance"
      />

      <InstanceModeNotice
        :instance="selectedSummary"
        :state="state.selectedState.value"
      />

      <Cluster justify="between" gap="2">
        <RadioGroup
          v-model="view"
          legend="Configuration view"
          legend-hidden
          variant="segmented"
          :options="viewOptions"
          data-test="config-view"
        />
        <Text
          v-if="state.instanceLoading.value"
          as="span"
          variant="caption"
          role="status"
          >Loading instance…</Text
        >
      </Cluster>
      <InlineMessage
        v-if="state.instanceError.value"
        tone="error"
        data-test="instance-error"
      >
        {{ state.instanceError.value }}
      </InlineMessage>

      <Text
        v-if="instanceView && instancePending"
        variant="secondary"
        data-test="instance-pending"
      >
        Loading instance…
      </Text>
      <span v-else-if="instanceView && state.instanceError.value" />
      <AgentConfigEffectiveView
        v-else-if="view === 'effective'"
        :effective-doc="
          reported ? (state.selectedInstance.value?.effective ?? null) : null
        "
        :base="state.selectedInstance.value?.base ?? null"
        :applied-overlay="state.appliedOverlay.value"
        :applied-revision-note="appliedRevisionNote"
        :provenance-fallback="state.appliedOverlayFallback.value"
        :filename="instanceFileName('effective')"
        :plugin-reports="state.selectedInstance.value?.plugins ?? null"
      />
      <ConfigYamlViewer
        v-else-if="view === 'file'"
        :doc="fileDoc"
        :filename="instanceFileName('file')"
        :empty-text="NOT_REPORTED_TEXT"
        :legend="LOCKED_LEGEND"
        label="Local file YAML"
      />
      <Stack v-else-if="view === 'overlay'" gap="2">
        <Text variant="caption">{{ OVERLAY_SECRETS_NOTICE }}</Text>
        <ConfigYamlViewer
          :doc="overlayDoc"
          :filename="`${safeName}-overlay-r${state.desiredRevision.value}.yaml`"
          empty-text="No overlay saved yet."
          label="Overlay YAML"
        />
      </Stack>
      <AgentConfigHistory
        v-else-if="view === 'history'"
        :api="api"
        :agent-id="agent.id"
        :file-base="safeName"
        :desired-revision="state.desiredRevision.value"
        :can-revert="ws.canConfigure.value"
        :revert-tooltip="permissionTooltip(RESOURCES.AGENT, ACTIONS.CONFIGURE)"
        :get-revision="state.getRevisionCached"
        @changed="refresh"
      />
    </template>

    <PendingChangesBar />
    <RawOverlayDialog v-if="rawOpen" v-model:visible="rawOpen" />
  </Stack>
</template>
