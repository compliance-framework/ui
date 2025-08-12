<template>
  <PageCard v-if="merge">
    <h1 class="text-2xl font-bold mb-6">Merge Settings</h1>
    <form class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Merge Type</label>
        <select v-model="mergeType" class="w-full rounded border border-ccf-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400">
          <option value="asIs">As Is</option>
          <option value="flat">Flat</option>
          <option disabled value="custom">Custom</option>
        </select>
      </div>
      <div>
        <label class="inline-flex items-center cursor-pointer">
          <input type="checkbox" v-model="combineEnabled" class="form-checkbox h-5 w-5 text-blue-600 rounded border-ccf-300 dark:accent-slate-700 dark:border-slate-700 focus:ring-blue-400" />
          <span class="ml-2 text-sm text-gray-700 dark:text-slate-300">Enable Combine</span>
        </label>
      </div>
      <div v-if="combineEnabled && merge.combine">
        <label class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Combine Method</label>
        <select v-model="merge.combine.method" class="w-full rounded border border-ccf-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400">
          <option value="use-first">Use First</option>
          <option value="flat">Flat</option>
        </select>
      </div>
      <PrimaryButton class="mt-4" @click.prevent="updateMerge()">
        Save Merge Settings
      </PrimaryButton>
    </form>
  </PageCard>
</template>

<script setup lang="ts">
import PageCard from '@/components/PageCard.vue';
import { type Merge, type MergeOptions } from '@/stores/profiles';
import { ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import PrimaryButton from '@/components/PrimaryButton.vue';
import { decamelizeKeys, useDataApi } from '@/composables/axios';
import type { AxiosError } from 'axios';
import type { ErrorResponse, ErrorBody } from '@/stores/types';

const route = useRoute();
const toast = useToast();
const id = route.params.id as string;

const { data: merge } = useDataApi<Merge>(`/api/oscal/profiles/${id}/merge`);
const { data: updatedMerge, execute: updateMergeExecute } = useDataApi<Merge>(`/api/oscal/profiles/${id}/merge`, { method: 'PUT', transformRequest: [decamelizeKeys] }, { immediate: false });

watch(merge, () => {
  if (merge.value) {
    mergeType.value = merge.value.asIs ? 'asIs' : merge.value.flat ? 'flat' : 'custom';
    combineEnabled.value = !!merge.value.combine;
  }
}, { immediate: true });

const mergeType = ref<MergeOptions>('asIs');
const combineEnabled = ref(false);

async function updateMerge() {
  if (!merge.value) { return }
  try {
    await updateMergeExecute({
      data: merge.value
    })
    merge.value = updatedMerge.value;
    toast.add({
      severity: 'success',
      summary: 'Merge settings updated successfully',
      life: 3000,
    });
  } catch (error) {
    const errorResponse = error as AxiosError<ErrorResponse<ErrorBody>>;
    toast.add({
      severity: 'error',
      summary: `Error updating merge settings - ${errorResponse.response?.statusText || 'Unknown error'}`,
      detail: errorResponse.response?.data.errors.body || 'An error occurred while updating merge settings.',
      life: 3000,
    });
  }
}

// Watch mergeType and update merge object
watch(mergeType, (type) => {
  if (!merge.value) return;
  if (type === 'asIs') {
    merge.value.asIs = true;
    delete merge.value.flat;
  } else if (type === 'custom') {
    // not implemented yet
  } else {
    merge.value.flat = {};
    delete merge.value.asIs;
  }
});

// Watch combineEnabled and update merge.combine
watch(combineEnabled, (enabled) => {
  if (!merge.value) return;
  if (enabled) {
    if (!merge.value.combine) {
      merge.value.combine = { method: 'use-first' };
    }
  } else {
    merge.value.combine = undefined;
  }
});
</script>
