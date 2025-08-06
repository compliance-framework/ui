<template>
  <PageHeader> New Evidence </PageHeader>
  <PageSubHeader>
    Create a new piece of evidence to support your control implementations.
  </PageSubHeader>
  <div class="mt-4">
    <form @submit.prevent="submit">
      <div class="mb-2">
        <label for="title">Title</label>
        <InputText id="title" v-model="evidence.title" required class="block" />
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
            <button type="button" @click="removeLabel(index)">X</button>
          </div>
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
import {
  useEvidenceStore,
  type Evidence,
  type EvidenceLabel,
  type EvidenceStatus,
} from '@/stores/evidence.ts';
import router from '@/router';
import DatePicker from '@/volt/DatePicker.vue';
import Textarea from '@/volt/Textarea.vue';
import InputText from '@/volt/InputText.vue';
import SelectButton from '@/volt/SelectButton.vue';

const evidenceStore = useEvidenceStore();
const evidence = ref<Partial<Evidence>>({
  status: {
    state: '',
    reason: '',
  },
});
const status = ref<EvidenceStatus>({
  state: '',
  reason: '',
});
const labels = ref<EvidenceLabel[]>([]);

async function submit() {
  const flatLabels = {} as Record<string, string>;
  labels.value.forEach((label) => {
    flatLabels[label.name] = label.value;
  });
  const response = await evidenceStore.create({
    ...evidence.value,
    status: status.value,
    labels: flatLabels,
  });
  evidence.value = response.data;
  router.push({ name: 'evidence:view', params: { id: response.data.id } });
}

function addLabel() {
  labels.value.push({ name: '', value: '' });
}

function removeLabel(index: number) {
  labels.value.splice(index, 1);
}
</script>
