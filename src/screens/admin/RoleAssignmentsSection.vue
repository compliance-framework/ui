<script setup lang="ts">
/**
 * The system roles a user or group holds, on their page: each role with where it comes from
 * (configuration or manual; for users, direct or inherited via a group), with Assign role and
 * Remove. Only manual direct grants can be removed here: configuration grants are fixed, and
 * inherited ones are managed on their group.
 */
import { computed, ref } from 'vue';
import { useToast } from 'primevue/usetoast';
import { useAuthenticatedInstance } from '@/composables/axios';
import { usePermissions } from '@/composables/usePermissions';
import { ACTIONS, MANIFEST_ROLES, RESOURCES } from '@/constants/permissions';
import type {
  CCFRoleAssignment,
  EffectiveRole,
  RoleAssignmentSource,
} from '@/stores/types';
import { getErrorDetail } from '@/utils/httpErrors';
import { plural } from '@/ds/format';
import { useApiQuery } from '@/ds/query';
import Button from '@/ds/components/Button/Button.vue';
import DataState from '@/ds/components/DataState/DataState.vue';
import DataTable from '@/ds/components/DataTable/DataTable.vue';
import type { DataTableColumn } from '@/ds/components/DataTable/types';
import Dialog from '@/ds/components/Dialog/Dialog.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import InlineMessage from '@/ds/components/InlineMessage/InlineMessage.vue';
import Select from '@/ds/components/Select/Select.vue';
import Tag from '@/ds/components/Tag/Tag.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Panel from '@/ds/components/layout/Panel.vue';
import Stack from '@/ds/components/layout/Stack.vue';

const props = defineProps<{
  /** GET lists the roles: a group's assignments, or a user's effective roles. */
  rolesUrl: string;
  assigneeType: 'user' | 'group';
  /** As role assignments name them: a user's email, a group's name. */
  assigneeId: string;
  description: string;
  emptyBody: string;
}>();

const toast = useToast();
const api = useAuthenticatedInstance();
const { can } = usePermissions();

const assignDenied = computed(() =>
  can(RESOURCES.ROLE_ASSIGNMENT, ACTIONS.CREATE)
    ? undefined
    : "Your access doesn't include assigning roles.",
);
const removeDenied = computed(() =>
  can(RESOURCES.ROLE_ASSIGNMENT, ACTIONS.DELETE)
    ? undefined
    : "Your access doesn't include removing roles.",
);

const roles = useApiQuery<(CCFRoleAssignment | EffectiveRole)[]>(
  props.rolesUrl,
  { isEmpty: (list) => list.length === 0 },
);

interface Row {
  key: string;
  roleName: string;
  assignmentId: string;
  source: RoleAssignmentSource;
  inherited: boolean;
  viaGroup?: string;
}

const rows = computed<Row[]>(() =>
  (roles.data.value ?? []).map((role) => {
    const effective = role as EffectiveRole;
    const assignmentId =
      effective.assignmentId ?? (role as CCFRoleAssignment).id;
    return {
      key: `${role.roleName}-${effective.viaGroup ?? 'direct'}-${assignmentId}`,
      roleName: role.roleName,
      assignmentId,
      source: role.source,
      inherited: Boolean(effective.inherited),
      viaGroup: effective.viaGroup,
    };
  }),
);

const columns = computed<DataTableColumn[]>(() => [
  { key: 'roleName', label: 'Role', minWidth: 'sm' },
  { key: 'source', label: 'Source', nowrap: true },
  ...(props.assigneeType === 'user'
    ? [{ key: 'origin', label: 'Origin', nowrap: true }]
    : []),
]);

const removeReason = (row: Row) =>
  row.inherited
    ? `Inherited via ${row.viaGroup || 'a group'}: remove it on the group.`
    : row.source !== 'manual'
      ? 'Defined in configuration, so it can only be changed there.'
      : removeDenied.value;

async function remove(row: Row) {
  try {
    await api.delete(`/api/admin/role-assignments/${row.assignmentId}`);
    roles.retry();
    toast.add({
      severity: 'success',
      summary: 'Role removed',
      detail: `${row.roleName} was removed.`,
      life: 3000,
    });
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: "The role wasn't removed",
      detail: await getErrorDetail(error, 'Try again.'),
      life: 5000,
    });
  }
}

// Assign -------------------------------------------------------------------------------------

const assigning = ref(false);
const chosen = ref('');
const chooseError = ref('');
const saving = ref(false);
const saveError = ref('');
/** Roles already granted directly are left out, so a redundant grant can't conflict. */
const options = computed(() => {
  const held = new Set(
    rows.value.filter((r) => !r.inherited).map((r) => r.roleName),
  );
  return MANIFEST_ROLES.filter((role) => !held.has(role.name)).map((role) => ({
    value: role.name,
    label: `${role.name}: ${role.description}`,
  }));
});

function openAssign() {
  chosen.value = '';
  chooseError.value = '';
  saveError.value = '';
  assigning.value = true;
}

async function assign() {
  chooseError.value = chosen.value ? '' : 'Choose a role.';
  if (chooseError.value) return;
  saving.value = true;
  saveError.value = '';
  try {
    await api.post('/api/admin/role-assignments', {
      roleName: chosen.value,
      assigneeType: props.assigneeType,
      assigneeId: props.assigneeId,
    });
    roles.retry();
    assigning.value = false;
    toast.add({ severity: 'success', summary: 'Role assigned', life: 3000 });
  } catch (error) {
    saveError.value = await getErrorDetail(error, 'Try again.');
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <Panel title="Roles" :description="description" :level="2">
    <template #actions>
      <Button
        icon="add"
        :disabled-reason="
          assignDenied ??
          (options.length ? undefined : 'Every role is already assigned.')
        "
        @click="openAssign"
        >Assign role</Button
      >
    </template>
    <DataState
      :status="roles.status.value"
      subject="roles"
      empty-title="No roles yet"
      :empty-body="emptyBody"
      icon="users"
      @retry="roles.retry"
    >
      <DataTable
        :caption="plural(rows.length, 'role')"
        caption-hidden
        :columns="columns"
        :rows="rows"
        :row-key="(r) => r.key"
      >
        <template #cell-source="{ row: r }">
          <Tag :label="r.source === 'manual' ? 'Manual' : 'Configuration'" />
        </template>
        <template #cell-origin="{ row: r }">{{
          r.inherited ? `Inherited via ${r.viaGroup || 'a group'}` : 'Direct'
        }}</template>
        <template #actions="{ row: r }">
          <Button
            size="sm"
            :disabled-reason="removeReason(r)"
            @click="remove(r)"
            >Remove</Button
          >
        </template>
      </DataTable>
    </DataState>

    <Dialog v-model:open="assigning" title="Assign role">
      <template #default="{ requestClose }">
        <form novalidate @submit.prevent="assign">
          <Stack gap="4">
            <FormField label="Role" required :error="chooseError">
              <Select v-model="chosen" :options="options" />
            </FormField>
            <InlineMessage v-if="saveError" tone="error" title="Not assigned">
              <p>{{ saveError }}</p>
            </InlineMessage>
            <Cluster justify="end" gap="2">
              <Button @click="requestClose">Cancel</Button>
              <Button variant="primary" type="submit" :loading="saving"
                >Assign role</Button
              >
            </Cluster>
          </Stack>
        </form>
      </template>
    </Dialog>
  </Panel>
</template>
