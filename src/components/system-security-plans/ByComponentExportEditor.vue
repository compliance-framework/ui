<template>
  <div class="space-y-6">
    <!-- Provided -->
    <div>
      <div class="flex items-center justify-between mb-2">
        <h4 class="text-sm font-medium dark:text-slate-300">Provided</h4>
        <PermissionGate :resource="RESOURCES.SSP" :action="ACTIONS.UPDATE">
          <SecondaryButton
            v-if="!draftProvided"
            type="button"
            size="small"
            @click="startAddProvided"
          >
            Add Provided
          </SecondaryButton>
        </PermissionGate>
      </div>

      <div
        v-if="!providedEntries.length && !draftProvided"
        class="text-sm text-gray-500 dark:text-slate-400 py-2"
      >
        No provided entries yet.
      </div>

      <div class="space-y-2">
        <div
          v-for="entry in providedEntries"
          :key="entry.uuid"
          class="p-3 border border-ccf-200 dark:border-slate-600 rounded bg-white dark:bg-slate-900"
        >
          <template
            v-if="editingProvidedUuid === entry.uuid && editProvidedBuffer"
          >
            <ByComponentExportEntryFields
              v-model:description="editProvidedBuffer.description"
              v-model:responsible-roles="editProvidedBuffer.responsibleRoles"
              description-placeholder="Description of what is provided"
            />
            <div class="flex justify-end gap-2 mt-2">
              <SecondaryButton
                type="button"
                size="small"
                @click="cancelEditProvided"
              >
                Cancel
              </SecondaryButton>
              <PrimaryButton
                type="button"
                size="small"
                :disabled="savingProvidedUuid === entry.uuid"
                @click="saveEditProvided(entry)"
              >
                Save
              </PrimaryButton>
            </div>
          </template>
          <template v-else>
            <div class="flex justify-between items-start mb-1">
              <p class="text-sm dark:text-slate-300 whitespace-pre-wrap">
                {{ entry.description || '(no description)' }}
              </p>
              <PermissionGate
                :resource="RESOURCES.SSP"
                :action="ACTIONS.UPDATE"
              >
                <div class="flex gap-2 shrink-0 ml-2">
                  <button
                    type="button"
                    class="text-blue-500 hover:text-blue-700 text-sm"
                    @click="startEditProvided(entry)"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    class="text-red-500 hover:text-red-700 text-sm"
                    @click="removeProvided(entry)"
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
              Roles:
              {{ entry.responsibleRoles.map((r) => r.roleId).join(', ') }}
            </div>
          </template>
        </div>

        <div
          v-if="draftProvided"
          class="p-3 border border-ccf-200 dark:border-slate-600 rounded bg-white dark:bg-slate-900"
        >
          <ByComponentExportEntryFields
            v-model:description="draftProvided.description"
            v-model:responsible-roles="draftProvided.responsibleRoles"
            description-placeholder="Description of what is provided"
          />
          <div class="flex justify-end gap-2 mt-2">
            <SecondaryButton
              type="button"
              size="small"
              @click="cancelAddProvided"
            >
              Cancel
            </SecondaryButton>
            <PrimaryButton
              type="button"
              size="small"
              :disabled="savingNewProvided"
              @click="saveNewProvided"
            >
              Save
            </PrimaryButton>
          </div>
        </div>
      </div>
    </div>

    <!-- Responsibilities -->
    <div>
      <div class="flex items-center justify-between mb-2">
        <h4 class="text-sm font-medium dark:text-slate-300">
          Responsibilities
        </h4>
        <PermissionGate :resource="RESOURCES.SSP" :action="ACTIONS.UPDATE">
          <SecondaryButton
            v-if="!draftResponsibility"
            type="button"
            size="small"
            @click="startAddResponsibility"
          >
            Add Responsibility
          </SecondaryButton>
        </PermissionGate>
      </div>

      <div
        v-if="!responsibilityEntries.length && !draftResponsibility"
        class="text-sm text-gray-500 dark:text-slate-400 py-2"
      >
        No responsibility entries yet.
      </div>

      <div class="space-y-2">
        <div
          v-for="entry in responsibilityEntries"
          :key="entry.uuid"
          class="p-3 border border-ccf-200 dark:border-slate-600 rounded bg-white dark:bg-slate-900"
        >
          <template
            v-if="
              editingResponsibilityUuid === entry.uuid &&
              editResponsibilityBuffer
            "
          >
            <div class="mb-2">
              <Label :for="`provided-select-${entry.uuid}`" required>
                Provided
              </Label>
              <Select
                :id="`provided-select-${entry.uuid}`"
                v-model="editResponsibilityBuffer.providedUuid"
                :options="providedEntries"
                option-label="description"
                option-value="uuid"
                placeholder="Select a provided entry"
                class="w-full"
                @update:model-value="editResponsibilityError = ''"
              />
              <Message
                v-if="editResponsibilityError"
                severity="error"
                class="mt-1"
              >
                {{ editResponsibilityError }}
              </Message>
            </div>
            <ByComponentExportEntryFields
              v-model:description="editResponsibilityBuffer.description"
              v-model:responsible-roles="
                editResponsibilityBuffer.responsibleRoles
              "
              description-placeholder="Description of responsibility"
            />
            <div class="flex justify-end gap-2 mt-2">
              <SecondaryButton
                type="button"
                size="small"
                @click="cancelEditResponsibility"
              >
                Cancel
              </SecondaryButton>
              <PrimaryButton
                type="button"
                size="small"
                :disabled="savingResponsibilityUuid === entry.uuid"
                @click="saveEditResponsibility(entry)"
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
                  Provided: {{ providedDescription(entry.providedUuid) }}
                </div>
              </div>
              <PermissionGate
                :resource="RESOURCES.SSP"
                :action="ACTIONS.UPDATE"
              >
                <div class="flex gap-2 shrink-0 ml-2">
                  <button
                    type="button"
                    class="text-blue-500 hover:text-blue-700 text-sm"
                    @click="startEditResponsibility(entry)"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    class="text-red-500 hover:text-red-700 text-sm"
                    @click="removeResponsibility(entry)"
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
              Roles:
              {{ entry.responsibleRoles.map((r) => r.roleId).join(', ') }}
            </div>
          </template>
        </div>

        <div
          v-if="draftResponsibility"
          class="p-3 border border-ccf-200 dark:border-slate-600 rounded bg-white dark:bg-slate-900"
        >
          <div class="mb-2">
            <Label for="new-responsibility-provided" required>Provided</Label>
            <Select
              id="new-responsibility-provided"
              v-model="draftResponsibility.providedUuid"
              :options="providedEntries"
              option-label="description"
              option-value="uuid"
              placeholder="Select a provided entry"
              class="w-full"
              @update:model-value="newResponsibilityError = ''"
            />
            <Message
              v-if="newResponsibilityError"
              severity="error"
              class="mt-1"
            >
              {{ newResponsibilityError }}
            </Message>
          </div>
          <ByComponentExportEntryFields
            v-model:description="draftResponsibility.description"
            v-model:responsible-roles="draftResponsibility.responsibleRoles"
            description-placeholder="Description of responsibility"
          />
          <div class="flex justify-end gap-2 mt-2">
            <SecondaryButton
              type="button"
              size="small"
              @click="cancelAddResponsibility"
            >
              Cancel
            </SecondaryButton>
            <PrimaryButton
              type="button"
              size="small"
              :disabled="savingNewResponsibility"
              @click="saveNewResponsibility"
            >
              Save
            </PrimaryButton>
          </div>
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
import { uuid } from '@/utils/uuid';
import type {
  ByComponentExport,
  ByComponentExportProvided,
  ByComponentExportResponsibility,
  ResponsibleRole,
} from '@/oscal';
import type { DataResponse, ErrorBody, ErrorResponse } from '@/stores/types';

const props = defineProps<{
  sspId: string;
  reqId: string;
  stmtId?: string;
  byComponentId: string;
  modelValue: ByComponentExport | undefined;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: ByComponentExport | undefined];
}>();

const toast = useToast();
const axiosInstance = useAuthenticatedInstance();
const requestConfig = { transformRequest: [decamelizeKeys] };

const localExport = ref<ByComponentExport | undefined>(
  props.modelValue ? cloneExport(props.modelValue) : undefined,
);

watch(
  () => props.modelValue,
  (value) => {
    localExport.value = value ? cloneExport(value) : undefined;
  },
);

type WithRoles<T> = T & { responsibleRoles: ResponsibleRole[] };

function withRoles<T extends { responsibleRoles?: ResponsibleRole[] }>(
  entry: T,
): WithRoles<T> {
  return { ...entry, responsibleRoles: entry.responsibleRoles ?? [] };
}

function cloneExport(value: ByComponentExport): ByComponentExport {
  const cloned = JSON.parse(JSON.stringify(value)) as ByComponentExport;
  cloned.provided = (cloned.provided ?? []).map(withRoles);
  cloned.responsibilities = (cloned.responsibilities ?? []).map(withRoles);
  return cloned;
}

const providedEntries = computed(() => localExport.value?.provided ?? []);
const responsibilityEntries = computed(
  () => localExport.value?.responsibilities ?? [],
);

function providedDescription(providedUuid: string | undefined): string {
  if (!providedUuid) return '(none)';
  const match = providedEntries.value.find((p) => p.uuid === providedUuid);
  return match?.description || providedUuid;
}

const baseUrl = computed(() => {
  const base = props.stmtId
    ? `/api/oscal/system-security-plans/${props.sspId}/control-implementation/implemented-requirements/${props.reqId}/statements/${props.stmtId}/by-components/${props.byComponentId}`
    : `/api/oscal/system-security-plans/${props.sspId}/control-implementation/implemented-requirements/${props.reqId}/by-components/${props.byComponentId}`;
  return `${base}/export`;
});
const providedUrl = computed(() => `${baseUrl.value}/provided`);
const responsibilitiesUrl = computed(() => `${baseUrl.value}/responsibilities`);

function errorMessage(error: unknown, fallback: string): string {
  const errorResponse = error as AxiosError<ErrorResponse<ErrorBody>>;
  return (
    errorResponse.response?.data?.errors?.body ||
    errorResponse.message ||
    fallback
  );
}

// The dedicated Provided/Responsibility endpoints 404 until an Export row exists, so the
// first add of either must create the Export first.
async function ensureExport(): Promise<void> {
  if (localExport.value) return;
  const response = await axiosInstance.post<DataResponse<ByComponentExport>>(
    baseUrl.value,
    { description: '', remarks: '' },
    requestConfig,
  );
  localExport.value = {
    ...response.data.data,
    provided: response.data.data.provided ?? [],
    responsibilities: response.data.data.responsibilities ?? [],
  };
  emit('update:modelValue', localExport.value);
}

// ---- Provided ----

const draftProvided = ref<WithRoles<ByComponentExportProvided> | null>(null);
const savingNewProvided = ref(false);
const editingProvidedUuid = ref<string | null>(null);
const editProvidedBuffer = ref<WithRoles<ByComponentExportProvided> | null>(
  null,
);
const savingProvidedUuid = ref<string | null>(null);

function startAddProvided() {
  draftProvided.value = {
    uuid: uuid(),
    description: '',
    responsibleRoles: [],
  };
}

function cancelAddProvided() {
  draftProvided.value = null;
}

async function saveNewProvided() {
  if (!draftProvided.value) return;
  savingNewProvided.value = true;
  try {
    await ensureExport();
    const response = await axiosInstance.post<
      DataResponse<ByComponentExportProvided>
    >(providedUrl.value, draftProvided.value, requestConfig);
    localExport.value!.provided = [
      ...(localExport.value!.provided ?? []),
      withRoles(response.data.data),
    ];
    emit('update:modelValue', localExport.value);
    draftProvided.value = null;
    toast.add({
      severity: 'success',
      summary: 'Provided entry added.',
      life: 3000,
    });
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: errorMessage(error, 'Failed to add provided entry.'),
      life: 5000,
    });
  } finally {
    savingNewProvided.value = false;
  }
}

function startEditProvided(entry: ByComponentExportProvided) {
  editingProvidedUuid.value = entry.uuid;
  editProvidedBuffer.value = withRoles(
    JSON.parse(JSON.stringify(entry)) as ByComponentExportProvided,
  );
}

function cancelEditProvided() {
  editingProvidedUuid.value = null;
  editProvidedBuffer.value = null;
}

async function saveEditProvided(entry: ByComponentExportProvided) {
  if (!editProvidedBuffer.value) return;
  savingProvidedUuid.value = entry.uuid;
  try {
    const response = await axiosInstance.put<
      DataResponse<ByComponentExportProvided>
    >(
      `${providedUrl.value}/${entry.uuid}`,
      editProvidedBuffer.value,
      requestConfig,
    );
    const index = (localExport.value!.provided ?? []).findIndex(
      (p) => p.uuid === entry.uuid,
    );
    if (index !== -1) {
      localExport.value!.provided![index] = withRoles(response.data.data);
    }
    emit('update:modelValue', localExport.value);
    cancelEditProvided();
    toast.add({
      severity: 'success',
      summary: 'Provided entry updated.',
      life: 3000,
    });
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: errorMessage(error, 'Failed to update provided entry.'),
      life: 5000,
    });
  } finally {
    savingProvidedUuid.value = null;
  }
}

async function removeProvided(entry: ByComponentExportProvided) {
  try {
    await axiosInstance.delete(`${providedUrl.value}/${entry.uuid}`);
    localExport.value!.provided = (localExport.value!.provided ?? []).filter(
      (p) => p.uuid !== entry.uuid,
    );
    emit('update:modelValue', localExport.value);
    toast.add({
      severity: 'success',
      summary: 'Provided entry removed.',
      life: 3000,
    });
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: errorMessage(error, 'Failed to remove provided entry.'),
      life: 5000,
    });
  }
}

// ---- Responsibilities ----

const draftResponsibility =
  ref<WithRoles<ByComponentExportResponsibility> | null>(null);
const newResponsibilityError = ref('');
const savingNewResponsibility = ref(false);
const editingResponsibilityUuid = ref<string | null>(null);
const editResponsibilityBuffer =
  ref<WithRoles<ByComponentExportResponsibility> | null>(null);
const editResponsibilityError = ref('');
const savingResponsibilityUuid = ref<string | null>(null);

function startAddResponsibility() {
  draftResponsibility.value = {
    uuid: uuid(),
    description: '',
    providedUuid: '',
    responsibleRoles: [],
  };
  newResponsibilityError.value = '';
}

function cancelAddResponsibility() {
  draftResponsibility.value = null;
  newResponsibilityError.value = '';
}

async function saveNewResponsibility() {
  if (!draftResponsibility.value) return;
  if (!draftResponsibility.value.providedUuid) {
    newResponsibilityError.value =
      'Select a provided entry before saving this responsibility.';
    return;
  }
  savingNewResponsibility.value = true;
  try {
    await ensureExport();
    const response = await axiosInstance.post<
      DataResponse<ByComponentExportResponsibility>
    >(responsibilitiesUrl.value, draftResponsibility.value, requestConfig);
    localExport.value!.responsibilities = [
      ...(localExport.value!.responsibilities ?? []),
      withRoles(response.data.data),
    ];
    emit('update:modelValue', localExport.value);
    draftResponsibility.value = null;
    toast.add({
      severity: 'success',
      summary: 'Responsibility entry added.',
      life: 3000,
    });
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: errorMessage(error, 'Failed to add responsibility entry.'),
      life: 5000,
    });
  } finally {
    savingNewResponsibility.value = false;
  }
}

function startEditResponsibility(entry: ByComponentExportResponsibility) {
  editingResponsibilityUuid.value = entry.uuid;
  editResponsibilityBuffer.value = withRoles(
    JSON.parse(JSON.stringify(entry)) as ByComponentExportResponsibility,
  );
  editResponsibilityError.value = '';
}

function cancelEditResponsibility() {
  editingResponsibilityUuid.value = null;
  editResponsibilityBuffer.value = null;
  editResponsibilityError.value = '';
}

async function saveEditResponsibility(entry: ByComponentExportResponsibility) {
  if (!editResponsibilityBuffer.value) return;
  if (!editResponsibilityBuffer.value.providedUuid) {
    editResponsibilityError.value =
      'Select a provided entry before saving this responsibility.';
    return;
  }
  savingResponsibilityUuid.value = entry.uuid;
  try {
    const response = await axiosInstance.put<
      DataResponse<ByComponentExportResponsibility>
    >(
      `${responsibilitiesUrl.value}/${entry.uuid}`,
      editResponsibilityBuffer.value,
      requestConfig,
    );
    const index = (localExport.value!.responsibilities ?? []).findIndex(
      (r) => r.uuid === entry.uuid,
    );
    if (index !== -1) {
      localExport.value!.responsibilities![index] = withRoles(
        response.data.data,
      );
    }
    emit('update:modelValue', localExport.value);
    cancelEditResponsibility();
    toast.add({
      severity: 'success',
      summary: 'Responsibility entry updated.',
      life: 3000,
    });
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: errorMessage(error, 'Failed to update responsibility entry.'),
      life: 5000,
    });
  } finally {
    savingResponsibilityUuid.value = null;
  }
}

async function removeResponsibility(entry: ByComponentExportResponsibility) {
  try {
    await axiosInstance.delete(`${responsibilitiesUrl.value}/${entry.uuid}`);
    localExport.value!.responsibilities = (
      localExport.value!.responsibilities ?? []
    ).filter((r) => r.uuid !== entry.uuid);
    emit('update:modelValue', localExport.value);
    toast.add({
      severity: 'success',
      summary: 'Responsibility entry removed.',
      life: 3000,
    });
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: errorMessage(error, 'Failed to remove responsibility entry.'),
      life: 5000,
    });
  }
}
</script>
