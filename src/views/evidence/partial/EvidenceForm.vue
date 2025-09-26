<template>
  <div
    class="mt-4 bg-white dark:bg-slate-900 rounded-md border border-ccf-300 dark:border-slate-700 p-8"
  >
    <form @submit.prevent="$emit('submit', evidence, labels, status)">
      <div class="flex">
        <div>
          <div class="mb-2">
            <label for="uuid">UUID</label>
            <div class="flex items-center place-items-stretch" v-if="!updating">
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
            <div class="flex items-center place-items-stretch" v-else>
              <div
                class="flex items-center bg-gray-100 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-md px-3 py-2"
              >
                <span
                  class="text-sm text-gray-600 dark:text-slate-400 font-mono"
                  >{{ evidence.uuid }}</span
                >
              </div>
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
          <div class="mb-2" v-if="!updating">
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
      <primary-button type="submit"
        >{{ props.updating ? 'Update' : 'Create' }} Evidence</primary-button
      >
    </form>
  </div>
</template>

<script lang="ts" setup>
import type {
  Evidence,
  EvidenceLabel,
  EvidenceStatus,
} from '@/stores/evidence';
import { ref } from 'vue';
import type { BackMatterResource, Base64 } from '@/oscal';
import { v4 as uuidv4 } from 'uuid';
import DatePicker from '@/volt/DatePicker.vue';
import Textarea from '@/volt/Textarea.vue';
import InputText from '@/volt/InputText.vue';
import SelectButton from '@/volt/SelectButton.vue';
import TertiaryButton from '@/volt/TertiaryButton.vue';
import { BIconArrowRepeat, BIconX } from 'bootstrap-icons-vue';
import Base64FileUpload from '@/components/Base64FileUpload.vue';

const props = defineProps<{
  backmatterResources: BackMatterResource[];
  evidence?: Partial<Evidence>;
  updating?: boolean;
}>();

const backmatterResources = ref<BackMatterResource[]>(
  props.backmatterResources || [],
);
const evidence = ref<Partial<Evidence>>(
  props.evidence || {
    uuid: uuidv4(),
  },
);
const status = ref<EvidenceStatus>({
  state: '',
  reason: '',
});
const labels = ref<EvidenceLabel[]>([]);

defineEmits<{
  submit: [Partial<Evidence>, EvidenceLabel[], EvidenceStatus];
}>();

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
