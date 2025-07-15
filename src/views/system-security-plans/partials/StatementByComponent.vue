<script setup lang="ts">
import type { ByComponent, Statement, SystemComponent, SystemSecurityPlan } from '@/stores/system-security-plans.ts'
import { useSystemSecurityPlanStore } from '@/stores/system-security-plans.ts'
import { onMounted, ref } from 'vue'

const props = defineProps<{
  ssp: SystemSecurityPlan,
  statement: Statement,
  byComponent: ByComponent,
}>()
const component = ref<SystemComponent>({} as SystemComponent)

const sspStore = useSystemSecurityPlanStore()

onMounted(() => {
  sspStore.getSystemImplementationComponent(props.ssp.uuid, props.byComponent.componentUuid).then((response) => {
    component.value = response.data
  })
})

function edit() {
  console.log('Edit Statement By Component:', props.statement, props.byComponent)
  alert('Statement By Component editing functionality is in development')
}
</script>

<template>
  <div class="flex justify-between items-start">
    <span class="font-medium">{{ component.title }}</span>
    <button
      @click="edit"
      class="text-blue-600 hover:text-blue-800 dark:text-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      Edit
    </button>
  </div>
  <p class="text-gray-600 dark:text-slate-400 mt-1">
    {{ props.byComponent.description }}
  </p>

  <!-- Export Information -->
  <div v-if="props.byComponent.export" class="mt-2 text-xs">
    <div v-if="props.byComponent.export.provided?.length" class="mb-1">
      <span class="font-medium text-green-700 dark:text-green-400"
        >Provided:</span
      >
      <div class="ml-2">
        <div
          v-for="provided in props.byComponent.export.provided"
          :key="provided.uuid"
          class="text-green-600 dark:text-green-400"
        >
          {{ provided.description }}
        </div>
      </div>
    </div>
    <div v-if="props.byComponent.export.responsibilities?.length" class="mb-1">
      <span class="font-medium text-orange-700 dark:text-orange-400"
        >Responsibilities:</span
      >
      <div class="ml-2">
        <div
          v-for="responsibility in props.byComponent.export.responsibilities"
          :key="responsibility.uuid"
          class="text-orange-600 dark:text-orange-400"
        >
          {{ responsibility.description }}
        </div>
      </div>
    </div>
  </div>

  <!-- Satisfied Requirements -->
  <div v-if="props.byComponent.satisfied?.length" class="mt-2 text-xs">
    <span class="font-medium text-blue-700 dark:text-blue-400">Satisfied:</span>
    <div class="ml-2">
      <div
        v-for="satisfied in props.byComponent.satisfied"
        :key="satisfied.uuid"
        class="text-blue-600 dark:text-blue-400"
      >
        {{ satisfied.description }}
      </div>
    </div>
  </div>

  <!-- Inherited Requirements -->
  <div v-if="props.byComponent.inherited?.length" class="mt-2 text-xs">
    <span class="font-medium text-purple-700 dark:text-purple-400"
      >Inherited:</span
    >
    <div class="ml-2">
      <div
        v-for="inherited in props.byComponent.inherited"
        :key="inherited.uuid"
        class="text-purple-600 dark:text-purple-400"
      >
        {{ inherited.description }}
      </div>
    </div>
  </div>
</template>
