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

/** Edit a user's name. Their email is how they sign in, so it can't change here. */
const props = defineProps<{ user: CCFUser }>();
const open = defineModel<boolean>('open', { default: false });
const emit = defineEmits<{ saved: [user: CCFUser] }>();

const api = useAuthenticatedInstance();
const draft = reactive({ firstName: '', lastName: '' });
const attempted = ref(false);
const saving = ref(false);
const saveError = ref<string>();

watch(open, (isOpen) => {
  if (!isOpen) return;
  draft.firstName = props.user.firstName;
  draft.lastName = props.user.lastName;
  attempted.value = false;
  saveError.value = undefined;
});

const errors = computed<Record<string, string>>(() => {
  if (!attempted.value) return {};
  const found: Record<string, string> = {};
  if (!draft.firstName.trim()) found.firstName = 'Enter a first name.';
  if (!draft.lastName.trim()) found.lastName = 'Enter a last name.';
  return found;
});
const dirty = computed(
  () =>
    draft.firstName !== props.user.firstName ||
    draft.lastName !== props.user.lastName,
);

async function submit(): Promise<void> {
  attempted.value = true;
  if (Object.keys(errors.value).length) return;
  saving.value = true;
  saveError.value = undefined;
  try {
    const response = await api.put<DataResponse<CCFUser>>(
      `/api/admin/users/${props.user.id}`,
      {
        ...props.user,
        firstName: draft.firstName.trim(),
        lastName: draft.lastName.trim(),
      },
    );
    open.value = false;
    emit('saved', response.data.data);
  } catch (error) {
    saveError.value = await getErrorDetail(
      error,
      "The changes weren't saved. Try again.",
    );
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <Dialog
    v-model:open="open"
    title="Edit user"
    :description="`Signs in as ${user.email}.`"
    :dirty="dirty"
  >
    <template #default="{ requestClose }">
      <form novalidate @submit.prevent="submit">
        <Stack gap="4">
          <FormField label="First name" required :error="errors.firstName">
            <TextInput v-model="draft.firstName" />
          </FormField>
          <FormField label="Last name" required :error="errors.lastName">
            <TextInput v-model="draft.lastName" />
          </FormField>
          <InlineMessage v-if="saveError" tone="error" title="Not saved">
            <p>{{ saveError }}</p>
          </InlineMessage>
          <Cluster justify="end" gap="2">
            <Button @click="requestClose">Cancel</Button>
            <Button variant="primary" type="submit" :loading="saving"
              >Save changes</Button
            >
          </Cluster>
        </Stack>
      </form>
    </template>
  </Dialog>
</template>
