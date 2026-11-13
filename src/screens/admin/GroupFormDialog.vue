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

/**
 * A group's name and description: a new group, or `group` to edit. Members and roles are managed
 * on the group's page.
 */
const props = defineProps<{ group?: CCFGroup }>();
const open = defineModel<boolean>('open', { default: false });
const emit = defineEmits<{ saved: [group: CCFGroup] }>();

const api = useAuthenticatedInstance();
const draft = reactive({ name: '', description: '' });
const attempted = ref(false);
const saving = ref(false);
const saveError = ref<string>();

watch(open, (isOpen) => {
  if (!isOpen) return;
  Object.assign(draft, {
    name: props.group?.name ?? '',
    description: props.group?.description ?? '',
  });
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
    const body = {
      name: draft.name.trim(),
      description: draft.description.trim(),
    };
    const response = props.group
      ? await api.put<DataResponse<CCFGroup>>(
          `/api/admin/groups/${props.group.id}`,
          body,
        )
      : await api.post<DataResponse<CCFGroup>>('/api/admin/groups', body);
    open.value = false;
    emit('saved', response.data.data);
  } catch (error) {
    saveError.value = await getErrorDetail(
      error,
      props.group
        ? "The changes weren't saved. Try again."
        : "The group couldn't be created. Try again.",
    );
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <Dialog
    v-model:open="open"
    :title="group ? 'Edit group' : 'New group'"
    :description="
      group ? undefined : 'Add members and roles once it\'s created.'
    "
    :dirty="
      draft.name !== (group?.name ?? '') ||
      draft.description !== (group?.description ?? '')
    "
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
          <InlineMessage
            v-if="saveError"
            tone="error"
            :title="group ? 'Not saved' : 'Not created'"
          >
            <p>{{ saveError }}</p>
          </InlineMessage>
          <Cluster justify="end" gap="2">
            <Button @click="requestClose">Cancel</Button>
            <Button variant="primary" type="submit" :loading="saving">{{
              group ? 'Save changes' : 'Create group'
            }}</Button>
          </Cluster>
        </Stack>
      </form>
    </template>
  </Dialog>
</template>
