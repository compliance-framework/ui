<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import type { SystemSecurityPlan } from '@/oscal';
import { useSystemStore } from '@/stores/system';
import { useDataApi } from '@/composables/axios';
import V2ModalFormTemplate from '@/components/v2/patterns/V2ModalFormTemplate.vue';
import V2StatePanel from '@/components/v2/system/V2StatePanel.vue';

const route = useRoute();
const toast = useToast();
const systemStore = useSystemStore();

const activePlan = computed(() => systemStore.system.securityPlan);

const canOpenSwitcher = computed(
  () => route.name !== 'system-security-plans-create',
);

const summaryText = computed(() => {
  if (!activePlan.value) {
    return 'No active SSP selected';
  }

  const title =
    activePlan.value.metadata?.title || 'Untitled System Security Plan';
  const version = activePlan.value.metadata?.version || 'N/A';
  return `${title} / v${version}`;
});

const isSwitcherOpen = ref(false);
const searchQuery = ref('');

const {
  data: availablePlans,
  isLoading: plansLoading,
  error: plansError,
  execute: loadPlans,
} = useDataApi<SystemSecurityPlan[]>(null, null, { immediate: false });

const filteredPlans = computed(() => {
  const plans = availablePlans.value || [];
  const query = searchQuery.value.trim().toLowerCase();

  if (!query) {
    return plans;
  }

  return plans.filter((plan) => {
    const title = plan.metadata?.title?.toLowerCase() || '';
    const version = plan.metadata?.version?.toLowerCase() || '';
    const uuid = plan.uuid.toLowerCase();
    return (
      title.includes(query) || version.includes(query) || uuid.includes(query)
    );
  });
});

const plansErrorMessage = computed(() => {
  if (!plansError.value) {
    return 'Unable to load System Security Plans.';
  }
  if (typeof plansError.value === 'string') {
    return plansError.value;
  }
  if (plansError.value instanceof Error) {
    return plansError.value.message;
  }
  return 'Unable to load System Security Plans.';
});

function isActivePlan(plan: SystemSecurityPlan): boolean {
  return activePlan.value?.uuid === plan.uuid;
}

async function refreshPlans(): Promise<void> {
  await loadPlans('/api/oscal/system-security-plans');
}

async function openSwitcher(): Promise<void> {
  if (!canOpenSwitcher.value) {
    return;
  }

  isSwitcherOpen.value = true;
  searchQuery.value = '';
  await refreshPlans();
}

function closeSwitcher(): void {
  isSwitcherOpen.value = false;
}

function setActivePlan(plan: SystemSecurityPlan): void {
  if (isActivePlan(plan)) {
    closeSwitcher();
    return;
  }

  systemStore.setSecurityPlan(plan);
  toast.add({
    severity: 'success',
    summary: 'Active SSP Updated',
    detail: `"${plan.metadata?.title || 'System Security Plan'}" is now active.`,
    life: 2500,
  });
  closeSwitcher();
}

function handleGlobalKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && isSwitcherOpen.value) {
    closeSwitcher();
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleGlobalKeydown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleGlobalKeydown);
});
</script>

<template>
  <div
    class="ui-v2-surface-card flex items-center justify-between gap-4 px-4 py-3"
  >
    <div class="min-w-0">
      <p class="ui-v2-label text-[var(--ui-v2-secondary-foreground)]">
        Active SSP
      </p>
      <p class="truncate text-[var(--ui-v2-foreground)]">{{ summaryText }}</p>
      <p
        v-if="activePlan?.uuid"
        class="ui-v2-meta mt-1 text-[var(--ui-v2-tertiary-foreground)]"
      >
        ID: {{ activePlan.uuid }}
      </p>
    </div>

    <button
      v-if="canOpenSwitcher"
      type="button"
      class="ui-v2-nav ui-v2-radius-none border border-[var(--ui-v2-primary)] bg-[var(--ui-v2-primary)] px-3 py-2 font-semibold text-[var(--ui-v2-primary-foreground)]"
      @click="openSwitcher"
    >
      {{ activePlan ? 'Change' : 'Select' }}
    </button>
  </div>

  <div
    v-if="isSwitcherOpen"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    @click.self="closeSwitcher"
  >
    <div class="ui-v2-surface-card w-full max-w-3xl p-4">
      <V2ModalFormTemplate
        title="Select System Security Plan"
        description="Search and set an active system security plan."
        required-hint=""
        :error-summary="plansError ? plansErrorMessage : ''"
        :show-default-actions="false"
      >
        <div class="space-y-4">
          <div class="space-y-2 border-b border-[var(--ui-v2-border)] pb-3">
            <label
              class="ui-v2-label text-[var(--ui-v2-secondary-foreground)]"
              for="active-ssp-search"
            >
              Search Plans
            </label>
            <div class="flex flex-wrap items-center gap-2">
              <input
                id="active-ssp-search"
                v-model="searchQuery"
                type="text"
                placeholder="Search by title, version, or UUID"
                class="ui-v2-interactive min-w-0 flex-1 px-3 py-2 focus:outline-none"
              />
              <button
                type="button"
                class="ui-v2-nav ui-v2-interactive px-3 py-2"
                @click="refreshPlans"
              >
                Refresh
              </button>
            </div>
          </div>

          <div class="max-h-[50vh] overflow-y-auto pr-1">
            <V2StatePanel
              v-if="plansLoading && !availablePlans"
              kind="loading"
              title="Loading"
              description="Loading system security plans..."
            />

            <V2StatePanel
              v-else-if="plansError"
              kind="error"
              title="Load failed"
              :description="plansErrorMessage"
            >
              <template #actions>
                <button
                  type="button"
                  class="ui-v2-nav border border-[var(--ui-v2-error)] bg-[var(--ui-v2-error)] px-4 py-2 font-semibold text-[var(--ui-v2-background)]"
                  @click="refreshPlans"
                >
                  Retry
                </button>
              </template>
            </V2StatePanel>

            <V2StatePanel
              v-else-if="!availablePlans?.length"
              kind="empty"
              title="No plans available"
              description="Create or import a system security plan to continue."
              cta-label="Go to import"
              :cta-to="{ name: 'admin-import' }"
            />

            <V2StatePanel
              v-else-if="!filteredPlans.length"
              kind="empty"
              title="No matches"
              description="No plans match your current search query."
            />

            <div v-else class="space-y-3">
              <article
                v-for="plan in filteredPlans"
                :key="plan.uuid"
                class="ui-v2-surface-base p-4"
              >
                <div class="flex flex-wrap items-start justify-between gap-3">
                  <div class="min-w-0">
                    <p
                      class="ui-v2-nav truncate text-[var(--ui-v2-foreground)]"
                    >
                      {{
                        plan.metadata?.title || 'Untitled System Security Plan'
                      }}
                    </p>
                    <p
                      class="ui-v2-meta mt-1 text-[var(--ui-v2-tertiary-foreground)]"
                    >
                      Version {{ plan.metadata?.version || 'N/A' }}
                    </p>
                    <p
                      class="ui-v2-meta mt-1 break-all text-[var(--ui-v2-tertiary-foreground)]"
                    >
                      {{ plan.uuid }}
                    </p>
                  </div>

                  <button
                    type="button"
                    class="ui-v2-nav border px-3 py-2 font-semibold"
                    :class="
                      isActivePlan(plan)
                        ? 'border-[var(--ui-v2-success)] bg-[var(--ui-v2-success-tint-10)] text-[var(--ui-v2-success)]'
                        : 'border-[var(--ui-v2-primary)] bg-[var(--ui-v2-primary)] text-[var(--ui-v2-primary-foreground)]'
                    "
                    @click="setActivePlan(plan)"
                  >
                    {{ isActivePlan(plan) ? 'Active' : 'Set Active' }}
                  </button>
                </div>
              </article>
            </div>
          </div>
        </div>

        <template #actions>
          <button
            type="button"
            class="ui-v2-nav ui-v2-interactive px-3 py-2"
            @click="closeSwitcher"
          >
            Close
          </button>
        </template>
      </V2ModalFormTemplate>
    </div>
  </div>
</template>
