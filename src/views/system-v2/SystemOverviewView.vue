<script setup lang="ts">
import { computed, watch } from 'vue';
import type {
  InventoryItem,
  LeveragedAuthorization,
  SystemCharacteristics,
  SystemComponent,
  SystemUser,
} from '@/oscal';
import { useSystemStore } from '@/stores/system';
import { useDataApi } from '@/composables/axios';
import V2PageHeader from '@/components/v2/patterns/V2PageHeader.vue';
import PrerequisiteGate from '@/components/v2/system/PrerequisiteGate.vue';
import V2StatePanel from '@/components/v2/system/V2StatePanel.vue';

const systemStore = useSystemStore();

const activePlan = computed(() => systemStore.system.securityPlan);
const activeSspId = computed(() => activePlan.value?.uuid || '');

const {
  data: systemCharacteristics,
  isLoading: characteristicsLoading,
  error: characteristicsError,
  execute: loadSystemCharacteristics,
} = useDataApi<SystemCharacteristics>(null, null, { immediate: false });

const {
  data: users,
  isLoading: usersLoading,
  error: usersError,
  execute: loadUsers,
} = useDataApi<SystemUser[]>(null, null, { immediate: false });

const {
  data: components,
  isLoading: componentsLoading,
  error: componentsError,
  execute: loadComponents,
} = useDataApi<SystemComponent[]>(null, null, { immediate: false });

const {
  data: leveragedAuthorizations,
  isLoading: authorizationsLoading,
  error: authorizationsError,
  execute: loadAuthorizations,
} = useDataApi<LeveragedAuthorization[]>(null, null, { immediate: false });

const {
  data: inventoryItems,
  isLoading: inventoryLoading,
  error: inventoryError,
  execute: loadInventory,
} = useDataApi<InventoryItem[]>(null, null, { immediate: false });

watch(
  activeSspId,
  async (id) => {
    if (!id) {
      systemCharacteristics.value = undefined;
      users.value = undefined;
      components.value = undefined;
      leveragedAuthorizations.value = undefined;
      inventoryItems.value = undefined;
      return;
    }

    await Promise.allSettled([
      loadSystemCharacteristics(
        `/api/oscal/system-security-plans/${id}/system-characteristics`,
      ),
      loadUsers(
        `/api/oscal/system-security-plans/${id}/system-implementation/users`,
      ),
      loadComponents(
        `/api/oscal/system-security-plans/${id}/system-implementation/components`,
      ),
      loadAuthorizations(
        `/api/oscal/system-security-plans/${id}/system-implementation/leveraged-authorizations`,
      ),
      loadInventory(
        `/api/oscal/system-security-plans/${id}/system-implementation/inventory-items`,
      ),
    ]);
  },
  { immediate: true },
);

const isLoading = computed(
  () =>
    characteristicsLoading.value ||
    usersLoading.value ||
    componentsLoading.value ||
    authorizationsLoading.value ||
    inventoryLoading.value,
);

const hasAnyData = computed(
  () =>
    systemCharacteristics.value !== undefined ||
    users.value !== undefined ||
    components.value !== undefined ||
    leveragedAuthorizations.value !== undefined ||
    inventoryItems.value !== undefined,
);

const hasLoadError = computed(() =>
  Boolean(
    characteristicsError.value ||
      usersError.value ||
      componentsError.value ||
      authorizationsError.value ||
      inventoryError.value,
  ),
);

const errorMessage = computed(() => {
  const firstError =
    characteristicsError.value ||
    usersError.value ||
    componentsError.value ||
    authorizationsError.value ||
    inventoryError.value;

  if (!firstError) {
    return 'Unable to load system overview data.';
  }
  if (typeof firstError === 'string') {
    return firstError;
  }
  if (firstError instanceof Error) {
    return firstError.message;
  }
  return 'Unable to load system overview data.';
});

const hasCharacteristics = computed(() => {
  if (!systemCharacteristics.value) {
    return false;
  }

  const model = systemCharacteristics.value;
  return Boolean(
    model.systemName ||
      model.systemNameShort ||
      model.description ||
      model.securitySensitivityLevel ||
      model.dateAuthorized,
  );
});

async function reloadOverview(): Promise<void> {
  if (!activeSspId.value) {
    return;
  }

  await Promise.allSettled([
    loadSystemCharacteristics(
      `/api/oscal/system-security-plans/${activeSspId.value}/system-characteristics`,
    ),
    loadUsers(
      `/api/oscal/system-security-plans/${activeSspId.value}/system-implementation/users`,
    ),
    loadComponents(
      `/api/oscal/system-security-plans/${activeSspId.value}/system-implementation/components`,
    ),
    loadAuthorizations(
      `/api/oscal/system-security-plans/${activeSspId.value}/system-implementation/leveraged-authorizations`,
    ),
    loadInventory(
      `/api/oscal/system-security-plans/${activeSspId.value}/system-implementation/inventory-items`,
    ),
  ]);
}

function formatDate(dateString?: string): string {
  if (!dateString) {
    return 'N/A';
  }
  return new Date(dateString).toLocaleDateString();
}
</script>

<template>
  <div class="space-y-6">
    <V2PageHeader
      eyebrow="System"
      title="System Overview"
      description="Review active system posture and navigate to users, components, and leveraged authorizations."
    />

    <PrerequisiteGate
      v-if="!activePlan"
      title="No active system security plan"
      description="Select an active System Security Plan before working in the System module."
      cta-label="Select active SSP"
      :cta-to="{ name: 'system-security-plans' }"
      hint="Your selected plan drives all System module data."
      eyebrow="Scope Required"
    />

    <template v-else>
      <section
        class="border border-[var(--ui-v2-border)] bg-[var(--ui-v2-card)] p-6"
      >
        <p class="ui-v2-label mb-2 text-[var(--ui-v2-secondary-foreground)]">
          Active Plan
        </p>
        <h2 class="ui-v2-section-title text-[var(--ui-v2-foreground)]">
          {{ activePlan.metadata?.title || 'Untitled System Security Plan' }}
        </h2>
        <p class="ui-v2-meta mt-2 text-[var(--ui-v2-tertiary-foreground)]">
          Version {{ activePlan.metadata?.version || 'N/A' }} ·
          {{ activePlan.uuid }}
        </p>

        <div class="mt-4 flex flex-wrap gap-2">
          <RouterLink
            :to="{ name: 'system:users' }"
            class="ui-v2-nav border border-[var(--ui-v2-border)] bg-[var(--ui-v2-background)] px-3 py-2 text-[var(--ui-v2-foreground)]"
          >
            Manage Users
          </RouterLink>
          <RouterLink
            :to="{ name: 'system:components' }"
            class="ui-v2-nav border border-[var(--ui-v2-border)] bg-[var(--ui-v2-background)] px-3 py-2 text-[var(--ui-v2-foreground)]"
          >
            Manage Components
          </RouterLink>
          <RouterLink
            :to="{ name: 'system:authorizations' }"
            class="ui-v2-nav border border-[var(--ui-v2-border)] bg-[var(--ui-v2-background)] px-3 py-2 text-[var(--ui-v2-foreground)]"
          >
            Manage Authorizations
          </RouterLink>
        </div>
      </section>

      <V2StatePanel
        v-if="isLoading && !hasAnyData"
        kind="loading"
        title="Loading"
        description="Loading system overview data..."
      />

      <V2StatePanel
        v-else-if="hasLoadError"
        kind="error"
        title="Load failed"
        :description="errorMessage"
      >
        <template #actions>
          <button
            type="button"
            class="ui-v2-nav border border-[var(--ui-v2-error)] bg-[var(--ui-v2-error)] px-4 py-2 font-semibold text-[var(--ui-v2-background)]"
            @click="reloadOverview"
          >
            Retry
          </button>
        </template>
      </V2StatePanel>

      <template v-else>
        <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div
            class="border border-[var(--ui-v2-border)] bg-[var(--ui-v2-card)] p-4"
          >
            <p class="ui-v2-label text-[var(--ui-v2-secondary-foreground)]">
              System Users
            </p>
            <p class="ui-v2-metric mt-2 text-[var(--ui-v2-foreground)]">
              {{ users?.length || 0 }}
            </p>
          </div>

          <div
            class="border border-[var(--ui-v2-border)] bg-[var(--ui-v2-card)] p-4"
          >
            <p class="ui-v2-label text-[var(--ui-v2-secondary-foreground)]">
              Components
            </p>
            <p class="ui-v2-metric mt-2 text-[var(--ui-v2-foreground)]">
              {{ components?.length || 0 }}
            </p>
          </div>

          <div
            class="border border-[var(--ui-v2-border)] bg-[var(--ui-v2-card)] p-4"
          >
            <p class="ui-v2-label text-[var(--ui-v2-secondary-foreground)]">
              Authorizations
            </p>
            <p class="ui-v2-metric mt-2 text-[var(--ui-v2-foreground)]">
              {{ leveragedAuthorizations?.length || 0 }}
            </p>
          </div>

          <div
            class="border border-[var(--ui-v2-border)] bg-[var(--ui-v2-card)] p-4"
          >
            <p class="ui-v2-label text-[var(--ui-v2-secondary-foreground)]">
              Inventory
            </p>
            <p class="ui-v2-metric mt-2 text-[var(--ui-v2-foreground)]">
              {{ inventoryItems?.length || 0 }}
            </p>
          </div>
        </section>

        <section
          v-if="hasCharacteristics"
          class="border border-[var(--ui-v2-border)] bg-[var(--ui-v2-card)] p-6"
        >
          <p class="ui-v2-label mb-3 text-[var(--ui-v2-secondary-foreground)]">
            System Characteristics
          </p>

          <div class="grid gap-6 md:grid-cols-2">
            <div v-if="systemCharacteristics?.systemName">
              <p class="ui-v2-label text-[var(--ui-v2-secondary-foreground)]">
                System Name
              </p>
              <p class="mt-1 text-[var(--ui-v2-foreground)]">
                {{ systemCharacteristics.systemName }}
              </p>
            </div>

            <div v-if="systemCharacteristics?.systemNameShort">
              <p class="ui-v2-label text-[var(--ui-v2-secondary-foreground)]">
                System Name (Short)
              </p>
              <p class="mt-1 text-[var(--ui-v2-foreground)]">
                {{ systemCharacteristics.systemNameShort }}
              </p>
            </div>

            <div v-if="systemCharacteristics?.securitySensitivityLevel">
              <p class="ui-v2-label text-[var(--ui-v2-secondary-foreground)]">
                Security Sensitivity
              </p>
              <p class="mt-1 text-[var(--ui-v2-foreground)]">
                {{ systemCharacteristics.securitySensitivityLevel }}
              </p>
            </div>

            <div v-if="systemCharacteristics?.dateAuthorized">
              <p class="ui-v2-label text-[var(--ui-v2-secondary-foreground)]">
                Date Authorized
              </p>
              <p class="mt-1 text-[var(--ui-v2-foreground)]">
                {{
                  formatDate(systemCharacteristics.dateAuthorized.toString())
                }}
              </p>
            </div>

            <div
              v-if="systemCharacteristics?.description"
              class="md:col-span-2"
            >
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
          v-else
          kind="empty"
          title="No characteristics data"
          description="No system characteristics are available for the active plan yet."
        />
      </template>
    </template>
  </div>
</template>
