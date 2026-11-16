<script setup lang="ts">
/**
 * A group's members, on the group page: name, email and whether the membership is native or
 * synced from the identity provider (which can't be removed here), with Add member (a filterable
 * picker over the user directory) and Remove.
 */
import { computed, ref } from 'vue';
import { useToast } from '@/ds/toasts';
import { useAuthenticatedInstance } from '@/composables/axios';
import type { CCFGroupMember, CCFUser } from '@/stores/types';
import { getErrorDetail } from '@/utils/httpErrors';
import { plural } from '@/ds/format';
import { useApiQuery } from '@/ds/query';
import Button from '@/ds/components/Button/Button.vue';
import Combobox from '@/ds/components/Combobox/Combobox.vue';
import DataState from '@/ds/components/DataState/DataState.vue';
import DataTable from '@/ds/components/DataTable/DataTable.vue';
import type { DataTableColumn } from '@/ds/components/DataTable/types';
import Dialog from '@/ds/components/Dialog/Dialog.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import InlineMessage from '@/ds/components/InlineMessage/InlineMessage.vue';
import Tag from '@/ds/components/Tag/Tag.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Panel from '@/ds/components/layout/Panel.vue';
import Stack from '@/ds/components/layout/Stack.vue';

const props = defineProps<{ groupId: string }>();

const toast = useToast();
const api = useAuthenticatedInstance();

const url = `/api/admin/groups/${props.groupId}/members`;
const members = useApiQuery<CCFGroupMember[]>(url, {
  isEmpty: (list) => list.length === 0,
});
// The members endpoint has no emails; the directory adds them and feeds the picker.
const users = useApiQuery<CCFUser[]>('/api/admin/users');

const emailOf = (id: string) =>
  users.data.value?.find((u) => u.id === id)?.email ?? '';
const nameOf = (user: CCFUser) =>
  `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email;

const rows = computed(() =>
  (members.data.value ?? []).map((member) => ({
    id: member.userId,
    name: member.displayName || 'No name',
    email: emailOf(member.userId) || 'Not available',
    member,
  })),
);
const columns: DataTableColumn[] = [
  { key: 'name', label: 'Name', minWidth: 'sm' },
  { key: 'email', label: 'Email' },
  { key: 'source', label: 'Source', nowrap: true },
];

// Add ----------------------------------------------------------------------------------------

const adding = ref(false);
const chosen = ref('');
const chooseError = ref('');
const saving = ref(false);
const saveError = ref('');
const options = computed(() => {
  const current = new Set((members.data.value ?? []).map((m) => m.userId));
  return (users.data.value ?? [])
    .filter((user) => !current.has(user.id))
    .map((user) => ({
      value: user.id,
      label: `${nameOf(user)} (${user.email})`,
    }));
});

function openAdd() {
  chosen.value = '';
  chooseError.value = '';
  saveError.value = '';
  adding.value = true;
}

async function add() {
  chooseError.value = chosen.value ? '' : 'Choose someone to add.';
  if (chooseError.value) return;
  saving.value = true;
  saveError.value = '';
  try {
    await api.post(url, { userId: chosen.value });
    members.retry();
    adding.value = false;
    toast.add({ severity: 'success', summary: 'Member added', life: 3000 });
  } catch (error) {
    saveError.value = await getErrorDetail(error, 'Try again.');
  } finally {
    saving.value = false;
  }
}

async function remove(member: CCFGroupMember) {
  try {
    await api.delete(`${url}/${member.userId}`);
    members.data.value = (members.data.value ?? []).filter(
      (m) => m.userId !== member.userId,
    );
    toast.add({
      severity: 'success',
      summary: 'Member removed',
      detail: `${member.displayName || 'They'} left the group.`,
      life: 3000,
    });
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: "The member wasn't removed",
      detail: await getErrorDetail(error, 'Try again.'),
      life: 5000,
    });
  }
}
</script>

<template>
  <Panel title="Members" :level="2">
    <template #actions>
      <Button icon="add" @click="openAdd">Add member</Button>
    </template>
    <DataState
      :status="members.status.value"
      subject="members"
      empty-title="No members yet"
      empty-body="Add people to give them this group's roles."
      icon="people"
      @retry="members.retry"
    >
      <DataTable
        :caption="plural(rows.length, 'member')"
        caption-hidden
        :columns="columns"
        :rows="rows"
        :row-key="(r) => r.id"
      >
        <template #cell-source="{ row: r }">
          <Tag :label="r.member.inherited ? 'Synced (SSO)' : 'Native'" />
        </template>
        <template #actions="{ row: r }">
          <Button
            size="sm"
            :disabled-reason="
              r.member.inherited
                ? 'Synced from the identity provider, so it can only be removed there.'
                : undefined
            "
            @click="remove(r.member)"
            >Remove</Button
          >
        </template>
      </DataTable>
    </DataState>

    <Dialog v-model:open="adding" title="Add member">
      <template #default="{ requestClose }">
        <form novalidate @submit.prevent="add">
          <Stack gap="4">
            <FormField label="Person" required :error="chooseError">
              <Combobox
                v-model="chosen"
                :options="options"
                :loading="users.status.value === 'loading'"
                placeholder="Type a name or email"
                empty-text="No one else matches."
              />
            </FormField>
            <InlineMessage v-if="saveError" tone="error" title="Not added">
              <p>{{ saveError }}</p>
            </InlineMessage>
            <Cluster justify="end" gap="2">
              <Button @click="requestClose">Cancel</Button>
              <Button variant="primary" type="submit" :loading="saving"
                >Add member</Button
              >
            </Cluster>
          </Stack>
        </form>
      </template>
    </Dialog>
  </Panel>
</template>
