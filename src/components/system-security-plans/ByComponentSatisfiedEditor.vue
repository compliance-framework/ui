<template>
  <div>
    <div class="flex items-center justify-between mb-2">
      <h4 class="text-sm font-medium dark:text-slate-300">Satisfied</h4>
      <PermissionGate :resource="RESOURCES.SSP" :action="ACTIONS.UPDATE">
        <SecondaryButton
          v-if="!draft"
          type="button"
          size="small"
          @click="startAdd"
        >
          Add Satisfied
        </SecondaryButton>
      </PermissionGate>
    </div>

    <div
      v-if="!entries.length && !draft"
      class="text-sm text-gray-500 dark:text-slate-400 py-2"
    >
      No satisfied entries yet.
    </div>

    <div class="space-y-2">
      <div
        v-for="entry in entries"
        :key="entry.uuid"
        class="p-3 border border-ccf-200 dark:border-slate-600 rounded bg-white dark:bg-slate-900"
      >
        <template v-if="editingUuid === entry.uuid && editBuffer">
          <!-- responsibilityUuid is fixed at create time: the API rejects a change with a
               400, because the entry discharges one specific upstream responsibility. -->
          <div class="mb-2 text-xs text-gray-500 dark:text-slate-400">
            Responsibility: {{ responsibilityLabel(entry.responsibilityUuid) }}
          </div>
          <ByComponentExportEntryFields
            v-model:description="editBuffer.description"
            v-model:responsible-roles="editBuffer.responsibleRoles"
            description-placeholder="How this responsibility is discharged"
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
                Responsibility:
                {{ responsibilityLabel(entry.responsibilityUuid) }}
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
                  :disabled="removingUuid === entry.uuid"
                  @click="
                    confirmDeleteDialog(() => remove(entry), {
                      itemType: 'satisfied entry',
                    })
                  "
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
          <Label for="new-satisfied-responsibility" required>
            Responsibility
          </Label>
          <!-- Only responsibilities carried by an inherited export for this statement are
               offerable: the API 400s a responsibility-uuid that isn't on one. -->
          <Select
            id="new-satisfied-responsibility"
            v-model="draft.responsibilityUuid"
            :options="responsibilityOptions"
            option-label="description"
            option-value="responsibilityUuid"
            placeholder="Select a responsibility to satisfy"
            class="w-full"
            @update:model-value="newError = ''"
          />
          <!-- A failed lookup is not the same as an empty one: telling the author to "inherit a
               capability first" when the request merely errored sends them off to fix nothing. -->
          <div
            v-if="responsibilityOptionsFailed"
            class="text-xs text-red-600 dark:text-red-400 mt-1"
          >
            Could not load the responsibilities available to satisfy. Close and
            reopen this editor to try again.
          </div>
          <div
            v-else-if="!responsibilityOptions.length"
            class="text-xs text-gray-500 dark:text-slate-400 mt-1"
          >
            No inherited responsibilities are available on this statement yet.
            Inherit a capability first.
          </div>
          <Message v-if="newError" severity="error" class="mt-1">
            {{ newError }}
          </Message>
        </div>
        <ByComponentExportEntryFields
          v-model:description="draft.description"
          v-model:responsible-roles="draft.responsibleRoles"
          description-placeholder="How this responsibility is discharged"
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
import Select from '@/volt/Select.vue';
import Label from '@/volt/Label.vue';
import Message from '@/volt/Message.vue';
import PermissionGate from '@/components/auth/PermissionGate.vue';
import ByComponentExportEntryFields from './ByComponentExportEntryFields.vue';
import { RESOURCES, ACTIONS } from '@/constants/permissions';
import { useAuthenticatedInstance, decamelizeKeys } from '@/composables/axios';
import { useDeleteConfirmationDialog } from '@/utils/delete-dialog';
import { uuid } from '@/utils/uuid';
import type { ByComponentSatisfy, ResponsibleRole } from '@/oscal';
import type { UpstreamResponsibility } from '@/types/ssp-export-offerings';
import type { DataResponse, ErrorBody, ErrorResponse } from '@/stores/types';

const props = defineProps<{
  sspId: string;
  reqId: string;
  stmtId: string;
  byComponentId: string;
  modelValue: ByComponentSatisfy[] | undefined;
  // The CREATE picker's options: only what is still outstanding. An already-satisfied
  // responsibility is deliberately absent, so this must not be used for labelling.
  responsibilityOptions: UpstreamResponsibility[];
  // The FULL upstream set (uuid + description), including already-satisfied ones — the
  // authoritative text every existing row is labelled from.
  responsibilityLabels?: UpstreamResponsibility[];
  // True when the options could not be fetched — distinct from "there are none".
  responsibilityOptionsFailed?: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: ByComponentSatisfy[]];
}>();

const toast = useToast();
const axiosInstance = useAuthenticatedInstance();
const { confirmDeleteDialog } = useDeleteConfirmationDialog();
const requestConfig = { transformRequest: [decamelizeKeys] };

type WithRoles = ByComponentSatisfy & { responsibleRoles: ResponsibleRole[] };

function withRoles(entry: ByComponentSatisfy): WithRoles {
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

const baseUrl = computed(
  () =>
    `/api/oscal/system-security-plans/${props.sspId}/control-implementation/implemented-requirements/${props.reqId}/statements/${props.stmtId}/by-components/${props.byComponentId}/satisfied`,
);

// Label from the full set first: an existing satisfied entry's responsibility is by
// definition no longer outstanding, so resolving it against the picker's options alone
// would always miss and fall through to the bare uuid.
function responsibilityLabel(responsibilityUuid: string | undefined): string {
  if (!responsibilityUuid) return '(none)';
  const match =
    (props.responsibilityLabels ?? []).find(
      (option) => option.responsibilityUuid === responsibilityUuid,
    ) ??
    props.responsibilityOptions.find(
      (option) => option.responsibilityUuid === responsibilityUuid,
    );
  return match?.description || responsibilityUuid;
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
const removingUuid = ref<string | null>(null);

function startAdd() {
  draft.value = {
    uuid: uuid(),
    responsibilityUuid: '',
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
  if (!draft.value.responsibilityUuid) {
    newError.value = 'Select the responsibility this entry satisfies.';
    return;
  }
  savingNew.value = true;
  try {
    const response = await axiosInstance.post<DataResponse<ByComponentSatisfy>>(
      baseUrl.value,
      draft.value,
      requestConfig,
    );
    localEntries.value = [...localEntries.value, withRoles(response.data.data)];
    commit();
    draft.value = null;
    toast.add({
      severity: 'success',
      summary: 'Satisfied entry added.',
      life: 3000,
    });
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: errorMessage(error, 'Failed to add satisfied entry.'),
      life: 5000,
    });
  } finally {
    savingNew.value = false;
  }
}

function startEdit(entry: ByComponentSatisfy) {
  editingUuid.value = entry.uuid;
  editBuffer.value = withRoles(
    JSON.parse(JSON.stringify(entry)) as ByComponentSatisfy,
  );
}

function cancelEdit() {
  editingUuid.value = null;
  editBuffer.value = null;
}

async function saveEdit(entry: ByComponentSatisfy) {
  if (!editBuffer.value) return;
  savingUuid.value = entry.uuid;
  try {
    const response = await axiosInstance.put<DataResponse<ByComponentSatisfy>>(
      `${baseUrl.value}/${entry.uuid}`,
      { ...editBuffer.value, responsibilityUuid: entry.responsibilityUuid },
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
      summary: 'Satisfied entry updated.',
      life: 3000,
    });
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: errorMessage(error, 'Failed to update satisfied entry.'),
      life: 5000,
    });
  } finally {
    savingUuid.value = null;
  }
}

async function remove(entry: ByComponentSatisfy) {
  // Without an in-flight guard a double-click fires two DELETEs, and the second 404s — toasting
  // an error over a delete that actually succeeded.
  if (removingUuid.value === entry.uuid) return;
  removingUuid.value = entry.uuid;
  try {
    await axiosInstance.delete(`${baseUrl.value}/${entry.uuid}`);
    localEntries.value = localEntries.value.filter(
      (e) => e.uuid !== entry.uuid,
    );
    commit();
    toast.add({
      severity: 'success',
      summary: 'Satisfied entry removed.',
      life: 3000,
    });
  } catch (error) {
    // Satisfied entries are subscription-owned too — subscribing creates them from
    // `items[].satisfiedResponsibilityUuids` — so this endpoint 409s on the same condition
    // as the inherited one. Without this branch the generic handler toasts `errors.body`,
    // which for a 409 is a bare offering name: a red toast reading only "the Meridian
    // Platform Baseline offering", and the row survives with no stated reason.
    const errorResponse = error as AxiosError<ErrorResponse<ErrorBody>>;
    if (errorResponse.response?.status === 409) {
      const offering =
        errorResponse.response.data?.errors?.body ||
        'an upstream export offering';
      toast.add({
        severity: 'warn',
        summary: 'Owned by a subscription',
        detail: `This satisfied entry came from your subscription to ${offering}. Unsubscribe from the offering to remove it.`,
        life: 8000,
      });
      return;
    }
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: errorMessage(error, 'Failed to remove satisfied entry.'),
      life: 5000,
    });
  } finally {
    // `finally`, not a tail assignment: the 409 branch above returns early.
    removingUuid.value = null;
  }
}
</script>
