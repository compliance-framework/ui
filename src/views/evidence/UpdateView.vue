<template>
  <PageHeader> Update Evidence </PageHeader>
  <PageSubHeader>
    Update the details of an existing piece of evidence.
  </PageSubHeader>
  <template v-if="isLoading">
    <div class="text-center">
      <p>Loading...</p>
    </div>
  </template>
  <template v-else-if="evidence">
    <EvidenceForm
      :backmatter-resources="backmatterResources"
      :evidence="evidence"
      :updating="true"
      @submit="submit"
    ></EvidenceForm>
  </template>
</template>
<script lang="ts" setup>
import { ref, computed } from 'vue';
import EvidenceForm from './partial/EvidenceForm.vue';
import PageHeader from '@/components/PageHeader.vue';
import PageSubHeader from '@/components/PageSubHeader.vue';
import type {
  Evidence,
  EvidenceLabel,
  EvidenceStatus,
} from '@/stores/evidence.ts';
import { useRoute, useRouter } from 'vue-router';
import { useDataApi, decamelizeKeys } from '@/composables/axios';
import type { BackMatterResource } from '@/oscal';

const route = useRoute();
const router = useRouter();

const { data: evidenceData, isLoading } = useDataApi<Evidence>(
  `/api/evidence/${route.params.id}`,
  null,
);
const backmatterResources = ref<BackMatterResource[]>([]);

const evidence = computed<Partial<Evidence>>(() => {
  if (!evidenceData.value) {
    return {};
  }
  return {
    ...evidenceData.value,
    start: '',
    end: '',
  };
});

const { data: createdEvidence, execute: createEvidence } = useDataApi<Evidence>(
  '/api/evidence',
  {
    method: 'POST',
    transformRequest: [decamelizeKeys],
  },
  { immediate: false },
);

async function submit(
  updatedEvidence: Partial<Evidence>,
  labels: EvidenceLabel[],
  status: EvidenceStatus,
) {
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
      },
    },
  });
  return await router.push({
    name: 'evidence:view',
    params: { id: createdEvidence.value!.id },
  });
}
</script>
