<template>
  <CollapsableGroup>
    <template #header>
      <div class="py-2 px-4 flex items-center gap-4">
        <span
          class="bg-green-100 dark:bg-green-800 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-300 rounded-md text-sm whitespace-nowrap px-4 py-1"
        >Capability</span>
        <div class="grow">
          {{ capability.name }}
          <span class="text-gray-400 dark:text-slate-300 text-sm px-2 py-1">{{ capability.description }}</span>
        </div>
        <div class="flex gap-2">
          <TertiaryButton
            class="bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800 text-blue-800 dark:text-blue-200"
            @click.stop="editCapability"
          >
            Edit
          </TertiaryButton>
        </div>
      </div>
    </template>

    <div class="px-4 py-4 dark:bg-slate-950 border-b border-ccf-300 dark:border-slate-700">
      <div class="flex items-start justify-between gap-4">
        <div class="grow">
          <div v-if="capability.description" class="mb-4">
            <h4 class="font-medium text-gray-900 dark:text-slate-300 mb-2">Description</h4>
            <p class="text-gray-700 dark:text-slate-400">{{ capability.description }}</p>
          </div>

          <div v-if="capability.remarks" class="mb-4">
            <h4 class="font-medium text-gray-900 dark:text-slate-300 mb-2">Remarks</h4>
            <p class="text-gray-700 dark:text-slate-400">{{ capability.remarks }}</p>
          </div>

          <div v-if="capability.incorporatesComponents?.length ?? 0 > 0" class="mb-4">
            <h4 class="font-medium text-gray-900 dark:text-slate-300 mb-2">Incorporates Components</h4>
            <div class="space-y-2">
              <div
                v-for="comp in capability.incorporatesComponents"
                :key="comp.componentUuid"
                class="bg-gray-50 dark:bg-slate-800 p-3 rounded-md"
              >
                <div class="flex justify-between items-start">
                  <div>
                    <p class="font-medium text-sm">{{ comp.componentUuid }}</p>
                    <p class="text-sm text-gray-600 dark:text-slate-400">{{ comp.description }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-if="capability.controlImplementations?.length ?? 0 > 0" class="mb-4">
            <h4 class="font-medium text-gray-900 dark:text-slate-300 mb-2">Control Implementations</h4>
            <div class="space-y-2">
              <div
                v-for="impl in capability.controlImplementations"
                :key="impl.uuid"
                class="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md"
              >
                <div class="flex justify-between items-start">
                  <div>
                    <p class="font-medium text-sm">{{ impl.source }}</p>
                    <p class="text-sm text-gray-600 dark:text-slate-400">{{ impl.description }}</p>
                  </div>
                  <span class="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 px-2 py-1 rounded">
                    {{ impl.implementedRequirements?.length || 0 }} requirements
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="rounded-md border border-ccf-300 dark:border-slate-700 min-w-48">
          <table class="table-auto w-full">
            <tbody>
              <tr>
                <td colspan="2" class="px-2 py-2 font-medium">Attributes</td>
              </tr>
              <tr class="border-t border-ccf-300 dark:border-slate-700">
                <td class="px-2 py-1">UUID</td>
                <td class="px-2 py-1 text-xs font-mono">{{ capability.uuid }}</td>
              </tr>
              <tr class="border-t border-ccf-300 dark:border-slate-700">
                <td class="px-2 py-1">Name</td>
                <td class="px-2 py-1">{{ capability.name }}</td>
              </tr>
              <tr class="border-t dark:border-slate-700" v-if="capability.incorporatesComponents?.length ?? 0 > 0">
                <td class="px-2 py-1">Components</td>
                <td class="px-2 py-1">{{ capability.incorporatesComponents?.length }}</td>
              </tr>
              <tr class="border-t dark:border-slate-700" v-if="capability.controlImplementations?.length ?? 0 > 0">
                <td class="px-2 py-1">Controls</td>
                <td class="px-2 py-1">{{ capability.controlImplementations?.length }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </CollapsableGroup>
</template>

<script setup lang="ts">
import CollapsableGroup from '@/components/CollapsableGroup.vue'
import TertiaryButton from '@/components/TertiaryButton.vue'
import type { Capability } from '@/stores/component-definitions'

const props = defineProps<{
  capability: Capability
  componentDefinitionId: string
}>()

const emit = defineEmits<{
  edit: [capability: Capability]
}>()

function editCapability() {
  emit('edit', props.capability)
}
</script>
