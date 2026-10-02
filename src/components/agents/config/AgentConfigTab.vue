<template>
  <div class="space-y-4 pt-4" data-test="agent-config-tab">
    <p
      v-if="state.status.value === 'loading' || state.status.value === 'idle'"
      class="text-sm text-gray-500 dark:text-slate-400"
      data-test="config-loading"
    >
      Loading configuration…
    </p>
    <Message
      v-else-if="state.status.value === 'unsupported'"
      severity="info"
      data-test="config-unsupported"
    >
      This CCF API version does not support agent configuration.
    </Message>
    <Message
      v-else-if="state.status.value === 'error'"
      severity="error"
      data-test="config-error"
    >
      <div class="flex flex-wrap items-center gap-3">
        <span>{{ state.error.value }}</span>
        <SecondaryButton size="small" @click="state.load()"
          >Retry</SecondaryButton
        >
      </div>
    </Message>
    <template v-else>
      <AgentConfigHeader
        :config="state.config.value"
        :sync-summary="state.syncSummary.value"
        :instance-count="state.instances.value.length"
        :loading="refreshing"
        @refresh="refresh"
        @select-instance="state.selectInstance"
      >
        <template #actions>
          <span v-tooltip.top="{ value: editTooltip, disabled: canEdit }">
            <SecondaryButton
              size="small"
              :disabled="!canEdit || !ws.ready.value"
              data-test="raw-overlay"
              @click="rawOpen = true"
            >
              Advanced: raw YAML
            </SecondaryButton>
          </span>
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

      <div class="flex flex-wrap items-center justify-between gap-2">
        <SelectButton
          v-model="view"
          :options="viewOptions"
          option-label="label"
          option-value="value"
          :allow-empty="false"
          aria-label="Configuration view"
          data-test="config-view"
        />
        <span
          v-if="state.instanceLoading.value"
          class="text-xs text-gray-500 dark:text-slate-400"
          >Loading instance…</span
        >
      </div>
      <Message v-if="state.instanceError.value" severity="error">
        {{ state.instanceError.value }}
      </Message>

      <p
        v-if="instanceView && instancePending"
        class="text-sm text-gray-500 dark:text-slate-400"
        data-test="instance-pending"
      >
        Loading instance…
      </p>
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
        :filename="
          fileName(
            'effective',
            state.selectedInstance.value?.appliedRevision ?? 0,
          )
        "
        :plugin-reports="state.selectedInstance.value?.plugins ?? null"
      />
      <ConfigYamlViewer
        v-else-if="view === 'file'"
        :doc="fileDoc"
        :filename="fileName('file', 0)"
        :empty-text="NOT_REPORTED_TEXT"
        :legend="LOCKED_LEGEND"
      />
      <div v-else-if="view === 'overlay'" class="space-y-2">
        <p class="text-xs text-gray-500 dark:text-slate-400">
          <i class="pi pi-info-circle mr-1" />{{ OVERLAY_SECRETS_NOTICE }}
        </p>
        <ConfigYamlViewer
          :doc="overlayDoc"
          :filename="fileName('overlay', state.desiredRevision.value)"
          empty-text="No overlay saved yet."
        />
      </div>
      <AgentConfigHistory
        v-else-if="view === 'history'"
        :api="api"
        :agent-id="agent.id"
        :file-base="safeName"
        :desired-revision="state.desiredRevision.value"
        :revert-access="revertAccess"
        :revert-tooltip="permissionTooltip(RESOURCES.AGENT, ACTIONS.CONFIGURE)"
        :current-overlay="currentOverlay"
        :load-bases="state.loadValidationBases"
        :get-revision="state.getRevisionCached"
        @changed="refresh"
      />
    </template>

    <PendingChangesBar />
    <RawOverlayDialog v-if="rawOpen" v-model:visible="rawOpen" />
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  defineAsyncComponent,
  onMounted,
  ref,
  toRef,
  watch,
} from 'vue';
import Message from '@/volt/Message.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import SelectButton from '@/volt/SelectButton.vue';
import type { Agent } from '@/types/agents';
import type { OverlayDoc } from '@/types/agent-config';
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

type ConfigView = 'effective' | 'file' | 'overlay' | 'history';

const props = defineProps<{ agent: Agent }>();

const api = useAgentConfigApi();
const agentId = toRef(() => props.agent.id);
const state = useAgentConfig(agentId, api);
// R69: the shared pending-changes draft + inline editing.
const ws = useConfigWorkspace(props.agent.id, api, state);
const rawOpen = ref(false);

const view = ref<ConfigView>('effective');
const viewOptions = [
  { label: 'Effective', value: 'effective' },
  { label: 'File', value: 'file' },
  { label: 'Overlay', value: 'overlay' },
  { label: 'History', value: 'history' },
];
const refreshing = ref(false);

// ---- Editing: configure OR configure-policy (U2.7, R58/R61) ----
const { can, permissionTooltip, RESOURCES, ACTIONS } = usePermissions();
const canEdit = ws.canEdit;
// R61: configure may revert to anything; configure-policy only when the revert is a
// policy-only change (decided per revision in the history panel, as the API does).
const revertAccess = computed<'full' | 'policy-only' | 'none'>(() => {
  if (can(RESOURCES.AGENT, ACTIONS.CONFIGURE)) return 'full';
  if (can(RESOURCES.AGENT, ACTIONS.CONFIGURE_POLICY)) return 'policy-only';
  return 'none';
});
const EMPTY_OVERLAY: OverlayDoc = {};
const currentOverlay = computed<OverlayDoc>(
  () => state.config.value?.overlay ?? EMPTY_OVERLAY,
);
const editTooltip = computed(() =>
  canEdit.value ? '' : permissionTooltip(RESOURCES.AGENT, ACTIONS.CONFIGURE),
);
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

const safeName = computed(() =>
  props.agent.name.replace(/[^A-Za-z0-9_.-]+/g, '-'),
);

function fileName(kind: string, rev: number): string {
  return `${safeName.value}-${kind}-r${rev}.yaml`;
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
