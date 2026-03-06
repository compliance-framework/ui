<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import InputText from '@/volt/InputText.vue';
import Textarea from '@/volt/Textarea.vue';
import type { SystemUser } from '@/oscal';
import { useDataApi, decamelizeKeys } from '@/composables/axios';
import { toErrorSummaryItems } from '@/composables/v2/useV2FormValidation';
import V2FormField from '@/components/v2/forms/V2FormField.vue';
import V2StatePanel from '@/components/v2/system/V2StatePanel.vue';
import SspEditorFormPage, {
  type SspEditorBreadcrumbItem,
} from '@/components/v2/system-security-plans/forms/SspEditorFormPage.vue';
import SspEditorSection from '@/components/v2/system-security-plans/forms/SspEditorSection.vue';
import {
  cloneValue,
  getRouteParam,
  resolveApiErrorMessage,
} from './sspEditorHelpers';

const formId = 'ssp-system-user-editor';

const route = useRoute();
const router = useRouter();
const toast = useToast();

const sspId = computed(() => getRouteParam(route, 'id'));
const userId = computed(() => getRouteParam(route, 'userId'));
const isEditMode = computed(() => userId.value.length > 0);

const breadcrumbs = computed<SspEditorBreadcrumbItem[]>(() => [
  {
    label: 'IMPLEMENTATION',
    to: {
      name: 'system-security-plan-system-implementation',
      params: { id: sspId.value },
      query: { section: 'users' },
    },
  },
  {
    label: 'USERS',
    to: {
      name: 'system-security-plan-system-implementation',
      params: { id: sspId.value },
      query: { section: 'users' },
    },
  },
  { label: isEditMode.value ? 'EDIT USER' : 'CREATE USER' },
]);

const backTo = computed(() => ({
  name: 'system-security-plan-system-implementation',
  params: { id: sspId.value },
  query: { section: 'users' },
}));

const {
  data: users,
  isLoading,
  execute: loadUsers,
} = useDataApi<SystemUser[]>(null, null, { immediate: false });

const {
  data: savedUser,
  execute: persistUser,
  isLoading: isSaving,
} = useDataApi<SystemUser>(
  null,
  {
    method: 'POST',
    transformRequest: [decamelizeKeys],
  },
  { immediate: false },
);

const loadErrorMessage = ref('');
const serverErrorMessage = ref('');

const fieldErrors = reactive({
  title: '',
  description: '',
});

const form = reactive<{
  uuid: string;
  title: string;
  shortName: string;
  description: string;
  props: NonNullable<SystemUser['props']>;
  links: NonNullable<SystemUser['links']>;
  roleIds: string[];
  authorizedPrivileges: NonNullable<SystemUser['authorizedPrivileges']>;
}>({
  uuid: '',
  title: '',
  shortName: '',
  description: '',
  props: [],
  links: [],
  roleIds: [],
  authorizedPrivileges: [],
});

const displayedUuid = computed(() =>
  isEditMode.value ? form.uuid : 'Auto-generated',
);

const pageTitle = computed(() =>
  isEditMode.value ? 'EDIT USER' : 'CREATE USER',
);
const submitLabel = computed(() =>
  isEditMode.value ? 'SAVE USER' : 'CREATE USER',
);

const errorSummary = computed(() =>
  toErrorSummaryItems([
    { fieldId: 'system-user-title', message: fieldErrors.title },
    {
      fieldId: 'system-user-description',
      message: fieldErrors.description,
    },
    { message: serverErrorMessage.value },
  ]),
);

watch(
  [sspId, userId],
  async ([nextSspId, nextUserId]) => {
    resetErrors();
    resetForm();

    if (!nextSspId) {
      return;
    }

    if (!nextUserId) {
      form.uuid = crypto.randomUUID();
      loadErrorMessage.value = '';
      return;
    }

    loadErrorMessage.value = '';

    try {
      await loadUsers(
        `/api/oscal/system-security-plans/${nextSspId}/system-implementation/users`,
      );

      const currentUser = (users.value || []).find(
        (candidate) => candidate.uuid === nextUserId,
      );

      if (!currentUser) {
        throw new Error('The requested system user was not found.');
      }

      loadForm(currentUser);
    } catch (error) {
      loadErrorMessage.value = resolveApiErrorMessage(
        error,
        'Unable to load this system user.',
      );
    }
  },
  { immediate: true },
);

function resetForm(): void {
  form.uuid = '';
  form.title = '';
  form.shortName = '';
  form.description = '';
  form.props = [];
  form.links = [];
  form.roleIds = [];
  form.authorizedPrivileges = [];
}

function loadForm(value: SystemUser): void {
  form.uuid = value.uuid;
  form.title = value.title || '';
  form.shortName = value.shortName || '';
  form.description = value.description || '';
  form.props = cloneValue(value.props || []);
  form.links = cloneValue(value.links || []);
  form.roleIds = cloneValue(value.roleIds || []);
  form.authorizedPrivileges = cloneValue(value.authorizedPrivileges || []).map(
    (privilege) => ({
      ...privilege,
      functionsPerformed: cloneValue(privilege.functionsPerformed || []),
    }),
  );
}

function resetErrors(): void {
  fieldErrors.title = '';
  fieldErrors.description = '';
  serverErrorMessage.value = '';
}

function addRoleId(): void {
  form.roleIds = form.roleIds || [];
  form.roleIds.push('');
}

function removeRoleId(index: number): void {
  form.roleIds = form.roleIds || [];
  form.roleIds.splice(index, 1);
}

function addPrivilege(): void {
  form.authorizedPrivileges = form.authorizedPrivileges || [];
  form.authorizedPrivileges.push({
    title: '',
    description: '',
    functionsPerformed: [],
  });
}

function removePrivilege(index: number): void {
  form.authorizedPrivileges = form.authorizedPrivileges || [];
  form.authorizedPrivileges.splice(index, 1);
}

function addFunctionPerformed(privilegeIndex: number): void {
  const privilege = form.authorizedPrivileges?.[privilegeIndex];

  if (!privilege) {
    return;
  }

  privilege.functionsPerformed = privilege.functionsPerformed || [];
  privilege.functionsPerformed.push('');
}

function removeFunctionPerformed(
  privilegeIndex: number,
  functionIndex: number,
): void {
  const privilege = form.authorizedPrivileges?.[privilegeIndex];

  if (!privilege?.functionsPerformed) {
    return;
  }

  privilege.functionsPerformed.splice(functionIndex, 1);
}

function validateForm(): boolean {
  resetErrors();

  if (!form.title.trim()) {
    fieldErrors.title = 'Title is required.';
  }

  if (!form.description.trim()) {
    fieldErrors.description = 'Description is required.';
  }

  return !fieldErrors.title && !fieldErrors.description;
}

async function handleSubmit(): Promise<void> {
  if (!validateForm()) {
    return;
  }

  const method = isEditMode.value ? 'PUT' : 'POST';
  const url = isEditMode.value
    ? `/api/oscal/system-security-plans/${sspId.value}/system-implementation/users/${userId.value}`
    : `/api/oscal/system-security-plans/${sspId.value}/system-implementation/users`;

  try {
    await persistUser(url, {
      method,
      data: form,
    });

    toast.add({
      severity: 'success',
      summary: isEditMode.value ? 'User Saved' : 'User Created',
      detail: isEditMode.value
        ? 'System user updated successfully.'
        : 'System user created successfully.',
      life: 2500,
    });

    if (savedUser.value) {
      loadForm(savedUser.value);
    }

    await router.push(backTo.value);
  } catch (error) {
    serverErrorMessage.value = resolveApiErrorMessage(
      error,
      isEditMode.value
        ? 'Unable to update this system user.'
        : 'Unable to create this system user.',
    );

    toast.add({
      severity: 'error',
      summary: 'Save Failed',
      detail: serverErrorMessage.value,
      life: 4000,
    });
  }
}
</script>

<template>
  <div class="space-y-6">
    <V2StatePanel
      v-if="isEditMode && isLoading && !users"
      kind="loading"
      title="Loading"
      description="Loading the selected system user..."
    />

    <V2StatePanel
      v-else-if="loadErrorMessage"
      kind="error"
      title="Load failed"
      :description="loadErrorMessage"
    >
      <template #actions>
        <RouterLink
          :to="backTo"
          class="ui-v2-nav inline-flex h-10 items-center justify-center border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] px-4 font-bold text-[var(--ui-v2-foreground)]"
        >
          BACK
        </RouterLink>
      </template>
    </V2StatePanel>

    <SspEditorFormPage
      v-else
      :breadcrumbs="breadcrumbs"
      :title="pageTitle"
      :form-id="formId"
      :back-to="backTo"
      :submit-label="submitLabel"
      :submitting="isSaving"
      :errors="errorSummary"
      @submit="handleSubmit"
    >
      <SspEditorSection title="BASICS">
        <div class="grid gap-4 lg:grid-cols-2">
          <V2FormField label="UUID" input-id="system-user-uuid">
            <template #default="fieldProps">
              <InputText
                :model-value="displayedUuid"
                :input-id="fieldProps.inputId"
                readonly
                fluid
              />
            </template>
          </V2FormField>

          <V2FormField
            label="TITLE"
            input-id="system-user-title"
            required
            :error="fieldErrors.title"
          >
            <template #default="fieldProps">
              <InputText
                v-model="form.title"
                :input-id="fieldProps.inputId"
                :aria-describedby="fieldProps.describedBy"
                :aria-invalid="fieldProps.invalid"
                fluid
              />
            </template>
          </V2FormField>

          <V2FormField label="SHORT NAME" input-id="system-user-short-name">
            <template #default="fieldProps">
              <InputText
                v-model="form.shortName"
                :input-id="fieldProps.inputId"
                :aria-describedby="fieldProps.describedBy"
                :aria-invalid="fieldProps.invalid"
                fluid
              />
            </template>
          </V2FormField>
        </div>

        <V2FormField
          label="DESCRIPTION"
          input-id="system-user-description"
          required
          :error="fieldErrors.description"
        >
          <template #default="fieldProps">
            <Textarea
              v-model="form.description"
              :input-id="fieldProps.inputId"
              :aria-describedby="fieldProps.describedBy"
              :aria-invalid="fieldProps.invalid"
              rows="5"
              fluid
            />
          </template>
        </V2FormField>
      </SspEditorSection>

      <SspEditorSection title="ROLE IDS">
        <div class="space-y-3">
          <article
            v-for="(roleId, index) in form.roleIds"
            :key="`role-${index}`"
            class="flex flex-col gap-3 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] p-3 md:flex-row md:items-end"
          >
            <V2FormField
              :input-id="`system-user-role-${index}`"
              label="Role ID"
              class="flex-1"
            >
              <template #default="fieldProps">
                <InputText
                  v-model="form.roleIds[index]"
                  :input-id="fieldProps.inputId"
                  :aria-describedby="fieldProps.describedBy"
                  :aria-invalid="fieldProps.invalid"
                  fluid
                />
              </template>
            </V2FormField>

            <button
              type="button"
              class="ui-v2-nav inline-flex h-10 items-center justify-center border border-[var(--ui-v2-error)] bg-[var(--ui-v2-error-tint-10)] px-3 font-bold text-[var(--ui-v2-error)]"
              @click="removeRoleId(index)"
            >
              REMOVE
            </button>
          </article>

          <button
            type="button"
            class="ui-v2-nav inline-flex h-9 items-center justify-center border border-[var(--ui-v2-primary)] bg-[var(--ui-v2-primary-tint-10)] px-3 font-bold text-[var(--ui-v2-primary)]"
            @click="addRoleId"
          >
            ADD ROLE ID
          </button>
        </div>
      </SspEditorSection>

      <SspEditorSection title="AUTHORIZED PRIVILEGES">
        <div class="space-y-4">
          <article
            v-for="(privilege, privilegeIndex) in form.authorizedPrivileges"
            :key="`privilege-${privilegeIndex}`"
            class="space-y-4 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] p-4"
          >
            <div class="flex justify-end">
              <button
                type="button"
                class="ui-v2-nav inline-flex h-8 items-center justify-center border border-[var(--ui-v2-error)] bg-[var(--ui-v2-error-tint-10)] px-3 font-bold text-[var(--ui-v2-error)]"
                @click="removePrivilege(privilegeIndex)"
              >
                REMOVE PRIVILEGE
              </button>
            </div>

            <div class="grid gap-4 lg:grid-cols-2">
              <V2FormField
                :input-id="`privilege-title-${privilegeIndex}`"
                label="Title"
              >
                <template #default="fieldProps">
                  <InputText
                    v-model="privilege.title"
                    :input-id="fieldProps.inputId"
                    :aria-describedby="fieldProps.describedBy"
                    :aria-invalid="fieldProps.invalid"
                    fluid
                  />
                </template>
              </V2FormField>

              <V2FormField
                :input-id="`privilege-description-${privilegeIndex}`"
                label="Description"
              >
                <template #default="fieldProps">
                  <Textarea
                    v-model="privilege.description"
                    :input-id="fieldProps.inputId"
                    :aria-describedby="fieldProps.describedBy"
                    :aria-invalid="fieldProps.invalid"
                    rows="3"
                    fluid
                  />
                </template>
              </V2FormField>
            </div>

            <div class="space-y-3">
              <p
                class="font-[var(--ui-v2-font-secondary)] text-[11px] font-bold uppercase tracking-[1px] text-[var(--ui-v2-secondary-foreground)]"
              >
                FUNCTIONS PERFORMED
              </p>

              <article
                v-for="(_, functionIndex) in privilege.functionsPerformed || []"
                :key="`privilege-${privilegeIndex}-function-${functionIndex}`"
                class="flex flex-col gap-3 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-card)] p-3 md:flex-row md:items-end"
              >
                <V2FormField
                  :input-id="`privilege-function-${privilegeIndex}-${functionIndex}`"
                  label="Function Description"
                  class="flex-1"
                >
                  <template #default="fieldProps">
                    <InputText
                      v-model="privilege.functionsPerformed![functionIndex]"
                      :input-id="fieldProps.inputId"
                      :aria-describedby="fieldProps.describedBy"
                      :aria-invalid="fieldProps.invalid"
                      fluid
                    />
                  </template>
                </V2FormField>

                <button
                  type="button"
                  class="ui-v2-nav inline-flex h-10 items-center justify-center border border-[var(--ui-v2-error)] bg-[var(--ui-v2-error-tint-10)] px-3 font-bold text-[var(--ui-v2-error)]"
                  @click="
                    removeFunctionPerformed(privilegeIndex, functionIndex)
                  "
                >
                  REMOVE
                </button>
              </article>

              <button
                type="button"
                class="ui-v2-nav inline-flex h-9 items-center justify-center border border-[var(--ui-v2-primary)] bg-[var(--ui-v2-primary-tint-10)] px-3 font-bold text-[var(--ui-v2-primary)]"
                @click="addFunctionPerformed(privilegeIndex)"
              >
                ADD FUNCTION
              </button>
            </div>
          </article>

          <button
            type="button"
            class="ui-v2-nav inline-flex h-9 items-center justify-center border border-[var(--ui-v2-primary)] bg-[var(--ui-v2-primary-tint-10)] px-3 font-bold text-[var(--ui-v2-primary)]"
            @click="addPrivilege"
          >
            ADD PRIVILEGE
          </button>
        </div>
      </SspEditorSection>
    </SspEditorFormPage>
  </div>
</template>
