<script setup lang="ts">
/**
 * A workflow instance's Roles tab: every role its steps name (plus any other assigned role), who
 * holds it, and a menu to assign someone or remove the assignment. Assigning picks a user from
 * the selectable-users list, filtered as you type.
 */
import { computed, ref, watch } from 'vue';
import { useWorkflowInstanceStore } from '@/stores/workflows/instances';
import { useWorkflowInstances } from '@/composables/workflows';
import { useUserSearch } from '@/composables/workflows/useUserSearch';
import { usePermissions } from '@/composables/usePermissions';
import { RESOURCES, ACTIONS } from '@/constants/permissions';
import type { RoleAssignment } from '@/types/workflows';
import { plural } from '@/ds/format';
import { useApiQuery } from '@/ds/query';
import Button from '@/ds/components/Button/Button.vue';
import Combobox from '@/ds/components/Combobox/Combobox.vue';
import ConfirmDialog from '@/ds/components/ConfirmDialog/ConfirmDialog.vue';
import DataTable from '@/ds/components/DataTable/DataTable.vue';
import type { DataTableColumn } from '@/ds/components/DataTable/types';
import Dialog from '@/ds/components/Dialog/Dialog.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import InlineMessage from '@/ds/components/InlineMessage/InlineMessage.vue';
import Menu from '@/ds/components/Menu/Menu.vue';
import type { MenuEntry } from '@/ds/components/Menu/menuEntries';
import Tag from '@/ds/components/Tag/Tag.vue';
import Text from '@/ds/components/Text/Text.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Stack from '@/ds/components/layout/Stack.vue';

const store = useWorkflowInstanceStore();
const { createRoleAssignment, deleteRoleAssignment } = useWorkflowInstances();
const { loadUsersByIds, getCachedUser } = useUserSearch();
const { can } = usePermissions();

const assignDenied = computed(() =>
  can(RESOURCES.ROLE_ASSIGNMENT, ACTIONS.CREATE)
    ? undefined
    : "Your access doesn't include assigning roles.",
);
const removeDenied = computed(() =>
  can(RESOURCES.ROLE_ASSIGNMENT, ACTIONS.DELETE)
    ? undefined
    : "Your access doesn't include removing role assignments.",
);

const roleOf = (assignment: RoleAssignment) =>
  assignment.roleName || assignment.role || 'Unknown';
const holderOf = (assignment: RoleAssignment) =>
  assignment.assignedToId ?? assignment.userId;

watch(
  () => store.roleAssignments,
  (assignments) =>
    void loadUsersByIds([
      ...new Set(assignments.map(holderOf).filter(Boolean)),
    ]),
  { immediate: true, deep: true },
);

interface Row {
  role: string;
  holder: string;
  assignment?: RoleAssignment;
}

const rows = computed<Row[]>(() => {
  const stepRoles = (store.instance?.workflowDefinition?.steps ?? [])
    .map((step) => (step.responsibleRole ?? '').trim())
    .filter(Boolean);
  const byRole = new Map(store.roleAssignments.map((a) => [roleOf(a), a]));
  const roles = [...new Set([...stepRoles, ...byRole.keys()])];
  return roles.map((role) => {
    const assignment = byRole.get(role);
    const id = assignment && holderOf(assignment);
    return {
      role,
      assignment,
      holder: !id
        ? ''
        : assignment.assignedToType === 'group'
          ? `${id} (group)`
          : (getCachedUser(id)?.displayName ?? id),
    };
  });
});
const unassigned = computed(
  () => rows.value.filter((row) => !row.assignment).length,
);

const columns: DataTableColumn[] = [
  { key: 'role', label: 'Role', minWidth: 'sm' },
  { key: 'holder', label: 'Assigned to' },
];

// Assign -------------------------------------------------------------------------------------

const users =
  useApiQuery<{ id: string; displayName: string }[]>('/api/users/select');
const userOptions = computed(() =>
  (users.data.value ?? []).map((u) => ({
    value: u.id,
    label: u.displayName || u.id,
  })),
);

const assigning = ref<string>();
const assignOpen = computed({
  get: () => Boolean(assigning.value),
  set: (open: boolean) => {
    if (!open) assigning.value = undefined;
  },
});
const chosen = ref('');
const chooseError = ref('');
const saving = ref(false);
const saveError = ref('');

function openAssign(role: string) {
  chosen.value = '';
  chooseError.value = '';
  saveError.value = '';
  assigning.value = role;
}

async function assign() {
  const role = assigning.value;
  if (!role || !store.instance) return;
  chooseError.value = chosen.value ? '' : 'Choose who takes this role.';
  if (chooseError.value) return;
  saving.value = true;
  saveError.value = '';
  try {
    await createRoleAssignment(
      {
        workflowInstanceId: store.instance.id,
        roleName: role,
        assignedToType: 'user',
        assignedToId: chosen.value,
      },
      (assignment) => store.addRoleAssignmentLocally(assignment),
    );
    assigning.value = undefined;
  } catch (error) {
    saveError.value =
      error instanceof Error ? error.message : "The role wasn't assigned.";
  } finally {
    saving.value = false;
  }
}

// Remove -------------------------------------------------------------------------------------

const removing = ref<Row>();
const removeOpen = computed({
  get: () => Boolean(removing.value),
  set: (open: boolean) => {
    if (!open) removing.value = undefined;
  },
});

async function remove() {
  const assignment = removing.value?.assignment;
  removing.value = undefined;
  if (!assignment) return;
  try {
    await deleteRoleAssignment(assignment.id);
    store.removeRoleAssignmentLocally(assignment.id);
  } catch {
    // useWorkflowInstances has shown the error.
  }
}

// To hand a role to someone else, remove the assignment, then assign it.
const actions = (row: Row): MenuEntry[] =>
  row.assignment
    ? [
        {
          label: 'Remove assignment',
          icon: 'delete',
          tone: 'danger',
          disabledReason: removeDenied.value,
          onSelect: () => (removing.value = row),
        },
      ]
    : [
        {
          label: 'Assign role',
          icon: 'person',
          disabledReason: assignDenied.value,
          onSelect: () => openAssign(row.role),
        },
      ];
</script>

<template>
  <Stack gap="4">
    <Text v-if="!rows.length"
      >This workflow's steps don't name any responsible roles, so there is
      nothing to assign.</Text
    >
    <template v-else>
      <Text variant="secondary">{{
        unassigned
          ? `${plural(unassigned, 'role')} still to assign. Tasks for an unassigned role have no one to do them.`
          : 'Every role is assigned.'
      }}</Text>
      <DataTable
        :caption="plural(rows.length, 'role')"
        caption-hidden
        :columns="columns"
        :rows="rows"
        :row-key="(r) => r.role"
      >
        <template #cell-holder="{ row: r }">
          <Tag v-if="!r.assignment" label="Unassigned" />
          <template v-else>{{ r.holder }}</template>
        </template>
        <template #actions="{ row: r }">
          <Menu :label="`Actions for ${r.role}`" :items="actions(r)" />
        </template>
      </DataTable>
    </template>

    <Dialog
      v-model:open="assignOpen"
      :title="`Assign ${assigning ?? 'role'}`"
      description="Whoever holds the role is given its tasks in each run."
    >
      <template #default="{ requestClose }">
        <form novalidate @submit.prevent="assign">
          <Stack gap="4">
            <FormField label="Person" required :error="chooseError">
              <Combobox
                v-model="chosen"
                :options="userOptions"
                :loading="users.status.value === 'loading'"
                placeholder="Type a name"
                empty-text="No one matches."
              />
            </FormField>
            <InlineMessage
              v-if="users.status.value === 'error'"
              tone="error"
              title="People didn't load"
            >
              <p>Close this and try again.</p>
            </InlineMessage>
            <InlineMessage v-if="saveError" tone="error" title="Not assigned">
              <p>{{ saveError }}</p>
            </InlineMessage>
            <Cluster justify="end" gap="2">
              <Button @click="requestClose">Cancel</Button>
              <Button variant="primary" type="submit" :loading="saving"
                >Assign</Button
              >
            </Cluster>
          </Stack>
        </form>
      </template>
    </Dialog>
    <ConfirmDialog
      v-model:open="removeOpen"
      :title="`Remove ${removing?.holder ?? 'this person'} from ${removing?.role ?? 'the role'}?`"
      confirm-label="Remove assignment"
      @confirm="remove"
      ><Text
        >New tasks for this role will have no one to do them until it's assigned
        again.</Text
      ></ConfirmDialog
    >
  </Stack>
</template>
