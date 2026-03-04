<template>
  <V2DetailEditorTemplate
    :loading="isLoading"
    :error-message="loadErrorMessage"
    :has-content="Boolean(systemSecurityPlan)"
    loading-description="Loading system security plan details..."
    empty-title="No plan found"
    empty-description="This system security plan is unavailable or no longer exists."
  >
    <template #header>
      <V2PageHeader
        :title="systemSecurityPlan?.metadata?.title || 'System Security Plan'"
      >
        <template #breadcrumbs>
          <div
            class="ui-v2-nav flex items-center gap-2 text-[var(--ui-v2-secondary-foreground)]"
          >
            <span>System Security Plans</span>
            <span class="text-[var(--ui-v2-tertiary-foreground)]">&gt;</span>
            <span class="truncate text-[var(--ui-v2-foreground)]">
              {{
                systemSecurityPlan?.metadata?.title || 'System Security Plan'
              }}
            </span>
          </div>
        </template>

        <template #metadata>
          <div
            class="ui-v2-meta flex flex-wrap items-center gap-2 text-[var(--ui-v2-tertiary-foreground)]"
          >
            <span
              class="ui-v2-label border px-2 py-0.5"
              :class="
                isActivePlan
                  ? 'border-[var(--ui-v2-success)] bg-[var(--ui-v2-success-tint-10)] text-[var(--ui-v2-success)]'
                  : 'border-[var(--ui-v2-border)] text-[var(--ui-v2-secondary-foreground)]'
              "
            >
              {{ isActivePlan ? 'Active' : 'Inactive' }}
            </span>
            <span
              >Version
              {{ systemSecurityPlan?.metadata?.version || 'N/A' }}</span
            >
            <span>
              Revision Date
              {{ formatDate(systemSecurityPlan?.metadata?.lastModified) }}
            </span>
            <span class="truncate">UUID {{ systemSecurityPlan?.uuid }}</span>
          </div>
        </template>

        <template #actions>
          <RouterLink
            :to="{ name: 'system-security-plans' }"
            class="ui-v2-nav border border-[var(--ui-v2-border)] bg-[var(--ui-v2-background)] px-4 py-2 text-[var(--ui-v2-foreground)]"
          >
            Back to list
          </RouterLink>
        </template>
      </V2PageHeader>
    </template>

    <template #error-actions>
      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          class="ui-v2-nav border border-[var(--ui-v2-error)] bg-[var(--ui-v2-error)] px-4 py-2 font-semibold text-[var(--ui-v2-background)]"
          @click="reloadCurrentPlan"
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

    <template #empty-actions>
      <RouterLink
        :to="{ name: 'system-security-plans' }"
        class="ui-v2-nav border border-[var(--ui-v2-primary)] bg-[var(--ui-v2-primary)] px-4 py-2 font-semibold text-[var(--ui-v2-primary-foreground)]"
      >
        Back to list
      </RouterLink>
    </template>

    <template #tabs>
      <nav
        class="flex overflow-x-auto border border-[var(--ui-v2-border)] bg-[var(--ui-v2-card)] whitespace-nowrap"
      >
        <RouterLink
          v-for="tab in tabs"
          :key="tab.route"
          :to="{ name: tab.route, params: { id: sspId } }"
          class="ui-v2-nav flex min-w-[140px] flex-1 items-center justify-center border-r border-[var(--ui-v2-border)] px-4 py-3 last:border-r-0"
          :class="
            route.name === tab.route
              ? 'bg-[var(--ui-v2-primary-tint-10)] text-[var(--ui-v2-primary)]'
              : 'text-[var(--ui-v2-secondary-foreground)] hover:text-[var(--ui-v2-foreground)]'
          "
        >
          {{ tab.index }} {{ tab.label }}
        </RouterLink>
      </nav>
    </template>

    <template #content>
      <RouterView v-slot="{ Component }">
        <KeepAlive>
          <component :is="Component" />
        </KeepAlive>
      </RouterView>
    </template>

    <template #stickyActions>
      <button
        class="ui-v2-nav border border-[var(--ui-v2-primary)] bg-[var(--ui-v2-primary)] px-4 py-2 font-semibold text-[var(--ui-v2-primary-foreground)] disabled:cursor-not-allowed disabled:opacity-60"
        type="button"
        :disabled="isActivePlan"
        @click="setAsActive"
      >
        Set Active
      </button>
    </template>
  </V2DetailEditorTemplate>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue';
import { RouterView, useRoute } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import type { SystemSecurityPlan } from '@/oscal';
import { useDataApi } from '@/composables/axios';
import { useSystemStore } from '@/stores/system';
import V2DetailEditorTemplate from '@/components/v2/patterns/V2DetailEditorTemplate.vue';
import V2PageHeader from '@/components/v2/patterns/V2PageHeader.vue';

const route = useRoute();
const toast = useToast();
const systemStore = useSystemStore();

const sspId = computed(() => String(route.params.id || ''));

const tabs = [
  { index: '01', label: 'Overview', route: 'system-security-plan-overview' },
  {
    index: '02',
    label: 'Characteristics',
    route: 'system-security-plan-characteristics',
  },
  {
    index: '03',
    label: 'Implementation',
    route: 'system-security-plan-system-implementation',
  },
  {
    index: '04',
    label: 'Controls',
    route: 'system-security-plan-control-implementation',
  },
  {
    index: '05',
    label: 'Compliance',
    route: 'system-security-plan-compliance',
  },
  { index: '06', label: 'JSON', route: 'system-security-plan-json' },
];

const {
  data: systemSecurityPlan,
  isLoading,
  error,
  execute: loadSystemSecurityPlan,
} = useDataApi<SystemSecurityPlan>(null, null, {
  immediate: false,
});

watch(
  sspId,
  async (id) => {
    if (!id) {
      return;
    }
    await loadSystemSecurityPlan(`/api/oscal/system-security-plans/${id}`);
  },
  { immediate: true },
);

const errorMessage = computed(() => {
  if (!error.value) {
    return 'Unable to load System Security Plan.';
  }
  if (typeof error.value === 'string') {
    return error.value;
  }
  if (error.value instanceof Error) {
    return error.value.message;
  }
  return 'Unable to load System Security Plan.';
});

const loadErrorMessage = computed(() =>
  error.value ? errorMessage.value : null,
);

const isActivePlan = computed(
  () =>
    systemStore.system.securityPlan?.uuid === systemSecurityPlan.value?.uuid,
);

function setAsActive(): void {
  if (!systemSecurityPlan.value || isActivePlan.value) {
    return;
  }
  systemStore.setSecurityPlan(systemSecurityPlan.value);
  toast.add({
    severity: 'success',
    summary: 'Active SSP Updated',
    detail: `"${systemSecurityPlan.value.metadata?.title || 'System Security Plan'}" is now active.`,
    life: 2500,
  });
}

async function reloadCurrentPlan(): Promise<void> {
  if (!sspId.value) {
    return;
  }

  await loadSystemSecurityPlan(
    `/api/oscal/system-security-plans/${sspId.value}`,
  );
}

function formatDate(dateString?: string): string {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString();
}
</script>
