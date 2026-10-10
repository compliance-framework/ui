import { computed } from 'vue';
import { useDataApi } from '@/composables/axios';

interface EvidenceConfig {
  manualSubjectRequired: boolean;
}

/**
 * Evidence submission settings from GET /api/evidence/config. An API without the endpoint
 * doesn't require a subject.
 */
export function useEvidenceConfig() {
  const { data } = useDataApi<EvidenceConfig>('/api/evidence/config');

  const manualSubjectRequired = computed(
    () => data.value?.manualSubjectRequired === true,
  );

  return { manualSubjectRequired };
}
