<script setup lang="ts">
/**
 * An agent's Keys tab (admins only): its service account keys with client ID, status, last use,
 * expiry and creation, Revoke for each live key, and New key (which shows the secret once).
 */
import { computed, ref } from 'vue';
import { useToast } from 'primevue/usetoast';
import { useAuthenticatedInstance } from '@/composables/axios';
import type { Agent, AgentServiceAccountKey } from '@/types/agents';
import { getErrorDetail } from '@/utils/httpErrors';
import { formatDate, formatDateTime, plural } from '@/ds/format';
import { useApiQuery } from '@/ds/query';
import Button from '@/ds/components/Button/Button.vue';
import ConfirmDialog from '@/ds/components/ConfirmDialog/ConfirmDialog.vue';
import DataState from '@/ds/components/DataState/DataState.vue';
import DataTable from '@/ds/components/DataTable/DataTable.vue';
import type { DataTableColumn } from '@/ds/components/DataTable/types';
import Dialog from '@/ds/components/Dialog/Dialog.vue';
import Tag from '@/ds/components/Tag/Tag.vue';
import Text from '@/ds/components/Text/Text.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import AgentKeyForm from './AgentKeyForm.vue';

const props = defineProps<{ agent: Agent }>();
const toast = useToast();
const api = useAuthenticatedInstance();
const agentId = props.agent.id;
const url = `/api/admin/agents/${agentId}/keys`;

const keys = useApiQuery<AgentServiceAccountKey[]>(url, {
  isEmpty: (list) => list.length === 0,
});

function status(key: AgentServiceAccountKey): 'Active' | 'Expired' | 'Revoked' {
  if (key.revokedAt) return 'Revoked';
  if (key.expiresAt && new Date(key.expiresAt).getTime() <= Date.now())
    return 'Expired';
  return 'Active';
}
const keyName = (key: AgentServiceAccountKey) => key.name || 'Untitled key';

const columns: DataTableColumn[] = [
  { key: 'name', label: 'Key' },
  { key: 'clientId', label: 'Client ID', minWidth: 'md' },
  { key: 'status', label: 'Status' },
  { key: 'lastUsed', label: 'Last used' },
  { key: 'expires', label: 'Expires' },
  { key: 'created', label: 'Created' },
];
const rows = computed(() =>
  (keys.data.value ?? []).map((key) => ({
    id: key.id,
    name: keyName(key),
    clientId: key.clientId,
    status: status(key),
    lastUsed: key.lastUsedAt ? formatDateTime(key.lastUsedAt) : 'Never',
    expires: key.neverExpires
      ? 'Never'
      : key.expiresAt
        ? formatDateTime(key.expiresAt)
        : 'Not known',
    created: formatDate(key.createdAt),
    key,
  })),
);

const creating = ref(false);
const revoking = ref<AgentServiceAccountKey>();
const revokeOpen = computed({
  get: () => Boolean(revoking.value),
  set: (open: boolean) => {
    if (!open) revoking.value = undefined;
  },
});

async function revoke() {
  const key = revoking.value;
  revoking.value = undefined;
  if (!key) return;
  try {
    await api.delete(`${url}/${key.id}`);
    keys.retry();
    toast.add({
      severity: 'success',
      summary: 'Key revoked',
      detail: `${keyName(key)} can no longer sign in.`,
      life: 3000,
    });
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: "The key wasn't revoked",
      detail: await getErrorDetail(error, 'Try again.'),
      life: 5000,
    });
  }
}
</script>

<template>
  <Stack gap="5">
    <div>
      <Button variant="primary" icon="add" @click="creating = true"
        >New key</Button
      >
    </div>
    <DataState
      :status="keys.status.value"
      subject="the service account keys"
      empty-title="No keys yet"
      empty-body="An agent signs in with a service account key. Create one to connect it."
      icon="locked"
      skeleton="table"
      @retry="keys.retry"
    >
      <DataTable
        :caption="plural(rows.length, 'key')"
        caption-hidden
        :columns="columns"
        :rows="rows"
        :row-key="(r) => r.id"
      >
        <template #cell-status="{ row: r }"><Tag :label="r.status" /></template>
        <template #cell-clientId="{ row: r }"
          ><Text as="code" variant="code">{{ r.clientId }}</Text></template
        >
        <template #actions="{ row: r }">
          <Button
            variant="danger"
            :disabled-reason="
              r.key.revokedAt ? 'This key is already revoked.' : undefined
            "
            @click="revoking = r.key"
            >Revoke</Button
          >
        </template>
      </DataTable>
    </DataState>

    <Dialog v-model:open="creating" title="New service account key">
      <AgentKeyForm
        v-if="creating"
        :agent-id="agentId"
        @created="keys.retry"
        @close="creating = false"
      />
    </Dialog>
    <ConfirmDialog
      v-model:open="revokeOpen"
      :title="`Revoke ${revoking ? keyName(revoking) : 'this key'}?`"
      confirm-label="Revoke key"
      @confirm="revoke"
      ><Text>The agent can no longer sign in with it.</Text></ConfirmDialog
    >
  </Stack>
</template>
