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
      <Message v-if="api.fixtures" severity="warn" data-test="fixtures-banner">
        Showing fixture data (agent configuration fixture mode is on).
      </Message>
      <AgentConfigHeader
        :config="state.config.value"
        :sync-summary="state.syncSummary.value"
        :instance-count="state.instances.value.length"
        :loading="refreshing"
        show-edit
        :can-edit="canEdit"
        :edit-tooltip="editTooltip"
        @edit="openEditor"
        @refresh="refresh"
        @select-instance="state.selectInstance"
      />

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
        :bundles-first-seen="state.config.value?.bundlesFirstSeen"
        :policy-bundles="state.selectedInstance.value?.policyBundles ?? null"
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
        :can-revert="canConfigure"
        :revert-tooltip="permissionTooltip(RESOURCES.AGENT, ACTIONS.CONFIGURE)"
        :get-revision="state.getRevisionCached"
        @changed="refresh"
      />
    </template>

    <AgentConfigEditorDrawer
      v-if="drawerOpen && state.config.value"
      v-model:visible="drawerOpen"
      :agent="agent"
      :config="state.config.value"
      :instances="state.instances.value"
      :instance-details="instanceDetails"
      :initial-instance-id="state.selectedInstanceId.value"
      :details-loading="detailsLoading"
      @saved="onSaved"
    />
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  defineAsyncComponent,
  onMounted,
  ref,
  shallowRef,
  toRef,
} from 'vue';
import Message from '@/volt/Message.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import SelectButton from '@/volt/SelectButton.vue';
import type { Agent } from '@/types/agents';
import type { AgentInstanceDetail } from '@/types/agent-config';
import { usePermissions } from '@/composables/usePermissions';
import { useAgentConfigApi } from '@/composables/agent-config/useAgentConfigApi';
import { useAgentConfig } from '@/composables/agent-config/useAgentConfig';
import { sanitizeForDisplay } from '@/utils/agent-config/display';
import AgentConfigHeader from './AgentConfigHeader.vue';
import AgentInstancePicker from './AgentInstancePicker.vue';
import InstanceModeNotice from './InstanceModeNotice.vue';
import AgentConfigEffectiveView from './AgentConfigEffectiveView.vue';
import ConfigYamlViewer from './ConfigYamlViewer.vue';
import AgentConfigHistory from './AgentConfigHistory.vue';
import {
  LOCKED_LEGEND,
  NOT_REPORTED_TEXT,
  OVERLAY_SECRETS_NOTICE,
} from './constants';

// The editor (form, YAML, review) is only needed once someone opens it: keep it out of the
// AgentsView chunk.
const AgentConfigEditorDrawer = defineAsyncComponent(
  () => import('./AgentConfigEditorDrawer.vue'),
);

type ConfigView = 'effective' | 'file' | 'overlay' | 'history';

const props = defineProps<{ agent: Agent }>();

const api = useAgentConfigApi();
const agentId = toRef(() => props.agent.id);
const state = useAgentConfig(agentId, api);

const view = ref<ConfigView>('effective');
const viewOptions = [
  { label: 'Effective', value: 'effective' },
  { label: 'File', value: 'file' },
  { label: 'Overlay', value: 'overlay' },
  { label: 'History', value: 'history' },
];
const refreshing = ref(false);

// ---- Editor (U2.7): configure OR configure-policy opens it ----
const { can, permissionTooltip, RESOURCES, ACTIONS } = usePermissions();
const canEdit = computed(
  () =>
    can(RESOURCES.AGENT, ACTIONS.CONFIGURE) ||
    can(RESOURCES.AGENT, ACTIONS.CONFIGURE_POLICY),
);
// Revert can touch anything: the UI requires configure (the API also accepts
// configure-policy for policy-only reverts; U2.7).
const canConfigure = computed(() => can(RESOURCES.AGENT, ACTIONS.CONFIGURE));
const editTooltip = computed(() =>
  canEdit.value ? '' : permissionTooltip(RESOURCES.AGENT, ACTIONS.CONFIGURE),
);
const drawerOpen = ref(false);
const instanceDetails = shallowRef(new Map<string, AgentInstanceDetail>());
const detailsLoading = ref(false);

/** The review diff needs every reported base: load them all (≤ 6 at a time) on open. */
async function openEditor() {
  if (!canEdit.value) return;
  drawerOpen.value = true;
  detailsLoading.value = true;
  try {
    instanceDetails.value = await state.loadAllInstanceDetails();
  } finally {
    detailsLoading.value = false;
  }
}

async function onSaved() {
  await refresh();
}

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

defineExpose({ state });
</script>
