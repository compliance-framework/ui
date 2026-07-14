<template>
  <div>
    <div class="flex items-center justify-between mb-2">
      <h4 class="text-sm font-medium dark:text-slate-300">Inherited</h4>
      <PermissionGate :resource="RESOURCES.SSP" :action="ACTIONS.UPDATE">
        <SecondaryButton
          v-if="!draft"
          type="button"
          size="small"
          @click="startAdd"
        >
          Add Inherited
        </SecondaryButton>
      </PermissionGate>
    </div>

    <div
      v-if="!entries.length && !draft"
      class="text-sm text-gray-500 dark:text-slate-400 py-2"
    >
      No inherited entries yet.
    </div>

    <div class="space-y-2">
      <div
        v-for="entry in entries"
        :key="entry.uuid"
        class="p-3 border border-ccf-200 dark:border-slate-600 rounded bg-white dark:bg-slate-900"
      >
        <template v-if="editingUuid === entry.uuid && editBuffer">
          <!-- providedUuid is fixed at create time: the API rejects a change with a 400,
               because the entry is anchored to one upstream provided capability. -->
          <div class="mb-2 text-xs text-gray-500 dark:text-slate-400">
            Provided UUID: {{ entry.providedUuid || '(none)' }}
          </div>
          <ByComponentExportEntryFields
            v-model:description="editBuffer.description"
            v-model:responsible-roles="editBuffer.responsibleRoles"
            description-placeholder="Description of what is inherited"
          />
          <div class="flex justify-end gap-2 mt-2">
            <SecondaryButton type="button" size="small" @click="cancelEdit">
              Cancel
            </SecondaryButton>
            <PrimaryButton
              type="button"
              size="small"
              :disabled="savingUuid === entry.uuid"
              @click="saveEdit(entry)"
            >
              Save
            </PrimaryButton>
          </div>
        </template>
        <template v-else>
          <div class="flex justify-between items-start mb-1">
            <div>
              <p class="text-sm dark:text-slate-300 whitespace-pre-wrap">
                {{ entry.description || '(no description)' }}
              </p>
              <div class="text-xs text-gray-500 dark:text-slate-400">
                Provided: {{ providedLabel(entry.providedUuid) }}
              </div>
            </div>
            <PermissionGate :resource="RESOURCES.SSP" :action="ACTIONS.UPDATE">
              <div class="flex gap-2 shrink-0 ml-2">
                <button
                  type="button"
                  class="text-blue-500 hover:text-blue-700 text-sm"
                  @click="startEdit(entry)"
                >
                  Edit
                </button>
                <button
                  type="button"
                  class="text-red-500 hover:text-red-700 text-sm"
                  @click="remove(entry)"
                >
                  Remove
                </button>
              </div>
            </PermissionGate>
          </div>
          <div
            v-if="entry.responsibleRoles?.length"
            class="text-xs text-gray-500 dark:text-slate-400"
          >
            Roles: {{ entry.responsibleRoles.map((r) => r.roleId).join(', ') }}
          </div>
        </template>
      </div>

      <div
        v-if="draft"
        class="p-3 border border-ccf-200 dark:border-slate-600 rounded bg-white dark:bg-slate-900"
      >
        <div class="mb-2">
          <Label for="new-inherited-provided" required>Provided UUID</Label>
          <InputText
            id="new-inherited-provided"
            v-model="draft.providedUuid"
            placeholder="UUID of the upstream provided capability"
            class="w-full"
            @update:model-value="newError = ''"
          />
          <Message v-if="newError" severity="error" class="mt-1">
            {{ newError }}
          </Message>
        </div>
        <ByComponentExportEntryFields
          v-model:description="draft.description"
          v-model:responsible-roles="draft.responsibleRoles"
          description-placeholder="Description of what is inherited"
        />
        <div class="flex justify-end gap-2 mt-2">
          <SecondaryButton type="button" size="small" @click="cancelAdd">
            Cancel
          </SecondaryButton>
          <PrimaryButton
            type="button"
            size="small"
            :disabled="savingNew"
            @click="saveNew"
          >
            Save
          </PrimaryButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useToast } from 'primevue/usetoast';
import type { AxiosError } from 'axios';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import InputText from '@/volt/InputText.vue';
import Label from '@/volt/Label.vue';
import Message from '@/volt/Message.vue';
import PermissionGate from '@/components/auth/PermissionGate.vue';
import ByComponentExportEntryFields from './ByComponentExportEntryFields.vue';
import { RESOURCES, ACTIONS } from '@/constants/permissions';
import { useAuthenticatedInstance, decamelizeKeys } from '@/composables/axios';
import { uuid } from '@/utils/uuid';
import type { ByComponentInherit, ResponsibleRole } from '@/oscal';
import type { DataResponse, ErrorBody, ErrorResponse } from '@/stores/types';

const props = defineProps<{
  sspId: string;
  reqId: string;
  stmtId: string;
  byComponentId: string;
  modelValue: ByComponentInherit[] | undefined;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: ByComponentInherit[]];
  removed: [];
}>();

const toast = useToast();
const axiosInstance = useAuthenticatedInstance();
const requestConfig = { transformRequest: [decamelizeKeys] };

type WithRoles = ByComponentInherit & { responsibleRoles: ResponsibleRole[] };

function withRoles(entry: ByComponentInherit): WithRoles {
  return { ...entry, responsibleRoles: entry.responsibleRoles ?? [] };
}

const localEntries = ref<WithRoles[]>((props.modelValue ?? []).map(withRoles));

watch(
  () => props.modelValue,
  (value) => {
    localEntries.value = (value ?? []).map(withRoles);
  },
);

const entries = computed(() => localEntries.value);

// The inherited entries are statement-scoped: a requirement-level by-component is legacy and
// gets the read-only list instead, so this editor always has a stmtId.
const baseUrl = computed(
  () =>
    `/api/oscal/system-security-plans/${props.sspId}/control-implementation/implemented-requirements/${props.reqId}/statements/${props.stmtId}/by-components/${props.byComponentId}/inherited`,
);

function providedLabel(providedUuid: string | undefined): string {
  return providedUuid || '(none)';
}

function errorMessage(error: unknown, fallback: string): string {
  const errorResponse = error as AxiosError<ErrorResponse<ErrorBody>>;
  return (
    errorResponse.response?.data?.errors?.body ||
    errorResponse.message ||
    fallback
  );
}

function commit() {
  emit(
    'update:modelValue',
    localEntries.value.map((entry) => ({ ...entry })),
  );
}

const draft = ref<WithRoles | null>(null);
const newError = ref('');
const savingNew = ref(false);
const editingUuid = ref<string | null>(null);
const editBuffer = ref<WithRoles | null>(null);
const savingUuid = ref<string | null>(null);

function startAdd() {
  draft.value = {
    uuid: uuid(),
    providedUuid: '',
    description: '',
    responsibleRoles: [],
  };
  newError.value = '';
}

function cancelAdd() {
  draft.value = null;
  newError.value = '';
}

async function saveNew() {
  if (!draft.value) return;
  if (!draft.value.providedUuid?.trim()) {
    newError.value =
      'A provided UUID is required — it identifies the upstream capability being inherited.';
    return;
  }
  savingNew.value = true;
  try {
    const response = await axiosInstance.post<DataResponse<ByComponentInherit>>(
      baseUrl.value,
      draft.value,
      requestConfig,
    );
    localEntries.value = [...localEntries.value, withRoles(response.data.data)];
    commit();
    draft.value = null;
    toast.add({
      severity: 'success',
      summary: 'Inherited entry added.',
      life: 3000,
    });
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: errorMessage(error, 'Failed to add inherited entry.'),
      life: 5000,
    });
  } finally {
    savingNew.value = false;
  }
}

function startEdit(entry: ByComponentInherit) {
  editingUuid.value = entry.uuid;
  editBuffer.value = withRoles(
    JSON.parse(JSON.stringify(entry)) as ByComponentInherit,
  );
}

function cancelEdit() {
  editingUuid.value = null;
  editBuffer.value = null;
}

async function saveEdit(entry: ByComponentInherit) {
  if (!editBuffer.value) return;
  savingUuid.value = entry.uuid;
  try {
    // providedUuid is echoed back untouched: the API rejects a change to it, and the edit
    // form never offers it.
    const response = await axiosInstance.put<DataResponse<ByComponentInherit>>(
      `${baseUrl.value}/${entry.uuid}`,
      { ...editBuffer.value, providedUuid: entry.providedUuid },
      requestConfig,
    );
    const index = localEntries.value.findIndex((e) => e.uuid === entry.uuid);
    if (index !== -1) {
      localEntries.value[index] = withRoles(response.data.data);
    }
    commit();
    cancelEdit();
    toast.add({
      severity: 'success',
      summary: 'Inherited entry updated.',
      life: 3000,
    });
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: errorMessage(error, 'Failed to update inherited entry.'),
      life: 5000,
    });
  } finally {
    savingUuid.value = null;
  }
}

async function remove(entry: ByComponentInherit) {
  try {
    await axiosInstance.delete(`${baseUrl.value}/${entry.uuid}`);
    localEntries.value = localEntries.value.filter(
      (e) => e.uuid !== entry.uuid,
    );
    commit();
    emit('removed');
    toast.add({
      severity: 'success',
      summary: 'Inherited entry removed.',
      life: 3000,
    });
  } catch (error) {
    // A 409 means the entry is owned by a subscription, not by this SSP's authors: the
    // leverage link created it, and only unsubscribing may remove it. Never try to delete
    // the leverage link from here.
    const errorResponse = error as AxiosError<ErrorResponse<ErrorBody>>;
    if (errorResponse.response?.status === 409) {
      const offering =
        errorResponse.response.data?.errors?.body ||
        'an upstream export offering';
      toast.add({
        severity: 'warn',
        summary: 'Owned by a subscription',
        detail: `This capability is inherited from ${offering}. Unsubscribe from the offering to remove it.`,
        life: 8000,
      });
      return;
    }
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: errorMessage(error, 'Failed to remove inherited entry.'),
      life: 5000,
    });
  }
}
</script>
