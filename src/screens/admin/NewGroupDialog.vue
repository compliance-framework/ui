<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { useAuthenticatedInstance } from '@/composables/axios';
import type { CCFGroup, DataResponse } from '@/stores/types';
import { getErrorDetail } from '@/utils/httpErrors';
import Button from '@/ds/components/Button/Button.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Dialog from '@/ds/components/Dialog/Dialog.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import InlineMessage from '@/ds/components/InlineMessage/InlineMessage.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import Textarea from '@/ds/components/Textarea/Textarea.vue';
import TextInput from '@/ds/components/TextInput/TextInput.vue';

/** New group: a name and description. Members and roles are added on the group's page. */
const open = defineModel<boolean>('open', { default: false });
const emit = defineEmits<{ created: [group: CCFGroup] }>();

const api = useAuthenticatedInstance();
const draft = reactive({ name: '', description: '' });
const attempted = ref(false);
const saving = ref(false);
const saveError = ref<string>();

watch(open, (isOpen) => {
  if (!isOpen) return;
  Object.assign(draft, { name: '', description: '' });
  attempted.value = false;
  saveError.value = undefined;
});

const nameError = computed(() =>
  attempted.value && !draft.name.trim() ? 'Enter a name.' : undefined,
);

async function submit(): Promise<void> {
  attempted.value = true;
  if (nameError.value) return;
  saving.value = true;
  saveError.value = undefined;
  try {
    const response = await api.post<DataResponse<CCFGroup>>(
      '/api/admin/groups',
      { name: draft.name.trim(), description: draft.description.trim() },
    );
    open.value = false;
    emit('created', response.data.data);
  } catch (error) {
    saveError.value = await getErrorDetail(
      error,
      "The group couldn't be created. Try again.",
    );
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <Dialog
    v-model:open="open"
    title="New group"
    description="Add members and roles once it's created."
    :dirty="Boolean(draft.name || draft.description)"
  >
    <template #default="{ requestClose }">
      <form novalidate @submit.prevent="submit">
        <Stack gap="4">
          <FormField label="Name" required :error="nameError">
            <TextInput v-model="draft.name" />
          </FormField>
          <FormField label="Description">
            <Textarea v-model="draft.description" :rows="3" />
          </FormField>
          <InlineMessage v-if="saveError" tone="error" title="Not created">
            <p>{{ saveError }}</p>
          </InlineMessage>
          <Cluster justify="end" gap="2">
            <Button @click="requestClose">Cancel</Button>
            <Button variant="primary" type="submit" :loading="saving"
              >Create group</Button
            >
          </Cluster>
        </Stack>
      </form>
    </template>
  </Dialog>
</template>
