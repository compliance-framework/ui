<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { useAuthenticatedInstance } from '@/composables/axios';
import type { CCFUser, DataResponse } from '@/stores/types';
import { getErrorDetail } from '@/utils/httpErrors';
import Button from '@/ds/components/Button/Button.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Dialog from '@/ds/components/Dialog/Dialog.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import InlineMessage from '@/ds/components/InlineMessage/InlineMessage.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import TextInput from '@/ds/components/TextInput/TextInput.vue';

/** New user with a password (local sign-in). SSO users are created when they first sign in. */
const open = defineModel<boolean>('open', { default: false });
const emit = defineEmits<{ created: [user: CCFUser] }>();

const api = useAuthenticatedInstance();
const blank = () => ({
  email: '',
  firstName: '',
  lastName: '',
  password: '',
  confirm: '',
});
const draft = reactive(blank());
const attempted = ref(false);
const saving = ref(false);
const saveError = ref<string>();

watch(open, (isOpen) => {
  if (!isOpen) return;
  Object.assign(draft, blank());
  attempted.value = false;
  saveError.value = undefined;
});

const errors = computed<Record<string, string>>(() => {
  if (!attempted.value) return {};
  const found: Record<string, string> = {};
  if (!/^\S+@\S+$/.test(draft.email.trim()))
    found.email = 'Enter an email address, like name@example.com.';
  if (!draft.firstName.trim()) found.firstName = 'Enter a first name.';
  if (!draft.lastName.trim()) found.lastName = 'Enter a last name.';
  if (!draft.password) found.password = 'Enter a password.';
  if (draft.password && draft.confirm !== draft.password)
    found.confirm = "The passwords don't match.";
  return found;
});
const dirty = computed(() =>
  Boolean(draft.email || draft.firstName || draft.lastName || draft.password),
);

async function submit(): Promise<void> {
  attempted.value = true;
  if (Object.keys(errors.value).length) return;
  saving.value = true;
  saveError.value = undefined;
  try {
    const response = await api.post<DataResponse<CCFUser>>('/api/admin/users', {
      email: draft.email.trim(),
      firstName: draft.firstName.trim(),
      lastName: draft.lastName.trim(),
      password: draft.password,
    });
    open.value = false;
    emit('created', response.data.data);
  } catch (error) {
    saveError.value = await getErrorDetail(
      error,
      "The user couldn't be created. Try again.",
    );
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <Dialog
    v-model:open="open"
    title="New user"
    description="They sign in with this email and password."
    :dirty="dirty"
  >
    <template #default="{ requestClose }">
      <form novalidate @submit.prevent="submit">
        <Stack gap="4">
          <FormField label="Email" required :error="errors.email">
            <TextInput v-model="draft.email" type="email" />
          </FormField>
          <FormField label="First name" required :error="errors.firstName">
            <TextInput v-model="draft.firstName" />
          </FormField>
          <FormField label="Last name" required :error="errors.lastName">
            <TextInput v-model="draft.lastName" />
          </FormField>
          <FormField label="Password" required :error="errors.password">
            <TextInput v-model="draft.password" type="password" />
          </FormField>
          <FormField label="Confirm password" required :error="errors.confirm">
            <TextInput v-model="draft.confirm" type="password" />
          </FormField>
          <InlineMessage v-if="saveError" tone="error" title="Not created">
            <p>{{ saveError }}</p>
          </InlineMessage>
          <Cluster justify="end" gap="2">
            <Button @click="requestClose">Cancel</Button>
            <Button variant="primary" type="submit" :loading="saving"
              >Create user</Button
            >
          </Cluster>
        </Stack>
      </form>
    </template>
  </Dialog>
</template>
