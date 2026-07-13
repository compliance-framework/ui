<template>
  <form class="mt-4 space-y-6" @submit.prevent="handleSubmit">
    <PageCard>
      <h3 class="text-lg font-semibold text-zinc-700 dark:text-slate-200">
        Details
      </h3>
      <div class="mt-4 space-y-4">
        <div>
          <label
            for="title"
            class="text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400"
          >
            Title
          </label>
          <InputText
            id="title"
            v-model="evidence.title"
            required
            class="mt-1 block w-full"
            placeholder="Evidence title"
          />
        </div>
        <div>
          <label
            for="description"
            class="text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400"
          >
            Description
          </label>
          <Textarea
            id="description"
            v-model="evidence.description"
            rows="3"
            class="mt-1 block w-full"
            placeholder="What does this evidence demonstrate?"
          />
        </div>
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label
              for="status"
              class="text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400"
            >
              Status
            </label>
            <div class="mt-1">
              <SelectButton
                v-model="status.state"
                :options="['satisfied', 'not-satisfied', 'in-progress']"
                required
              />
            </div>
          </div>
          <div>
            <label
              for="reason"
              class="text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400"
            >
              Reason
            </label>
            <InputText
              id="reason"
              v-model="status.reason"
              class="mt-1 block w-full"
              placeholder="Why is the status what it is?"
            />
          </div>
        </div>
      </div>

      <div class="mt-6 border-t border-ccf-300 pt-4 dark:border-slate-700">
        <div class="flex items-center justify-between gap-2">
          <h4 class="text-sm font-semibold text-zinc-700 dark:text-slate-200">
            Labels
          </h4>
          <SecondaryButton
            v-if="!updating"
            size="small"
            type="button"
            @click="addLabel"
          >
            Add
          </SecondaryButton>
        </div>
        <p class="mt-1 text-sm text-gray-600 dark:text-slate-400">
          Labels make evidence searchable and drive control matching.
        </p>

        <div v-if="!updating" class="mt-3 flex flex-col gap-y-2">
          <div
            v-for="(label, index) in labels"
            :key="index"
            class="flex items-center justify-start gap-1"
          >
            <InputText
              v-model="label.name"
              placeholder="Label name"
              size="small"
            />
            <InputText
              v-model="label.value"
              placeholder="Label value"
              size="small"
            />
            <TertiaryButton
              type="button"
              class="!px-1"
              @click="removeLabel(index)"
              aria-label="Remove label"
            >
              <BIconX />
            </TertiaryButton>
          </div>
          <p
            v-if="!labels.length"
            class="text-sm text-gray-600 dark:text-slate-400"
          >
            No labels added.
          </p>
        </div>
        <div v-else class="mt-3">
          <LabelList v-if="labels.length" :labels="labels" show-all />
          <p v-else class="text-sm text-gray-600 dark:text-slate-400">
            No labels on this evidence.
          </p>
        </div>
      </div>

      <div class="mt-6 border-t border-ccf-300 pt-4 dark:border-slate-700">
        <h4 class="text-sm font-semibold text-zinc-700 dark:text-slate-200">
          Attachments
        </h4>
        <div
          v-if="backmatterResources.length"
          class="mt-3 flex flex-col gap-y-2"
        >
          <div
            v-for="matter in backmatterResources"
            :key="matter.uuid"
            class="rounded-md border border-ccf-300 px-3 py-2 text-sm text-gray-900 dark:border-slate-700 dark:text-slate-200"
          >
            {{ matter.title }}
          </div>
        </div>
        <p v-else class="mt-3 text-sm text-gray-600 dark:text-slate-400">
          No files attached.
        </p>
        <div class="mt-3">
          <Base64FileUpload @uploaded="onUpload" />
        </div>
      </div>
    </PageCard>

    <PageCard>
      <h3 class="text-lg font-semibold text-zinc-700 dark:text-slate-200">
        Collection Window &amp; Expiry
      </h3>
      <div class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <label
            for="start"
            class="text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400"
          >
            Start Date
          </label>
          <div class="mt-1">
            <DatePicker
              v-model="evidence.start"
              placeholder="Select start date"
              required
              date-format="yy-mm-dd"
              :max-date="
                evidence.end ? new Date(evidence.end) : new Date(Date.now())
              "
            />
          </div>
        </div>
        <div>
          <label
            for="end"
            class="text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400"
          >
            End Date
          </label>
          <div class="mt-1">
            <DatePicker
              v-model="evidence.end"
              placeholder="Select end date"
              required
              date-format="yy-mm-dd"
              :min-date="
                evidence.start ? new Date(evidence.start) : new Date(Date.now())
              "
              :max-date="new Date(Date.now())"
            />
          </div>
        </div>
        <div>
          <label
            for="expires"
            class="text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400"
          >
            Expiry Date
          </label>
          <div class="mt-1">
            <DatePicker
              v-model="evidence.expires"
              placeholder="Server default if empty"
              date-format="yy-mm-dd"
              :min-date="
                evidence.end ? new Date(evidence.end) : new Date(Date.now())
              "
              show-button-bar
            />
          </div>
          <p class="mt-1 text-xs text-gray-500 dark:text-slate-400">
            When this evidence stops being valid. Left empty, the server applies
            its default expiry.
          </p>
        </div>
      </div>
      <div v-if="dateValidationError" class="mt-2 text-sm text-red-500">
        {{ dateValidationError }}
      </div>
    </PageCard>

    <PageCard>
      <h3 class="text-lg font-semibold text-zinc-700 dark:text-slate-200">
        Properties
      </h3>
      <div class="mt-4">
        <PropsEditor v-model="propsList" />
      </div>
    </PageCard>

    <PageCard>
      <h3 class="text-lg font-semibold text-zinc-700 dark:text-slate-200">
        Links
      </h3>
      <p class="mt-1 text-sm text-gray-600 dark:text-slate-400">
        External references, or internal
        <code class="rounded bg-slate-100 px-1 text-xs dark:bg-slate-800"
          >#resource</code
        >
        references to attachments. Uploaded files appear here automatically.
      </p>
      <div class="mt-4">
        <LinksEditor v-model="linksList" />
      </div>
    </PageCard>

    <div class="flex justify-end">
      <primary-button
        type="submit"
        :disabled="!isFormValid || !can(RESOURCES.EVIDENCE, submitAction)"
        v-tooltip.top="{
          value: permissionTooltip(RESOURCES.EVIDENCE, submitAction),
          disabled: can(RESOURCES.EVIDENCE, submitAction),
        }"
        >{{ props.updating ? 'Re-submit' : 'Create' }} Evidence</primary-button
      >
    </div>
  </form>
</template>

<script lang="ts" setup>
import type {
  Evidence,
  EvidenceLabel,
  EvidenceStatus,
} from '@/stores/evidence';
import { ref, computed } from 'vue';
import type { BackMatterResource, Base64, Link, Property } from '@/oscal';
import { uuid } from '@/utils/uuid';
import DatePicker from '@/volt/DatePicker.vue';
import Textarea from '@/volt/Textarea.vue';
import InputText from '@/volt/InputText.vue';
import SelectButton from '@/volt/SelectButton.vue';
import TertiaryButton from '@/volt/TertiaryButton.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import { BIconX } from 'bootstrap-icons-vue';
import Base64FileUpload from '@/components/Base64FileUpload.vue';
import PageCard from '@/components/PageCard.vue';
import LabelList from '@/components/LabelList.vue';
import PropsEditor from '@/components/forms/PropsEditor.vue';
import LinksEditor from '@/components/forms/LinksEditor.vue';
import { usePermissions } from '@/composables/usePermissions';
import { RESOURCES, ACTIONS } from '@/constants/permissions';

const props = defineProps<{
  backmatterResources: BackMatterResource[];
  evidence?: Partial<Evidence>;
  updating?: boolean;
}>();

const { can, permissionTooltip } = usePermissions();
const submitAction = computed(() =>
  props.updating ? ACTIONS.UPDATE : ACTIONS.CREATE,
);

const backmatterResources = ref<BackMatterResource[]>(
  props.backmatterResources || [],
);
// Interface for form data with Date objects for DatePicker compatibility
interface EvidenceFormData extends Omit<Evidence, 'start' | 'end' | 'expires'> {
  start?: Date;
  end?: Date;
  expires?: Date;
}

const evidence = ref<Partial<EvidenceFormData>>({
  ...props.evidence,
  // Convert ISO strings to Date objects for DatePicker
  start: props.evidence?.start ? new Date(props.evidence.start) : undefined,
  end: props.evidence?.end ? new Date(props.evidence.end) : undefined,
  expires: props.evidence?.expires
    ? new Date(props.evidence.expires)
    : undefined,
  // The stream UUID stays hidden: generated once on create, preserved on
  // re-submission so revisions accumulate in the same evidence stream.
  uuid: props.evidence?.uuid || uuid(),
});
const status = ref<EvidenceStatus>({
  state: props.evidence?.status?.state || '',
  reason: props.evidence?.status?.reason || '',
});
const labels = ref<EvidenceLabel[]>(props.evidence?.labels || []);
const propsList = ref<Property[]>([...(props.evidence?.props ?? [])]);
const linksList = ref<Link[]>([...(props.evidence?.links ?? [])]);

// Date validation
const dateValidationError = computed(() => {
  if (!evidence.value.start || !evidence.value.end) return null;

  const startDate = evidence.value.start;
  const endDate = evidence.value.end;
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  if (endDate > today) {
    return 'End date cannot be in the future';
  }
  if (startDate > endDate) {
    return 'End date must be after start date';
  }
  if (evidence.value.expires && evidence.value.expires < endDate) {
    return 'Expiry date must be after the end date';
  }
  return null;
});

const isFormValid = computed(() => {
  return !dateValidationError.value;
});

const emit = defineEmits<{
  submit: [Partial<Evidence>, EvidenceLabel[], EvidenceStatus];
}>();

function handleSubmit() {
  if (!isFormValid.value) {
    return; // Prevent submission if validation fails
  }

  // Convert Date objects back to ISO strings for API
  const evidenceToSubmit: Partial<Evidence> = {
    ...evidence.value,
    start: evidence.value.start?.toISOString(),
    end: evidence.value.end?.toISOString(),
    expires: evidence.value.expires?.toISOString(),
    props: propsList.value.filter((prop) => prop.name || prop.value),
    links: linksList.value.filter((link) => link.href),
  };

  emit('submit', evidenceToSubmit, labels.value, status.value);
}

function onUpload(file: File, base64: Base64) {
  const id = uuid();
  backmatterResources.value.push({
    uuid: id,
    title: file.name,
    description: '',
    base64: base64,
  });
  linksList.value = [
    ...linksList.value,
    {
      href: `#${id}`,
      rel: `reference`,
      text: file.name,
    },
  ];
}

function addLabel() {
  labels.value.push({ name: '', value: '' });
}

function removeLabel(index: number) {
  labels.value.splice(index, 1);
}
</script>
