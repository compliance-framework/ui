import { ref, nextTick, watch } from 'vue';
import { useSystemSecurityPlanStore } from '@/stores/system-security-plans';
import { useToast } from 'primevue/usetoast';
import { getErrorStatus, getErrorDetail } from '@/utils/httpErrors';

export function useSspProfileBindings(
  getSspId: () => string | undefined,
  onProfilesUpdated?: (currentProfiles: string[]) => Promise<void>,
) {
  const sspStore = useSystemSecurityPlanStore();
  const toast = useToast();

  const selectedProfiles = ref<string[]>([]);
  const profileSaveInProgress = ref(false);
  let updatingProfiles = false;
  let suppressProfileWatch = false;

  async function setSelectedProfilesWithoutSaving(profileIds: string[]) {
    suppressProfileWatch = true;
    selectedProfiles.value = profileIds;
    await nextTick();
    suppressProfileWatch = false;
  }

  async function refreshSelectedProfiles() {
    const sspId = getSspId();
    if (!sspId) return;
    const result = await sspStore.listProfiles(sspId);
    await setSelectedProfilesWithoutSaving(
      result.data?.map((p) => p.uuid) || [],
    );
  }

  async function loadInitialProfiles() {
    try {
      await refreshSelectedProfiles();
    } catch (error) {
      if (getErrorStatus(error) !== 404) {
        toast.add({
          severity: 'error',
          summary: 'Error Loading Profiles',
          detail: await getErrorDetail(
            error,
            'An error occurred while loading profiles.',
          ),
          life: 3000,
        });
      }
    }
  }

  watch(
    () => [...selectedProfiles.value],
    async (newVal, oldVal) => {
      if (suppressProfileWatch || updatingProfiles) return;

      const sspId = getSspId();
      if (!sspId) return;

      const added = newVal.filter((id) => !oldVal.includes(id));
      const removed = oldVal.filter((id) => !newVal.includes(id));

      if (added.length === 0 && removed.length === 0) return;

      updatingProfiles = true;
      profileSaveInProgress.value = true;

      try {
        for (const profileId of added) {
          await sspStore.addProfile(sspId, profileId);
        }
        for (const profileId of removed) {
          await sspStore.removeProfile(sspId, profileId);
        }

        toast.add({
          severity: 'success',
          summary: 'Profiles updated',
          life: 3000,
        });
        await onProfilesUpdated?.(newVal);
      } catch (error) {
        const status = getErrorStatus(error);
        const detail = await getErrorDetail(
          error,
          `Received error status from API. Status: ${status ?? 'unknown'}`,
        );

        try {
          await refreshSelectedProfiles();
        } catch {
          await setSelectedProfilesWithoutSaving(oldVal);
        }

        await onProfilesUpdated?.(selectedProfiles.value);

        toast.add({
          severity: 'error',
          summary: 'Failed to update profiles',
          detail,
          life: 3000,
        });
      } finally {
        updatingProfiles = false;
        profileSaveInProgress.value = false;
      }
    },
  );

  return {
    selectedProfiles,
    profileSaveInProgress,
    loadInitialProfiles,
  };
}
