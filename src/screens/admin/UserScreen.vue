<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from '@/ds/toasts';
import { useAuthenticatedInstance } from '@/composables/axios';
import type { CCFUser, CCFUserGroup, DataResponse } from '@/stores/types';
import { getErrorDetail } from '@/utils/httpErrors';
import RoleAssignmentsSection from './RoleAssignmentsSection.vue';
import { formatDateTime } from '@/ds/format';
import { useApiQuery } from '@/ds/query';
import Button from '@/ds/components/Button/Button.vue';
import CodeBlock from '@/ds/components/CodeBlock/CodeBlock.vue';
import ConfirmDialog from '@/ds/components/ConfirmDialog/ConfirmDialog.vue';
import DataState from '@/ds/components/DataState/DataState.vue';
import DescriptionList from '@/ds/components/DescriptionList/DescriptionList.vue';
import Tag from '@/ds/components/Tag/Tag.vue';
import Text from '@/ds/components/Text/Text.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Panel from '@/ds/components/layout/Panel.vue';
import PanelSection from '@/ds/components/layout/PanelSection.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import RecordTemplate from '@/ds/templates/RecordTemplate/RecordTemplate.vue';
import EditUserDialog from './EditUserDialog.vue';

/**
 * A user (/users/:id, admin): account details, groups, and system roles. Edit, Lock and Delete are
 * page actions.
 */
const route = useRoute();
const router = useRouter();
const toast = useToast();
const api = useAuthenticatedInstance();
const id = String(route.params.id);

const user = useApiQuery<CCFUser>(`/api/admin/users/${id}`);
const groups = useApiQuery<CCFUserGroup[]>(`/api/admin/users/${id}/groups`, {
  isEmpty: (list) => list.length === 0,
});

const name = computed(() => {
  const u = user.data.value;
  return u ? `${u.firstName} ${u.lastName}`.trim() || u.email : '';
});
const date = (value?: string | Date | null) =>
  value ? formatDateTime(String(value)) : '';

const facts = computed(() => {
  const u = user.data.value;
  if (!u) return [];
  return [
    { key: 'email', label: 'Email', value: u.email },
    { key: 'method', label: 'Signs in with', value: u.authMethod },
    { key: 'provider', label: 'Identity provider', value: u.authProvider },
    {
      key: 'lastLogin',
      label: 'Last sign-in',
      value: date(u.lastLogin) || 'Never',
    },
    { key: 'failed', label: 'Failed sign-ins', value: u.failedLogins ?? 0 },
    { key: 'created', label: 'Created', value: date(u.createdAt) },
    { key: 'updated', label: 'Updated', value: date(u.updatedAt) },
    { key: 'id', label: 'ID', value: u.id },
  ];
});

const attributes = computed(() => {
  const raw = user.data.value?.userAttributes;
  if (!raw) return '';
  try {
    return JSON.stringify(
      typeof raw === 'string' ? JSON.parse(raw) : raw,
      null,
      2,
    );
  } catch {
    return String(raw);
  }
});

// Actions --------------------------------------------------------------------------------------

const editing = ref(false);
function saved(next: CCFUser): void {
  user.data.value = next;
  toast.add({ severity: 'success', summary: 'User updated', life: 3000 });
}

const locking = ref(false);
async function toggleLock(): Promise<void> {
  const u = user.data.value;
  if (!u) return;
  const locked = !u.isLocked;
  locking.value = true;
  try {
    const response = await api.put<DataResponse<CCFUser>>(
      `/api/admin/users/${id}`,
      { ...u, isLocked: locked },
    );
    user.data.value = response.data.data ?? { ...u, isLocked: locked };
    toast.add({
      severity: 'success',
      summary: locked ? 'User locked' : 'User unlocked',
      detail: locked
        ? `${name.value} can't sign in until unlocked.`
        : `${name.value} can sign in again.`,
      life: 3000,
    });
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: locked ? "The user wasn't locked" : "The user wasn't unlocked",
      detail: await getErrorDetail(error, 'Try again.'),
      life: 5000,
    });
  } finally {
    locking.value = false;
  }
}

const confirmDelete = ref(false);
async function remove(): Promise<void> {
  try {
    await api.delete(`/api/admin/users/${id}`);
    toast.add({
      severity: 'success',
      summary: 'User deleted',
      detail: `${name.value} was deleted.`,
      life: 3000,
    });
    void router.push({ name: 'users-list' });
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: "The user wasn't deleted",
      detail: await getErrorDetail(error, 'Try again.'),
      life: 5000,
    });
  }
}
</script>

<template>
  <DataState
    v-if="!user.data.value"
    :status="user.status.value === 'ready' ? 'error' : user.status.value"
    subject="this user"
    skeleton="panel"
    @retry="user.retry"
  />
  <RecordTemplate v-else :title="name">
    <template #status>
      <Tag v-if="user.data.value.isLocked" label="Locked" />
      <Tag v-if="user.data.value.isActive === false" label="Inactive" />
    </template>
    <template #actions>
      <Button icon="edit" @click="editing = true">Edit</Button>
      <Button
        :icon="user.data.value.isLocked ? 'check' : 'locked'"
        :loading="locking"
        @click="toggleLock"
        >{{ user.data.value.isLocked ? 'Unlock' : 'Lock' }}</Button
      >
      <Button variant="danger" icon="delete" @click="confirmDelete = true"
        >Delete</Button
      >
    </template>

    <Stack gap="6">
      <Panel>
        <PanelSection title="Account" :level="2">
          <DescriptionList :items="facts" />
        </PanelSection>
        <PanelSection
          v-if="attributes"
          title="Attributes from sign-in"
          :level="2"
        >
          <CodeBlock :code="attributes" label="User attributes" />
        </PanelSection>
      </Panel>

      <Panel>
        <PanelSection title="Groups" :level="2">
          <DataState
            :status="groups.status.value"
            subject="groups"
            empty-title="Not in any groups"
            empty-body="Add them to a group from the group's page."
            skeleton="text"
            @retry="groups.retry"
          >
            <Stack gap="2">
              <Cluster gap="2">
                <Tag
                  v-for="g in groups.data.value"
                  :key="g.groupId"
                  :label="
                    g.inherited ? `${g.groupName} (from SSO)` : g.groupName
                  "
                />
              </Cluster>
              <Text
                v-if="groups.data.value?.some((g) => g.inherited)"
                variant="caption"
                >Groups marked "from SSO" come from the identity provider and
                can only be changed there.</Text
              >
            </Stack>
          </DataState>
        </PanelSection>
      </Panel>

      <RoleAssignmentsSection
        :roles-url="`/api/admin/users/${user.data.value.id}/roles`"
        assignee-type="user"
        :assignee-id="user.data.value.email"
        description="System roles held directly or inherited from group membership."
        empty-body="This user holds no system roles, directly or through a group."
      />
    </Stack>
  </RecordTemplate>

  <EditUserDialog
    v-if="user.data.value"
    v-model:open="editing"
    :user="user.data.value"
    @saved="saved"
  />
  <ConfirmDialog
    v-model:open="confirmDelete"
    :title="`Delete ${name || 'this user'}?`"
    confirm-label="Delete user"
    @confirm="remove"
    ><Text
      >They can no longer sign in. This can't be undone.</Text
    ></ConfirmDialog
  >
</template>
