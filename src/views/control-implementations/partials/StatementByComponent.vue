<script setup lang="ts">
import { useSystemSecurityPlanStore } from '@/stores/system-security-plans.ts'
import { onMounted, ref } from 'vue'
import type {SystemComponent, ByComponent} from '@/oscal';
import { useSystemStore } from '@/stores/system.ts'

const { byComponent } = defineProps<{
  byComponent: ByComponent,
}>()

const emit = defineEmits<{
  edit: [byComponent: ByComponent]
}>()
const component = ref<SystemComponent>({} as SystemComponent)

const { system } = useSystemStore()

const sspStore = useSystemSecurityPlanStore()

onMounted(() => {
  if (system.securityPlan) {
    sspStore.getSystemImplementationComponent(system.securityPlan.uuid, byComponent.componentUuid).then((response) => {
      component.value = response.data
    })
  }
})

function edit() {
  emit('edit', byComponent)
}
</script>

<template>
  <div class="flex justify-between items-start">
    <span>{{ component.title }}</span>
    <button
      @click="edit"
      class="text-blue-600 hover:text-blue-800 dark:text-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      Edit
    </button>
  </div>
  <p class="text-gray-600 dark:text-slate-400 mt-1">
    {{ byComponent.description }}
  </p>

  <!-- Export Information -->
  <div v-if="byComponent.export" class="mt-2 text-xs">
    <div v-if="byComponent.export.provided?.length" class="mb-1">
      <span class="font-medium text-green-700 dark:text-green-400"
        >Provided:</span
      >
      <div class="ml-2">
        <div
          v-for="provided in byComponent.export.provided"
          :key="provided.uuid"
          class="text-green-600 dark:text-green-400"
        >
          {{ provided.description }}
        </div>
      </div>
    </div>
    <div v-if="byComponent.export.responsibilities?.length" class="mb-1">
      <span class="font-medium text-orange-700 dark:text-orange-400"
        >Responsibilities:</span
      >
      <div class="ml-2">
        <div
          v-for="responsibility in byComponent.export.responsibilities"
          :key="responsibility.uuid"
          class="text-orange-600 dark:text-orange-400"
        >
          {{ responsibility.description }}
        </div>
      </div>
    </div>
  </div>

  <!-- Satisfied Requirements -->
  <div v-if="byComponent.satisfied?.length" class="mt-2 text-xs">
    <span class="font-medium text-blue-700 dark:text-blue-400">Satisfied:</span>
    <div class="ml-2">
      <div
        v-for="satisfied in byComponent.satisfied"
        :key="satisfied.uuid"
        class="text-blue-600 dark:text-blue-400"
      >
        {{ satisfied.description }}
      </div>
    </div>
  </div>

  <!-- Inherited Requirements -->
  <div v-if="byComponent.inherited?.length" class="mt-2 text-xs">
    <span class="font-medium text-purple-700 dark:text-purple-400"
      >Inherited:</span
    >
    <div class="ml-2">
      <div
        v-for="inherited in byComponent.inherited"
        :key="inherited.uuid"
        class="text-purple-600 dark:text-purple-400"
      >
        {{ inherited.description }}
      </div>
    </div>
  </div>
</template>
