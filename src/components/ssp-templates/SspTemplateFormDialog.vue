<template>
  <Dialog
    v-model:visible="visible"
    modal
    :header="isEdit ? 'Edit SSP Template' : 'Create SSP Template'"
    class="w-full max-w-4xl"
  >
    <form class="space-y-6 p-1" @submit.prevent="submit">
      <div class="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-end">
        <div>
          <label
            for="ssp-template-name"
            class="inline-block pb-1 dark:text-slate-300"
            >Name <span class="text-red-500">*</span></label
          >
          <FormInput
            id="ssp-template-name"
            v-model="form.name"
            :disabled="isSaving"
            placeholder="Applications by _app"
          />
        </div>
        <label class="inline-flex items-center gap-2 pb-2 dark:text-slate-300">
          <input
            v-model="form.enabled"
            type="checkbox"
            data-testid="ssp-template-enabled"
            :disabled="isSaving"
          />
          Enabled
        </label>
      </div>

      <div>
        <label class="inline-block pb-1 dark:text-slate-300"
          >Key labels <span class="text-red-500">*</span></label
        >
        <p class="text-sm text-gray-500 dark:text-slate-400 mb-2">
          One SSP is created for every distinct combination of these label
          values. Press Enter to add a label.
          <span v-if="isEdit">Keys cannot change after creation.</span>
        </p>
        <AutoComplete
          v-model="form.keys"
          multiple
          :typeahead="false"
          :suggestions="[]"
          :disabled="isSaving || isEdit"
          data-testid="ssp-template-keys"
          fluid
        />
      </div>

      <div>
        <label
          for="ssp-template-filter"
          class="inline-block pb-1 dark:text-slate-300"
          >Evidence filter</label
        >
        <FormInput
          id="ssp-template-filter"
          v-model="form.filter"
          :disabled="isSaving"
          placeholder="auto_create_ssp=true"
        />
        <p v-if="filterError" class="text-sm text-red-500 mt-1">
          {{ filterError }}
        </p>
        <p v-else class="text-sm text-gray-500 dark:text-slate-400 mt-1">
          Optional. Only matching evidence counts, e.g.
          <code>env=prod AND team!=sandbox</code>.
        </p>
      </div>

      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="dark:text-slate-300">Scope label groups</label>
          <TertiaryButton
            type="button"
            :disabled="isSaving"
            @click="form.scopeLabels.push([])"
          >
            Add Group
          </TertiaryButton>
        </div>
        <p class="text-sm text-gray-500 dark:text-slate-400 mb-2">
          Values learned into each SSP's scope. The labels of one group are
          learned together as one entry.
        </p>
        <div
          v-for="(_, index) in form.scopeLabels"
          :key="`scope-group-${index}`"
          class="grid grid-cols-[1fr_auto] gap-2 mb-2"
          data-testid="ssp-template-scope-group"
        >
          <AutoComplete
            v-model="form.scopeLabels[index]"
            multiple
            :typeahead="false"
            :suggestions="[]"
            :disabled="isSaving"
            fluid
          />
          <TertiaryButton
            type="button"
            :disabled="isSaving"
            @click="form.scopeLabels.splice(index, 1)"
          >
            Remove
          </TertiaryButton>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label
            for="ssp-template-min-streams"
            class="inline-block pb-1 dark:text-slate-300"
            >Minimum streams</label
          >
          <FormInput
            id="ssp-template-min-streams"
            v-model="form.minStreams"
            type="number"
            min="1"
            step="1"
            :disabled="isSaving"
          />
        </div>
        <div class="md:col-span-2">
          <label
            for="ssp-template-profiles"
            class="inline-block pb-1 dark:text-slate-300"
            >Profiles</label
          >
          <MultiSelect
            v-model="form.profileIds"
            input-id="ssp-template-profiles"
            :options="profileOptions"
            option-label="name"
            option-value="value"
            display="chip"
            placeholder="Profiles attached to each created SSP"
            :loading="loadingProfiles"
            :disabled="isSaving"
            :filter="profileOptions.length > 8"
            class="w-full"
          />
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label
            for="ssp-template-title"
            class="inline-block pb-1 dark:text-slate-300"
            >Title template <span class="text-red-500">*</span></label
          >
          <FormTextarea
            id="ssp-template-title"
            v-model="form.titleTemplate"
            rows="2"
            :disabled="isSaving"
            placeholder="SSP for Application {{ ._app }}"
          />
        </div>
        <div>
          <label
            for="ssp-template-description"
            class="inline-block pb-1 dark:text-slate-300"
            >Description template</label
          >
          <FormTextarea
            id="ssp-template-description"
            v-model="form.descriptionTemplate"
            rows="2"
            :disabled="isSaving"
            placeholder="Created from evidence labelled _app={{ ._app }}"
          />
        </div>
      </div>

      <TemplatePreview
        :title-template="form.titleTemplate"
        :description-template="form.descriptionTemplate"
        purpose-template=""
        remarks-template=""
        :label-schema="previewLabelSchema"
        :disabled="isSaving"
      />

      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="dark:text-slate-300">Properties</label>
          <TertiaryButton
            type="button"
            :disabled="isSaving"
            @click="form.props.push({ name: '', value: '' })"
          >
            Add Property
          </TertiaryButton>
        </div>
        <div
          v-for="(prop, index) in form.props"
          :key="`prop-${index}`"
          class="grid grid-cols-1 md:grid-cols-[1fr_2fr_auto] gap-2 mb-2"
          data-testid="ssp-template-prop"
        >
          <FormInput
            v-model="prop.name"
            :disabled="isSaving"
            placeholder="Name"
          />
          <FormInput
            v-model="prop.value"
            :disabled="isSaving"
            placeholder="Value template, e.g. {{ ._app }}"
          />
          <TertiaryButton
            type="button"
            :disabled="isSaving"
            @click="form.props.splice(index, 1)"
          >
            Remove
          </TertiaryButton>
        </div>
      </div>

      <div class="flex justify-end gap-3">
        <SecondaryButton
          type="button"
          :disabled="isSaving"
          @click="visible = false"
        >
          Cancel
        </SecondaryButton>
        <PrimaryButton type="submit" :disabled="isSaving">
          {{ isSaving ? 'Saving...' : isEdit ? 'Save' : 'Create' }}
        </PrimaryButton>
      </div>
    </form>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useToast } from 'primevue/usetoast';
import { decamelizeKeys, useDataApi } from '@/composables/axios';
import { getErrorDetail } from '@/utils/httpErrors';
import type { Profile } from '@/oscal';
import AutoComplete from '@/volt/AutoComplete.vue';
import Dialog from '@/volt/Dialog.vue';
import MultiSelect from '@/volt/MultiSelect.vue';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import TertiaryButton from '@/volt/TertiaryButton.vue';
import FormInput from '@/components/forms/FormInput.vue';
import FormTextarea from '@/components/forms/FormTextarea.vue';
import TemplatePreview from '@/components/subject-templates/TemplatePreview.vue';
import {
  buildUpsertSspTemplatePayload,
  createEmptySspTemplateForm,
  createSspTemplateFormFromTemplate,
  parseSspTemplateFilter,
  type SspTemplate,
  type SspTemplateFormData,
} from '@/types/ssp-templates';

// Create (no template) or edit (a saved template) dialog. It saves through the admin API
// itself and emits `saved` with the API's copy of the template.
const props = defineProps<{ template?: SspTemplate | null }>();
const emit = defineEmits<{ saved: [template: SspTemplate | undefined] }>();
const visible = defineModel<boolean>('visible', { required: true });

const toast = useToast();
const form = ref<SspTemplateFormData>(createEmptySspTemplateForm());
const isEdit = computed(() => Boolean(props.template?.id));

const { data: profiles, isLoading: loadingProfiles } = useDataApi<Profile[]>(
  '/api/oscal/profiles',
);
const profileOptions = computed(
  () =>
    profiles.value?.map((profile) => ({
      name: profile.metadata?.title ?? profile.uuid,
      value: profile.uuid,
    })) ?? [],
);

const { execute: executeSave, isLoading: isSaving } = useDataApi<SspTemplate>(
  null,
  { transformRequest: [decamelizeKeys] },
  { immediate: false },
);

const filterError = computed(() => {
  try {
    parseSspTemplateFilter(form.value.filter);
    return '';
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
});

// TemplatePreview substitutes `{{ name }}` placeholders by their sample label's key. SSP
// templates are Go templates over the key values (`{{ ._app }}`), so each sample label is
// named with the leading dot to match.
const previewLabelSchema = computed(() =>
  form.value.keys.map((key) => ({ key: `.${key}`, description: '' })),
);

watch(
  visible,
  (open) => {
    if (open) {
      form.value = props.template
        ? createSspTemplateFormFromTemplate(props.template)
        : createEmptySspTemplateForm();
    }
  },
  { immediate: true },
);

async function submit() {
  let payload;
  try {
    payload = buildUpsertSspTemplatePayload(form.value);
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Invalid template',
      detail: error instanceof Error ? error.message : String(error),
      life: 4000,
    });
    return;
  }

  const id = props.template?.id;
  try {
    const response = await executeSave(
      id ? `/api/admin/ssp-templates/${id}` : '/api/admin/ssp-templates',
      { method: id ? 'PUT' : 'POST', data: payload },
    );
    toast.add({
      severity: 'success',
      summary: id ? 'Template Updated' : 'Template Created',
      detail: `SSP template "${payload.name}" saved.`,
      life: 3000,
    });
    visible.value = false;
    emit('saved', response.data.value?.data);
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Save Failed',
      detail: await getErrorDetail(error, 'Failed to save SSP template.'),
      life: 4000,
    });
  }
}
</script>
