<template>
  <div class="space-y-4">
    <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <article
        v-for="card in statsCards"
        :key="card.label"
        class="border border-[var(--ui-v2-border)] bg-[var(--ui-v2-card)] p-5"
      >
        <p
          class="ui-v2-label text-[11px] text-[var(--ui-v2-secondary-foreground)]"
        >
          {{ card.label }}
        </p>
        <p class="ui-v2-metric mt-1 text-[var(--ui-v2-foreground)]">
          {{ card.value }}
        </p>
      </article>
    </section>

    <section
      class="border border-[var(--ui-v2-border)] bg-[var(--ui-v2-card)] p-5"
    >
      <div class="flex items-center">
        <h2 class="ui-v2-card-title text-[var(--ui-v2-foreground)]">
          COMPLIANCE PREVIEW
        </h2>
      </div>

      <div class="mt-3 flex items-center">
        <p
          class="ui-v2-label text-[11px] text-[var(--ui-v2-secondary-foreground)]"
        >
          {{ complianceMetaLabel }}
        </p>
      </div>

      <template v-if="showComplianceLoading">
        <div class="mt-3 grid gap-2 md:grid-cols-3">
          <div
            v-for="index in 3"
            :key="`overview-compliance-skeleton-${index}`"
            class="h-[72px] border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)]"
          />
        </div>
        <div
          class="mt-2 h-[10px] border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)]"
        />
      </template>

      <template v-else-if="showNoProfileState">
        <div
          class="mt-3 flex gap-2.5 border border-[color:var(--ui-v2-info)_/_0.3] bg-[color:var(--ui-v2-info)_/_0.1] p-4"
        >
          <div class="w-[3px] shrink-0 bg-[var(--ui-v2-info)]" />
          <div class="space-y-1">
            <p class="ui-v2-label text-[11px] text-[var(--ui-v2-foreground)]">
              NO PROFILE IS ATTACHED TO THIS SYSTEM SECURITY PLAN.
            </p>
            <p
              class="ui-v2-nav text-[11px] text-[var(--ui-v2-muted-foreground)]"
            >
              Attach a profile using the PROFILE selector above to view
              progress.
            </p>
          </div>
        </div>
      </template>

      <template v-else-if="showNoDataOrErrorState">
        <div
          class="mt-3 flex gap-2.5 border border-[color:var(--ui-v2-primary)_/_0.3] bg-[color:var(--ui-v2-primary)_/_0.1] p-4"
        >
          <div class="w-[3px] shrink-0 bg-[var(--ui-v2-primary)]" />
          <div class="space-y-1">
            <p class="ui-v2-label text-[11px] text-[var(--ui-v2-foreground)]">
              {{ warningBannerTitle }}
            </p>
            <p
              class="ui-v2-nav text-[11px] text-[var(--ui-v2-muted-foreground)]"
            >
              {{ warningBannerBody }}
            </p>
          </div>
        </div>
        <p
          class="ui-v2-nav mt-3 text-[11px] text-[var(--ui-v2-secondary-foreground)]"
        >
          {{ noDataFooterText }}
        </p>
      </template>

      <template v-else>
        <div class="mt-3 grid gap-2 md:grid-cols-5">
          <article
            v-for="item in summaryItems"
            :key="item.label"
            class="space-y-0.5 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] p-3"
          >
            <p
              class="ui-v2-label text-[10px] text-[var(--ui-v2-secondary-foreground)]"
            >
              {{ item.label }}
            </p>
            <p
              class="font-[var(--ui-v2-font-primary)] text-2xl font-bold"
              :class="item.valueClass"
            >
              {{ item.value }}
            </p>
          </article>
        </div>

        <div class="mt-3 space-y-1.5">
          <div class="ui-v2-nav flex items-center justify-between text-[11px]">
            <span class="text-[var(--ui-v2-secondary-foreground)]">
              {{ satisfiedCount }}/{{ totalControls }} CONTROLS SATISFIED
            </span>
            <span class="font-bold text-[var(--ui-v2-foreground)]">
              {{ compliancePercent }}%
            </span>
          </div>

          <div
            class="flex h-[10px] overflow-hidden border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)]"
          >
            <div
              class="h-full bg-[var(--ui-v2-success)]"
              :style="{ width: `${satisfiedBarPercent}%` }"
            />
            <div
              class="h-full bg-[var(--ui-v2-error)]"
              :style="{ width: `${notSatisfiedBarPercent}%` }"
            />
            <div
              class="h-full bg-[var(--ui-v2-tertiary-foreground)]"
              :style="{ width: `${unknownBarPercent}%` }"
            />
          </div>
        </div>

        <div class="mt-2 space-y-1.5">
          <div class="ui-v2-nav flex items-center justify-between text-[11px]">
            <span class="text-[var(--ui-v2-secondary-foreground)]">
              IMPLEMENTATION COVERAGE
            </span>
            <span class="font-bold text-[var(--ui-v2-foreground)]">
              {{ implementationPercent }}%
            </span>
          </div>

          <div
            class="flex h-[10px] overflow-hidden border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)]"
          >
            <div
              class="h-full bg-[var(--ui-v2-info)]"
              :style="{ width: `${implementationPercent}%` }"
            />
          </div>

          <p
            class="ui-v2-nav text-[11px] text-[var(--ui-v2-secondary-foreground)]"
          >
            {{ implementedControls }} IMPLEMENTED / {{ unimplementedControls }}
            NOT IMPLEMENTED
          </p>
        </div>
      </template>
    </section>

    <section
      class="border border-[var(--ui-v2-border)] bg-[var(--ui-v2-card)] p-5"
    >
      <h2 class="ui-v2-card-title text-[var(--ui-v2-foreground)]">
        SYSTEM CHARACTERISTICS SUMMARY
      </h2>

      <div class="mt-3 grid gap-4 md:grid-cols-2">
        <div class="space-y-2">
          <div class="space-y-0.5">
            <p
              class="ui-v2-label text-[11px] text-[var(--ui-v2-secondary-foreground)]"
            >
              SYSTEM NAME
            </p>
            <p
              class="ui-v2-nav text-[12px] font-bold text-[var(--ui-v2-foreground)]"
            >
              {{ systemName }}
            </p>
          </div>

          <div class="space-y-0.5">
            <p
              class="ui-v2-label text-[11px] text-[var(--ui-v2-secondary-foreground)]"
            >
              SYSTEM NAME (SHORT)
            </p>
            <p
              class="ui-v2-nav text-[12px] font-bold text-[var(--ui-v2-foreground)]"
            >
              {{ systemNameShort }}
            </p>
          </div>

          <div class="space-y-0.5">
            <p
              class="ui-v2-label text-[11px] text-[var(--ui-v2-secondary-foreground)]"
            >
              SECURITY SENSITIVITY LEVEL
            </p>
            <p
              class="ui-v2-nav text-[12px] font-bold text-[var(--ui-v2-foreground)]"
            >
              {{ securitySensitivity }}
            </p>
          </div>
        </div>

        <div class="space-y-2">
          <div class="space-y-0.5">
            <p
              class="ui-v2-label text-[11px] text-[var(--ui-v2-secondary-foreground)]"
            >
              DATE AUTHORIZED
            </p>
            <p
              class="ui-v2-nav text-[12px] font-bold text-[var(--ui-v2-foreground)]"
            >
              {{ dateAuthorized }}
            </p>
          </div>

          <div class="space-y-0.5">
            <p
              class="ui-v2-label text-[11px] text-[var(--ui-v2-secondary-foreground)]"
            >
              DESCRIPTION
            </p>
            <p
              class="ui-v2-nav text-[11px] font-semibold text-[var(--ui-v2-muted-foreground)]"
            >
              {{ systemDescription }}
            </p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, watch } from 'vue';
import { useRoute } from 'vue-router';
import type {
  InventoryItem,
  LeveragedAuthorization,
  SystemCharacteristics,
  SystemComponent,
  SystemUser,
} from '@/oscal';
import { useDataApi } from '@/composables/axios';
import { useProfileCompliance } from '@/composables/useProfileCompliance';
import {
  sspDetailProfileBindingKey,
  type SspDetailProfileBinding,
} from './sspDetailProfileBinding';

const route = useRoute();
const sspId = computed(() => String(route.params.id || ''));

const { data: systemCharacteristics, execute: loadSystemCharacteristics } =
  useDataApi<SystemCharacteristics>(null, null, {
    immediate: false,
  });

const { data: users, execute: loadUsers } = useDataApi<SystemUser[]>(
  null,
  null,
  { immediate: false },
);

const { data: components, execute: loadComponents } = useDataApi<
  SystemComponent[]
>(null, null, { immediate: false });

const { data: inventoryItems, execute: loadInventory } = useDataApi<
  InventoryItem[]
>(null, null, { immediate: false });

const { data: leveragedAuthorizations, execute: loadAuthorizations } =
  useDataApi<LeveragedAuthorization[]>(null, null, { immediate: false });

const profileBinding = inject<SspDetailProfileBinding | null>(
  sspDetailProfileBindingKey,
  null,
);

const profileItems = computed(() => profileBinding?.profileItems.value || []);
const profileResolved = computed(
  () => profileBinding?.profileResolved.value || false,
);
const selectedProfileId = computed(
  () => profileBinding?.selectedProfileId.value || '',
);

const {
  progress,
  summary,
  isLoading: complianceLoading,
  error: complianceError,
  loadCompliance,
} = useProfileCompliance(selectedProfileId);

watch(
  sspId,
  async (id) => {
    if (!id) {
      systemCharacteristics.value = undefined;
      users.value = undefined;
      components.value = undefined;
      inventoryItems.value = undefined;
      leveragedAuthorizations.value = undefined;
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
      loadInventory(
        `/api/oscal/system-security-plans/${id}/system-implementation/inventory-items`,
      ),
      loadAuthorizations(
        `/api/oscal/system-security-plans/${id}/system-implementation/leveraged-authorizations`,
      ),
    ]);
  },
  { immediate: true },
);

watch(
  [sspId, selectedProfileId],
  async ([id, profileId]) => {
    if (!id || !profileId) {
      return;
    }

    await loadCompliance({
      includeControls: false,
      sspId: id,
    });
  },
  { immediate: true },
);

const statsCards = computed(() => [
  { label: 'USERS', value: users.value?.length || 0 },
  { label: 'COMPONENTS', value: components.value?.length || 0 },
  {
    label: 'AUTHORIZATIONS',
    value: leveragedAuthorizations.value?.length || 0,
  },
  { label: 'INVENTORY', value: inventoryItems.value?.length || 0 },
]);

const selectedProfileLabel = computed(() => {
  const selected = profileItems.value.find(
    (item) => item.value === selectedProfileId.value,
  );
  return selected?.label || '';
});

const complianceMetaLabel = computed(() => {
  if (!selectedProfileId.value) {
    return 'NO PROFILE IS ATTACHED';
  }

  return `PROFILE: ${selectedProfileLabel.value.toUpperCase()}`;
});

const hasCurrentCompliance = computed(() =>
  Boolean(
    progress.value &&
      selectedProfileId.value &&
      progress.value.scope.id === selectedProfileId.value,
  ),
);

const totalControls = computed(() =>
  hasCurrentCompliance.value ? summary.value?.totalControls || 0 : 0,
);
const satisfiedCount = computed(() =>
  hasCurrentCompliance.value ? summary.value?.satisfied || 0 : 0,
);
const notSatisfiedCount = computed(() =>
  hasCurrentCompliance.value ? summary.value?.notSatisfied || 0 : 0,
);
const unknownCount = computed(() =>
  hasCurrentCompliance.value ? summary.value?.unknown || 0 : 0,
);

const compliancePercent = computed(() =>
  hasCurrentCompliance.value ? summary.value?.compliancePercent || 0 : 0,
);
const assessedPercent = computed(() =>
  hasCurrentCompliance.value ? summary.value?.assessedPercent || 0 : 0,
);

const implementedControls = computed(() => {
  if (!hasCurrentCompliance.value) {
    return 0;
  }

  return (
    progress.value?.implementation?.implementedControls ||
    summary.value?.implementedControls ||
    0
  );
});

const unimplementedControls = computed(() => {
  if (!hasCurrentCompliance.value) {
    return 0;
  }

  if (progress.value?.implementation) {
    return progress.value.implementation.unimplementedControls;
  }

  return Math.max(totalControls.value - implementedControls.value, 0);
});

const implementationPercent = computed(() => {
  if (!hasCurrentCompliance.value) {
    return 0;
  }

  if (progress.value?.implementation) {
    return progress.value.implementation.implementationPercent;
  }

  return calculatePercent(implementedControls.value, totalControls.value);
});

const showComplianceLoading = computed(
  () =>
    Boolean(selectedProfileId.value) &&
    (complianceLoading.value ||
      (!hasCurrentCompliance.value && !complianceError.value)),
);

const showNoProfileState = computed(
  () => !selectedProfileId.value && profileResolved.value,
);

const showNoDataOrErrorState = computed(() => {
  if (!selectedProfileId.value || showComplianceLoading.value) {
    return false;
  }

  if (complianceError.value) {
    return true;
  }

  return hasCurrentCompliance.value && totalControls.value === 0;
});

const warningBannerTitle = computed(() => {
  if (complianceError.value) {
    return 'COMPLIANCE PARTLY AVAILABLE DUE TO DATA SYNC/PROFILE DELAY.';
  }
  return 'NO COMPLIANCE DATA AVAILABLE';
});

const warningBannerBody = computed(() => {
  if (complianceError.value) {
    return 'Compliance results could not be fully loaded for this SSP/profile pair.';
  }
  return 'No compliance results exist yet for this SSP/profile pair.';
});

const noDataFooterText = computed(() => {
  if (complianceError.value) {
    return 'Unable to load compliance data.';
  }
  return 'No compliance data available.';
});

const summaryItems = computed(() => [
  {
    label: 'SATISFIED',
    value: satisfiedCount.value,
    valueClass: 'text-[var(--ui-v2-success)]',
  },
  {
    label: 'NOT SAT',
    value: notSatisfiedCount.value,
    valueClass: 'text-[var(--ui-v2-error)]',
  },
  {
    label: 'UNKNOWN',
    value: unknownCount.value,
    valueClass: 'text-[var(--ui-v2-secondary-foreground)]',
  },
  {
    label: 'COMPLIANCE',
    value: `${compliancePercent.value}%`,
    valueClass: 'text-[var(--ui-v2-info)]',
  },
  {
    label: 'ASSESSED',
    value: `${assessedPercent.value}%`,
    valueClass: 'text-[var(--ui-v2-foreground)]',
  },
]);

const satisfiedBarPercent = computed(() =>
  calculateBarPercent(satisfiedCount.value, totalControls.value),
);
const notSatisfiedBarPercent = computed(() =>
  calculateBarPercent(notSatisfiedCount.value, totalControls.value),
);
const unknownBarPercent = computed(() =>
  calculateBarPercent(unknownCount.value, totalControls.value),
);

const systemName = computed(
  () => systemCharacteristics.value?.systemName || 'N/A',
);
const systemNameShort = computed(
  () => systemCharacteristics.value?.systemNameShort || 'N/A',
);
const securitySensitivity = computed(
  () => systemCharacteristics.value?.securitySensitivityLevel || 'N/A',
);
const dateAuthorized = computed(() =>
  formatDateToken(systemCharacteristics.value?.dateAuthorized?.toString()),
);
const systemDescription = computed(
  () =>
    systemCharacteristics.value?.description ||
    'No system description has been recorded yet.',
);

function calculateBarPercent(part: number, total: number): number {
  if (!total) {
    return 0;
  }

  return Number(((part / total) * 100).toFixed(2));
}

function calculatePercent(part: number, total: number): number {
  if (!total) {
    return 0;
  }

  return Math.round((part / total) * 100);
}

function formatDateToken(dateString?: string): string {
  if (!dateString) {
    return 'N/A';
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString;
  }

  const parsedDate = new Date(dateString);
  if (Number.isNaN(parsedDate.getTime())) {
    return 'N/A';
  }

  const year = parsedDate.getUTCFullYear();
  const month = String(parsedDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(parsedDate.getUTCDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}
</script>
