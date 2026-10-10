<template>
  <PageHeader> Evidence History </PageHeader>
  <PageSubHeader>
    {{ uuid }}
  </PageSubHeader>

  <div class="mt-4">
    <EvidenceHistorySection :uuid="uuid" />
  </div>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router';
import PageHeader from '@/components/PageHeader.vue';
import PageSubHeader from '@/components/PageSubHeader.vue';
import EvidenceHistorySection from '@/components/evidence/EvidenceHistorySection.vue';

const route = useRoute();
const uuid = route.params.uuid as string;
</script>
