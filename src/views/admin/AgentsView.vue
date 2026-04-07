<template>
  <PageHeader>Agents</PageHeader>
  <PageSubHeader>
    Register agents and manage their service account keys
  </PageSubHeader>

  <div class="mt-6 space-y-6">
    <div class="flex justify-end">
      <PrimaryButton @click="openCreateAgentDialog"
        >Register Agent</PrimaryButton
      >
    </div>

    <div
      class="rounded-md bg-white dark:bg-slate-900 border border-ccf-300 dark:border-slate-700 overflow-x-auto"
    >
      <template v-if="isLoadingAgents">
        <p class="p-6 text-gray-500 dark:text-slate-400">Loading agents...</p>
      </template>
      <template v-else-if="agentsError">
        <p class="p-6 text-red-500">Error loading agents.</p>
      </template>
      <template v-else-if="!agents?.length">
        <Message severity="warn" variant="outlined" class="m-6">
          No agents found. Register your first agent to create service account
          keys.
        </Message>
      </template>
      <template v-else>
        <table class="w-full min-w-[980px] text-sm">
          <thead class="bg-gray-50 dark:bg-slate-800">
            <tr>
              <th class="table-header">Name</th>
              <th class="table-header">Description</th>
              <th class="table-header">Status</th>
              <th class="table-header">Active Key Count</th>
              <th class="table-header">Last Authenticated</th>
              <th class="table-header">Created</th>
              <th class="table-header">Actions</th>
            </tr>
          </thead>
          <tbody class="table-body">
            <tr
              v-for="agent in agents"
              :key="agent.id"
              class="border-t border-ccf-300 dark:border-slate-700 cursor-pointer"
              :class="{
                'bg-slate-100 dark:bg-slate-800/80':
                  agent.id === selectedAgentId,
                'hover:bg-slate-50 dark:hover:bg-slate-800/40':
                  agent.id !== selectedAgentId,
              }"
              role="button"
              tabindex="0"
              :aria-pressed="agent.id === selectedAgentId"
              @click="selectAgent(agent.id)"
              @keydown.enter="selectAgent(agent.id)"
              @keydown.space.prevent="selectAgent(agent.id)"
            >
              <td
                class="table-cell font-medium text-gray-900 dark:text-slate-200"
              >
                {{ agent.name }}
              </td>
              <td class="table-cell text-gray-600 dark:text-slate-400">
                {{ agent.description || 'N/A' }}
              </td>
              <td class="table-cell">
                <span :class="getAgentStatusClass(agent)">
                  {{ agent.isActive ? 'Active' : 'Inactive' }}
                </span>
              </td>
              <td class="table-cell text-gray-600 dark:text-slate-400">
                {{ agent.serviceAccountKeyCount }}
              </td>
              <td class="table-cell text-gray-600 dark:text-slate-400">
                {{ formatDateTime(agent.lastAuthenticatedAt) }}
              </td>
              <td class="table-cell text-gray-600 dark:text-slate-400">
                {{ formatDate(agent.createdAt) }}
              </td>
              <td class="table-cell">
                <div class="flex flex-wrap gap-2">
                  <TertiaryButton @click.stop="openEditAgentDialog(agent)">
                    Edit
                  </TertiaryButton>
                  <TertiaryButton @click.stop="confirmDeleteAgent(agent)">
                    Delete
                  </TertiaryButton>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </template>
    </div>

    <div
      class="rounded-md bg-white dark:bg-slate-900 border border-ccf-300 dark:border-slate-700 overflow-hidden"
    >
      <div
        class="flex items-center justify-between gap-4 border-b border-ccf-300 dark:border-slate-700 px-6 py-4"
      >
        <div>
          <h2 class="text-lg font-semibold text-gray-900 dark:text-slate-200">
            {{ selectedAgent ? selectedAgent.name : 'Agent Details' }}
          </h2>
          <p class="mt-1 text-sm text-gray-500 dark:text-slate-400">
            {{
              selectedAgent
                ? selectedAgent.description || 'No description provided.'
                : 'Select an agent to review details and manage keys.'
            }}
          </p>
        </div>
        <PrimaryButton :disabled="!selectedAgent" @click="activeTab = 'keys'">
          Manage Keys
        </PrimaryButton>
      </div>

      <div class="p-6">
        <template v-if="selectedAgent">
          <Tabs v-model:value="activeTab">
            <TabList>
              <Tab value="details">Details</Tab>
              <Tab value="keys">Service Account Keys</Tab>
            </TabList>
            <TabPanels>
              <TabPanel value="details">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                  <div class="detail-card">
                    <span class="detail-label">Name</span>
                    <span class="detail-value">{{ selectedAgent.name }}</span>
                  </div>
                  <div class="detail-card">
                    <span class="detail-label">Status</span>
                    <span class="detail-value">
                      {{ selectedAgent.isActive ? 'Active' : 'Inactive' }}
                    </span>
                  </div>
                  <div class="detail-card md:col-span-2">
                    <span class="detail-label">Description</span>
                    <span class="detail-value">
                      {{
                        selectedAgent.description || 'No description provided.'
                      }}
                    </span>
                  </div>
                  <div class="detail-card">
                    <span class="detail-label">Active Keys</span>
                    <span class="detail-value">
                      {{ selectedAgent.serviceAccountKeyCount }}
                    </span>
                  </div>
                  <div class="detail-card">
                    <span class="detail-label">Last Authenticated</span>
                    <span class="detail-value">
                      {{ formatDateTime(selectedAgent.lastAuthenticatedAt) }}
                    </span>
                  </div>
                  <div class="detail-card">
                    <span class="detail-label">Created</span>
                    <span class="detail-value">
                      {{ formatDateTime(selectedAgent.createdAt) }}
                    </span>
                  </div>
                  <div class="detail-card">
                    <span class="detail-label">Updated</span>
                    <span class="detail-value">
                      {{ formatDateTime(selectedAgent.updatedAt) }}
                    </span>
                  </div>
                </div>

                <div class="mt-6 flex flex-wrap gap-3">
                  <PrimaryButton @click="openEditAgentDialog(selectedAgent)">
                    Edit Agent
                  </PrimaryButton>
                  <TertiaryButton @click="confirmDeleteAgent(selectedAgent)">
                    Delete Agent
                  </TertiaryButton>
                </div>
              </TabPanel>

              <TabPanel value="keys">
                <div class="pt-4 space-y-4">
                  <div class="flex justify-end">
                    <PrimaryButton @click="openCreateKeyDialog">
                      Create Service Account Key
                    </PrimaryButton>
                  </div>

                  <template v-if="isLoadingKeys">
                    <p class="text-gray-500 dark:text-slate-400">
                      Loading service account keys...
                    </p>
                  </template>
                  <template v-else-if="keysError">
                    <p class="text-red-500">
                      Error loading service account keys.
                    </p>
                  </template>
                  <template v-else-if="!agentKeys?.length">
                    <Message severity="warn" variant="outlined">
                      No active or revoked service account keys exist for this
                      agent yet.
                    </Message>
                  </template>
                  <template v-else>
                    <div
                      class="rounded-md border border-ccf-300 dark:border-slate-700 overflow-x-auto"
                    >
                      <table class="w-full min-w-[880px] text-sm">
                        <thead class="bg-gray-50 dark:bg-slate-800">
                          <tr>
                            <th class="table-header">Name</th>
                            <th class="table-header">Client ID</th>
                            <th class="table-header">Status</th>
                            <th class="table-header">Last Used</th>
                            <th class="table-header">Expires</th>
                            <th class="table-header">Created</th>
                            <th class="table-header">Actions</th>
                          </tr>
                        </thead>
                        <tbody class="table-body">
                          <tr
                            v-for="key in agentKeys"
                            :key="key.id"
                            class="border-t border-ccf-300 dark:border-slate-700"
                          >
                            <td
                              class="table-cell text-gray-900 dark:text-slate-200"
                            >
                              {{ key.name || 'Untitled key' }}
                            </td>
                            <td
                              class="table-cell font-mono text-xs text-gray-600 dark:text-slate-400"
                            >
                              {{ key.clientId }}
                            </td>
                            <td class="table-cell">
                              <span :class="getKeyStatusClass(key)">
                                {{ getKeyStatus(key) }}
                              </span>
                            </td>
                            <td
                              class="table-cell text-gray-600 dark:text-slate-400"
                            >
                              {{ formatDateTime(key.lastUsedAt) }}
                            </td>
                            <td
                              class="table-cell text-gray-600 dark:text-slate-400"
                            >
                              {{
                                key.neverExpires
                                  ? 'Never'
                                  : formatDateTime(key.expiresAt)
                              }}
                            </td>
                            <td
                              class="table-cell text-gray-600 dark:text-slate-400"
                            >
                              {{ formatDate(key.createdAt) }}
                            </td>
                            <td class="table-cell">
                              <TertiaryButton
                                :disabled="!!key.revokedAt"
                                @click="confirmRevokeKey(key)"
                              >
                                Revoke
                              </TertiaryButton>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </template>
                </div>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </template>
        <template v-else>
          <Message severity="warn" variant="outlined">
            Select or register an agent to manage service account keys.
          </Message>
        </template>
      </div>
    </div>
  </div>

  <Dialog
    v-model:visible="agentDialogVisible"
    modal
    :header="agentDialogHeader"
    class="custom-colors"
  >
    <form class="space-y-4 p-1" @submit.prevent="submitAgent">
      <div>
        <label class="form-label" for="agent-name-input">
          Name <span class="text-red-500">*</span>
        </label>
        <input
          id="agent-name-input"
          v-model="agentForm.name"
          type="text"
          required
          placeholder="e.g. compliance-collector"
          class="form-input"
        />
      </div>

      <div>
        <label class="form-label" for="agent-description-input">
          Description
        </label>
        <textarea
          id="agent-description-input"
          v-model="agentForm.description"
          rows="3"
          placeholder="Optional description"
          class="form-textarea"
        />
      </div>

      <label
        class="inline-flex items-center gap-3 text-sm text-gray-700 dark:text-slate-300"
      >
        <input
          v-model="agentForm.isActive"
          type="checkbox"
          class="h-4 w-4 rounded border-ccf-300 dark:border-slate-700"
        />
        Agent is active
      </label>

      <div class="flex justify-end gap-3 pt-2">
        <TertiaryButton type="button" @click="agentDialogVisible = false">
          Cancel
        </TertiaryButton>
        <PrimaryButton type="submit" :disabled="isSavingAgent">
          {{ agentDialogMode === 'create' ? 'Create Agent' : 'Save Changes' }}
        </PrimaryButton>
      </div>
    </form>
  </Dialog>

  <Dialog
    v-model:visible="keyDialogVisible"
    modal
    header="Create Service Account Key"
    class="custom-colors"
  >
    <form class="space-y-4 p-1" @submit.prevent="submitKey">
      <div>
        <label class="form-label" for="agent-key-name-input">Key Name</label>
        <input
          id="agent-key-name-input"
          v-model="keyForm.name"
          type="text"
          placeholder="e.g. primary"
          class="form-input"
        />
      </div>

      <label
        class="inline-flex items-center gap-3 text-sm text-gray-700 dark:text-slate-300"
      >
        <input
          v-model="keyForm.neverExpires"
          type="checkbox"
          class="h-4 w-4 rounded border-ccf-300 dark:border-slate-700"
        />
        Never expires
      </label>

      <div v-if="!keyForm.neverExpires">
        <label class="form-label" for="agent-key-expires-at-input">
          Expires At <span class="text-red-500">*</span>
        </label>
        <input
          id="agent-key-expires-at-input"
          v-model="keyForm.expiresAt"
          type="datetime-local"
          :required="!keyForm.neverExpires"
          :min="minExpiryInput"
          class="form-input"
        />
      </div>

      <div class="flex justify-end gap-3 pt-2">
        <TertiaryButton type="button" @click="keyDialogVisible = false">
          Cancel
        </TertiaryButton>
        <PrimaryButton type="submit" :disabled="isCreatingKey">
          Create Key
        </PrimaryButton>
      </div>
    </form>
  </Dialog>

  <Dialog
    v-model:visible="credentialsDialogVisible"
    modal
    header="Service Account Key Created"
    class="custom-colors"
  >
    <div v-if="createdCredentials" class="space-y-4 p-1">
      <Message severity="warn" variant="outlined">
        Save this client secret now. It will not be shown again after you close
        this dialog.
      </Message>

      <div class="credential-card">
        <div>
          <p class="credential-label">Client ID</p>
          <p class="credential-value">{{ createdCredentials.clientId }}</p>
        </div>
        <TertiaryButton
          @click="copyText(createdCredentials.clientId, 'Client ID copied')"
        >
          Copy
        </TertiaryButton>
      </div>

      <div class="credential-card">
        <div>
          <p class="credential-label">Client Secret</p>
          <p class="credential-value">{{ createdCredentials.clientSecret }}</p>
        </div>
        <TertiaryButton
          @click="
            copyText(createdCredentials.clientSecret, 'Client secret copied')
          "
        >
          Copy
        </TertiaryButton>
      </div>

      <div>
        <div class="flex items-center justify-between gap-4">
          <label class="form-label mb-0">Sample token request</label>
          <TertiaryButton
            @click="copyText(authCurlCommand, 'Sample curl copied')"
          >
            Copy
          </TertiaryButton>
        </div>
        <pre class="command-preview">{{ authCurlCommand }}</pre>
      </div>

      <div class="flex justify-end pt-2">
        <PrimaryButton @click="closeCredentialsDialog">Done</PrimaryButton>
      </div>
    </div>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { isAxiosError, type AxiosError } from 'axios';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import PageHeader from '@/components/PageHeader.vue';
import PageSubHeader from '@/components/PageSubHeader.vue';
import Message from '@/volt/Message.vue';
import Dialog from '@/volt/Dialog.vue';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import TertiaryButton from '@/volt/TertiaryButton.vue';
import Tabs from '@/volt/Tabs.vue';
import Tab from '@/volt/Tab.vue';
import TabList from '@/volt/TabList.vue';
import TabPanel from '@/volt/TabPanel.vue';
import TabPanels from '@/volt/TabPanels.vue';
import { decamelizeKeys, useDataApi } from '@/composables/axios';
import { useConfigStore } from '@/stores/config';
import type { ErrorBody, ErrorResponse } from '@/stores/types';
import type {
  Agent,
  AgentServiceAccountKey,
  CreatedAgentServiceAccountKey,
  CreateAgentServiceAccountKeyRequest,
  UpsertAgentRequest,
} from '@/types/agents';

type AgentDialogMode = 'create' | 'edit';
type AgentTab = 'details' | 'keys';

interface AgentFormData {
  name: string;
  description: string;
  isActive: boolean;
}

interface KeyFormData {
  name: string;
  neverExpires: boolean;
  expiresAt: string;
}

const toast = useToast();
const confirm = useConfirm();
const configStore = useConfigStore();

const activeTab = ref<AgentTab>('details');
const selectedAgentId = ref<string | null>(null);
const apiBaseUrl = ref('');

const agentDialogVisible = ref(false);
const agentDialogMode = ref<AgentDialogMode>('create');
const agentForm = ref<AgentFormData>(createEmptyAgentForm());

const keyDialogVisible = ref(false);
const keyForm = ref<KeyFormData>(createEmptyKeyForm());

const credentialsDialogVisible = ref(false);
const createdCredentials = ref<CreatedAgentServiceAccountKey | null>(null);

const {
  data: agents,
  isLoading: isLoadingAgents,
  error: agentsError,
  execute: loadAgents,
} = useDataApi<Agent[]>(
  '/api/admin/agents',
  {},
  { immediate: true, initialData: [] },
);

const {
  data: createdAgent,
  execute: executeCreateAgent,
  isLoading: isCreatingAgent,
} = useDataApi<Agent>(
  '/api/admin/agents',
  {
    method: 'POST',
    transformRequest: [decamelizeKeys],
  },
  { immediate: false },
);

const {
  data: updatedAgent,
  execute: executeUpdateAgent,
  isLoading: isUpdatingAgent,
} = useDataApi<Agent>(
  null,
  {
    method: 'PUT',
    transformRequest: [decamelizeKeys],
  },
  { immediate: false },
);

const { execute: executeDeleteAgent } = useDataApi<void>(
  null,
  { method: 'DELETE' },
  { immediate: false },
);

const {
  data: agentKeys,
  isLoading: isLoadingKeys,
  error: keysError,
  execute: loadAgentKeysRequest,
} = useDataApi<AgentServiceAccountKey[]>(
  null,
  {},
  { immediate: false, initialData: [] },
);

const {
  data: createdKey,
  execute: executeCreateKey,
  isLoading: isCreatingKey,
} = useDataApi<CreatedAgentServiceAccountKey>(
  null,
  {
    method: 'POST',
    transformRequest: [decamelizeKeys],
  },
  { immediate: false },
);

const { execute: executeDeleteKey } = useDataApi<void>(
  null,
  { method: 'DELETE' },
  { immediate: false },
);

const selectedAgent = computed(() => {
  return (
    (agents.value ?? []).find((agent) => agent.id === selectedAgentId.value) ??
    null
  );
});

const agentDialogHeader = computed(() => {
  return agentDialogMode.value === 'create' ? 'Register Agent' : 'Edit Agent';
});

const isSavingAgent = computed(() => {
  return isCreatingAgent.value || isUpdatingAgent.value;
});

const authCurlCommand = computed(() => {
  if (!createdCredentials.value) {
    return '';
  }

  const baseUrl = apiBaseUrl.value.replace(/\/$/, '');
  const authUrl = baseUrl
    ? `${baseUrl}/api/auth/agent/token`
    : '/api/auth/agent/token';

  return `curl --request POST \\
  --user '${createdCredentials.value.clientId}:${createdCredentials.value.clientSecret}' \\
  '${authUrl}'`;
});

const minExpiryInput = computed(() => {
  return formatDateTimeLocalInput(new Date());
});

watch(
  () => agents.value,
  (items) => {
    if (!items?.length) {
      selectedAgentId.value = null;
      agentKeys.value = [];
      activeTab.value = 'details';
      return;
    }

    if (
      selectedAgentId.value &&
      items.some((agent) => agent.id === selectedAgentId.value)
    ) {
      return;
    }

    selectedAgentId.value = items[0].id;
  },
  { immediate: true },
);

watch(
  () => selectedAgentId.value,
  async (agentId) => {
    if (!agentId) {
      agentKeys.value = [];
      return;
    }

    await loadAgentKeys(agentId);
  },
  { immediate: true },
);

watch(
  () => agentsError.value,
  (error) => {
    handlePermissionError(error, "You don't have access to agents.");
  },
);

watch(
  () => keysError.value,
  (error) => {
    handlePermissionError(
      error,
      "You don't have access to service account keys.",
    );
  },
);

watch(
  () => credentialsDialogVisible.value,
  (visible) => {
    if (!visible) {
      createdCredentials.value = null;
    }
  },
);

onMounted(async () => {
  try {
    const config = await configStore.getConfig();
    apiBaseUrl.value = config.API_URL;
  } catch {
    apiBaseUrl.value = '';
  }
});

function createEmptyAgentForm(): AgentFormData {
  return {
    name: '',
    description: '',
    isActive: true,
  };
}

function createEmptyKeyForm(): KeyFormData {
  return {
    name: '',
    neverExpires: true,
    expiresAt: '',
  };
}

function handlePermissionError(error: unknown, detail: string) {
  if (!error) {
    return;
  }

  const status = (error as AxiosError).response?.status;
  if (status === 403) {
    toast.add({
      severity: 'warn',
      summary: 'Insufficient permissions',
      detail,
      life: 4000,
    });
  }
}

function toOptionalString(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function openCreateAgentDialog() {
  agentDialogMode.value = 'create';
  agentForm.value = createEmptyAgentForm();
  agentDialogVisible.value = true;
}

function selectAgent(agentId: string) {
  selectedAgentId.value = agentId;
}

function openEditAgentDialog(agent: Agent) {
  selectAgent(agent.id);
  agentDialogMode.value = 'edit';
  agentForm.value = {
    name: agent.name,
    description: agent.description ?? '',
    isActive: agent.isActive,
  };
  agentDialogVisible.value = true;
}

async function submitAgent() {
  const trimmedName = agentForm.value.name.trim();
  if (!trimmedName) {
    toast.add({
      severity: 'error',
      summary: 'Validation Error',
      detail: 'Agent name is required.',
      life: 3000,
    });
    return;
  }

  const payload: UpsertAgentRequest = {
    name: trimmedName,
    description: toOptionalString(agentForm.value.description),
    isActive: agentForm.value.isActive,
  };

  try {
    if (agentDialogMode.value === 'create') {
      await executeCreateAgent('/api/admin/agents', { data: payload });
    } else {
      if (!selectedAgentId.value) {
        throw new Error('Missing agent identifier for update.');
      }

      await executeUpdateAgent(`/api/admin/agents/${selectedAgentId.value}`, {
        data: payload,
      });
    }

    const preferredAgentId =
      agentDialogMode.value === 'create'
        ? createdAgent.value?.id
        : (updatedAgent.value?.id ?? selectedAgentId.value);

    agentDialogVisible.value = false;
    await loadAgents();

    if (preferredAgentId) {
      selectedAgentId.value = preferredAgentId;
    }

    toast.add({
      severity: 'success',
      summary:
        agentDialogMode.value === 'create' ? 'Agent Created' : 'Agent Updated',
      detail:
        agentDialogMode.value === 'create'
          ? 'Agent registered successfully.'
          : 'Agent updated successfully.',
      life: 3000,
    });
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Save Failed',
      detail: getApiErrorMessage(error, 'Failed to save agent.'),
      life: 4000,
    });
  }
}

function confirmDeleteAgent(agent: Agent) {
  confirm.require({
    header: 'Delete Agent',
    message: `Delete the agent "${agent.name}"? This action cannot be undone.`,
    rejectProps: {
      label: 'Cancel',
      severity: 'secondary',
      outlined: true,
    },
    acceptProps: {
      label: 'Delete',
      severity: 'danger',
    },
    accept: async () => {
      await deleteAgent(agent);
    },
  });
}

async function deleteAgent(agent: Agent) {
  try {
    await executeDeleteAgent(`/api/admin/agents/${agent.id}`);
    await loadAgents();
    toast.add({
      severity: 'success',
      summary: 'Agent Deleted',
      detail: 'Agent deleted successfully.',
      life: 3000,
    });
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Delete Failed',
      detail: getApiErrorMessage(error, 'Failed to delete agent.'),
      life: 4000,
    });
  }
}

function openCreateKeyDialog() {
  if (!selectedAgent.value) {
    return;
  }

  keyForm.value = createEmptyKeyForm();
  keyDialogVisible.value = true;
}

async function submitKey() {
  if (!selectedAgentId.value) {
    toast.add({
      severity: 'error',
      summary: 'No Agent Selected',
      detail: 'Select an agent before creating a key.',
      life: 3000,
    });
    return;
  }

  try {
    const payload = buildKeyPayload();
    await executeCreateKey(`/api/admin/agents/${selectedAgentId.value}/keys`, {
      data: payload,
    });

    keyDialogVisible.value = false;
    await loadAgents();
    await loadAgentKeys(selectedAgentId.value);

    if (createdKey.value) {
      createdCredentials.value = createdKey.value;
      credentialsDialogVisible.value = true;
    }

    activeTab.value = 'keys';

    toast.add({
      severity: 'success',
      summary: 'Key Created',
      detail: 'Service account key created successfully.',
      life: 3000,
    });
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Create Failed',
      detail: getApiErrorMessage(
        error,
        'Failed to create service account key.',
      ),
      life: 4000,
    });
  }
}

function buildKeyPayload(): CreateAgentServiceAccountKeyRequest {
  const payload: CreateAgentServiceAccountKeyRequest = {
    name: toOptionalString(keyForm.value.name),
    neverExpires: keyForm.value.neverExpires,
  };

  if (keyForm.value.neverExpires) {
    return payload;
  }

  if (!keyForm.value.expiresAt) {
    throw new Error('Expiration date is required when the key can expire.');
  }

  const expiresAt = new Date(keyForm.value.expiresAt);
  if (Number.isNaN(expiresAt.getTime())) {
    throw new Error('Expiration date is invalid.');
  }
  if (expiresAt.getTime() <= Date.now()) {
    throw new Error('Expiration date must be in the future.');
  }

  payload.expiresAt = expiresAt.toISOString();
  return payload;
}

function confirmRevokeKey(key: AgentServiceAccountKey) {
  if (key.revokedAt) {
    return;
  }

  confirm.require({
    header: 'Revoke Service Account Key',
    message: `Revoke the key "${key.name || key.clientId}"? It will no longer be able to authenticate.`,
    rejectProps: {
      label: 'Cancel',
      severity: 'secondary',
      outlined: true,
    },
    acceptProps: {
      label: 'Revoke',
      severity: 'danger',
    },
    accept: async () => {
      await revokeKey(key);
    },
  });
}

async function revokeKey(key: AgentServiceAccountKey) {
  if (!selectedAgentId.value) {
    return;
  }

  try {
    await executeDeleteKey(
      `/api/admin/agents/${selectedAgentId.value}/keys/${key.id}`,
    );
    await loadAgents();
    await loadAgentKeys(selectedAgentId.value);
    toast.add({
      severity: 'success',
      summary: 'Key Revoked',
      detail: 'Service account key revoked successfully.',
      life: 3000,
    });
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Revoke Failed',
      detail: getApiErrorMessage(
        error,
        'Failed to revoke service account key.',
      ),
      life: 4000,
    });
  }
}

async function loadAgentKeys(agentId: string) {
  await loadAgentKeysRequest(`/api/admin/agents/${agentId}/keys`);
}

async function copyText(value: string, successMessage: string) {
  try {
    if (!navigator.clipboard) {
      throw new Error('Clipboard API unavailable');
    }

    await navigator.clipboard.writeText(value);
    toast.add({
      severity: 'success',
      summary: 'Copied',
      detail: successMessage,
      life: 2500,
    });
  } catch {
    toast.add({
      severity: 'error',
      summary: 'Copy Failed',
      detail: 'Unable to copy to the clipboard.',
      life: 3000,
    });
  }
}

function closeCredentialsDialog() {
  credentialsDialogVisible.value = false;
}

function getApiErrorMessage(error: unknown, fallbackMessage: string): string {
  if (isAxiosError(error)) {
    const axiosError = error as AxiosError<ErrorResponse<ErrorBody>>;
    const responseBody = axiosError.response?.data?.errors?.body;
    if (responseBody) {
      return responseBody;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallbackMessage;
}

function formatDate(value?: string | null): string {
  if (!value) {
    return 'N/A';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'N/A';
  }

  return date.toLocaleDateString();
}

function formatDateTime(value?: string | null): string {
  if (!value) {
    return 'N/A';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'N/A';
  }

  return date.toLocaleString();
}

function formatDateTimeLocalInput(value: Date): string {
  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function getAgentStatusClass(agent: Agent): string {
  return agent.isActive
    ? 'status-pill status-pill--success'
    : 'status-pill status-pill--muted';
}

function getKeyStatus(
  key: AgentServiceAccountKey,
): 'Active' | 'Expired' | 'Revoked' {
  if (key.revokedAt) {
    return 'Revoked';
  }

  if (key.expiresAt && new Date(key.expiresAt).getTime() <= Date.now()) {
    return 'Expired';
  }

  return 'Active';
}

function getKeyStatusClass(key: AgentServiceAccountKey): string {
  const status = getKeyStatus(key);
  if (status === 'Revoked') {
    return 'status-pill status-pill--danger';
  }
  if (status === 'Expired') {
    return 'status-pill status-pill--warn';
  }

  return 'status-pill status-pill--success';
}
</script>

<style scoped>
@reference '@/assets/base.css';

.table-header {
  @apply p-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-slate-400;
}

.table-body {
  @apply bg-white dark:bg-slate-900;
}

.table-cell {
  @apply p-3 align-top;
}

.form-label {
  @apply mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300;
}

.form-input {
  @apply w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200;
}

.form-textarea {
  @apply w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200;
}

.detail-card {
  @apply rounded-md border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/60;
}

.detail-label {
  @apply block text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-slate-400;
}

.detail-value {
  @apply mt-2 block text-sm text-gray-900 dark:text-slate-200;
}

.status-pill {
  @apply inline-flex rounded-full px-2.5 py-1 text-xs font-medium;
}

.status-pill--success {
  @apply bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300;
}

.status-pill--warn {
  @apply bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300;
}

.status-pill--danger {
  @apply bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300;
}

.status-pill--muted {
  @apply bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300;
}

.credential-card {
  @apply flex items-start justify-between gap-4 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/60;
}

.credential-label {
  @apply text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-slate-400;
}

.credential-value {
  @apply mt-2 break-all font-mono text-sm text-gray-900 dark:text-slate-200;
}

.command-preview {
  @apply mt-2 overflow-x-auto rounded-md border border-slate-200 bg-slate-950 px-4 py-3 text-sm text-slate-100 dark:border-slate-700;
}
</style>

<style>
.custom-colors .p-dialog-content {
  background-color: white;
  color: #1f2937;
}

.dark .custom-colors .p-dialog-content {
  background-color: #1f2937;
  color: #e5e7eb;
}
</style>
