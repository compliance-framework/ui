<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import InputText from '@/volt/InputText.vue';
import Textarea from '@/volt/Textarea.vue';
import type { Link, Property, SystemImplementation } from '@/oscal';
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

const formId = 'ssp-implementation-overview-editor';

const route = useRoute();
const router = useRouter();
const toast = useToast();

const sspId = computed(() => getRouteParam(route, 'id'));

const breadcrumbs = computed<SspEditorBreadcrumbItem[]>(() => [
  {
    label: 'IMPLEMENTATION',
    to: {
      name: 'system-security-plan-system-implementation',
      params: { id: sspId.value },
      query: { section: 'overview' },
    },
  },
  { label: 'OVERVIEW' },
  { label: 'EDIT OVERVIEW' },
]);

const backTo = computed(() => ({
  name: 'system-security-plan-system-implementation',
  params: { id: sspId.value },
  query: { section: 'overview' },
}));

const {
  data: systemImplementation,
  isLoading,
  execute: loadSystemImplementation,
} = useDataApi<SystemImplementation>(null, null, { immediate: false });

const {
  data: savedSystemImplementation,
  execute: saveSystemImplementation,
  isLoading: isSaving,
} = useDataApi<SystemImplementation>(
  null,
  {
    method: 'PUT',
    transformRequest: [decamelizeKeys],
  },
  { immediate: false },
);

const loadErrorMessage = ref('');
const serverErrorMessage = ref('');

const form = reactive<{
  users: SystemImplementation['users'];
  components: SystemImplementation['components'];
  remarks: string;
  props: Property[];
  links: Link[];
}>({
  users: [],
  components: [],
  remarks: '',
  props: [],
  links: [],
});

const errorSummary = computed(() =>
  toErrorSummaryItems([{ message: serverErrorMessage.value }]),
);

watch(
  sspId,
  async (id) => {
    if (!id) {
      return;
    }

    loadErrorMessage.value = '';

    try {
      await loadSystemImplementation(
        `/api/oscal/system-security-plans/${id}/system-implementation`,
      );

      if (!systemImplementation.value) {
        throw new Error('System implementation overview is unavailable.');
      }

      loadForm(systemImplementation.value);
    } catch (error) {
      loadErrorMessage.value = resolveApiErrorMessage(
        error,
        'Unable to load the system implementation overview.',
      );
    }
  },
  { immediate: true },
);

function loadForm(value: SystemImplementation): void {
  form.users = cloneValue(value.users || []);
  form.components = cloneValue(value.components || []);
  form.remarks = value.remarks || '';
  form.props = cloneValue(value.props || []);
  form.links = cloneValue(value.links || []);
}

function addProperty(): void {
  form.props.push({
    name: '',
    value: '',
  });
}

function removeProperty(index: number): void {
  form.props.splice(index, 1);
}

function addLink(): void {
  form.links.push({
    href: '',
    text: '',
    rel: '',
  });
}

function removeLink(index: number): void {
  form.links.splice(index, 1);
}

async function handleSubmit(): Promise<void> {
  serverErrorMessage.value = '';

  try {
    await saveSystemImplementation(
      `/api/oscal/system-security-plans/${sspId.value}/system-implementation`,
      {
        data: {
          users: form.users,
          components: form.components,
          remarks: form.remarks,
          props: form.props,
          links: form.links,
        } as SystemImplementation,
      },
    );

    toast.add({
      severity: 'success',
      summary: 'Overview Saved',
      detail: 'System implementation overview updated successfully.',
      life: 2500,
    });

    if (savedSystemImplementation.value) {
      loadForm(savedSystemImplementation.value);
    }

    await router.push(backTo.value);
  } catch (error) {
    serverErrorMessage.value = resolveApiErrorMessage(
      error,
      'Unable to save the system implementation overview.',
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
      v-if="isLoading && !systemImplementation"
      kind="loading"
      title="Loading"
      description="Loading the system implementation overview editor..."
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
      title="EDIT IMPLEMENTATION OVERVIEW"
      :form-id="formId"
      :back-to="backTo"
      submit-label="SAVE OVERVIEW"
      :submitting="isSaving"
      :errors="errorSummary"
      @submit="handleSubmit"
    >
      <SspEditorSection title="REMARKS">
        <V2FormField
          label="Remarks"
          input-id="system-implementation-remarks"
          helper-text="Describe the system implementation and additional context."
        >
          <template #default="fieldProps">
            <Textarea
              v-model="form.remarks"
              :input-id="fieldProps.inputId"
              :aria-describedby="fieldProps.describedBy"
              :aria-invalid="fieldProps.invalid"
              rows="5"
              fluid
            />
          </template>
        </V2FormField>
      </SspEditorSection>

      <SspEditorSection title="PROPERTIES">
        <div class="space-y-3">
          <article
            v-for="(property, index) in form.props"
            :key="`property-${index}`"
            class="space-y-3 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] p-3"
          >
            <div class="flex justify-end">
              <button
                type="button"
                class="ui-v2-nav inline-flex h-8 items-center justify-center border border-[var(--ui-v2-error)] bg-[var(--ui-v2-error-tint-10)] px-3 font-bold text-[var(--ui-v2-error)]"
                @click="removeProperty(index)"
              >
                REMOVE
              </button>
            </div>

            <div class="grid gap-3 md:grid-cols-2">
              <V2FormField :input-id="`property-name-${index}`" label="Name">
                <template #default="fieldProps">
                  <InputText
                    v-model="property.name"
                    :input-id="fieldProps.inputId"
                    :aria-describedby="fieldProps.describedBy"
                    :aria-invalid="fieldProps.invalid"
                    fluid
                  />
                </template>
              </V2FormField>

              <V2FormField :input-id="`property-value-${index}`" label="Value">
                <template #default="fieldProps">
                  <InputText
                    v-model="property.value"
                    :input-id="fieldProps.inputId"
                    :aria-describedby="fieldProps.describedBy"
                    :aria-invalid="fieldProps.invalid"
                    fluid
                  />
                </template>
              </V2FormField>
            </div>
          </article>

          <button
            type="button"
            class="ui-v2-nav inline-flex h-9 items-center justify-center border border-[var(--ui-v2-primary)] bg-[var(--ui-v2-primary-tint-10)] px-3 font-bold text-[var(--ui-v2-primary)]"
            @click="addProperty"
          >
            ADD PROPERTY
          </button>
        </div>
      </SspEditorSection>

      <SspEditorSection title="LINKS">
        <div class="space-y-3">
          <article
            v-for="(link, index) in form.links"
            :key="`link-${index}`"
            class="space-y-3 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] p-3"
          >
            <div class="flex justify-end">
              <button
                type="button"
                class="ui-v2-nav inline-flex h-8 items-center justify-center border border-[var(--ui-v2-error)] bg-[var(--ui-v2-error-tint-10)] px-3 font-bold text-[var(--ui-v2-error)]"
                @click="removeLink(index)"
              >
                REMOVE
              </button>
            </div>

            <div class="grid gap-3 md:grid-cols-2">
              <V2FormField :input-id="`link-href-${index}`" label="Href">
                <template #default="fieldProps">
                  <InputText
                    v-model="link.href"
                    :input-id="fieldProps.inputId"
                    :aria-describedby="fieldProps.describedBy"
                    :aria-invalid="fieldProps.invalid"
                    fluid
                  />
                </template>
              </V2FormField>

              <V2FormField :input-id="`link-text-${index}`" label="Text">
                <template #default="fieldProps">
                  <InputText
                    v-model="link.text"
                    :input-id="fieldProps.inputId"
                    :aria-describedby="fieldProps.describedBy"
                    :aria-invalid="fieldProps.invalid"
                    fluid
                  />
                </template>
              </V2FormField>

              <V2FormField :input-id="`link-rel-${index}`" label="Rel">
                <template #default="fieldProps">
                  <InputText
                    v-model="link.rel"
                    :input-id="fieldProps.inputId"
                    :aria-describedby="fieldProps.describedBy"
                    :aria-invalid="fieldProps.invalid"
                    fluid
                  />
                </template>
              </V2FormField>
            </div>
          </article>

          <button
            type="button"
            class="ui-v2-nav inline-flex h-9 items-center justify-center border border-[var(--ui-v2-primary)] bg-[var(--ui-v2-primary-tint-10)] px-3 font-bold text-[var(--ui-v2-primary)]"
            @click="addLink"
          >
            ADD LINK
          </button>
        </div>
      </SspEditorSection>
    </SspEditorFormPage>
  </div>
</template>
