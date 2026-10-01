<template>
  <PageHeader>Policies</PageHeader>
  <PageSubHeader>
    {{ agent?.name ?? agentId }} · inline policy bundles and the sources its
    plugins load
  </PageSubHeader>

  <div class="mt-4 space-y-4 pb-4" data-test="agent-policies-view">
    <div class="flex flex-wrap items-center gap-3">
      <RouterLink
        :to="{ name: 'admin-agents', query: { agent: agentId, tab: 'config' } }"
        class="text-sm text-sky-700 hover:underline dark:text-sky-300"
        data-test="back-to-configuration"
      >
        <i class="pi pi-arrow-left mr-1 text-xs" />Configuration
      </RouterLink>
      <span class="flex-1" />
      <span
        v-if="placeholderLabel"
        class="text-xs text-gray-500 dark:text-slate-400"
        data-test="placeholder-instance"
      >
        Vendor files and file values from {{ placeholderLabel }}
      </span>
      <SecondaryButton
        size="small"
        :disabled="refreshing"
        aria-label="Refresh"
        data-test="refresh"
        @click="refresh"
      >
        <i class="pi pi-refresh" :class="{ 'animate-spin': refreshing }" />
      </SecondaryButton>
    </div>

    <p
      v-if="state.status.value === 'loading' || state.status.value === 'idle'"
      class="text-sm text-gray-500 dark:text-slate-400"
      data-test="policies-loading"
    >
      Loading configuration…
    </p>
    <Message
      v-else-if="state.status.value === 'unsupported'"
      severity="info"
      data-test="policies-unsupported"
    >
      This CCF API version does not support agent configuration.
    </Message>
    <Message
      v-else-if="state.status.value === 'error'"
      severity="error"
      data-test="policies-error"
    >
      <div class="flex flex-wrap items-center gap-3">
        <span>{{ state.error.value }}</span>
        <SecondaryButton size="small" @click="state.load()"
          >Retry</SecondaryButton
        >
      </div>
    </Message>
    <template v-else>
      <Message v-if="api.fixtures" severity="warn">
        Showing fixture data (agent configuration fixture mode is on).
      </Message>
      <Message
        v-if="!ws.canEdit.value"
        severity="info"
        data-test="policies-read-only"
      >
        Read-only: changing policies needs agent:configure or
        agent:configure-policy.
      </Message>
      <Message
        v-else-if="ws.editorMode.value === 'policy-only'"
        severity="info"
        data-test="policies-policy-only"
      >
        You can change policy bundles and wire <code>inline:</code> bundles into
        plugins. A new extended source must already be used by this agent.
      </Message>
      <PoliciesWorkspace :initial-bundle="initialBundle" />
    </template>
    <PendingChangesBar />
  </div>
</template>

<script setup lang="ts">
// R68: the Policies page of ONE agent, rendered by AgentPoliciesView keyed on the agent id.
// It shares the agent's pending-changes draft with the Configuration tab (R69): edits made
// here and there are reviewed and saved together from the pending bar. The workspace and its
// draft are bound to `agentId` at setup, so a different agent always needs a new instance.
import { computed, onMounted, ref, watch } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import PageHeader from '@/components/PageHeader.vue';
import PageSubHeader from '@/components/PageSubHeader.vue';
import Message from '@/volt/Message.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import { useDataApi } from '@/composables/axios';
import type { Agent } from '@/types/agents';
import { useAgentConfigApi } from '@/composables/agent-config/useAgentConfigApi';
import { useAgentConfig } from '@/composables/agent-config/useAgentConfig';
import { useConfigWorkspace } from '@/composables/agent-config/useConfigWorkspace';
import PoliciesWorkspace from './PoliciesWorkspace.vue';
import PendingChangesBar from '@/components/agents/config/workspace/PendingChangesBar.vue';

const props = defineProps<{ agentId: string }>();
const route = useRoute();
const agentId = computed(() => props.agentId);
const initialBundle = computed(() =>
  typeof route.query.bundle === 'string' ? route.query.bundle : null,
);

const api = useAgentConfigApi();
// Fixed for this instance's lifetime (the parent re-keys on the id).
const state = useAgentConfig(
  computed(() => props.agentId),
  api,
);
const ws = useConfigWorkspace(props.agentId, api, state);
const { data: agent } = useDataApi<Agent>(
  `/api/admin/agents/${encodeURIComponent(agentId.value)}`,
  {},
  { immediate: true },
);

const placeholderLabel = computed(() => {
  const d = ws.placeholderDetail.value;
  return d ? d.hostname || d.instanceId.slice(0, 8) : '';
});

// Vendor file lists and validation bases come from every reported instance.
watch(
  () => state.status.value === 'ready' && !state.instanceLoading.value,
  (go) => {
    if (go && !ws.detailsLoaded.value && !ws.detailsLoading.value)
      ws.loadDetails();
  },
  { immediate: true },
);

const refreshing = ref(false);
async function refresh() {
  refreshing.value = true;
  try {
    await state.refresh();
  } finally {
    refreshing.value = false;
  }
}

onMounted(() => state.load());

defineExpose({ ws, state });
</script>
