<template>
  <PageCard>
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
import { useProfileStore, type Merge, type MergeOptions } from '@/stores/profiles';
import { ref, watch, onActivated, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import PrimaryButton from '@/components/PrimaryButton.vue';

const profileStore = useProfileStore();
const route = useRoute();
const toast = useToast();
const merge = ref<Merge>({} as Merge);
const id = route.params.id as string;

const mergeType = ref<MergeOptions>('asIs');
const combineEnabled = ref(false);

function updateMerge() {
  profileStore.updateMerge(id, merge.value).then(() => {
    toast.add({
      severity: 'success',
      summary: 'Merge settings updated successfully',
      life: 3000,
    });
  }).catch(async (response) => {
    const error = await response.json();
    toast.add({
      severity: 'error',
      summary: `Error updating merge settings - ${response.statusText}`,
      detail: error.errors.body,
      life: 3000,
    });
  });
}

function loadMergeData() {
  if (id) {
    profileStore.getMerge(id).then(resp => {
      merge.value = resp.data;
      // Set mergeType and combineEnabled based on loaded data
      if ('flat' in merge.value) {
        mergeType.value = 'flat';
      } else if ('custom' in merge.value) {
        mergeType.value = 'custom';
      } else {
        mergeType.value = 'asIs';
      }
      combineEnabled.value = !!merge.value.combine;
    }).catch(async (response) => {
      const error = await response.json();
      toast.add({
        severity: 'error',
        summary: `Error loading merge settings - ${response.statusText}`,
        detail: error.errors.body,
        life: 3000,
      });
    });
  }
}

onActivated(() => {
  loadMergeData();
});

onMounted(() => {
  loadMergeData();
});

// Watch mergeType and update merge object
watch(mergeType, (type) => {
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
  if (enabled) {
    if (!merge.value.combine) {
      merge.value.combine = { method: 'use-first' };
    }
  } else {
    merge.value.combine = undefined;
  }
});
</script>
