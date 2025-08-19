<template>
  <PageHeader> New Evidence </PageHeader>
  <PageSubHeader>
    Create a new piece of evidence to support your control implementations.
  </PageSubHeader>
  <EvidenceForm
    :backmatter-resources="backmatterResources"
    :evidence="evidence"
    @submit="submit"></EvidenceForm>
</template>
<script setup lang="ts">
import { ref } from 'vue';
import PageHeader from '@/components/PageHeader.vue';
import PageSubHeader from '@/components/PageSubHeader.vue';
import type {
  Evidence,
  EvidenceLabel,
  EvidenceStatus
} from '@/stores/evidence.ts';
import router from '@/router';
import { v4 as uuidv4 } from 'uuid';
import EvidenceForm from './partial/EvidenceForm.vue';

import type { BackMatterResource } from '@/oscal';
import { useDataApi, decamelizeKeys } from '@/composables/axios';


const { data: createdEvidence, execute: createEvidence } = useDataApi<Evidence>(
  '/api/evidence',
  {
    method: 'POST',
    transformRequest: [decamelizeKeys]
  }, { immediate: false }
);


const backmatterResources = ref<BackMatterResource[]>([]);
const evidence = ref<Partial<Evidence>>({
  uuid: uuidv4(),
});

async function submit(updatedEvidence: Partial<Evidence>, labels: EvidenceLabel[], status: EvidenceStatus) {
  const flatLabels = {} as Record<string, string>;
  labels.forEach((label) => {
    flatLabels[label.name] = label.value;
  });
  await createEvidence({
    data: {
      ...updatedEvidence,
      status: status,
      labels: flatLabels,
      backMatter: {
        resources: backmatterResources.value,
      }
    }
  });
  //evidence.value = createdEvidence.value!;
  return await router.push({
    name: 'evidence:view',
    params: { id: createdEvidence.value!.id },
  });
}
</script>
