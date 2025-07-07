<template>
  <div class="space-y-6">
    <!-- UUID -->
    <div v-if="item.uuid" class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="md:col-span-1">
        <h4 class="text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">UUID</h4>
      </div>
      <div class="md:col-span-2">
        <code class="text-sm bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded text-gray-800 dark:text-slate-300">{{ item.uuid }}</code>
      </div>
    </div>

    <!-- Title -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="md:col-span-1">
        <h4 class="text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">Title</h4>
      </div>
      <div class="md:col-span-2">
        <p class="text-sm text-gray-900 dark:text-slate-300">{{ item.title }}</p>
      </div>
    </div>

    <!-- Description -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="md:col-span-1">
        <h4 class="text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">Description</h4>
      </div>
      <div class="md:col-span-2">
        <p class="text-sm text-gray-900 dark:text-slate-300 whitespace-pre-wrap">{{ item.description }}</p>
      </div>
    </div>

    <!-- Properties -->
    <div v-if="item.props && item.props.length > 0" class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="md:col-span-1">
        <h4 class="text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">Properties</h4>
      </div>
      <div class="md:col-span-2">
        <div class="space-y-2">
          <div
            v-for="prop in item.props"
            :key="`${prop.name}-${prop.value}`"
            class="flex items-center gap-2 text-sm"
          >
            <span class="font-medium text-gray-600 dark:text-slate-400">{{ prop.name }}:</span>
            <span class="text-gray-900 dark:text-slate-300">{{ prop.value }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Links -->
    <div v-if="item.links && item.links.length > 0" class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="md:col-span-1">
        <h4 class="text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">Links</h4>
      </div>
      <div class="md:col-span-2">
        <div class="space-y-2">
          <div
            v-for="link in item.links"
            :key="link.href"
            class="text-sm"
          >
            <a
              :href="link.href"
              target="_blank"
              rel="noopener noreferrer"
              class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
            >
              {{ link.href }}
            </a>
            <span v-if="link.rel" class="text-gray-500 dark:text-slate-400 ml-2">({{ link.rel }})</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Origins -->
    <div v-if="item.origins && item.origins.length > 0" class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="md:col-span-1">
        <h4 class="text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">Origins</h4>
      </div>
      <div class="md:col-span-2">
        <div class="space-y-3">
          <div
            v-for="(origin, index) in item.origins"
            :key="index"
            class="border border-gray-200 dark:border-slate-600 rounded p-3"
          >
            <div class="space-y-2">
              <div
                v-for="actor in origin.actors"
                :key="actor.actorUuid"
                class="text-sm"
              >
                <div class="flex items-center gap-2">
                  <span class="font-medium text-gray-600 dark:text-slate-400">Type:</span>
                  <span class="text-gray-900 dark:text-slate-300">{{ actor.type }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="font-medium text-gray-600 dark:text-slate-400">Actor UUID:</span>
                  <code class="text-xs bg-gray-100 dark:bg-slate-700 px-1 py-0.5 rounded text-gray-800 dark:text-slate-300">{{ actor.actorUuid }}</code>
                </div>
                <div v-if="actor.roleId" class="flex items-center gap-2">
                  <span class="font-medium text-gray-600 dark:text-slate-400">Role ID:</span>
                  <span class="text-gray-900 dark:text-slate-300">{{ actor.roleId }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Related Findings -->
    <div v-if="item.relatedFindings && item.relatedFindings.length > 0" class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="md:col-span-1">
        <h4 class="text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">Related Findings</h4>
      </div>
      <div class="md:col-span-2">
        <div class="space-y-2">
          <div
            v-for="finding in item.relatedFindings"
            :key="finding.findingUuid"
            class="text-sm"
          >
            <code class="bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded text-blue-800 dark:text-blue-200">{{ finding.findingUuid }}</code>
          </div>
        </div>
      </div>
    </div>

    <!-- Related Observations -->
    <div v-if="item.relatedObservations && item.relatedObservations.length > 0" class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="md:col-span-1">
        <h4 class="text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">Related Observations</h4>
      </div>
      <div class="md:col-span-2">
        <div class="space-y-2">
          <div
            v-for="observation in item.relatedObservations"
            :key="observation.observationUuid"
            class="text-sm"
          >
            <code class="bg-green-100 dark:bg-green-900 px-2 py-1 rounded text-green-800 dark:text-green-200">{{ observation.observationUuid }}</code>
          </div>
        </div>
      </div>
    </div>

    <!-- Related Risks -->
    <div v-if="item.relatedRisks && item.relatedRisks.length > 0" class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="md:col-span-1">
        <h4 class="text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">Related Risks</h4>
      </div>
      <div class="md:col-span-2">
        <div class="space-y-2">
          <div
            v-for="risk in item.relatedRisks"
            :key="risk.riskUuid"
            class="text-sm"
          >
            <code class="bg-red-100 dark:bg-red-900 px-2 py-1 rounded text-red-800 dark:text-red-200">{{ risk.riskUuid }}</code>
          </div>
        </div>
      </div>
    </div>

    <!-- Remarks -->
    <div v-if="item.remarks" class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="md:col-span-1">
        <h4 class="text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">Remarks</h4>
      </div>
      <div class="md:col-span-2">
        <p class="text-sm text-gray-900 dark:text-slate-300 whitespace-pre-wrap">{{ item.remarks }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { type PoamItem } from '@/stores/plan-of-action-and-milestones.ts'

defineProps<{
  item: PoamItem
}>()
</script> 