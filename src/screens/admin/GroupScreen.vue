<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from '@/ds/toasts';
import { useAuthenticatedInstance } from '@/composables/axios';
import type { CCFGroup } from '@/stores/types';
import { getErrorDetail } from '@/utils/httpErrors';
import GroupMembersSection from './GroupMembersSection.vue';
import RoleAssignmentsSection from './RoleAssignmentsSection.vue';
import { formatDateTime } from '@/ds/format';
import { useApiQuery } from '@/ds/query';
import Button from '@/ds/components/Button/Button.vue';
import ConfirmDialog from '@/ds/components/ConfirmDialog/ConfirmDialog.vue';
import DataState from '@/ds/components/DataState/DataState.vue';
import DescriptionList from '@/ds/components/DescriptionList/DescriptionList.vue';
import Text from '@/ds/components/Text/Text.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import RecordTemplate from '@/ds/templates/RecordTemplate/RecordTemplate.vue';
import GroupFormDialog from './GroupFormDialog.vue';

/**
 * A group (/admin/groups/:id): its details, members and system roles.
 */
const route = useRoute();
const router = useRouter();
const toast = useToast();
const api = useAuthenticatedInstance();
const id = String(route.params.id);

const group = useApiQuery<CCFGroup>(`/api/admin/groups/${id}`);

const facts = computed(() => {
  const g = group.data.value;
  if (!g) return [];
  const date = (value?: string | Date) =>
    value ? formatDateTime(String(value)) : '';
  return [
    { key: 'created', label: 'Created', value: date(g.createdAt) },
    { key: 'updated', label: 'Updated', value: date(g.updatedAt) },
    { key: 'id', label: 'ID', value: g.id },
  ];
});

const editing = ref(false);
function saved(next: CCFGroup): void {
  group.data.value = next;
  toast.add({ severity: 'success', summary: 'Group updated', life: 3000 });
}

const confirmDelete = ref(false);
async function remove(): Promise<void> {
  const name = group.data.value?.name ?? 'The group';
  try {
    await api.delete(`/api/admin/groups/${id}`);
    toast.add({
      severity: 'success',
      summary: 'Group deleted',
      detail: `${name} was deleted.`,
      life: 3000,
    });
    void router.push({ name: 'admin-groups' });
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: "The group wasn't deleted",
      detail: await getErrorDetail(error, 'Try again.'),
      life: 5000,
    });
  }
}
</script>

<template>
  <DataState
    v-if="!group.data.value"
    :status="group.status.value === 'ready' ? 'error' : group.status.value"
    subject="this group"
    skeleton="panel"
    @retry="group.retry"
  />
  <RecordTemplate
    v-else
    :title="group.data.value.name"
    :description="group.data.value.description"
  >
    <template #facts>
      <DescriptionList :items="facts" layout="inline" />
    </template>
    <template #actions>
      <Button icon="edit" @click="editing = true">Edit</Button>
      <Button variant="danger" icon="delete" @click="confirmDelete = true"
        >Delete</Button
      >
    </template>
    <Stack gap="6">
      <GroupMembersSection :group-id="group.data.value.id" />
      <RoleAssignmentsSection
        :roles-url="`/api/admin/groups/${group.data.value.id}/roles`"
        assignee-type="group"
        :assignee-id="group.data.value.name"
        description="System roles granted to this group. Members inherit them."
        empty-body="Assign a role to grant it to every member of this group."
      />
    </Stack>
  </RecordTemplate>

  <GroupFormDialog
    v-if="group.data.value"
    v-model:open="editing"
    :group="group.data.value"
    @saved="saved"
  />
  <ConfirmDialog
    v-model:open="confirmDelete"
    :title="`Delete ${group.data.value?.name ?? 'this group'}?`"
    confirm-label="Delete group"
    @confirm="remove"
    ><Text
      >Its members lose the roles granted through it. This can't be
      undone.</Text
    ></ConfirmDialog
  >
</template>
