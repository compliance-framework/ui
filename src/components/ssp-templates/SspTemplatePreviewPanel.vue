<template>
  <PageCard>
    <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
      <div>
        <h3 class="font-medium text-gray-900 dark:text-slate-200">Preview</h3>
        <p class="text-sm text-gray-500 dark:text-slate-400">
          What discovery would do now with the saved template. Nothing is
          written.
        </p>
      </div>
      <SecondaryButton :disabled="isLoading" @click="runPreview">
        {{ isLoading ? 'Previewing...' : 'Preview' }}
      </SecondaryButton>
    </div>

    <p v-if="errorMessage" class="text-sm text-red-500">{{ errorMessage }}</p>

    <div v-else-if="preview" class="space-y-4 text-sm">
      <p class="text-gray-600 dark:text-slate-400" data-testid="preview-counts">
        {{ newSsps.length }} SSP(s) to create, {{ existingSsps }} already
        created. {{ preview.missingKeys }} matching stream(s) lack a key label.
      </p>

      <div
        v-for="ssp in preview.ssps"
        :key="formatKeyValues(ssp.keyValues)"
        class="rounded-md border border-ccf-300 dark:border-slate-700 p-3"
        data-testid="preview-ssp"
      >
        <div class="flex flex-wrap items-center gap-2">
          <span class="font-medium text-gray-900 dark:text-slate-200">
            {{ ssp.title }}
          </span>
          <Badge
            :value="ssp.exists ? 'Exists' : 'New'"
            :severity="ssp.exists ? 'secondary' : 'success'"
          />
          <span class="text-gray-500 dark:text-slate-400">
            {{ formatKeyValues(ssp.keyValues) }} · {{ ssp.streams }} stream(s)
          </span>
        </div>
        <ul class="mt-2 space-y-1 text-gray-700 dark:text-slate-300">
          <li v-for="(entry, index) in ssp.learn" :key="`learn-${index}`">
            Learn: <code>{{ formatLabels(entry) }}</code>
          </li>
          <li
            v-for="(entry, index) in ssp.skippedByException ?? []"
            :key="`skip-${index}`"
            class="text-amber-700 dark:text-amber-400"
          >
            Skipped by exception: <code>{{ formatLabels(entry) }}</code>
          </li>
        </ul>
      </div>

      <div v-if="preview.belowThreshold?.length">
        <h4 class="font-medium text-gray-900 dark:text-slate-200 mb-1">
          Below the minimum streams
        </h4>
        <ul class="text-gray-600 dark:text-slate-400">
          <li
            v-for="group in preview.belowThreshold"
            :key="formatKeyValues(group.keyValues)"
            data-testid="preview-below-threshold"
          >
            {{ formatKeyValues(group.keyValues) }}: {{ group.streams }}
            stream(s)
          </li>
        </ul>
      </div>

      <div v-if="preview.invalid?.length">
        <h4 class="font-medium text-gray-900 dark:text-slate-200 mb-1">
          Invalid key values
        </h4>
        <ul class="text-red-600 dark:text-red-400">
          <li
            v-for="group in preview.invalid"
            :key="formatKeyValues(group.keyValues)"
            data-testid="preview-invalid"
          >
            {{ formatKeyValues(group.keyValues) }}: {{ group.reason }}
          </li>
        </ul>
      </div>
    </div>
  </PageCard>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { decamelizeKeys, useDataApi } from '@/composables/axios';
import { getErrorDetail } from '@/utils/httpErrors';
import Badge from '@/volt/Badge.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import PageCard from '@/components/PageCard.vue';
import {
  formatKeyValues,
  formatLabels,
  SSP_TEMPLATE_PREVIEW_STOP_PATHS,
  toSspTemplateRequest,
  type SspTemplate,
  type SspTemplatePreview,
} from '@/types/ssp-templates';

const props = defineProps<{ template: SspTemplate }>();

const errorMessage = ref('');

const {
  data: preview,
  isLoading,
  execute,
} = useDataApi<SspTemplatePreview>(
  '/api/admin/ssp-templates/preview',
  {
    method: 'POST',
    transformRequest: [decamelizeKeys],
    camelcaseStopPaths: SSP_TEMPLATE_PREVIEW_STOP_PATHS,
  },
  { immediate: false },
);

const newSsps = computed(
  () => preview.value?.ssps?.filter((ssp) => !ssp.exists) ?? [],
);
const existingSsps = computed(
  () => (preview.value?.ssps?.length ?? 0) - newSsps.value.length,
);

async function runPreview() {
  errorMessage.value = '';
  try {
    await execute({ data: toSspTemplateRequest(props.template) });
  } catch (error) {
    errorMessage.value = await getErrorDetail(
      error,
      'Failed to preview the template.',
    );
  }
}
</script>
