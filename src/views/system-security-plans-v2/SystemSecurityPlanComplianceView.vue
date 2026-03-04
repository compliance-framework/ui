<template>
  <div class="space-y-6">
    <V2PageHeader eyebrow="Compliance" title="Compliance Overview" />

    <section
      v-if="profileLoading || (profileId && isLoading)"
      class="border border-[var(--ui-v2-border)] bg-[var(--ui-v2-card)] p-6"
    >
      <p class="ui-v2-nav text-[var(--ui-v2-secondary-foreground)]">Loading</p>
      <p class="mt-2 text-[var(--ui-v2-muted-foreground)]">
        Loading compliance progress...
      </p>
    </section>

    <V2StatePanel
      v-else-if="error"
      kind="error"
      title="Load failed"
      :description="errorMessage"
    >
      <template #actions>
        <button
          type="button"
          class="ui-v2-nav border border-[var(--ui-v2-error)] bg-[var(--ui-v2-error)] px-4 py-2 font-semibold text-[var(--ui-v2-background)]"
          @click="retryLoad"
        >
          Retry
        </button>
      </template>
    </V2StatePanel>

    <section
      v-else-if="profileResolved && !profileId"
      class="border border-[var(--ui-v2-info)] bg-[var(--ui-v2-info-tint-10)] p-6"
    >
      <p class="ui-v2-nav text-[var(--ui-v2-foreground)]">
        No profile attached
      </p>
      <p class="mt-2 text-[var(--ui-v2-foreground)]">
        Attach a profile from
        <RouterLink
          :to="{
            name: 'system-security-plan-overview',
            params: { id: sspId },
          }"
          class="ui-v2-link font-semibold"
        >
          Overview
        </RouterLink>
        to view compliance progress.
      </p>
    </section>

    <section
      v-else-if="hasCurrentProgress && summary"
      class="border border-[var(--ui-v2-border)] bg-[var(--ui-v2-card)] p-5 lg:p-6"
    >
      <ComplianceProgressPanel
        :summary="summary"
        :controls="controls"
        :groups="groups"
        :implementation="progress?.implementation"
        progress-title="Overall Compliance Progress"
        :show-detailed-group-breakdown="true"
        :group-not-implemented-count="groupNotImplementedCount"
      />
    </section>

    <section
      v-else
      class="border border-dashed border-[var(--ui-v2-border)] bg-[var(--ui-v2-background)] p-6"
    >
      <p class="ui-v2-nav text-[var(--ui-v2-secondary-foreground)]">No data</p>
      <p class="mt-2 text-[var(--ui-v2-muted-foreground)]">
        No compliance data available.
      </p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onActivated, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import type { AxiosError } from 'axios';
import ComplianceProgressPanel from '@/components/ComplianceProgressPanel.vue';
import { useProfileCompliance } from '@/composables/useProfileCompliance';
import { useDataApi } from '@/composables/axios';
import type { ErrorBody, ErrorResponse } from '@/stores/types';
import type { Profile } from '@/oscal';
import V2PageHeader from '@/components/v2/patterns/V2PageHeader.vue';
import V2StatePanel from '@/components/v2/system/V2StatePanel.vue';

const route = useRoute();
const toast = useToast();

const sspId = computed(() => String(route.params.id || ''));
const profileId = ref<string>('');
const profileResolved = ref(false);
const profileLoading = ref(false);

const { execute: fetchProfile } = useDataApi<Profile>(null, null, {
  immediate: false,
});

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

const errorMessage = computed(() => {
  if (!error.value) {
    return 'Unable to load compliance progress.';
  }

  if (typeof error.value === 'string') {
    return error.value;
  }

  if (error.value instanceof Error) {
    return error.value.message;
  }

  const errorResponse = error.value as AxiosError<ErrorResponse<ErrorBody>>;
  return (
    errorResponse.response?.data.errors.body ||
    'Unable to load compliance progress.'
  );
});

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

async function retryLoad(): Promise<void> {
  if (!sspId.value) {
    return;
  }

  await loadProfileAndCompliance(sspId.value);
}
</script>
