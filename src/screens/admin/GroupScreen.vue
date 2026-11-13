<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import { useAuthenticatedInstance } from '@/composables/axios';
import type { CCFGroup } from '@/stores/types';
import { getErrorDetail } from '@/utils/httpErrors';
import GroupMembersPanel from '@/components/groups/GroupMembersPanel.vue';
import GroupRolesPanel from '@/components/groups/GroupRolesPanel.vue';
import LegacyPage from '@/views/layouts/LegacyPage.vue';
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
 * A group (/admin/groups/:id): its details, members and system roles. The members and roles
 * panels are the classic ones (legacy islands).
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
      <LegacyPage>
        <GroupMembersPanel :group-id="group.data.value.id" />
      </LegacyPage>
      <LegacyPage>
        <GroupRolesPanel
          :group-id="group.data.value.id"
          :group-name="group.data.value.name"
        />
      </LegacyPage>
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
