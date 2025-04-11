<template>
  <CollapsableGroup>
    <template #header>
      <div class="py-2 px-4 flex items-center gap-4">
        <span class="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 text-gray-800 dark:text-slate-300 rounded-md text-sm whitespace-nowrap px-4 py-1">{{control.id}}</span>
        <div class="grow">
          {{ control.title }}
        </div>
        <ResultStatusBadge v-if="compliance"
          :gray="
                    compliance?.reduce(
                      (total, current) =>
                        ['satisfied', 'not satisfied'].includes(
                          current.status?.toLowerCase(),
                        )
                          ? total
                          : total + current.count,
                      0,
                    )
                  "
          :red="
                    compliance?.reduce(
                      (total, current) =>
                        current.status?.toLowerCase() == 'not satisfied'
                          ? total + current.count
                          : total,
                      0,
                    )
                  "
          :green="
                    compliance?.reduce(
                      (total, current) =>
                        current.status?.toLowerCase() == 'satisfied'
                          ? total + current.count
                          : total,
                      0,
                    )
                  "
        ></ResultStatusBadge>
        <RouterLink
          class="bg-white hover:bg-zinc-100 border px-4 py-1 rounded-md dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700"
          :to="{ name: 'catalog-control-findings', params: { class: control.class, id: control.id } }"
        >Findings
        </RouterLink>
      </div>
    </template>
    <div class="px-4 py-4 border-b dark:border-slate-700">
      <template v-if="hasPart('statement')">
        <p class="whitespace-pre-wrap">{{ getPart('statement')?.prose }}</p>
      </template>

      <template v-if="hasPart('assessment-objective')">
        <h4 class="font-medium mt-2">Objective:</h4>
        <p class="whitespace-pre-wrap">{{ getPart('assessment-objective')?.prose }}</p>
      </template>

      <template v-if="hasPart('guidance')">
        <h4 class="font-medium mt-2">Guidance:</h4>
        <p class="whitespace-pre-wrap">{{ getPart('guidance')?.prose }}</p>
      </template>
      <div
        class="my-4 rounded-md bg-white dark:bg-slate-900 border-collapse border dark:border-slate-700"
      >
        <CatalogControl v-for="control in controls" :key="control.id" :control="control" />
      </div>
    </div>
  </CollapsableGroup>
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import CollapsableGroup from '@/components/CollapsableGroup.vue'
import { type Control, useControlStore } from '@/stores/controls.ts'
import type { Part } from '@/stores/types.ts'
import { type ComplianceIntervalStatus, useFindingsStore } from '@/stores/findings.ts'
import ResultStatusBadge from '@/components/ResultStatusBadge.vue'

const props = defineProps<{
  control: Control,
}>()

const controlStore = useControlStore()
const findingStore = useFindingsStore();
const controls = ref<Control[]>([]);
const compliance = ref<ComplianceIntervalStatus[]|null>(null);

function hasPart(type: string) {
  return props.control.parts?.find((part) => {
    return part.name == type
  })
}

function getPart(type: string) {
  return props.control.parts?.find((part) => {
    return part.name == type
  })
}

onMounted(() => {
  controlStore.children(props.control).then((data) => {
    controls.value = data.data
  })
  findingStore.getComplianceForControl(props.control.class, props.control.id).then((data) => {
    compliance.value = data.data
  })
})
</script>
