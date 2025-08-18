<template>
  <div class="space-y-6">
    <!-- UUID -->
    <div v-if="resource.uuid" class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="md:col-span-1">
        <h4 class="text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">
          UUID
        </h4>
      </div>
      <div class="md:col-span-2">
        <code
          class="text-sm bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded text-gray-800 dark:text-slate-300"
          >{{ resource.uuid }}</code
        >
      </div>
    </div>

    <!-- Title -->
    <div v-if="resource.title" class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="md:col-span-1">
        <h4 class="text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">
          Title
        </h4>
      </div>
      <div class="md:col-span-2">
        <p class="text-sm text-gray-900 dark:text-slate-300">
          {{ resource.title }}
        </p>
      </div>
    </div>

    <!-- Description -->
    <div
      v-if="resource.description"
      class="grid grid-cols-1 md:grid-cols-3 gap-4"
    >
      <div class="md:col-span-1">
        <h4 class="text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">
          Description
        </h4>
      </div>
      <div class="md:col-span-2">
        <p
          class="text-sm text-gray-900 dark:text-slate-300 whitespace-pre-wrap"
        >
          {{ resource.description }}
        </p>
      </div>
    </div>

    <!-- Document IDs -->
    <div
      v-if="resource.documentIds?.length"
      class="grid grid-cols-1 md:grid-cols-3 gap-4"
    >
      <div class="md:col-span-1">
        <h4 class="text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">
          Document Identifiers
        </h4>
      </div>
      <div class="md:col-span-2">
        <div class="space-y-2">
          <div
            v-for="docId in resource.documentIds"
            :key="`${docId.scheme}-${docId.identifier}`"
            class="flex items-center gap-2 text-sm"
          >
            <span
              v-if="docId.scheme"
              class="font-medium text-gray-600 dark:text-slate-400"
              >{{ docId.scheme }}:</span
            >
            <span class="text-gray-900 dark:text-slate-300">{{
              docId.identifier
            }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Citation -->
    <div
      v-if="resource.citation?.text"
      class="grid grid-cols-1 md:grid-cols-3 gap-4"
    >
      <div class="md:col-span-1">
        <h4 class="text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">
          Citation
        </h4>
      </div>
      <div class="md:col-span-2">
        <div class="bg-gray-50 dark:bg-slate-800 rounded-md p-3">
          <p class="text-sm text-gray-700 dark:text-slate-300">
            {{ resource.citation.text }}
          </p>
        </div>
      </div>
    </div>

    <!-- External Links -->
    <div
      v-if="resource.rlinks?.length"
      class="grid grid-cols-1 md:grid-cols-3 gap-4"
    >
      <div class="md:col-span-1">
        <h4 class="text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">
          External Links
        </h4>
      </div>
      <div class="md:col-span-2">
        <div class="space-y-2">
          <div
            v-for="rlink in resource.rlinks"
            :key="rlink.href"
            class="flex items-center gap-2"
          >
            <a
              :href="rlink.href"
              target="_blank"
              rel="noopener noreferrer"
              class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm break-all underline"
            >
              {{ rlink.href }}
            </a>
            <span
              v-if="rlink.mediaType"
              class="text-xs text-gray-500 dark:text-slate-400"
            >
              ({{ rlink.mediaType }})
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Base64 Content -->
    <div
      v-if="resource.base64?.value"
      class="grid grid-cols-1 md:grid-cols-3 gap-4"
    >
      <div class="md:col-span-1">
        <h4 class="text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">
          Embedded Content
        </h4>
      </div>
      <div class="md:col-span-2">
        <div class="bg-gray-50 dark:bg-slate-800 rounded-md p-3">
          <div class="text-sm text-gray-600 dark:text-slate-400 mb-2">
            <span v-if="resource.base64.filename"
              >Filename: {{ resource.base64.filename }}</span
            >
            <span v-if="resource.base64.mediaType" class="ml-2"
              >Type: {{ resource.base64.mediaType }}</span
            >
          </div>
          <div
            class="text-xs text-gray-500 dark:text-slate-500 font-mono break-all"
          >
            {{
              resource.base64.value
                ? `${resource.base64.value.substring(0, 100)}...`
                : 'No content'
            }}
          </div>
        </div>
      </div>
    </div>

    <!-- Properties -->
    <div
      v-if="resource.props?.length"
      class="grid grid-cols-1 md:grid-cols-3 gap-4"
    >
      <div class="md:col-span-1">
        <h4 class="text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">
          Properties
        </h4>
      </div>
      <div class="md:col-span-2">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div
            v-for="prop in resource.props"
            :key="`${prop.name}-${prop.value}`"
            class="text-sm"
          >
            <span class="font-medium text-gray-600 dark:text-slate-400"
              >{{ prop.name }}:</span
            >
            <span class="text-gray-700 dark:text-slate-300 ml-1">{{
              prop.value
            }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Remarks -->
    <div v-if="resource.remarks" class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="md:col-span-1">
        <h4 class="text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">
          Remarks
        </h4>
      </div>
      <div class="md:col-span-2">
        <p class="text-sm text-gray-600 dark:text-slate-400">
          {{ resource.remarks }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { type Resource } from '@/stores/plan-of-action-and-milestones';

interface Props {
  resource: Resource;
}

defineProps<Props>();
</script>
