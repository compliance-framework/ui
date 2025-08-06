<template>
  <PageHeader> New Evidence </PageHeader>
  <PageSubHeader>
    Create a new piece of evidence to support your control implementations.
  </PageSubHeader>
  <form @submit.prevent="submit">
    <div>
      <label for="title">Title</label>
      <input id="title" v-model="evidence.title" required />
    </div>
    <div>
      <label for="description">Description</label>
      <textarea id="description" v-model="evidence.description" />
    </div>
    <div>
      <label for="start">Start Date</label>
      <input
        id="start"
        type="datetime-local"
        v-model="evidence.start"
        required
      />
    </div>
    <div>
      <label for="end">End Date</label>
      <input id="end" type="datetime-local" v-model="evidence.end" required />
    </div>
    <div>
      <label for="status">Status</label>
      <input id="status" v-model="evidence.status.state" required />
    </div>
    <div>
      <label for="reason">Reason</label>
      <input id="reason" v-model="evidence.status.reason" />
    </div>
    <button type="submit">Create Evidence</button>
  </form>
</template>
<script setup lang="ts">
import { ref } from 'vue';
import PageHeader from '@/components/PageHeader.vue';
import PageSubHeader from '@/components/PageSubHeader.vue';
import { useEvidenceStore, type Evidence } from '@/stores/evidence.ts';
import router from '@/router';

const evidenceStore = useEvidenceStore();
const evidence = ref<Partial<Evidence>>({
  status: {
    state: '',
    reason: '',
  },
});
const error = ref<string | null>(null);
const success = ref<boolean>(false);

async function submit() {
  const response = await evidenceStore.create(evidence.value);
  evidence.value = response.data;
  router.push({ name: 'evidence:view', params: { id: response.data.id } });
}
</script>
