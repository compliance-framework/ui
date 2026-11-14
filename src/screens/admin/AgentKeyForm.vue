<script setup lang="ts">
/**
 * A new service account key for an agent: an optional name and when it expires (never, or a date
 * and time in the future). Once created, it shows the client ID and secret, which are never shown
 * again, with the curl command that signs the agent in. Emits `created` when the key exists and
 * `close` when done.
 */
import { computed, reactive, ref } from 'vue';
import { decamelizeKeys, useAuthenticatedInstance } from '@/composables/axios';
import { useConfigStore } from '@/stores/config';
import type {
  CreateAgentServiceAccountKeyRequest,
  CreatedAgentServiceAccountKey,
} from '@/types/agents';
import { getErrorDetail } from '@/utils/httpErrors';
import Button from '@/ds/components/Button/Button.vue';
import Checkbox from '@/ds/components/Checkbox/Checkbox.vue';
import CodeBlock from '@/ds/components/CodeBlock/CodeBlock.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import InlineMessage from '@/ds/components/InlineMessage/InlineMessage.vue';
import Text from '@/ds/components/Text/Text.vue';
import TextInput from '@/ds/components/TextInput/TextInput.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Stack from '@/ds/components/layout/Stack.vue';

const props = defineProps<{ agentId: string }>();
const emit = defineEmits<{
  created: [key: CreatedAgentServiceAccountKey];
  close: [];
}>();

const api = useAuthenticatedInstance();
const configStore = useConfigStore();

const draft = reactive({ name: '', neverExpires: true, expiresAt: '' });
const expiresError = ref('');
const saveError = ref('');
const saving = ref(false);
const created = ref<CreatedAgentServiceAccountKey>();
const apiBaseUrl = ref('');

const authCurlCommand = computed(() => {
  if (!created.value) return '';
  const baseUrl = apiBaseUrl.value.replace(/\/$/, '');
  const authUrl = baseUrl
    ? `${baseUrl}/api/auth/agent/token`
    : '/api/auth/agent/token';
  return `curl --request POST \\
  --user '${created.value.clientId}:${created.value.clientSecret}' \\
  '${authUrl}'`;
});

const credentialBlocks = computed(() =>
  created.value
    ? [
        { label: 'Client ID', code: created.value.clientId },
        { label: 'Client secret', code: created.value.clientSecret },
        { label: 'Sign the agent in', code: authCurlCommand.value },
      ]
    : [],
);

async function create() {
  expiresError.value = '';
  saveError.value = '';
  const body: CreateAgentServiceAccountKeyRequest = {
    name: draft.name.trim() || undefined,
    neverExpires: draft.neverExpires,
  };
  if (!draft.neverExpires) {
    const expiresAt = new Date(draft.expiresAt);
    if (!draft.expiresAt || Number.isNaN(expiresAt.getTime())) {
      expiresError.value = 'Enter when the key expires.';
    } else if (expiresAt.getTime() <= Date.now()) {
      expiresError.value = 'Choose a time in the future.';
    } else {
      body.expiresAt = expiresAt.toISOString();
    }
    if (expiresError.value) return;
  }
  saving.value = true;
  try {
    const response = await api.post<{ data: CreatedAgentServiceAccountKey }>(
      `/api/admin/agents/${props.agentId}/keys`,
      body,
      { transformRequest: [decamelizeKeys] },
    );
    try {
      apiBaseUrl.value = (await configStore.getConfig()).API_URL;
    } catch {
      apiBaseUrl.value = '';
    }
    created.value = response.data.data;
    emit('created', response.data.data);
  } catch (error) {
    saveError.value = await getErrorDetail(error, 'Try again.');
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <Stack v-if="created" gap="4">
    <InlineMessage tone="warning" title="Save the client secret now">
      <p>It won't be shown again after you close this.</p>
    </InlineMessage>
    <Stack v-for="block in credentialBlocks" :key="block.label" gap="2">
      <Text as="span" variant="label">{{ block.label }}</Text>
      <CodeBlock :label="block.label" :code="block.code" />
    </Stack>
    <Cluster justify="end">
      <Button variant="primary" @click="emit('close')">Done</Button>
    </Cluster>
  </Stack>
  <form v-else novalidate @submit.prevent="create">
    <Stack gap="4">
      <FormField label="Name" hint="Optional, e.g. primary">
        <TextInput v-model="draft.name" />
      </FormField>
      <Checkbox v-model="draft.neverExpires" label="Never expires" />
      <FormField
        v-if="!draft.neverExpires"
        label="Expires at"
        required
        :error="expiresError || undefined"
      >
        <TextInput v-model="draft.expiresAt" type="datetime-local" />
      </FormField>
      <InlineMessage v-if="saveError" tone="error" title="Not created">
        <p>{{ saveError }}</p>
      </InlineMessage>
      <Cluster justify="end" gap="2">
        <Button @click="emit('close')">Cancel</Button>
        <Button variant="primary" type="submit" :loading="saving"
          >Create key</Button
        >
      </Cluster>
    </Stack>
  </form>
</template>
