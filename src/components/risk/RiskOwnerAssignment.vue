<template>
  <div
    class="bg-white dark:bg-slate-900 border border-ccf-300 dark:border-slate-700 rounded-lg p-4 space-y-4"
  >
    <div class="flex items-center justify-between gap-3">
      <div>
        <h3 class="text-sm font-semibold text-gray-800 dark:text-slate-200">
          Owner Assignment
        </h3>
        <p class="text-xs text-gray-500 dark:text-slate-400 mt-1">
          Primary owner is required for workflow accountability.
        </p>
      </div>
      <button
        v-if="mode === 'overview'"
        type="button"
        class="px-3 py-1.5 rounded-md text-sm bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60"
        :disabled="disabled"
        @click="onHeaderAction"
      >
        {{ isEditing ? 'Save' : 'Assign Owner' }}
      </button>
    </div>

    <div class="space-y-2 text-sm text-gray-700 dark:text-slate-300">
      <p>
        <span class="font-semibold">Primary Owner:</span>
        <span class="ml-1">{{ primaryOwnerLabel || 'Unassigned' }}</span>
      </p>

      <div>
        <span class="font-semibold">Additional Owners:</span>
        <span v-if="!secondaryOwnerLabels.length" class="ml-1 text-gray-500"
          >None</span
        >
        <ul v-else class="mt-1 list-disc list-inside">
          <li
            v-for="(owner, index) in secondaryOwnerLabels"
            :key="`secondary-owner-${index}`"
          >
            {{ owner }}
          </li>
        </ul>
      </div>
    </div>

    <p
      v-if="ownerValidationError && showEditor"
      class="text-xs text-red-600 dark:text-red-400"
    >
      {{ ownerValidationError }}
    </p>

    <div
      v-if="showEditor"
      class="space-y-3 border border-ccf-300 dark:border-slate-700 rounded-md p-3"
    >
      <div
        v-if="!rows.length"
        class="text-xs text-gray-500 dark:text-slate-400 italic"
      >
        No owner assignments configured.
      </div>

      <div
        v-for="row in rows"
        :key="row.key"
        class="grid grid-cols-1 gap-2 md:grid-cols-[1fr_auto_auto]"
      >
        <AutoComplete
          v-model="row.user"
          :suggestions="userSuggestions"
          optionLabel="displayName"
          :filterBy="['displayName', 'email']"
          placeholder="Search users..."
          class="w-full"
          :forceSelection="true"
          :disabled="disabled"
          @complete="searchUsers"
          @update:modelValue="onUserSelected(row, $event)"
        >
          <template #item="{ item }">
            <div class="flex flex-col">
              <span class="font-medium text-gray-900 dark:text-slate-100">
                {{ item.displayName }}
              </span>
              <span class="text-xs text-gray-500 dark:text-slate-400">
                {{ item.email }}
              </span>
            </div>
          </template>
          <template #selected="{ value }">
            <div class="flex flex-col">
              <span class="font-medium text-gray-900 dark:text-slate-100">
                {{ value?.displayName || row.ownerRef || 'Select user' }}
              </span>
              <span class="text-xs text-gray-500 dark:text-slate-400">
                {{ value?.email || row.ownerRef || '' }}
              </span>
            </div>
          </template>
        </AutoComplete>

        <label class="flex items-center gap-2 text-xs text-gray-600">
          <input
            type="radio"
            :name="primaryOwnerInputName"
            :checked="row.isPrimary"
            :disabled="disabled"
            @change="setPrimary(row.key)"
          />
          Primary
        </label>

        <button
          type="button"
          class="text-xs px-2 py-1 rounded-md bg-red-600 hover:bg-red-700 text-white disabled:opacity-60"
          :disabled="disabled"
          @click="removeRow(row.key)"
        >
          Remove
        </button>
      </div>

      <button
        type="button"
        class="text-sm text-blue-600 hover:text-blue-700 disabled:opacity-60"
        :disabled="disabled"
        @click="addRow"
      >
        + Add Owner
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, getCurrentInstance, ref, watch } from 'vue';
import AutoComplete from '@/volt/AutoComplete.vue';
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

const {
  userSuggestions,
  userCache,
  searchUsers,
  loadUsersByIds,
  getCachedUser,
} = useUserSearch();

const rows = ref<OwnerRow[]>([]);
const isEditing = ref(false);
const primaryOwnerInputName = `primary-owner-${getCurrentInstance()?.uid ?? Date.now()}`;
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

const secondaryOwnerLabels = computed(() =>
  rows.value
    .filter((row) => row.ownerRef && !row.isPrimary)
    .map((row) => ownerLabel(row)),
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
