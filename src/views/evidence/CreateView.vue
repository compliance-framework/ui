<template>
  <PageHeader> New Evidence </PageHeader>
  <PageSubHeader>
    Create a new piece of evidence to support your control implementations.
  </PageSubHeader>
  <div>Here we are</div>
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue';
import PageHeader from '@/components/PageHeader.vue';
import PageSubHeader from '@/components/PageSubHeader.vue';
import type { Activity } from '@/stores/activities.ts';
import { type Evidence, useEvidenceStore } from '@/stores/evidence.ts';

const evidenceStore = useEvidenceStore();

const evidence = ref<Evidence>({} as Evidence);
const activities = ref<Activity[]>([] as Activity[]);

onMounted(() => {});
</script>
