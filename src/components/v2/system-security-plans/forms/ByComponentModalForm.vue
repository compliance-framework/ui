<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { uuid } from '@/utils/uuid';
import { useToast } from 'primevue/usetoast';
import DangerButton from '@/volt/DangerButton.vue';
import InputText from '@/volt/InputText.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import Textarea from '@/volt/Textarea.vue';
import type {
  ByComponent,
  ImplementedRequirement,
  Statement,
  SystemComponent,
} from '@/oscal';
import { useDataApi, decamelizeKeys } from '@/composables/axios';
import { focusFirstInvalidField } from '@/composables/v2/useV2FormValidation';
import V2FormField from '@/components/v2/forms/V2FormField.vue';
import V2EditorDrawer from '@/components/v2/patterns/V2EditorDrawer.vue';
import V2EditorFormTemplate from '@/components/v2/patterns/V2EditorFormTemplate.vue';
import SharedResponsibilityEditors from '@/components/v2/system-security-plans/forms/SharedResponsibilityEditors.vue';
import {
  cloneValue,
  resolveApiErrorMessage,
} from '@/views/system-security-plans-v2/editors/sspEditorHelpers';

const props = defineProps<{
  sspId: string;
  requirement: ImplementedRequirement;
  statement?: Statement | null;
  byComponent?: ByComponent | null;
  systemComponents?: SystemComponent[];
  preferredComponentUuid?: string;
}>();

const emit = defineEmits<{
  cancel: [];
  created: [byComponent: ByComponent];
  saved: [byComponent: ByComponent];
}>();

const toast = useToast();
const formId = `by-component-form-${uuid()}`;
const isEditMode = computed(() => Boolean(props.byComponent));

const implementationStates = [
  'implemented',
  'partial',
  'planned',
  'alternative',
  'not-applicable',
];

const componentOptions = computed(() => props.systemComponents || []);
const form = reactive<ByComponent>({
  uuid: '',
  componentUuid: '',
  description: '',
  props: [],
  links: [],
  setParameters: [],
  responsibleRoles: [],
  remarks: '',
  implementationStatus: { state: '', remarks: '' },
  export: undefined,
  inherited: [],
  satisfied: [],
});

const fieldErrors = reactive({
  componentUuid: '',
  description: '',
  server: '',
});

const {
  data: persistedByComponent,
  execute: persistByComponent,
  isLoading: saving,
} = useDataApi<ByComponent>(
  null,
  {
    method: 'POST',
    transformRequest: [decamelizeKeys],
  },
  { immediate: false },
);

const errorSummary = computed(() =>
  [
    fieldErrors.componentUuid,
    fieldErrors.description,
    fieldErrors.server,
  ].filter(Boolean),
);

watch(
  () => [props.byComponent, props.preferredComponentUuid] as const,
  ([value, preferredComponentUuid]) => {
    resetErrors();

    if (value) {
      Object.assign(form, cloneValue(value));
      form.implementationStatus = cloneValue(
        value.implementationStatus || { state: '', remarks: '' },
      );
      form.export = value.export ? cloneExport(value.export) : undefined;
      form.inherited = cloneValue(value.inherited || []);
      form.satisfied = cloneValue(value.satisfied || []);
      form.setParameters = cloneValue(value.setParameters || []);
      form.responsibleRoles = cloneValue(value.responsibleRoles || []);
      return;
    }

    resetForm();
    form.componentUuid = String(preferredComponentUuid || '').trim();
  },
  { immediate: true },
);

// The shared responsibility editors save immediately through their own
// endpoints, so closing the drawer afterwards must still report the change.
const sharedResponsibilityChanged = ref(false);
watch(
  () => [form.export, form.inherited, form.satisfied],
  () => {
    sharedResponsibilityChanged.value = true;
  },
);

function close(): void {
  if (sharedResponsibilityChanged.value && props.byComponent) {
    emit('saved', {
      ...props.byComponent,
      export: form.export,
      inherited: form.inherited,
      satisfied: form.satisfied,
    });
    return;
  }
  emit('cancel');
}

function cloneExport(value: NonNullable<ByComponent['export']>) {
  return {
    ...cloneValue(value),
    provided: cloneValue(value.provided || []),
    responsibilities: cloneValue(value.responsibilities || []),
  };
}

function resetForm(): void {
  form.uuid = uuid();
  form.componentUuid = '';
  form.description = '';
  form.props = [];
  form.links = [];
  form.setParameters = [];
  form.responsibleRoles = [];
  form.remarks = '';
  form.implementationStatus = { state: '', remarks: '' };
  form.export = undefined;
  form.inherited = [];
  form.satisfied = [];
}

function resetErrors(): void {
  fieldErrors.componentUuid = '';
  fieldErrors.description = '';
  fieldErrors.server = '';
}

function addParameter(): void {
  form.setParameters = form.setParameters || [];
  form.setParameters.push({ paramId: '', values: [''], remarks: '' });
}

function removeParameter(index: number): void {
  form.setParameters = form.setParameters || [];
  form.setParameters.splice(index, 1);
}

function setParameterValues(index: number, value: string): void {
  const parameter = form.setParameters?.[index];
  if (!parameter) {
    return;
  }

  parameter.values = value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function addRole(): void {
  form.responsibleRoles = form.responsibleRoles || [];
  form.responsibleRoles.push({
    roleId: '',
    partyUuids: [],
    props: [],
    links: [],
  });
}

function removeRole(index: number): void {
  form.responsibleRoles = form.responsibleRoles || [];
  form.responsibleRoles.splice(index, 1);
}

function setRolePartyUuids(index: number, value: string): void {
  const role = form.responsibleRoles?.[index];
  if (!role) {
    return;
  }

  role.partyUuids = value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function validate(): boolean {
  resetErrors();

  if (!form.componentUuid.trim()) {
    fieldErrors.componentUuid = 'Component is required.';
  }
  if (!form.description.trim()) {
    fieldErrors.description = 'Description is required.';
  }

  const valid = !fieldErrors.componentUuid && !fieldErrors.description;
  if (!valid) {
    focusFirstInvalidField(document.getElementById(formId) || document);
  }

  return valid;
}

async function submit(): Promise<void> {
  if (!validate()) {
    return;
  }

  // Statement-only, as on main: the API has no requirement-level by-component
  // create, and legacy requirement-level rows are read-only plus delete in the
  // parent views (backlog M1-14).
  if (!props.statement) {
    fieldErrors.server =
      'Component implementations are recorded per statement. Select a statement first.';
    return;
  }
  const baseUrl = `/api/oscal/system-security-plans/${props.sspId}/control-implementation/implemented-requirements/${props.requirement.uuid}/statements/${props.statement.uuid}/by-components`;

  const url = isEditMode.value ? `${baseUrl}/${form.uuid}` : baseUrl;
  const method = isEditMode.value ? 'PUT' : 'POST';

  // Only the fields the API writes. Export/inherited/satisfied save through
  // their own endpoints (SharedResponsibilityEditors): the PUT ignores them and
  // the POST would bypass the leverage bookkeeping. The PUT also ignores
  // responsible roles, so they are only sent on create (backlog M0-01).
  const data: Partial<ByComponent> = {
    uuid: form.uuid,
    componentUuid: form.componentUuid,
    description: form.description,
    props: form.props,
    links: form.links,
    setParameters: form.setParameters,
    remarks: form.remarks,
    implementationStatus: form.implementationStatus,
    ...(isEditMode.value ? {} : { responsibleRoles: form.responsibleRoles }),
  };

  try {
    await persistByComponent(url, { method, data });

    // The PUT response echoes the body, so restore what it didn't carry.
    const result: ByComponent = isEditMode.value
      ? {
          ...persistedByComponent.value!,
          export: form.export,
          inherited: form.inherited,
          satisfied: form.satisfied,
          responsibleRoles: props.byComponent?.responsibleRoles,
        }
      : persistedByComponent.value!;
    toast.add({
      severity: 'success',
      summary: isEditMode.value ? 'Component Saved' : 'Component Created',
      detail: isEditMode.value
        ? 'By-component implementation updated successfully.'
        : 'By-component implementation created successfully.',
      life: 2500,
    });

    if (isEditMode.value) {
      emit('saved', result);
      return;
    }

    emit('created', result);
  } catch (error) {
    fieldErrors.server = resolveApiErrorMessage(
      error,
      isEditMode.value
        ? 'Unable to update by-component implementation.'
        : 'Unable to create by-component implementation.',
    );
  }
}
</script>

<template>
  <V2EditorDrawer
    :title="
      isEditMode
        ? 'EDIT BY-COMPONENT IMPLEMENTATION'
        : 'CREATE BY-COMPONENT IMPLEMENTATION'
    "
    description="Map requirement behavior to a specific component and describe how the implementation is delivered."
    :submit-mode="isEditMode ? 'save' : 'create'"
    :submitting="saving"
    :form-id="formId"
    width-class="w-screen! sm:w-[94vw]! lg:w-[980px]!"
    @close="close"
  >
    <form :id="formId" class="space-y-5" @submit.prevent="submit">
      <V2EditorFormTemplate :error-summary="errorSummary">
        <div class="grid gap-4 md:grid-cols-2">
          <V2FormField label="UUID" input-id="by-component-uuid">
            <template #default="fieldProps">
              <InputText
                :model-value="form.uuid"
                :id="fieldProps.inputId"
                readonly
                fluid
              />
            </template>
          </V2FormField>

          <V2FormField
            label="COMPONENT"
            input-id="by-component-component-uuid"
            required
            :error="fieldErrors.componentUuid"
          >
            <template #default="fieldProps">
              <select
                v-if="componentOptions.length"
                :id="fieldProps.inputId"
                v-model="form.componentUuid"
                :aria-describedby="fieldProps.describedBy"
                :aria-invalid="fieldProps.invalid"
                class="ui-v2-body h-10 w-full border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] px-3 text-[var(--ui-v2-foreground)]"
              >
                <option value="">Select component</option>
                <option
                  v-for="component in componentOptions"
                  :key="component.uuid"
                  :value="component.uuid"
                >
                  {{ component.title || component.uuid }}
                </option>
              </select>
              <InputText
                v-else
                v-model="form.componentUuid"
                :id="fieldProps.inputId"
                :aria-describedby="fieldProps.describedBy"
                :aria-invalid="fieldProps.invalid"
                fluid
              />
            </template>
          </V2FormField>
        </div>

        <V2FormField
          label="DESCRIPTION"
          input-id="by-component-description"
          required
          :error="fieldErrors.description"
        >
          <template #default="fieldProps">
            <Textarea
              v-model="form.description"
              :id="fieldProps.inputId"
              :aria-describedby="fieldProps.describedBy"
              :aria-invalid="fieldProps.invalid"
              rows="4"
              fluid
            />
          </template>
        </V2FormField>

        <div class="grid gap-4 md:grid-cols-2">
          <V2FormField
            label="IMPLEMENTATION STATE"
            input-id="by-component-state"
          >
            <template #default="fieldProps">
              <select
                :id="fieldProps.inputId"
                v-model="form.implementationStatus!.state"
                class="ui-v2-body h-10 w-full border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] px-3 text-[var(--ui-v2-foreground)]"
              >
                <option value="">Select state</option>
                <option
                  v-for="state in implementationStates"
                  :key="state"
                  :value="state"
                >
                  {{ state }}
                </option>
              </select>
            </template>
          </V2FormField>

          <V2FormField
            label="STATUS REMARKS"
            input-id="by-component-status-remarks"
          >
            <template #default="fieldProps">
              <Textarea
                v-model="form.implementationStatus!.remarks"
                :id="fieldProps.inputId"
                rows="3"
                fluid
              />
            </template>
          </V2FormField>
        </div>

        <V2FormField label="REMARKS" input-id="by-component-remarks">
          <template #default="fieldProps">
            <Textarea
              v-model="form.remarks"
              :id="fieldProps.inputId"
              rows="3"
              fluid
            />
          </template>
        </V2FormField>

        <section class="space-y-3">
          <p class="ui-v2-label text-[var(--ui-v2-secondary-foreground)]">
            SHARED RESPONSIBILITY
          </p>
          <SharedResponsibilityEditors
            v-if="isEditMode && statement"
            v-model:export="form.export"
            v-model:inherited="form.inherited"
            v-model:satisfied="form.satisfied"
            :ssp-id="sspId"
            :requirement="requirement"
            :statement="statement"
            :by-component-id="form.uuid"
          />
          <p v-else class="ui-v2-body text-[var(--ui-v2-muted-foreground)]">
            Create this component implementation first, then edit it to add
            exports, inherited capabilities and satisfied responsibilities.
          </p>
        </section>

        <section class="space-y-3">
          <div class="flex items-center justify-between gap-3">
            <p class="ui-v2-label text-[var(--ui-v2-secondary-foreground)]">
              SET PARAMETERS
            </p>
            <SecondaryButton type="button" size="small" @click="addParameter"
              >ADD PARAMETER</SecondaryButton
            >
          </div>

          <div v-if="form.setParameters?.length" class="space-y-3">
            <article
              v-for="(parameter, index) in form.setParameters"
              :key="`parameter-${index}`"
              class="space-y-3 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-background)] p-3"
            >
              <div class="flex justify-end">
                <DangerButton
                  type="button"
                  size="small"
                  @click="removeParameter(index)"
                  >REMOVE</DangerButton
                >
              </div>
              <div class="grid gap-3 md:grid-cols-2">
                <V2FormField
                  :input-id="`by-component-param-id-${index}`"
                  label="Parameter ID"
                  ><template #default="fieldProps"
                    ><InputText
                      v-model="parameter.paramId"
                      :id="fieldProps.inputId"
                      fluid /></template
                ></V2FormField>
                <V2FormField
                  :input-id="`by-component-param-values-${index}`"
                  label="Values (comma separated)"
                  ><template #default="fieldProps"
                    ><InputText
                      :model-value="(parameter.values || []).join(', ')"
                      :id="fieldProps.inputId"
                      fluid
                      @update:model-value="
                        setParameterValues(index, $event)
                      " /></template
                ></V2FormField>
              </div>
              <V2FormField
                :input-id="`by-component-param-remarks-${index}`"
                label="Remarks"
                ><template #default="fieldProps"
                  ><Textarea
                    v-model="parameter.remarks"
                    :id="fieldProps.inputId"
                    rows="3"
                    fluid /></template
              ></V2FormField>
            </article>
          </div>
        </section>

        <section class="space-y-3">
          <div class="flex items-center justify-between gap-3">
            <p class="ui-v2-label text-[var(--ui-v2-secondary-foreground)]">
              RESPONSIBLE ROLES
            </p>
            <SecondaryButton
              v-if="!isEditMode"
              type="button"
              size="small"
              @click="addRole"
              >ADD ROLE</SecondaryButton
            >
          </div>

          <!-- The by-component PUT does not write responsible roles, so edits to
               an existing row would be silently dropped (backlog M0-01). -->
          <template v-if="isEditMode">
            <p class="ui-v2-body text-[var(--ui-v2-muted-foreground)]">
              Responsible roles can only be set when the component
              implementation is created.
            </p>
            <ul
              v-if="form.responsibleRoles?.length"
              class="ui-v2-body space-y-1 text-[var(--ui-v2-foreground)]"
            >
              <li
                v-for="(role, index) in form.responsibleRoles"
                :key="`role-readonly-${index}`"
              >
                {{ role.roleId
                }}<template v-if="role.partyUuids?.length">
                  · {{ role.partyUuids.join(', ') }}</template
                >
              </li>
            </ul>
          </template>
          <div v-else-if="form.responsibleRoles?.length" class="space-y-3">
            <article
              v-for="(role, index) in form.responsibleRoles"
              :key="`role-${index}`"
              class="space-y-3 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-background)] p-3"
            >
              <div class="flex justify-end">
                <DangerButton
                  type="button"
                  size="small"
                  @click="removeRole(index)"
                  >REMOVE</DangerButton
                >
              </div>
              <div class="grid gap-3 md:grid-cols-2">
                <V2FormField
                  :input-id="`by-component-role-id-${index}`"
                  label="Role ID"
                  ><template #default="fieldProps"
                    ><InputText
                      v-model="role.roleId"
                      :id="fieldProps.inputId"
                      fluid /></template
                ></V2FormField>
                <V2FormField
                  :input-id="`by-component-role-party-uuids-${index}`"
                  label="Party UUIDs (comma separated)"
                  ><template #default="fieldProps"
                    ><InputText
                      :model-value="(role.partyUuids || []).join(', ')"
                      :id="fieldProps.inputId"
                      fluid
                      @update:model-value="
                        setRolePartyUuids(index, $event)
                      " /></template
                ></V2FormField>
              </div>
            </article>
          </div>
        </section>
      </V2EditorFormTemplate>
    </form>
  </V2EditorDrawer>
</template>
