<template>
  <Panel
    title="Owners"
    description="A primary owner is required for workflow accountability."
    :level="3"
  >
    <template v-if="mode === 'overview'" #actions>
      <Button
        :variant="isEditing ? 'primary' : 'secondary'"
        :disabled-reason="
          disabled ? 'Wait for the current change to finish.' : undefined
        "
        @click="onHeaderAction"
        >{{ isEditing ? 'Save owners' : 'Assign owners' }}</Button
      >
    </template>
    <Stack gap="4">
      <DescriptionList v-if="!showEditor" :items="ownerFacts" />
      <template v-else>
        <Text v-if="!rows.length" variant="caption">No owners yet.</Text>
        <Stack v-else gap="2" as="ul">
          <li v-for="(row, index) in rows" :key="row.key">
            <Cluster gap="2" align="end">
              <FormField :label="`Owner ${index + 1}`">
                <Combobox
                  :model-value="row.user?.id || row.ownerRef"
                  :options="userOptions"
                  :loading="users.status.value === 'loading'"
                  placeholder="Name or email"
                  @update:model-value="(id: string) => chooseUser(row, id)"
                />
              </FormField>
              <IconButton
                icon="close"
                :label="`Remove owner ${index + 1}`"
                :disabled-reason="
                  disabled
                    ? 'Wait for the current change to finish.'
                    : undefined
                "
                @click="removeRow(row.key)"
              />
            </Cluster>
          </li>
        </Stack>
        <div>
          <Button
            icon="add"
            :disabled-reason="
              disabled ? 'Wait for the current change to finish.' : undefined
            "
            @click="addRow"
            >Add owner</Button
          >
        </div>
        <RadioGroup
          v-if="primaryOptions.length"
          v-model="primaryKey"
          legend="Primary owner"
          :options="primaryOptions"
          :error="ownerValidationError || undefined"
        />
        <InlineMessage
          v-else-if="ownerValidationError"
          tone="error"
          title="Not saved"
          ><p>{{ ownerValidationError }}</p></InlineMessage
        >
      </template>
    </Stack>
  </Panel>
</template>

<script setup lang="ts">
/**
 * A risk's owners: who the primary owner is and who else owns it. On the risk's overview it is
 * read-only until Assign owners (then Save); inside the accept dialog it is always editable. It
 * emits each change and, on the overview, `save`. The script is the classic panel's.
 */
import { computed, ref, watch } from 'vue';
import { useApiQuery } from '@/ds/query';
import Button from '@/ds/components/Button/Button.vue';
import Combobox from '@/ds/components/Combobox/Combobox.vue';
import DescriptionList from '@/ds/components/DescriptionList/DescriptionList.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import IconButton from '@/ds/components/IconButton/IconButton.vue';
import InlineMessage from '@/ds/components/InlineMessage/InlineMessage.vue';
import RadioGroup from '@/ds/components/RadioGroup/RadioGroup.vue';
import Text from '@/ds/components/Text/Text.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Panel from '@/ds/components/layout/Panel.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import {
  useUserSearch,
  type DisplayUser,
} from '@/composables/workflows/useUserSearch';
import {
  normalizeOwnerAssignments,
  type RiskOwnerAssignmentsPayload,
} from '@/utils/risk-workflow';

type OwnerMode = 'overview' | 'embedded';

interface OwnerRow {
  key: string;
  ownerRef: string;
  isPrimary: boolean;
  user: DisplayUser | null;
}

const props = withDefaults(
  defineProps<{
    initialValue: RiskOwnerAssignmentsPayload;
    disabled?: boolean;
    mode?: OwnerMode;
    resetKey?: string | number;
  }>(),
  {
    disabled: false,
    mode: 'overview',
    resetKey: '',
  },
);

const emit = defineEmits<{
  change: [payload: RiskOwnerAssignmentsPayload];
  save: [];
}>();

const { userCache, loadUsersByIds, getCachedUser } = useUserSearch();

// Every selectable user, for the pickers (as on the workflow roles tab).
const users =
  useApiQuery<{ id: string; displayName: string }[]>('/api/users/select');
const userOptions = computed(() =>
  (users.data.value ?? []).map((u) => ({
    value: u.id,
    label: u.displayName || u.id,
  })),
);
function chooseUser(row: OwnerRow, id: string) {
  const picked = users.data.value?.find((u) => u.id === id);
  onUserSelected(
    row,
    picked
      ? { ...makeFallbackUser(picked.id), displayName: picked.displayName }
      : id
        ? makeFallbackUser(id)
        : null,
  );
}

const rows = ref<OwnerRow[]>([]);
const isEditing = ref(false);
const ownerValidationError = ref('');

const showEditor = computed(() => props.mode === 'embedded' || isEditing.value);
const hasPrimaryOwner = computed(() => {
  const normalized = normalizeOwnerAssignments({
    ownerAssignments: rows.value.map((row) => ({
      ownerKind: 'user' as const,
      ownerRef: (row.user?.id || row.ownerRef || '').trim(),
      isPrimary: row.isPrimary,
    })),
  });
  return !!normalized.primaryOwnerUserId;
});

const primaryOwnerLabel = computed(() => {
  const primary = rows.value.find((row) => row.isPrimary && row.ownerRef);
  if (!primary) return '';
  return ownerLabel(primary);
});

const ownerFacts = computed(() => [
  {
    key: 'primary',
    label: 'Primary owner',
    value: primaryOwnerLabel.value || 'Unassigned',
  },
  {
    key: 'others',
    label: 'Other owners',
    value:
      secondaryOwners.value.map((owner) => owner.label).join(', ') || 'None',
  },
]);
const primaryOptions = computed(() =>
  rows.value
    .filter((row) => row.ownerRef)
    .map((row) => ({ value: row.key, label: ownerLabel(row) })),
);
const primaryKey = computed({
  get: () => rows.value.find((row) => row.isPrimary && row.ownerRef)?.key ?? '',
  set: (key: string) => setPrimary(key),
});

const secondaryOwners = computed(() =>
  rows.value
    .filter((row) => row.ownerRef && !row.isPrimary)
    .map((row) => ({
      key: row.key,
      label: ownerLabel(row),
    })),
);

function makeFallbackUser(ownerRef: string): DisplayUser {
  return {
    id: ownerRef,
    email: ownerRef,
    firstName: '',
    lastName: '',
    failedLogins: 0,
    displayName: ownerRef,
  };
}

function ownerLabel(row: OwnerRow): string {
  return row.user?.displayName || row.ownerRef;
}

function normalizePayload(
  payload: RiskOwnerAssignmentsPayload | undefined,
): RiskOwnerAssignmentsPayload {
  return normalizeOwnerAssignments(payload);
}

function toRows(payload: RiskOwnerAssignmentsPayload): OwnerRow[] {
  return payload.ownerAssignments.map((assignment, index) => ({
    key: `${assignment.ownerRef}-${index}`,
    ownerRef: assignment.ownerRef,
    isPrimary: assignment.isPrimary,
    user: getCachedUser(assignment.ownerRef) || null,
  }));
}

async function hydrateUsers() {
  const ids = rows.value.map((row) => row.ownerRef).filter(Boolean);
  if (!ids.length) return;
  await loadUsersByIds(ids);
  rows.value = rows.value.map((row) => ({
    ...row,
    user:
      getCachedUser(row.ownerRef) ||
      row.user ||
      (row.ownerRef ? makeFallbackUser(row.ownerRef) : null),
  }));
}

function emitChange() {
  const ownerAssignments = rows.value
    .map((row) => ({
      ownerKind: 'user' as const,
      ownerRef: (row.user?.id || row.ownerRef || '').trim(),
      isPrimary: row.isPrimary,
    }))
    .filter((row) => !!row.ownerRef);

  const primaryOwnerUserId = ownerAssignments.find(
    (row) => row.isPrimary,
  )?.ownerRef;

  emit(
    'change',
    normalizeOwnerAssignments({
      primaryOwnerUserId,
      ownerAssignments,
    }),
  );
}

function setPrimary(key: string) {
  ownerValidationError.value = '';
  rows.value = rows.value.map((row) => ({
    ...row,
    isPrimary: row.key === key,
  }));
  emitChange();
}

function addRow() {
  ownerValidationError.value = '';
  if (props.mode === 'overview') {
    isEditing.value = true;
  }
  rows.value = [
    ...rows.value,
    {
      key: `owner-row-${Date.now()}-${Math.random()}`,
      ownerRef: '',
      isPrimary: rows.value.length === 0,
      user: null,
    },
  ];
  emitChange();
}

function onHeaderAction() {
  if (props.mode !== 'overview') return;
  if (!isEditing.value) {
    ownerValidationError.value = '';
    isEditing.value = true;
    return;
  }
  if (!hasPrimaryOwner.value) {
    ownerValidationError.value = 'Primary owner is required before saving.';
    return;
  }
  ownerValidationError.value = '';
  emit('save');
}

function removeRow(key: string) {
  ownerValidationError.value = '';
  const removed = rows.value.find((row) => row.key === key);
  rows.value = rows.value.filter((row) => row.key !== key);

  if (removed?.isPrimary && rows.value.length > 0) {
    rows.value[0].isPrimary = true;
  }

  emitChange();
}

function onUserSelected(row: OwnerRow, value: DisplayUser | null) {
  ownerValidationError.value = '';
  row.user = value;
  row.ownerRef = value?.id || '';
  if (!row.ownerRef) {
    row.isPrimary = false;
  }
  if (!rows.value.some((item) => item.isPrimary) && row.ownerRef) {
    row.isPrimary = true;
  } else if (!rows.value.some((item) => item.isPrimary && item.ownerRef)) {
    const fallbackPrimary = rows.value.find((item) => item.ownerRef);
    if (fallbackPrimary) {
      rows.value = rows.value.map((item) => ({
        ...item,
        isPrimary: item.key === fallbackPrimary.key,
      }));
    }
  }
  emitChange();
}

async function resetFromInitialValue() {
  const normalized = normalizePayload(props.initialValue);
  rows.value = toRows(normalized);
  isEditing.value = props.mode === 'embedded';
  emitChange();
  await hydrateUsers();
}

watch(
  () => props.resetKey,
  () => {
    void resetFromInitialValue();
  },
  { immediate: true },
);

watch(
  userCache,
  () => {
    rows.value = rows.value.map((row) => ({
      ...row,
      user:
        getCachedUser(row.ownerRef) ||
        row.user ||
        (row.ownerRef ? makeFallbackUser(row.ownerRef) : null),
    }));
  },
  { deep: true },
);
</script>
