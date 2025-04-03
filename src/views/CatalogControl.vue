<template>
  <CollapsableGroup>
    <template #header>
      <div class="py-3 px-4">
        {{control.id}} {{ control.title }}
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
      </div>
    </template>
    <div class="px-2 pt-2 pb-8">
      <h4 class="font-medium">Statement:</h4>
      <p>{{ getStatement(control.parts)?.prose }}</p>
      <h4 class="font-medium">Objective:</h4>
      <p>{{ getObjective(control.parts)?.prose }}</p>
      <h4 class="font-medium">Guidance:</h4>
      <p class="whitespace-pre-wrap">{{ getGuidance(control.parts)?.prose }}</p>
    </div>
    <CatalogControl v-for="control in controls" :key="control.id" :control="control" />
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

function getStatement(parts: Part[]) {
  return parts?.find((part) => {
    return part.name == "statement"
  })
}

function getGuidance(parts: Part[]) {
  return parts?.find((part) => {
    return part.name == "guidance"
  })
}

function getObjective(parts: Part[]) {
  return parts?.find((part) => {
    return part.name == "assessment-objective"
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
