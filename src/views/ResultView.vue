<template>
  <PageHeader>
    {{ result.title }}
  </PageHeader>
  <PageSubHeader>
    {{ result._id }}
  </PageSubHeader>
  <div class="grid grid-cols-2 gap-4 mt-4">
    <PageCard>
      <h3 class="text-lg pl-4 mb-4">Observations</h3>
      <div>
        <div
          v-for="(observation, index) in result.observations"
          :key="observation.id"
          class="px-4 py-2 hover:bg-zinc-100"
        >
          <p class="font-semibold">{{index + 1}}: {{ observation.title }}</p>
          <p class="pt-1">Desc: {{ observation.description }}</p>
        </div>
      </div>
    </PageCard>
    <PageCard>
      <h3 class="text-lg pl-4 mb-4">Findings</h3>
      <div>
        <div v-for="(finding, idx) in result.findings" :key="finding.id" class="p-* px-4 py-2 hover:bg-zinc-100">
          <p class="font-semibold">{{idx + 1}}. {{ finding.title }}</p>
          <p class="pt-1">Desc: {{ finding.description }}</p>
          <p :class="[
                'pt-1',
                'text-black-800', 
              ]">Status:
            <span 
              :class="[
                'inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset', 
                `bg-${getFindingStatusColor(finding.status)}-50`, 
                `text-${getFindingStatusColor(finding.status)}-800`, 
                `ring-${getFindingStatusColor(finding.status)}-600/20`
              ]"
            >
              {{ finding.status }}
            </span>
        </p>
        </div>
      </div>
    </PageCard>
    <PageCard>
      <h3 class="text-lg pl-4 mb-4">Logs</h3>
      <div>
        <div v-for="log in result.assessmentLogEntries" class="px-4 py-2 hover:bg-zinc-100">
          <p class="font-semibold">{{ log.title }}</p>
          <p>{{ log.description }}</p>
        </div>
      </div>
    </PageCard>
  </div>
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import PageCard from '@/components/PageCard.vue'
import PageSubHeader from '@/components/PageSubHeader.vue'
import { type Result, useApiStore } from '@/stores/api'

const apiStore = useApiStore();
const route = useRoute();
const id = route.params.id as string;

const result = ref<Result>({} as Result);

enum FindingStatusColor {
  UNKNOWN = 'grey',
  OPEN = 'red',
  MITIGATED = 'yellow',
  RESOLVED = 'green',
}

function getFindingStatusColor(status?: string): string {
  return FindingStatusColor[status as keyof typeof FindingStatusColor] || FindingStatusColor.UNKNOWN;
}

onMounted(() => {
  apiStore.getResult(id).then((res) => {
    result.value = res.data;
  });
});
</script>

