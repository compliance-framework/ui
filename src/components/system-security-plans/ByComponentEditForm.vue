<template>
  <div class="px-12 py-8">
    <!-- Legacy, requirement-anchored by-component: read-only. Shared responsibility is
         authored per statement, so there is nothing to edit here — only something to read
         and, from the caller, delete. -->
    <div v-if="!statementId" class="space-y-6">
      <Message severity="warn">
        This is a legacy, requirement-level component implementation. Shared
        responsibility is tracked per statement, so this row is read-only — move
        its export to a statement's by-component to keep authoring it.
      </Message>

      <div>
        <label class="inline-block pb-2 dark:text-slate-300">
          Component UUID
        </label>
        <div
          class="p-3 bg-gray-50 dark:bg-slate-800 border border-ccf-300 dark:border-slate-700 rounded-md"
        >
          <span class="text-gray-600 dark:text-slate-400 font-mono">
            {{ props.byComponent.componentUuid }}
          </span>
        </div>
      </div>

      <div>
        <label class="inline-block pb-2 dark:text-slate-300">Description</label>
        <p
          class="text-sm text-gray-700 dark:text-slate-300 whitespace-pre-wrap"
        >
          {{ props.byComponent.description || '(no description)' }}
        </p>
      </div>

      <div v-if="props.byComponent.implementationStatus?.state">
        <label class="inline-block pb-2 dark:text-slate-300">
          Implementation Status
        </label>
        <p class="text-sm text-gray-700 dark:text-slate-300">
          {{ props.byComponent.implementationStatus.state }}
        </p>
      </div>

      <SharedResponsibilityBlocks :by-component="props.byComponent" />

      <div class="flex justify-end">
        <SecondaryButton type="button" @click="$emit('cancel')">
          Close
        </SecondaryButton>
      </div>
    </div>

    <form v-else @submit.prevent="updateByComponent()">
      <!-- Component UUID (Read-only) -->
      <div class="mb-4">
        <label class="inline-block pb-2 dark:text-slate-300"
          >Component UUID</label
        >
        <div
          class="p-3 bg-gray-50 dark:bg-slate-800 border border-ccf-300 dark:border-slate-700 rounded-md"
        >
          <span class="text-gray-600 dark:text-slate-400 font-mono">{{
            byComponentData.componentUuid
          }}</span>
        </div>
      </div>

      <!-- UUID (Read-only) -->
      <div class="mb-4">
        <label class="inline-block pb-2 dark:text-slate-300">UUID</label>
        <div
          class="p-3 bg-gray-50 dark:bg-slate-800 border border-ccf-300 dark:border-slate-700 rounded-md"
        >
          <span class="text-gray-600 dark:text-slate-400 font-mono">{{
            byComponentData.uuid
          }}</span>
        </div>
      </div>

      <!-- Description -->
      <div class="mb-4">
        <label class="inline-block pb-2 dark:text-slate-300"
          >Description <span class="text-red-500">*</span></label
        >
        <Textarea
          v-model="byComponentData.description"
          required
          rows="4"
          class="w-full"
        />
      </div>

      <!-- Implementation Status -->
      <div class="mb-6">
        <label class="inline-block pb-2 dark:text-slate-300"
          >Implementation Status</label
        >
        <div
          class="p-4 border border-ccf-300 dark:border-slate-700 rounded-md bg-gray-50 dark:bg-slate-800"
        >
          <div class="mb-3">
            <label class="inline-block pb-1 text-sm dark:text-slate-300"
              >State</label
            >
            <select
              v-model="byComponentData.implementationStatus!.state"
              class="w-full p-2 border border-ccf-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 dark:text-slate-300"
            >
              <option value="">Select status</option>
              <option value="implemented">Implemented</option>
              <option value="partial">Partial</option>
              <option value="planned">Planned</option>
              <option value="alternative">Alternative</option>
              <option value="not-applicable">Not Applicable</option>
            </select>
          </div>

          <div>
            <label class="inline-block pb-1 text-sm dark:text-slate-300"
              >Remarks</label
            >
            <Textarea
              v-model="byComponentData.implementationStatus!.remarks"
              rows="2"
              class="w-full"
            />
          </div>
        </div>
      </div>

      <!-- Export -->
      <div class="mb-6">
        <label class="inline-block pb-2 dark:text-slate-300">Export</label>
        <div
          class="p-4 border border-ccf-300 dark:border-slate-700 rounded-md bg-gray-50 dark:bg-slate-800"
        >
          <ByComponentExportEditor
            :ssp-id="props.sspId"
            :req-id="props.requirement.uuid"
            :stmt-id="statementId"
            :by-component-id="props.byComponent.uuid"
            v-model="byComponentData.export"
          />
        </div>
      </div>

      <!-- Inherited -->
      <div class="mb-6">
        <div
          class="p-4 border border-ccf-300 dark:border-slate-700 rounded-md bg-gray-50 dark:bg-slate-800"
        >
          <ByComponentInheritedEditor
            :ssp-id="props.sspId"
            :req-id="props.requirement.uuid"
            :stmt-id="statementId"
            :by-component-id="props.byComponent.uuid"
            v-model="byComponentData.inherited"
          />
        </div>
      </div>

      <!-- Satisfied -->
      <div class="mb-6">
        <div
          class="p-4 border border-ccf-300 dark:border-slate-700 rounded-md bg-gray-50 dark:bg-slate-800"
        >
          <ByComponentSatisfiedEditor
            :ssp-id="props.sspId"
            :req-id="props.requirement.uuid"
            :stmt-id="statementId"
            :by-component-id="props.byComponent.uuid"
            :responsibility-options="satisfiableResponsibilities"
            :responsibility-labels="knownResponsibilities"
            :responsibility-options-failed="satisfiableLoadFailed"
            v-model="byComponentData.satisfied"
          />
        </div>
      </div>

      <!-- Set Parameters -->
      <div class="mb-6">
        <label class="inline-block pb-2 dark:text-slate-300"
          >Set Parameters</label
        >
        <div class="space-y-2">
          <div
            v-for="(param, index) in byComponentData.setParameters"
            :key="index"
            class="p-3 border border-ccf-300 dark:border-slate-700 rounded-md bg-gray-50 dark:bg-slate-800"
          >
            <div class="flex justify-between items-start mb-2">
              <h4 class="text-sm font-medium dark:text-slate-300">
                Parameter {{ index + 1 }}
              </h4>
              <button
                type="button"
                @click="removeParameter(index)"
                class="text-red-500 hover:text-red-700 text-sm"
              >
                Remove
              </button>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label class="inline-block pb-1 text-sm dark:text-slate-300"
                  >Parameter ID</label
                >
                <InputText
                  v-model="param.paramId"
                  placeholder="e.g., ac-1_prm_1"
                  class="w-full"
                />
              </div>
              <div>
                <label class="inline-block pb-1 text-sm dark:text-slate-300"
                  >Value</label
                >
                <InputText
                  v-model="param.values[0]"
                  placeholder="Parameter value"
                  class="w-full"
                />
              </div>
            </div>
          </div>
          <button
            type="button"
            @click="addParameter"
            class="text-sm px-3 py-1 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors"
          >
            Add Parameter
          </button>
        </div>
      </div>

      <!-- Responsible Roles -->
      <div class="mb-6">
        <label class="inline-block pb-2 dark:text-slate-300"
          >Responsible Roles</label
        >
        <div class="space-y-2">
          <div
            v-for="(role, index) in byComponentData.responsibleRoles"
            :key="index"
            class="p-3 border border-ccf-300 dark:border-slate-700 rounded-md bg-gray-50 dark:bg-slate-800"
          >
            <div class="flex justify-between items-start mb-2">
              <h4 class="text-sm font-medium dark:text-slate-300">
                Role {{ index + 1 }}
              </h4>
              <button
                type="button"
                @click="removeRole(index)"
                class="text-red-500 hover:text-red-700 text-sm"
              >
                Remove
              </button>
            </div>
            <div class="mb-2">
              <label class="inline-block pb-1 text-sm dark:text-slate-300"
                >Role ID</label
              >
              <InputText
                v-model="role.roleId"
                placeholder="e.g., system-owner, maintainer"
                class="w-full"
              />
            </div>
            <div>
              <label class="inline-block pb-1 text-sm dark:text-slate-300"
                >Party UUIDs (comma-separated)</label
              >
              <InputText
                :model-value="role.partyUuids?.join(', ')"
                @update:model-value="updateRolePartyUuids(index, $event)"
                placeholder="Enter UUIDs separated by commas"
                class="w-full"
              />
            </div>
          </div>
          <button
            type="button"
            @click="addRole"
            class="text-sm px-3 py-1 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors"
          >
            Add Responsible Role
          </button>
        </div>
      </div>

      <!-- Remarks -->
      <div class="mb-6">
        <label class="inline-block pb-2 dark:text-slate-300">Remarks</label>
        <Textarea v-model="byComponentData.remarks" rows="3" class="w-full" />
      </div>

      <!-- Form Actions -->
      <div class="flex justify-end gap-4">
        <button
          type="button"
          @click="$emit('cancel')"
          class="px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 rounded-md hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          :disabled="saving || !can(RESOURCES.SSP, ACTIONS.UPDATE)"
          v-tooltip.top="{
            value: permissionTooltip(RESOURCES.SSP, ACTIONS.UPDATE),
            disabled: can(RESOURCES.SSP, ACTIONS.UPDATE),
          }"
          class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 transition-colors"
        >
          {{ saving ? 'Saving...' : 'Save By-Component' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { reactive, onMounted, ref, watch } from 'vue';
import { useToast } from 'primevue/usetoast';
import InputText from '@/volt/InputText.vue';
import Textarea from '@/volt/Textarea.vue';
import Message from '@/volt/Message.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import SharedResponsibilityBlocks from './SharedResponsibilityBlocks.vue';
import ByComponentExportEditor from './ByComponentExportEditor.vue';
import ByComponentInheritedEditor from './ByComponentInheritedEditor.vue';
import ByComponentSatisfiedEditor from './ByComponentSatisfiedEditor.vue';
import type { ByComponent, Statement, ImplementedRequirement } from '@/oscal';
import {
  useDataApi,
  useAuthenticatedInstance,
  decamelizeKeys,
} from '@/composables/axios';
import type { AxiosError } from 'axios';
import type { DataResponse, ErrorBody, ErrorResponse } from '@/stores/types';
import type { UpstreamResponsibility } from '@/types/ssp-export-offerings';
import type { LeveragedControl } from '@/types/ssp-leverage';
import { usePermissions } from '@/composables/usePermissions';
import { RESOURCES, ACTIONS } from '@/constants/permissions';

const { can, permissionTooltip } = usePermissions();

const props = defineProps<{
  sspId: string;
  requirement: ImplementedRequirement;
  statement?: Statement;
  byComponent: ByComponent;
}>();

const emit = defineEmits<{
  cancel: [];
  saved: [byComponent: ByComponent];
}>();

const toast = useToast();
const axiosInstance = useAuthenticatedInstance();

// The presence of a statement is what makes this by-component authorable: export, inherited
// and satisfied are all statement-anchored. Without one, this form is the read-only view of a
// legacy requirement-level row.
const statementId = props.statement?.uuid ?? '';

const endpoint = statementId
  ? `/api/oscal/system-security-plans/${props.sspId}/control-implementation/implemented-requirements/${props.requirement.uuid}/statements/${statementId}/by-components/${props.byComponent.uuid}`
  : `/api/oscal/system-security-plans/${props.sspId}/control-implementation/implemented-requirements/${props.requirement.uuid}/by-components/${props.byComponent.uuid}`;

const {
  data: updatedByComponent,
  execute: updateByComponentApi,
  isLoading: saving,
} = useDataApi<ByComponent>(
  endpoint,
  {
    method: 'PUT',
    transformRequest: [decamelizeKeys],
  },
  { immediate: false },
);

const byComponentData = reactive<ByComponent>({
  uuid: '',
  componentUuid: '',
  description: '',
  props: [],
  links: [],
  setParameters: [],
  responsibleRoles: [],
  remarks: '',
  implementationStatus: {
    state: '',
    remarks: '',
  },
  export: undefined,
  inherited: [],
  satisfied: [],
});

// A `satisfied` entry may only reference a responsibility carried by an export this
// statement already inherits — anything else is a 400 — so the picker's options come from the
// shared-responsibility rollup's `inherits[]`, narrowed to this statement.
const satisfiableResponsibilities = ref<UpstreamResponsibility[]>([]);
// The FULL upstream set under this statement's links, satisfied ones included. Kept apart
// from the picker's options above: `outstandingResponsibilities` excludes anything already
// satisfied, so labelling from it renders every existing row as a raw uuid.
const knownResponsibilities = ref<UpstreamResponsibility[]>([]);
// A failed rollup fetch must not read as "nothing to satisfy": that is a reassuring negative
// the author would act on. Track it so the picker can say it couldn't load instead.
const satisfiableLoadFailed = ref(false);

function normalizeId(value: string | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

async function loadSatisfiableResponsibilities() {
  if (!statementId || !props.statement) {
    satisfiableResponsibilities.value = [];
    knownResponsibilities.value = [];
    satisfiableLoadFailed.value = false;
    return;
  }
  // Statement ids, like control ids, are not reliably cased the same in an SSP as in the
  // catalog/profile the projection echoes — join case-insensitively, as everything else
  // here does. The leveraged-controls projection is the source: unlike the rollup's
  // inherits[] it carries each link's upstream responsibility uuids WITH descriptions.
  const targetControlId = normalizeId(props.requirement.controlId);
  const targetStatementId = normalizeId(props.statement.statementId);
  try {
    const response = await axiosInstance.get<DataResponse<LeveragedControl[]>>(
      `/api/oscal/system-security-plans/${props.sspId}/leveraged-controls`,
    );
    const byUuid = new Map<string, UpstreamResponsibility>();
    const knownByUuid = new Map<string, UpstreamResponsibility>();
    for (const control of response.data.data ?? []) {
      if (normalizeId(control.controlId) !== targetControlId) continue;
      if (normalizeId(control.statementId) !== targetStatementId) continue;
      for (const responsibility of control.outstandingResponsibilities ?? []) {
        byUuid.set(responsibility.responsibilityUuid, responsibility);
      }
      // `responsibilities` is absent on payloads from before the field shipped; the
      // outstanding subset is then the best text available.
      for (const responsibility of control.responsibilities ??
        control.outstandingResponsibilities ??
        []) {
        knownByUuid.set(responsibility.responsibilityUuid, responsibility);
      }
    }
    satisfiableResponsibilities.value = [...byUuid.values()];
    knownResponsibilities.value = [...knownByUuid.values()];
    satisfiableLoadFailed.value = false;
  } catch {
    // Don't block the rest of the form — the API is the authority and will reject a bad uuid
    // anyway — but say the options couldn't be loaded rather than claiming there are none.
    satisfiableResponsibilities.value = [];
    knownResponsibilities.value = [];
    satisfiableLoadFailed.value = true;
  }
}

// What may be satisfied is a function of what is inherited, so the picker's options are
// refreshed whenever the inherited list changes — adding an inherited capability is precisely
// what makes its responsibilities satisfiable. This watcher is the ONLY driver: onMounted's
// Object.assign below swaps the `inherited` reference, which trips it, so an explicit call
// there would just fetch the same rollup twice on every open.
watch(
  () => byComponentData.inherited,
  () => {
    void loadSatisfiableResponsibilities();
  },
);

onMounted(() => {
  // Deep copy the by-component data
  Object.assign(byComponentData, {
    ...props.byComponent,
    implementationStatus: props.byComponent.implementationStatus || {
      state: '',
      remarks: '',
    },
    export: props.byComponent.export
      ? {
          ...props.byComponent.export,
          provided: [...(props.byComponent.export.provided || [])],
          responsibilities: [
            ...(props.byComponent.export.responsibilities || []),
          ],
        }
      : undefined,
    inherited: [...(props.byComponent.inherited || [])],
    satisfied: [...(props.byComponent.satisfied || [])],
    setParameters: [...(props.byComponent.setParameters || [])],
    responsibleRoles: [...(props.byComponent.responsibleRoles || [])],
  });
});

// Parameter functions
const addParameter = () => {
  if (!byComponentData.setParameters) {
    byComponentData.setParameters = [];
  }
  byComponentData.setParameters.push({
    paramId: '',
    values: [''],
  });
};

const removeParameter = (index: number) => {
  byComponentData.setParameters?.splice(index, 1);
};

// Role functions
const addRole = () => {
  if (!byComponentData.responsibleRoles) {
    byComponentData.responsibleRoles = [];
  }
  byComponentData.responsibleRoles.push({
    roleId: '',
    partyUuids: [],
    props: [],
    links: [],
  });
};

const removeRole = (index: number) => {
  byComponentData.responsibleRoles?.splice(index, 1);
};

const updateRolePartyUuids = (index: number, value: string) => {
  if (
    byComponentData.responsibleRoles &&
    byComponentData.responsibleRoles[index]
  ) {
    byComponentData.responsibleRoles[index].partyUuids = value
      .split(',')
      .map((uuid) => uuid.trim())
      .filter((uuid) => uuid.length > 0);
  }
};

const updateByComponent = async () => {
  if (!byComponentData.description.trim()) {
    toast.add({
      severity: 'error',
      summary: 'Validation Error',
      detail: 'Description is required.',
      life: 3000,
    });
    return;
  }

  try {
    // Export/Provided/Responsibilities, Inherited and Satisfied are each persisted
    // independently by their own editor against dedicated endpoints, so all three subtrees
    // are omitted here to avoid the save paths racing or clobbering each other's writes. The
    // API contract matches: the by-component PUT ignores these subtrees.
    await updateByComponentApi({
      data: {
        ...byComponentData,
        export: undefined,
        inherited: undefined,
        satisfied: undefined,
      },
    });

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'By-Component updated successfully.',
      life: 3000,
    });

    // The PUT response reflects the request body, which omitted these subtrees, so restore
    // them from the locally-maintained copies (kept live by each editor's v-model) rather
    // than the response.
    emit('saved', {
      ...updatedByComponent.value!,
      export: byComponentData.export,
      inherited: byComponentData.inherited,
      satisfied: byComponentData.satisfied,
    });
  } catch (error) {
    const errorResponse = error as AxiosError<ErrorResponse<ErrorBody>>;
    const errorMessage =
      errorResponse.response?.data?.errors?.body ||
      errorResponse.message ||
      'An unexpected error occurred.';
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: errorMessage,
      life: 5000,
    });
  }
};
</script>
