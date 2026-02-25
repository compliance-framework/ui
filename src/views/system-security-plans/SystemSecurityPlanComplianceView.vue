<template>
  <div class="mt-6 space-y-6">
    <template v-if="profileLoading || (profileId && isLoading)">
      <PageHeader>Loading compliance progress...</PageHeader>
    </template>

    <template v-else-if="profileResolved && !profileId">
      <div
        class="rounded border border-dashed border-zinc-300 bg-zinc-50 dark:bg-slate-800 dark:border-slate-700 p-6 text-sm text-zinc-600 dark:text-slate-400"
      >
        No profile is attached to this System Security Plan. Attach a profile
        from the
        <RouterLink
          :to="{
            name: 'system-security-plan-overview',
            params: { id: sspId },
          }"
          class="underline text-blue-600 dark:text-blue-400"
        >
          Overview
        </RouterLink>
        tab to view compliance progress.
      </div>
    </template>

    <ComplianceProgressPanel
      v-else-if="hasCurrentProgress && summary"
      :summary="summary"
      :controls="controls"
      :groups="groups"
      :implementation="progress?.implementation"
      progress-title="Overall Compliance Progress"
      :show-detailed-group-breakdown="true"
      :group-not-implemented-count="groupNotImplementedCount"
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
import { computed, onActivated, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import type { AxiosError } from 'axios';
import PageHeader from '@/components/PageHeader.vue';
import ComplianceProgressPanel from '@/components/ComplianceProgressPanel.vue';
import { useProfileCompliance } from '@/composables/useProfileCompliance';
import { useDataApi } from '@/composables/axios';
import type { ErrorBody, ErrorResponse } from '@/stores/types';
import type { Profile } from '@/oscal';

const route = useRoute();
const toast = useToast();

const sspId = computed(() => String(route.params.id || ''));
const profileId = ref<string>('');
const profileResolved = ref(false);
const profileLoading = ref(false);

// Load the SSP's attached profile
const { execute: fetchProfile } = useDataApi<Profile>(null, null, {
  immediate: false,
});

// Once we have a profileId, load compliance data scoped to this SSP
const {
  summary,
  controls,
  groups,
  isLoading,
  error,
  progress,
  loadCompliance,
} = useProfileCompliance(profileId);

const hasCurrentProgress = computed(
  () => progress.value?.scope.id === profileId.value,
);
const hasActivatedOnce = ref(false);

async function loadProfileAndCompliance(currentSspId: string) {
  profileLoading.value = true;
  profileResolved.value = false;
  profileId.value = '';

  try {
    const { data } = await fetchProfile(
      `/api/oscal/system-security-plans/${currentSspId}/profile`,
    );
    const attachedProfile = data.value?.data;
    if (!attachedProfile) {
      return;
    }

    profileId.value = attachedProfile.uuid;
    await loadCompliance({ includeControls: true, sspId: currentSspId });
  } catch (err) {
    const axiosErr = err as AxiosError;
    // 404 just means no profile attached — not an error
    if (axiosErr.response?.status !== 404) {
      toast.add({
        severity: 'error',
        summary: 'Error loading profile',
        detail: 'Unable to load the attached profile for this SSP.',
        life: 4000,
      });
    }
  } finally {
    profileResolved.value = true;
    profileLoading.value = false;
  }
}

watch(
  sspId,
  async (id) => {
    if (!id) {
      profileId.value = '';
      profileLoading.value = false;
      profileResolved.value = true;
      return;
    }

    await loadProfileAndCompliance(id);
  },
  { immediate: true },
);

onActivated(async () => {
  if (!sspId.value) {
    return;
  }

  if (!hasActivatedOnce.value) {
    hasActivatedOnce.value = true;
    return;
  }

  await loadProfileAndCompliance(sspId.value);
});

watch(error, () => {
  if (!error.value) return;
  const errorResponse = error.value as AxiosError<ErrorResponse<ErrorBody>>;
  toast.add({
    severity: 'error',
    summary: 'Error loading compliance progress',
    detail:
      errorResponse.response?.data.errors.body ||
      'Unable to load compliance progress.',
    life: 4000,
  });
});

function groupNotImplementedCount(groupId: string): number {
  return controls.value.filter(
    (control) => control.groupId === groupId && control.implemented === false,
  ).length;
}
</script>
