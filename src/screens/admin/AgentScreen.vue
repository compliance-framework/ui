<script setup lang="ts">
/**
 * An agent (/admin/agents/:id/...): its overview, service account keys (admins) and configuration
 * (anyone who can read agents) as route tabs. Admins can edit or delete it. Registration, keys and
 * editing stay hidden for everyone else (R40), since they belong to a different role.
 */
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from '@/ds/toasts';
import { useAuthenticatedInstance } from '@/composables/axios';
import { usePermissions } from '@/composables/usePermissions';
import { ACTIONS, RESOURCES } from '@/constants/permissions';
import type { Agent } from '@/types/agents';
import { getErrorDetail } from '@/utils/httpErrors';
import { useApiQuery } from '@/ds/query';
import Breadcrumbs from '@/ds/components/Breadcrumbs/Breadcrumbs.vue';
import Button from '@/ds/components/Button/Button.vue';
import ConfirmDialog from '@/ds/components/ConfirmDialog/ConfirmDialog.vue';
import DataState from '@/ds/components/DataState/DataState.vue';
import Dialog from '@/ds/components/Dialog/Dialog.vue';
import Tag from '@/ds/components/Tag/Tag.vue';
import Text from '@/ds/components/Text/Text.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import RecordTemplate from '@/ds/templates/RecordTemplate/RecordTemplate.vue';
import AgentForm from './AgentForm.vue';
import { useAgentAdmin } from './agentAdmin';

const route = useRoute();
const router = useRouter();
const toast = useToast();
const api = useAuthenticatedInstance();
const { can } = usePermissions();
const { ready, isAdmin } = useAgentAdmin();

const id = String(route.params.id);
const query = useApiQuery<Agent>(`/api/admin/agents/${id}`);
const agent = computed(() => query.data.value);

const tabs = computed(() => [
  { label: 'Overview', to: { name: 'admin-agent', params: { id } } },
  ...(isAdmin.value
    ? [{ label: 'Keys', to: { name: 'admin-agent-keys', params: { id } } }]
    : []),
  ...(can(RESOURCES.AGENT, ACTIONS.READ)
    ? [
        {
          label: 'Configuration',
          to: { name: 'admin-agent-configuration', params: { id } },
        },
      ]
    : []),
]);

const editing = ref(false);
function saved(updated: Agent) {
  editing.value = false;
  query.data.value = updated;
  toast.add({
    severity: 'success',
    summary: 'Agent saved',
    detail: `${updated.name} was saved.`,
    life: 3000,
  });
}

const deleting = ref(false);
async function remove() {
  const current = agent.value;
  if (!current) return;
  try {
    await api.delete(`/api/admin/agents/${current.id}`);
    toast.add({
      severity: 'success',
      summary: 'Agent deleted',
      detail: `${current.name} was deleted.`,
      life: 3000,
    });
    await router.push({ name: 'admin-agents' });
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: "The agent wasn't deleted",
      detail: await getErrorDetail(error, 'Try again.'),
      life: 5000,
    });
  }
}
</script>

<template>
  <Stack gap="6">
    <Breadcrumbs
      :crumbs="[{ label: 'Agents', to: { name: 'admin-agents' } }]"
    />
    <DataState
      v-if="!agent"
      :status="query.status.value === 'ready' ? 'error' : query.status.value"
      subject="this agent"
      skeleton="panel"
      @retry="query.retry"
    />
    <RecordTemplate
      v-else
      :title="agent.name"
      :description="agent.description || undefined"
      :tabs="tabs"
    >
      <template #status>
        <Tag :label="agent.isActive ? 'Active' : 'Inactive'" />
      </template>
      <template v-if="isAdmin" #actions>
        <Button icon="edit" @click="editing = true">Edit</Button>
        <Button variant="danger" icon="delete" @click="deleting = true"
          >Delete</Button
        >
      </template>
      <!-- Keys are admin-only: a non-admin who follows a link there never requests them. -->
      <DataState
        v-if="route.name === 'admin-agent-keys' && !isAdmin"
        :status="ready ? 'forbidden' : 'loading'"
        subject="this agent's keys"
      />
      <RouterView v-else v-slot="{ Component }">
        <component :is="Component" :agent="agent" />
      </RouterView>
    </RecordTemplate>

    <Dialog v-model:open="editing" title="Edit agent">
      <AgentForm
        v-if="editing && agent"
        :agent="agent"
        @cancel="editing = false"
        @saved="saved"
      />
    </Dialog>
    <ConfirmDialog
      v-model:open="deleting"
      :title="`Delete ${agent?.name ?? 'this agent'}?`"
      confirm-label="Delete agent"
      @confirm="remove"
      ><Text>This can't be undone.</Text></ConfirmDialog
    >
  </Stack>
</template>
