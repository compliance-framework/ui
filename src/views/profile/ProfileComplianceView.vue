<template>
  <div class="mt-6 space-y-6">
    <template v-if="isLoading">
      <PageHeader>Loading compliance progress...</PageHeader>
    </template>

    <ComplianceProgressPanel
      v-else-if="summary"
      :summary="summary"
      :controls="controls"
      :groups="groups"
      progress-title="Overall Profile Progress"
    />

    <template v-else>
      <div
        class="rounded border border-dashed border-zinc-300 bg-zinc-50 dark:bg-slate-800 dark:border-slate-700 p-6 text-sm text-zinc-600 dark:text-slate-400"
      >
        No compliance data available.
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import type { AxiosError } from 'axios';
import PageHeader from '@/components/PageHeader.vue';
import ComplianceProgressPanel from '@/components/ComplianceProgressPanel.vue';
import { useProfileCompliance } from '@/composables/useProfileCompliance';
import type { ErrorBody, ErrorResponse } from '@/stores/types';

const route = useRoute();
const toast = useToast();

const profileId = computed(() => String(route.params.id || ''));
const { summary, controls, groups, isLoading, error, loadCompliance } =
  useProfileCompliance(profileId);

watch(
  profileId,
  async (id) => {
    if (!id) return;
    await loadCompliance({ includeControls: true });
  },
  { immediate: true },
);

watch(error, () => {
  if (!error.value) return;
  const errorResponse = error.value as AxiosError<ErrorResponse<ErrorBody>>;
  toast.add({
    severity: 'error',
    summary: 'Error loading compliance progress',
    detail:
      errorResponse.response?.data.errors.body ||
      'Unable to load profile compliance progress.',
    life: 4000,
  });
});
</script>
