import { computed } from 'vue';
import { useSystemStore } from '@/stores/system.ts';

// The System page's tab views all resolve to whichever SSP is currently "active" (set via
// the SSP list's "Set Active" button) rather than a route param, unlike their SSP-editor
// counterparts. This centralizes that lookup so it isn't repeated in every wrapper view.
export function useActiveSspId() {
  const { system } = useSystemStore();
  return computed(() => system.securityPlan?.uuid ?? '');
}
