<template>
  <PageHeader> New Evidence </PageHeader>
  <PageSubHeader>
    Create a new piece of evidence to support your control implementations.
  </PageSubHeader>
  <div
    class="mt-4 bg-white dark:bg-slate-900 rounded-md border border-ccf-300 dark:border-slate-700 p-8"
  >
    <form @submit.prevent="submit">
      <div class="flex">
        <div>
          <div class="mb-2">
            <label for="uuid">UUID</label>
            <div class="flex items-center place-items-stretch">
              <InputText
                v-model="evidence.uuid"
                class="rounded-r-none border-r-0"
              />
              <TertiaryButton
                type="button"
                @click="generateUuid"
                class="py-3 rounded-l-none"
                ><BIconArrowRepeat
              /></TertiaryButton>
            </div>
          </div>
          <div class="mb-2">
            <label for="title">Title</label>
            <InputText
              id="title"
              v-model="evidence.title"
              required
              class="block"
            />
          </div>
          <div class="mb-2">
            <label for="description">Description</label>
            <Textarea
              id="description"
              v-model="evidence.description"
              class="block"
            />
          </div>
          <div class="mb-2">
            <label for="start">Start Date</label>
            <div>
              <DatePicker
                v-model="evidence.start"
                placeholder="Select start date"
                required
              />
            </div>
          </div>
          <div class="mb-2">
            <label for="end">End Date</label>
            <div>
              <DatePicker
                v-model="evidence.end"
                placeholder="Select end date"
                required
              />
            </div>
          </div>
          <div class="mb-2">
            <label for="status">Status</label>
            <div>
              <SelectButton
                v-model="status.state"
                :options="['satisfied', 'not-satisfied', 'in-progress']"
                required
              />
            </div>
          </div>
          <div class="mb-2">
            <label for="reason">Reason</label>
            <div>
              <InputText id="reason" v-model="status.reason" />
            </div>
          </div>
          <div class="mb-2">
            <div class="flex items-center gap-2 mb-2">
              <p>Labels</p>
              <secondary-button size="small" type="button" @click="addLabel"
                >Add</secondary-button
              >
            </div>

            <div class="flex flex-col gap-y-1">
              <div
                v-for="(label, index) in labels"
                :key="index"
                class="flex items-center justify-start"
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
                  class="!px-1 ml-1"
                  @click="removeLabel(index)"
                  aria-label="Remove label"
                >
                  <BIconX />
                </TertiaryButton>
              </div>
            </div>
          </div>
        </div>
        <div>
          <div>
            <div v-for="matter in backmatterResources" :key="matter.uuid">
              {{ matter.title }}
            </div>
          </div>
          <Base64FileUpload @uploaded="onUpload" />
        </div>
      </div>
      <primary-button type="submit">Create Evidence</primary-button>
    </form>
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue';
import PageHeader from '@/components/PageHeader.vue';
import PageSubHeader from '@/components/PageSubHeader.vue';
import Base64FileUpload from '@/components/Base64FileUpload.vue';
import type {
  Evidence,
  EvidenceLabel,
  EvidenceStatus,
} from '@/stores/evidence.ts';
import router from '@/router';
import { v4 as uuidv4 } from 'uuid';
import DatePicker from '@/volt/DatePicker.vue';
import Textarea from '@/volt/Textarea.vue';
import InputText from '@/volt/InputText.vue';
import SelectButton from '@/volt/SelectButton.vue';
import TertiaryButton from '@/components/TertiaryButton.vue';
import { BIconArrowRepeat, BIconX } from 'bootstrap-icons-vue';
import type { BackMatterResource, Base64 } from '@/oscal';
import { useDataApi, decamelizeKeys } from '@/composables/axios';

const { data: createdEvidence, execute: createEvidence } = useDataApi<Evidence>(
  '/api/evidence',
  {
    method: 'POST',
    transformRequest: [decamelizeKeys],
  },
  { immediate: false },
);

const evidence = ref<Partial<Evidence>>({
  uuid: uuidv4(),
});
const status = ref<EvidenceStatus>({
  state: '',
  reason: '',
});
const labels = ref<EvidenceLabel[]>([]);
const backmatterResources = ref<BackMatterResource[]>([]);

async function submit() {
  const flatLabels = {} as Record<string, string>;
  labels.value.forEach((label) => {
    flatLabels[label.name] = label.value;
  });
  await createEvidence({
    data: {
      ...evidence.value,
      status: status.value,
      labels: flatLabels,
      backMatter: {
        resources: backmatterResources.value,
      },
    },
  });
  evidence.value = createdEvidence.value!;
  return await router.push({
    name: 'evidence:view',
    params: { id: createdEvidence.value!.id },
  });
}

function onUpload(file: File, base64: Base64) {
  const id = uuidv4();
  backmatterResources.value.push({
    uuid: id,
    title: file.name,
    description: '',
    base64: base64,
  });
  evidence.value.links = [
    ...(evidence.value.links || []),
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

function generateUuid() {
  evidence.value.uuid = uuidv4();
}
</script>
