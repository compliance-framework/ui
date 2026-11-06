<template>
  <PageHeader>Control Evidence</PageHeader>
  <PageSubHeader>{{ control.id }} - {{ control.title }}</PageSubHeader>

  <div
    class="mt-4 rounded-md bg-white dark:bg-slate-900 border-collapse border dark:border-slate-700"
  >
    <EvidenceList :evidence="evidence" />
  </div>
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue';
import PageHeader from '@/components/PageHeader.vue';
import { useRoute } from 'vue-router';
import PageSubHeader from '@/components/PageSubHeader.vue';
import EvidenceList from '@/components/EvidenceList.vue';
import { type Evidence, useEvidenceStore } from '@/stores/evidence.ts';
import type { Control } from '@/oscal';

const evidenceStore = useEvidenceStore();
const evidence = ref<Evidence[]>([]);
const control = ref<Control>({} as Control);

const route = useRoute();
const controlId = route.params.id as string;

onMounted(() => {
  evidenceStore.getForControl(controlId).then((data) => {
    control.value = data.metadata.control;
    // for-control returns `labels: null` (labels aren't loaded there), and the
    // list's LabelList maps over them, which crashed the whole page.
    evidence.value = data.data.map((item) => ({
      ...item,
      labels: item.labels ?? [],
    }));
  });
});
</script>
