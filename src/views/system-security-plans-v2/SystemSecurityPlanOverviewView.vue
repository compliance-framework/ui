<template>
  <div class="space-y-6">
    <V2StatePanel
      v-if="systemSecurityPlanLoading"
      kind="loading"
      title="Loading"
      description="Loading overview details..."
    />

    <V2StatePanel
      v-else-if="systemSecurityPlanError"
      kind="error"
      title="Load failed"
      :description="systemSecurityPlanErrorMessage"
    >
      <template #actions>
        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            class="ui-v2-nav border border-[var(--ui-v2-error)] bg-[var(--ui-v2-error)] px-4 py-2 font-semibold text-[var(--ui-v2-background)]"
            @click="reloadOverview"
          >
            Retry
          </button>
          <RouterLink
            :to="{ name: 'system-security-plans' }"
            class="ui-v2-nav border border-[var(--ui-v2-border)] bg-[var(--ui-v2-background)] px-4 py-2 text-[var(--ui-v2-foreground)]"
          >
            Back to list
          </RouterLink>
        </div>
      </template>
    </V2StatePanel>

    <V2StatePanel
      v-else-if="!systemSecurityPlan"
      kind="empty"
      title="No plan found"
      description="This system security plan is unavailable or has been removed."
      cta-label="Back to list"
      :cta-to="{ name: 'system-security-plans' }"
    />

    <template v-else>
      <section
        class="border border-[var(--ui-v2-border)] bg-[var(--ui-v2-card)] p-6"
      >
        <p class="ui-v2-label mb-3 text-[var(--ui-v2-secondary-foreground)]">
          Metadata
        </p>

        <div class="grid gap-6 md:grid-cols-2">
          <div>
            <p class="ui-v2-label text-[var(--ui-v2-secondary-foreground)]">
              Title
            </p>
            <p class="mt-1 text-[var(--ui-v2-foreground)]">
              {{ systemSecurityPlan.metadata?.title || 'N/A' }}
            </p>
          </div>

          <div>
            <p class="ui-v2-label text-[var(--ui-v2-secondary-foreground)]">
              UUID
            </p>
            <p
              class="ui-v2-meta mt-1 break-all text-[var(--ui-v2-tertiary-foreground)]"
            >
              {{ systemSecurityPlan.uuid }}
            </p>
          </div>

          <div>
            <p class="ui-v2-label text-[var(--ui-v2-secondary-foreground)]">
              Version
            </p>
            <p class="mt-1 text-[var(--ui-v2-foreground)]">
              {{ systemSecurityPlan.metadata?.version || 'N/A' }}
            </p>
          </div>

          <div>
            <p class="ui-v2-label text-[var(--ui-v2-secondary-foreground)]">
              Last Modified
            </p>
            <p class="mt-1 text-[var(--ui-v2-foreground)]">
              {{ formatDate(systemSecurityPlan.metadata?.lastModified) }}
            </p>
          </div>

          <div v-if="systemSecurityPlan.metadata?.published">
            <p class="ui-v2-label text-[var(--ui-v2-secondary-foreground)]">
              Published
            </p>
            <p class="mt-1 text-[var(--ui-v2-foreground)]">
              {{ formatDate(systemSecurityPlan.metadata?.published) }}
            </p>
          </div>

          <div>
            <p
              class="ui-v2-label mb-1 text-[var(--ui-v2-secondary-foreground)]"
            >
              Profile
            </p>
            <Select
              v-model="selectedProfile"
              placeholder="Select profile"
              :loading="loadingProfiles"
              :options="profileItems"
              option-label="name"
              class="w-full"
            />
          </div>

          <div
            v-if="systemSecurityPlan.metadata?.remarks"
            class="md:col-span-2"
          >
            <p class="ui-v2-label text-[var(--ui-v2-secondary-foreground)]">
              Remarks
            </p>
            <p class="mt-1 text-[var(--ui-v2-foreground)]">
              {{ systemSecurityPlan.metadata.remarks }}
            </p>
          </div>
        </div>
      </section>

      <V2StatePanel
        v-if="profileResolved && !attachedProfileId"
        kind="info"
        title="No profile attached"
        description="Select a profile in Metadata to enable compliance and control mapping workflows for this plan."
      />

      <section
        class="border border-[var(--ui-v2-border)] bg-[var(--ui-v2-card)] p-6"
      >
        <p class="ui-v2-label mb-3 text-[var(--ui-v2-secondary-foreground)]">
          Quick Actions
        </p>

        <div class="flex flex-wrap gap-2">
          <RouterLink
            :to="{
              name: 'system-security-plan-characteristics',
              params: { id: sspId },
            }"
            class="ui-v2-nav border border-[var(--ui-v2-border)] bg-[var(--ui-v2-background)] px-3 py-2 text-[var(--ui-v2-foreground)]"
          >
            Edit Characteristics
          </RouterLink>
          <RouterLink
            :to="{
              name: 'system-security-plan-system-implementation',
              params: { id: sspId },
            }"
            class="ui-v2-nav border border-[var(--ui-v2-border)] bg-[var(--ui-v2-background)] px-3 py-2 text-[var(--ui-v2-foreground)]"
          >
            Edit Implementation
          </RouterLink>
          <RouterLink
            :to="{
              name: 'system-security-plan-control-implementation',
              params: { id: sspId },
            }"
            class="ui-v2-nav border border-[var(--ui-v2-border)] bg-[var(--ui-v2-background)] px-3 py-2 text-[var(--ui-v2-foreground)]"
          >
            Edit Controls
          </RouterLink>
          <button
            class="ui-v2-nav border border-[var(--ui-v2-primary)] bg-[var(--ui-v2-primary)] px-3 py-2 font-semibold text-[var(--ui-v2-primary-foreground)]"
            type="button"
            @click="downloadJson"
          >
            Download JSON
          </button>
        </div>
      </section>

      <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div
          class="border border-[var(--ui-v2-border)] bg-[var(--ui-v2-card)] p-4"
          v-for="stat in statsCards"
          :key="stat.label"
        >
          <p class="ui-v2-label text-[var(--ui-v2-secondary-foreground)]">
            {{ stat.label }}
          </p>
          <p class="ui-v2-metric mt-2 text-[var(--ui-v2-foreground)]">
            {{ stat.value }}
          </p>
        </div>
      </section>

      <section
        v-if="systemCharacteristics"
        class="border border-[var(--ui-v2-border)] bg-[var(--ui-v2-card)] p-6"
      >
        <p class="ui-v2-label mb-3 text-[var(--ui-v2-secondary-foreground)]">
          System Characteristics
        </p>

        <div class="grid gap-6 md:grid-cols-2">
          <div v-if="systemCharacteristics.systemName">
            <p class="ui-v2-label text-[var(--ui-v2-secondary-foreground)]">
              System Name
            </p>
            <p class="mt-1 text-[var(--ui-v2-foreground)]">
              {{ systemCharacteristics.systemName }}
            </p>
          </div>

          <div v-if="systemCharacteristics.systemNameShort">
            <p class="ui-v2-label text-[var(--ui-v2-secondary-foreground)]">
              System Name (Short)
            </p>
            <p class="mt-1 text-[var(--ui-v2-foreground)]">
              {{ systemCharacteristics.systemNameShort }}
            </p>
          </div>

          <div v-if="systemCharacteristics.securitySensitivityLevel">
            <p class="ui-v2-label text-[var(--ui-v2-secondary-foreground)]">
              Security Sensitivity
            </p>
            <p class="mt-1 text-[var(--ui-v2-foreground)]">
              {{ systemCharacteristics.securitySensitivityLevel }}
            </p>
          </div>

          <div v-if="systemCharacteristics.dateAuthorized">
            <p class="ui-v2-label text-[var(--ui-v2-secondary-foreground)]">
              Date Authorized
            </p>
            <p class="mt-1 text-[var(--ui-v2-foreground)]">
              {{ formatDate(systemCharacteristics.dateAuthorized.toString()) }}
            </p>
          </div>

          <div v-if="systemCharacteristics.description" class="md:col-span-2">
            <p class="ui-v2-label text-[var(--ui-v2-secondary-foreground)]">
              Description
            </p>
            <p class="mt-1 text-[var(--ui-v2-foreground)]">
              {{ systemCharacteristics.description }}
            </p>
          </div>
        </div>
      </section>

      <V2StatePanel
        v-else-if="systemCharacteristicsLoading"
        kind="loading"
        title="Loading"
        description="Loading system characteristics..."
      />

      <V2StatePanel
        v-else-if="systemCharacteristicsError"
        kind="error"
        title="Load failed"
        :description="systemCharacteristicsErrorMessage"
      />

      <V2StatePanel
        v-else
        kind="empty"
        title="No characteristics data"
        description="No system characteristics have been recorded for this plan yet."
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { AxiosError } from 'axios';
import decamelizeKeys from 'decamelize-keys';
import Select from '@/volt/Select.vue';
import { useToast } from 'primevue/usetoast';
import { useRoute } from 'vue-router';
import type {
  InventoryItem,
  LeveragedAuthorization,
  Profile,
  SystemCharacteristics,
  SystemComponent,
  SystemSecurityPlan,
  SystemUser,
} from '@/oscal';
import type { ErrorBody, ErrorResponse } from '@/stores/types.ts';
import { useDataApi } from '@/composables/axios';
import V2StatePanel from '@/components/v2/system/V2StatePanel.vue';

const route = useRoute();
const toast = useToast();

const sspId = computed(() => String(route.params.id || ''));

const {
  data: systemSecurityPlan,
  isLoading: systemSecurityPlanLoading,
  error: systemSecurityPlanError,
  execute: executeLoadSystemSecurityPlan,
} = useDataApi<SystemSecurityPlan>(
  computed(() => `/api/oscal/system-security-plans/${sspId.value}`),
);

const {
  data: systemCharacteristics,
  isLoading: systemCharacteristicsLoading,
  error: systemCharacteristicsError,
  execute: executeLoadSystemCharacteristics,
} = useDataApi<SystemCharacteristics>(
  computed(
    () =>
      `/api/oscal/system-security-plans/${sspId.value}/system-characteristics`,
  ),
);

const { data: profiles, isLoading: loadingProfiles } = useDataApi<Profile[]>(
  '/api/oscal/profiles',
);

const profileItems = computed(
  () =>
    profiles.value?.map((item) => ({
      name: item.metadata.title,
      value: item.uuid,
    })) || [],
);

const selectedProfile = ref<{ name: string; value: string }>({
  name: '',
  value: '',
});

const attachedProfileId = ref<string>('');
const profileResolved = ref(false);

const systemSecurityPlanErrorMessage = computed(() => {
  if (!systemSecurityPlanError.value) {
    return 'Unable to load system security plan overview.';
  }
  if (typeof systemSecurityPlanError.value === 'string') {
    return systemSecurityPlanError.value;
  }
  if (systemSecurityPlanError.value instanceof Error) {
    return systemSecurityPlanError.value.message;
  }
  return 'Unable to load system security plan overview.';
});

const systemCharacteristicsErrorMessage = computed(() => {
  if (!systemCharacteristicsError.value) {
    return 'Unable to load system characteristics.';
  }
  if (typeof systemCharacteristicsError.value === 'string') {
    return systemCharacteristicsError.value;
  }
  if (systemCharacteristicsError.value instanceof Error) {
    return systemCharacteristicsError.value.message;
  }
  return 'Unable to load system characteristics.';
});

const { execute: executeAttachedProfile } = useDataApi<Profile>(
  null,
  { method: 'GET' },
  { immediate: false },
);

const { execute: attachProfile } = useDataApi<void>(
  null,
  { method: 'PUT' },
  { immediate: false },
);

const { execute: executeSIUsers } = useDataApi<SystemUser[]>(
  null,
  { method: 'GET' },
  { immediate: false },
);

const { execute: executeSIComponents } = useDataApi<SystemComponent[]>(
  null,
  { method: 'GET' },
  { immediate: false },
);

const { execute: executeSIInventory } = useDataApi<InventoryItem[]>(
  null,
  { method: 'GET' },
  { immediate: false },
);

const { execute: executeSILeveragedAuths } = useDataApi<
  LeveragedAuthorization[]
>(null, { method: 'GET' }, { immediate: false });

const { execute: executeDownloadJSON } = useDataApi<SystemSecurityPlan>(
  null,
  { method: 'GET' },
  { immediate: false },
);

const systemImplementationStats = ref({
  users: 0,
  components: 0,
  inventoryItems: 0,
  leveragedAuthorizations: 0,
});

const statsCards = computed(() => [
  { label: 'System Users', value: systemImplementationStats.value.users },
  { label: 'Components', value: systemImplementationStats.value.components },
  {
    label: 'Inventory Items',
    value: systemImplementationStats.value.inventoryItems,
  },
  {
    label: 'Leveraged Authorizations',
    value: systemImplementationStats.value.leveragedAuthorizations,
  },
]);

watch(
  sspId,
  async (id) => {
    if (!id) {
      profileResolved.value = true;
      return;
    }

    profileResolved.value = false;
    await Promise.allSettled([
      loadAttachedProfile(id),
      loadSystemImplementationStats(id),
    ]);
    profileResolved.value = true;
  },
  { immediate: true },
);

watch(selectedProfile, async (profile) => {
  const profileId = profile?.value || '';
  if (!sspId.value || !profileId || profileId === attachedProfileId.value) {
    return;
  }

  try {
    await attachProfile(
      `/api/oscal/system-security-plans/${sspId.value}/profile`,
      {
        data: {
          profileId,
        },
      },
    );

    attachedProfileId.value = profileId;
    toast.add({
      severity: 'success',
      summary: 'Profile Updated',
      life: 2500,
    });
  } catch (error) {
    const errorResponse = error as AxiosError<ErrorResponse<ErrorBody>>;
    toast.add({
      severity: 'error',
      summary: 'Failed to Set Profile',
      detail:
        errorResponse.response?.data.errors.body ||
        'An error occurred while assigning this profile.',
      life: 3000,
    });
  }
});

async function loadAttachedProfile(id: string): Promise<void> {
  try {
    const response = await executeAttachedProfile(
      `/api/oscal/system-security-plans/${id}/profile`,
    );
    const attachedProfile = response.data.value?.data;

    if (!attachedProfile) {
      selectedProfile.value = { name: '', value: '' };
      attachedProfileId.value = '';
      return;
    }

    selectedProfile.value = {
      name: attachedProfile.metadata.title,
      value: attachedProfile.uuid,
    };
    attachedProfileId.value = attachedProfile.uuid;
  } catch (error) {
    const errorResponse = error as AxiosError<ErrorResponse<ErrorBody>>;
    if (errorResponse.response?.status === 404) {
      selectedProfile.value = { name: '', value: '' };
      attachedProfileId.value = '';
      return;
    }

    toast.add({
      severity: 'error',
      summary: 'Error Loading Profile',
      detail:
        errorResponse.response?.data.errors.body ||
        'An error occurred while loading the attached profile.',
      life: 3000,
    });
  }
}

async function reloadOverview(): Promise<void> {
  if (!sspId.value) {
    return;
  }

  await Promise.allSettled([
    executeLoadSystemSecurityPlan(
      `/api/oscal/system-security-plans/${sspId.value}`,
    ),
    executeLoadSystemCharacteristics(
      `/api/oscal/system-security-plans/${sspId.value}/system-characteristics`,
    ),
    loadAttachedProfile(sspId.value),
    loadSystemImplementationStats(sspId.value),
  ]);
  profileResolved.value = true;
}

async function loadSystemImplementationStats(id: string): Promise<void> {
  const [usersResponse, componentsResponse, inventoryResponse, leveragedAuths] =
    await Promise.allSettled([
      executeSIUsers(
        `/api/oscal/system-security-plans/${id}/system-implementation/users`,
      ),
      executeSIComponents(
        `/api/oscal/system-security-plans/${id}/system-implementation/components`,
      ),
      executeSIInventory(
        `/api/oscal/system-security-plans/${id}/system-implementation/inventory-items`,
      ),
      executeSILeveragedAuths(
        `/api/oscal/system-security-plans/${id}/system-implementation/leveraged-authorizations`,
      ),
    ]);

  systemImplementationStats.value = {
    users:
      usersResponse.status === 'fulfilled'
        ? (usersResponse.value.data.value?.data.length ?? 0)
        : 0,
    components:
      componentsResponse.status === 'fulfilled'
        ? (componentsResponse.value.data.value?.data.length ?? 0)
        : 0,
    inventoryItems:
      inventoryResponse.status === 'fulfilled'
        ? (inventoryResponse.value.data.value?.data.length ?? 0)
        : 0,
    leveragedAuthorizations:
      leveragedAuths.status === 'fulfilled'
        ? (leveragedAuths.value.data.value?.data.length ?? 0)
        : 0,
  };
}

async function downloadJson(): Promise<void> {
  if (!systemSecurityPlan.value || !sspId.value) {
    return;
  }

  try {
    const response = await executeDownloadJSON(
      `/api/oscal/system-security-plans/${sspId.value}/full`,
    );
    const data = response.data.value;

    if (!data) {
      throw new Error('No JSON payload returned.');
    }

    const dataStr = JSON.stringify(
      decamelizeKeys(data, { separator: '-', deep: true }),
      null,
      2,
    );

    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ssp-${systemSecurityPlan.value.uuid}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    const errorResponse = error as AxiosError<ErrorResponse<ErrorBody>>;
    toast.add({
      severity: 'error',
      summary: 'Download Failed',
      detail:
        errorResponse.response?.data.errors.body ||
        'Unable to download this SSP JSON right now.',
      life: 3000,
    });
  }
}

function formatDate(dateString?: string): string {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString();
}
</script>
