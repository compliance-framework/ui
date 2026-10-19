<template>
  <PageCard>
    <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
      <div>
        <h3 class="font-medium text-gray-900 dark:text-slate-200">
          Created SSPs
        </h3>
        <p class="text-sm text-gray-500 dark:text-slate-400">
          SSPs this template created. A deleted SSP is not created again until
          you forget it.
        </p>
      </div>
      <SecondaryButton :disabled="isLoading" @click="load()">
        Refresh
      </SecondaryButton>
    </div>

    <p v-if="isLoading" class="text-sm text-gray-500 dark:text-slate-400">
      Loading created SSPs...
    </p>
    <p v-else-if="error" class="text-sm text-red-500">
      Failed to load the created SSPs.
    </p>
    <p
      v-else-if="!instances?.length"
      class="text-sm text-gray-500 dark:text-slate-400"
    >
      This template has not created any SSPs yet.
    </p>
    <div v-else class="overflow-x-auto">
      <table class="w-full min-w-[900px] text-sm">
        <thead class="bg-gray-50 dark:bg-slate-800">
          <tr>
            <th class="text-left p-2 font-semibold">Key values</th>
            <th class="text-left p-2 font-semibold">SSP</th>
            <th class="text-left p-2 font-semibold">Created</th>
            <th class="text-left p-2 font-semibold">Last seen</th>
            <th class="text-left p-2 font-semibold">Last error</th>
            <th class="text-left p-2 font-semibold"></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="instance in instances"
            :key="formatKeyValues(instance.keyValues)"
            class="border-t border-ccf-300 dark:border-slate-700 align-top"
            data-testid="ssp-template-instance"
          >
            <td class="p-2 text-gray-900 dark:text-slate-200">
              {{ formatKeyValues(instance.keyValues) }}
            </td>
            <td class="p-2">
              <RouterLink
                v-if="instance.sspId"
                :to="{
                  name: 'system-security-plan-overview',
                  params: { id: instance.sspId },
                }"
                class="text-blue-600 hover:underline dark:text-blue-400"
              >
                {{ instance.title }}
              </RouterLink>
              <span v-else class="text-gray-500 dark:text-slate-400">
                {{ instance.title }} (deleted)
              </span>
              <Badge
                v-if="instance.stale"
                value="Stale"
                severity="warn"
                class="ml-2"
              />
            </td>
            <td class="p-2 text-gray-600 dark:text-slate-400">
              {{ formatSspTemplateDate(instance.createdAt) }}
            </td>
            <td class="p-2 text-gray-600 dark:text-slate-400">
              {{ formatSspTemplateDate(instance.lastSeenAt) }}
            </td>
            <td class="p-2 text-red-600 dark:text-red-400">
              {{ instance.lastError || '' }}
              <span
                v-if="instance.skippedEntries > 0"
                class="block text-amber-700 dark:text-amber-400"
              >
                {{ instance.skippedEntries }} invalid value(s) skipped
              </span>
            </td>
            <td class="p-2">
              <TertiaryButton
                v-if="!instance.sspId"
                :disabled="!instance.keyHash"
                @click="confirmForget(instance)"
              >
                Forget
              </TertiaryButton>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </PageCard>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';
import { useDataApi } from '@/composables/axios';
import { getErrorDetail } from '@/utils/httpErrors';
import Badge from '@/volt/Badge.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import TertiaryButton from '@/volt/TertiaryButton.vue';
import PageCard from '@/components/PageCard.vue';
import {
  formatKeyValues,
  formatSspTemplateDate,
  SSP_TEMPLATE_INSTANCES_STOP_PATHS,
  type SspTemplateInstance,
} from '@/types/ssp-templates';

const props = defineProps<{ templateId: string }>();

const toast = useToast();
const confirm = useConfirm();

const {
  data: instances,
  isLoading,
  error,
  execute,
} = useDataApi<SspTemplateInstance[]>(
  null,
  { camelcaseStopPaths: SSP_TEMPLATE_INSTANCES_STOP_PATHS },
  { immediate: false },
);

const { execute: executeForget } = useDataApi<void>(
  null,
  { method: 'DELETE' },
  { immediate: false },
);

function load() {
  return execute(`/api/admin/ssp-templates/${props.templateId}/ssps`);
}

function confirmForget(instance: SspTemplateInstance) {
  confirm.require({
    header: 'Forget deleted SSP',
    message: `Forget "${instance.title}"? The next discovery run creates it again if its evidence is still there.`,
    rejectProps: { label: 'Cancel', severity: 'secondary', outlined: true },
    acceptProps: { label: 'Forget' },
    accept: () => forget(instance),
  });
}

async function forget(instance: SspTemplateInstance) {
  try {
    await executeForget(
      `/api/admin/ssp-templates/${props.templateId}/ssps/${encodeURIComponent(instance.keyHash ?? '')}`,
    );
    toast.add({
      severity: 'success',
      summary: 'SSP forgotten',
      detail: `"${instance.title}" can be created again by discovery.`,
      life: 3000,
    });
    await load();
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Forget failed',
      detail: await getErrorDetail(err, 'Failed to forget the SSP.'),
      life: 4000,
    });
  }
}

defineExpose({ load });
load();
</script>
