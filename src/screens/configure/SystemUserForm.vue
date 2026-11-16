<script setup lang="ts">
/**
 * Add or edit a system user in a security plan: title, short name, description, role IDs and
 * authorized privileges (each with the functions it allows). Saves the user and emits `created`
 * or `saved`.
 */
import { reactive, ref } from 'vue';
import { useToast } from '@/ds/toasts';
import type { SystemUser } from '@/oscal';
import { decamelizeKeys, useAuthenticatedInstance } from '@/composables/axios';
import { uuid } from '@/utils/uuid';
import { getErrorDetail } from '@/utils/httpErrors';
import Button from '@/ds/components/Button/Button.vue';
import FieldList from '@/ds/components/FieldList/FieldList.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import InlineMessage from '@/ds/components/InlineMessage/InlineMessage.vue';
import Textarea from '@/ds/components/Textarea/Textarea.vue';
import TextInput from '@/ds/components/TextInput/TextInput.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Grid from '@/ds/components/layout/Grid.vue';
import Stack from '@/ds/components/layout/Stack.vue';

const props = defineProps<{ sspId: string; user?: SystemUser }>();
const emit = defineEmits<{
  created: [user: SystemUser];
  saved: [user: SystemUser];
  cancel: [];
}>();

const toast = useToast();
const api = useAuthenticatedInstance();
const base = `/api/oscal/system-security-plans/${props.sspId}/system-implementation/users`;

const list = (text: string) =>
  text
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

const draft = reactive({
  title: props.user?.title ?? '',
  shortName: props.user?.shortName ?? '',
  description: props.user?.description ?? '',
  roles: (props.user?.roleIds ?? []).join(', '),
  privileges: (props.user?.authorizedPrivileges ?? []).map((p) => ({
    title: p.title,
    description: p.description ?? '',
    functions: (p.functionsPerformed ?? []).join(', '),
  })),
});
const errors = reactive({ title: '', description: '' });
const saving = ref(false);
const saveError = ref('');

async function save() {
  errors.title = draft.title.trim() ? '' : 'Enter a title.';
  errors.description = draft.description.trim() ? '' : 'Enter a description.';
  if (errors.title || errors.description) return;
  saving.value = true;
  saveError.value = '';
  const body: SystemUser = {
    ...(props.user ?? { uuid: uuid() }),
    title: draft.title.trim(),
    shortName: draft.shortName.trim() || undefined,
    description: draft.description.trim(),
    roleIds: list(draft.roles),
    authorizedPrivileges: draft.privileges
      .filter((p) => p.title.trim())
      .map((p) => ({
        title: p.title.trim(),
        description: p.description.trim() || undefined,
        functionsPerformed: list(p.functions),
      })),
  };
  try {
    const response = props.user
      ? await api.put<{ data: SystemUser }>(
          `${base}/${props.user.uuid}`,
          body,
          {
            transformRequest: [decamelizeKeys],
          },
        )
      : await api.post<{ data: SystemUser }>(base, body, {
          transformRequest: [decamelizeKeys],
        });
    toast.add({
      severity: 'success',
      summary: props.user ? 'User saved' : 'User added',
      life: 3000,
    });
    if (props.user) emit('saved', response.data.data);
    else emit('created', response.data.data);
  } catch (error) {
    saveError.value = await getErrorDetail(error, 'Try again.');
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <form novalidate @submit.prevent="save">
    <Stack gap="4">
      <Grid min="sm" gap="4">
        <FormField label="Title" required :error="errors.title">
          <TextInput v-model="draft.title" />
        </FormField>
        <FormField label="Short name"
          ><TextInput v-model="draft.shortName"
        /></FormField>
      </Grid>
      <FormField label="Description" required :error="errors.description">
        <Textarea v-model="draft.description" :rows="3" />
      </FormField>
      <FormField
        label="Role IDs"
        hint="Separate with commas, e.g. operator, on-call."
      >
        <TextInput v-model="draft.roles" />
      </FormField>
      <FieldList
        v-model="draft.privileges"
        legend="Authorized privileges"
        item-label="privilege"
        add-label="Add privilege"
        empty-text="No privileges."
        :new-item="() => ({ title: '', description: '', functions: '' })"
      >
        <template #item="{ item }">
          <Stack gap="2">
            <Grid min="sm" gap="2">
              <FormField label="Title"
                ><TextInput v-model="item.title"
              /></FormField>
              <FormField label="Description"
                ><TextInput v-model="item.description"
              /></FormField>
            </Grid>
            <FormField label="Functions performed" hint="Separate with commas.">
              <TextInput v-model="item.functions" />
            </FormField>
          </Stack>
        </template>
      </FieldList>
      <InlineMessage v-if="saveError" tone="error" title="Not saved">
        <p>{{ saveError }}</p>
      </InlineMessage>
      <Cluster justify="end" gap="2">
        <Button @click="emit('cancel')">Cancel</Button>
        <Button variant="primary" type="submit" :loading="saving">{{
          user ? 'Save user' : 'Add user'
        }}</Button>
      </Cluster>
    </Stack>
  </form>
</template>
