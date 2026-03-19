import { computed, toValue, type MaybeRefOrGetter } from 'vue';
import { useDataApi } from '@/composables/axios';
import type { ProfileComplianceProgress } from '@/types/compliance';

interface LoadComplianceOptions {
  includeControls?: boolean;
  sspId?: string;
}

export function useProfileCompliance(profileId: MaybeRefOrGetter<string>) {
  const {
    data,
    isLoading,
    error,
    execute: executeCompliance,
  } = useDataApi<ProfileComplianceProgress>(null, null, {
    immediate: false,
  });

  const progress = computed(() => data.value);
  const summary = computed(() => progress.value?.summary);
  const controls = computed(() => progress.value?.controls ?? []);
  const groups = computed(() => progress.value?.groups ?? []);

  async function loadCompliance(options: LoadComplianceOptions = {}) {
    const resolvedProfileID = toValue(profileId);

    const params = new URLSearchParams();
    if (typeof options.includeControls === 'boolean') {
      params.set('includeControls', String(options.includeControls));
    }
    if (options.sspId) {
      params.set('sspId', options.sspId);
    }

    const query = params.toString();
    const url = query.length
      ? `/api/oscal/profiles/${resolvedProfileID}/compliance-progress?${query}`
      : `/api/oscal/profiles/${resolvedProfileID}/compliance-progress`;

    await executeCompliance(url);
  }

  return {
    progress,
    summary,
    controls,
    groups,
    isLoading,
    error,
    loadCompliance,
  };
}
