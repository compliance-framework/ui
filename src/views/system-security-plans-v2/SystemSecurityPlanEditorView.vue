<template>
  <div class="space-y-6">
    <V2StatePanel
      v-if="isLoading"
      kind="loading"
      title="Loading"
      description="Loading system security plan details..."
    />

    <V2StatePanel
      v-else-if="loadErrorMessage"
      kind="error"
      title="Load failed"
      :description="loadErrorMessage"
    >
      <template #actions>
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
    </V2StatePanel>

    <V2StatePanel
      v-else-if="!systemSecurityPlan"
      kind="empty"
      title="No plan found"
      description="This system security plan is unavailable or no longer exists."
      cta-label="Back to list"
      :cta-to="{ name: 'system-security-plans' }"
    />

    <template v-else>
      <header class="space-y-3">
        <div
          class="ui-v2-nav flex flex-wrap items-center gap-2 text-[var(--ui-v2-secondary-foreground)]"
        >
          <template
            v-for="(breadcrumb, index) in headerBreadcrumbs"
            :key="`${breadcrumb.label}-${index}`"
          >
            <RouterLink
              v-if="breadcrumb.to"
              :to="breadcrumb.to"
              class="transition-colors hover:text-[var(--ui-v2-foreground)]"
            >
              {{ breadcrumb.label }}
            </RouterLink>
            <span
              v-else
              class="max-w-full truncate text-[var(--ui-v2-foreground)]"
            >
              {{ breadcrumb.label }}
            </span>
            <span
              v-if="index < headerBreadcrumbs.length - 1"
              class="text-[var(--ui-v2-tertiary-foreground)]"
            >
              &gt;
            </span>
          </template>
        </div>

        <div class="flex flex-wrap items-start justify-between gap-4">
          <div class="min-w-0 flex-1">
            <h1
              class="font-[var(--ui-v2-font-primary)] text-[clamp(2rem,1.625rem+1.2vw,40px)] font-bold tracking-[-0.01em] text-[var(--ui-v2-foreground)]"
            >
              {{ systemSecurityPlan.metadata?.title || 'System Security Plan' }}
            </h1>

            <div class="mt-3 space-y-2">
              <div
                class="flex items-center gap-3 overflow-x-auto whitespace-nowrap pb-1"
              >
                <span
                  class="ui-v2-label inline-flex shrink-0 items-center justify-center border px-2 py-[3px]"
                  :class="
                    isActivePlan
                      ? 'border-[var(--ui-v2-success)] bg-[var(--ui-v2-success-tint-10)] text-[var(--ui-v2-success)]'
                      : 'border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] text-[var(--ui-v2-secondary-foreground)]'
                  "
                >
                  {{ isActivePlan ? 'ACTIVE' : 'INACTIVE' }}
                </span>

                <div class="ui-v2-nav flex shrink-0 items-center gap-1.5">
                  <span
                    class="font-bold text-[var(--ui-v2-tertiary-foreground)]"
                    >VERSION</span
                  >
                  <span
                    class="font-semibold text-[var(--ui-v2-secondary-foreground)]"
                  >
                    {{ systemSecurityPlan.metadata?.version || 'N/A' }}
                  </span>
                </div>

                <div class="ui-v2-nav flex shrink-0 items-center gap-1.5">
                  <span
                    class="font-bold text-[var(--ui-v2-tertiary-foreground)]"
                    >MODIFIED</span
                  >
                  <span
                    class="font-semibold text-[var(--ui-v2-secondary-foreground)]"
                  >
                    {{
                      formatDateToken(systemSecurityPlan.metadata?.lastModified)
                    }}
                  </span>
                </div>

                <div class="ui-v2-nav flex shrink-0 items-center gap-1.5">
                  <span
                    class="font-bold text-[var(--ui-v2-tertiary-foreground)]"
                    >PUBLISHED</span
                  >
                  <span
                    class="font-semibold"
                    :class="
                      systemSecurityPlan.metadata?.published
                        ? 'text-[var(--ui-v2-secondary-foreground)]'
                        : 'text-[var(--ui-v2-tertiary-foreground)]'
                    "
                  >
                    {{
                      formatDateToken(systemSecurityPlan.metadata?.published)
                    }}
                  </span>
                </div>

                <div class="ui-v2-nav flex shrink-0 items-center gap-1.5">
                  <span
                    class="font-bold text-[var(--ui-v2-tertiary-foreground)]"
                    >UUID</span
                  >
                  <span
                    class="font-semibold text-[var(--ui-v2-secondary-foreground)]"
                  >
                    {{ shortUuid }}
                  </span>
                  <button
                    type="button"
                    class="flex h-5 w-5 items-center justify-center text-[var(--ui-v2-foreground)] hover:text-[var(--ui-v2-primary)] disabled:cursor-not-allowed disabled:opacity-60"
                    :disabled="!systemSecurityPlan.uuid"
                    @click="copyUuid"
                  >
                    <V2LucideIcon name="copy" :size="11" />
                  </button>
                </div>
              </div>

              <div
                ref="profileSwitcherElement"
                class="relative inline-flex max-w-full"
              >
                <button
                  type="button"
                  class="inline-flex h-8 min-w-0 max-w-full items-center justify-between gap-2 border border-[var(--ui-v2-primary)] bg-[var(--ui-v2-primary-tint-15)] px-2.5 text-left disabled:cursor-not-allowed disabled:opacity-60"
                  :disabled="
                    loadingProfiles ||
                    isAttachingProfile ||
                    profileItems.length === 0
                  "
                  @click="toggleProfileSwitcher"
                >
                  <span
                    class="flex min-w-0 items-center gap-1.5 overflow-hidden"
                  >
                    <span
                      class="shrink-0 font-[var(--ui-v2-font-secondary)] text-[10px] font-bold tracking-[1px] text-[var(--ui-v2-tertiary-foreground)]"
                    >
                      PROFILE
                    </span>
                    <span
                      class="ui-v2-nav min-w-0 flex-1 truncate text-[12px] font-bold leading-5 text-[var(--ui-v2-foreground)]"
                      :title="selectedProfileLabel"
                    >
                      {{ selectedProfileLabel }}
                    </span>
                  </span>
                  <span
                    class="ui-v2-nav shrink-0 text-[10px] text-[var(--ui-v2-foreground)]"
                  >
                    <V2LucideIcon
                      :name="
                        profileSwitcherOpen ? 'chevron-up' : 'chevron-down'
                      "
                      :size="10"
                    />
                  </span>
                </button>

                <div
                  v-if="profileSwitcherOpen"
                  class="absolute left-0 top-[calc(100%+6px)] z-30 flex max-h-72 w-max min-w-full max-w-[90vw] flex-col gap-0 overflow-y-auto border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] p-1 shadow-[0_10px_24px_rgba(17,17,26,0.12)]"
                >
                  <button
                    v-for="option in profileItems"
                    :key="option.value"
                    type="button"
                    class="group flex min-h-8 w-full appearance-none items-center justify-between gap-2 border px-2 py-1 text-left shadow-none transition-colors duration-150 focus-visible:border-[var(--ui-v2-primary)] focus-visible:bg-[var(--ui-v2-primary-tint-10)] focus-visible:text-[var(--ui-v2-foreground)] focus-visible:outline-none"
                    :title="option.label"
                    :class="
                      option.value === selectedProfileId
                        ? 'border-[var(--ui-v2-primary)] bg-[var(--ui-v2-primary-tint-15)] text-[var(--ui-v2-foreground)]'
                        : 'border-transparent bg-[var(--ui-v2-surface)] text-[var(--ui-v2-muted-foreground)] hover:border-[var(--ui-v2-primary-stroke-30)] hover:bg-[var(--ui-v2-primary-tint-10)] hover:text-[var(--ui-v2-foreground)]'
                    "
                    @click="onProfileSwitcherOptionSelect(option.value)"
                  >
                    <span
                      class="min-w-0 flex-1 truncate whitespace-nowrap font-[var(--ui-v2-font-secondary)] text-[12px] font-semibold leading-[1.2rem]"
                    >
                      {{ option.label }}
                    </span>
                    <V2LucideIcon
                      v-if="option.value === selectedProfileId"
                      name="check"
                      :size="10"
                      class="shrink-0 text-[var(--ui-v2-success)]"
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <PrimaryButton
            type="button"
            :disabled="isActivePlan"
            @click="setAsActive"
          >
            SET ACTIVE
          </PrimaryButton>
        </div>
      </header>

      <nav
        class="flex h-12 overflow-x-auto border border-[var(--ui-v2-border)] bg-[var(--ui-v2-card)] whitespace-nowrap"
      >
        <RouterLink
          v-for="tab in tabs"
          :key="tab.route"
          :to="{ name: tab.route, params: { id: sspId } }"
          class="group flex min-w-[140px] flex-1 flex-col border-r border-[var(--ui-v2-border)] last:border-r-0"
          :class="
            isTabActive(tab.route)
              ? 'bg-[var(--ui-v2-primary-tint-15)]'
              : 'bg-[var(--ui-v2-card)]'
          "
        >
          <span
            class="ui-v2-nav flex h-full items-center justify-center px-3 py-[10px]"
            :class="
              isTabActive(tab.route)
                ? 'font-bold text-[var(--ui-v2-foreground)]'
                : 'text-[var(--ui-v2-secondary-foreground)]'
            "
          >
            {{ tab.index }} {{ tab.label }}
          </span>
          <span
            class="h-[3px] w-full"
            :class="
              isTabActive(tab.route)
                ? 'bg-[var(--ui-v2-primary)]'
                : 'bg-[var(--ui-v2-border)]'
            "
          />
        </RouterLink>
      </nav>

      <RouterView v-slot="{ Component }">
        <KeepAlive>
          <component :is="Component" />
        </KeepAlive>
      </RouterView>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, provide, ref, watch } from 'vue';
import type { AxiosError } from 'axios';
import type { RouteLocationRaw } from 'vue-router';
import { RouterView, useRoute } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import type { Profile, SystemSecurityPlan } from '@/oscal';
import type { ErrorBody, ErrorResponse } from '@/stores/types';
import { useDataApi } from '@/composables/axios';
import { useSystemStore } from '@/stores/system';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import V2StatePanel from '@/components/v2/system/V2StatePanel.vue';
import V2LucideIcon from '@/components/v2/primitives/V2LucideIcon.vue';
import {
  sspDetailProfileBindingKey,
  type SspProfileOption,
} from './sspDetailProfileBinding';

const route = useRoute();
const toast = useToast();
const systemStore = useSystemStore();

const sspId = computed(() => String(route.params.id || ''));

const tabs = [
  { index: '01', label: 'OVERVIEW', route: 'system-security-plan-overview' },
  {
    index: '02',
    label: 'CHARACTERISTICS',
    route: 'system-security-plan-characteristics',
  },
  {
    index: '03',
    label: 'IMPLEMENTATION',
    route: 'system-security-plan-system-implementation',
  },
  {
    index: '04',
    label: 'CONTROLS',
    route: 'system-security-plan-control-implementation',
  },
  {
    index: '05',
    label: 'COMPLIANCE',
    route: 'system-security-plan-compliance',
  },
  { index: '06', label: 'JSON', route: 'system-security-plan-json' },
];

interface SspHeaderBreadcrumbMetaItem {
  label: string;
  routeName?: string;
  query?: Record<string, string>;
}

const {
  data: systemSecurityPlan,
  isLoading,
  error,
  execute: loadSystemSecurityPlan,
} = useDataApi<SystemSecurityPlan>(null, null, {
  immediate: false,
});

const { data: profiles, isLoading: loadingProfiles } = useDataApi<Profile[]>(
  '/api/oscal/profiles',
);

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

const profileResolved = ref(false);
const isAttachingProfile = ref(false);
const selectedProfileId = ref('');
const attachedProfileId = ref('');
const profileSwitcherOpen = ref(false);
const profileSwitcherElement = ref<HTMLElement | null>(null);

const profileItems = computed<SspProfileOption[]>(() =>
  (profiles.value || []).map((item) => ({
    label: normalizeProfileLabel(item.metadata?.title || item.uuid),
    value: item.uuid,
  })),
);

const selectedProfileLabel = computed(() => {
  const selected = profileItems.value.find(
    (item) => item.value === selectedProfileId.value,
  );
  return selected?.label || 'SELECT PROFILE';
});

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

const shortUuid = computed(() => {
  const uuid = systemSecurityPlan.value?.uuid;
  if (!uuid) {
    return 'N/A';
  }
  if (uuid.length <= 10) {
    return uuid;
  }
  return `${uuid.slice(0, 4)}...${uuid.slice(-4)}`;
});

const routeHeaderBreadcrumbs = computed<SspHeaderBreadcrumbMetaItem[]>(() => {
  const matchedRecord = [...route.matched]
    .reverse()
    .find((record) => Array.isArray(record.meta.sspHeaderBreadcrumbs));

  return (
    (matchedRecord?.meta.sspHeaderBreadcrumbs as
      | SspHeaderBreadcrumbMetaItem[]
      | undefined) || []
  );
});

const headerBreadcrumbs = computed<
  Array<{ label: string; to?: RouteLocationRaw }>
>(() => {
  const items: Array<{ label: string; to?: RouteLocationRaw }> = [
    {
      label: 'SYSTEM SECURITY PLANS',
      to: { name: 'system-security-plans' },
    },
    {
      label:
        systemSecurityPlan.value?.metadata?.title || 'SYSTEM SECURITY PLAN',
      to: sspId.value
        ? {
            name: 'system-security-plan-overview',
            params: { id: sspId.value },
          }
        : undefined,
    },
  ];

  routeHeaderBreadcrumbs.value.forEach((breadcrumb) => {
    items.push({
      label: breadcrumb.label,
      to: breadcrumb.routeName
        ? {
            name: breadcrumb.routeName,
            params: { id: sspId.value },
            query: breadcrumb.query,
          }
        : undefined,
    });
  });

  return items;
});

provide(sspDetailProfileBindingKey, {
  profileItems,
  loadingProfiles,
  profileResolved,
  isAttachingProfile,
  selectedProfileId,
  attachedProfileId,
  selectProfile,
});

watch(
  sspId,
  async (id) => {
    if (!id) {
      selectedProfileId.value = '';
      attachedProfileId.value = '';
      profileResolved.value = true;
      return;
    }

    profileResolved.value = false;
    await Promise.allSettled([
      loadSystemSecurityPlan(`/api/oscal/system-security-plans/${id}`),
      loadAttachedProfile(id),
    ]);
    profileResolved.value = true;
  },
  { immediate: true },
);

onMounted(() => {
  document.addEventListener('click', handleDocumentClick);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick);
});

function isTabActive(tabRoute: string): boolean {
  return (
    String(route.name || '') === tabRoute ||
    route.matched.some((record) => record.meta.sspTabRoute === tabRoute)
  );
}

function toggleProfileSwitcher(): void {
  profileSwitcherOpen.value = !profileSwitcherOpen.value;
}

async function onProfileSwitcherOptionSelect(profileId: string): Promise<void> {
  profileSwitcherOpen.value = false;
  await selectProfile(profileId);
}

function handleDocumentClick(event: MouseEvent): void {
  if (!profileSwitcherOpen.value) {
    return;
  }

  const target = event.target as Node;
  if (!profileSwitcherElement.value?.contains(target)) {
    profileSwitcherOpen.value = false;
  }
}

async function loadAttachedProfile(id: string): Promise<void> {
  try {
    const response = await executeAttachedProfile(
      `/api/oscal/system-security-plans/${id}/profile`,
    );
    const attachedProfile = response.data.value?.data;

    if (!attachedProfile) {
      selectedProfileId.value = '';
      attachedProfileId.value = '';
      return;
    }

    selectedProfileId.value = attachedProfile.uuid;
    attachedProfileId.value = attachedProfile.uuid;
  } catch (error) {
    const errorResponse = error as AxiosError<ErrorResponse<ErrorBody>>;
    if (errorResponse.response?.status === 404) {
      selectedProfileId.value = '';
      attachedProfileId.value = '';
      return;
    }

    toast.add({
      severity: 'error',
      summary: 'Error Loading Profile',
      detail:
        errorResponse.response?.data.errors.body ||
        'Unable to load the attached profile for this plan.',
      life: 3000,
    });
  }
}

async function selectProfile(profileId: string): Promise<boolean> {
  if (
    !sspId.value ||
    !profileId ||
    profileId === attachedProfileId.value ||
    isAttachingProfile.value
  ) {
    return false;
  }

  const previousProfileId = attachedProfileId.value;
  isAttachingProfile.value = true;

  try {
    await attachProfile(
      `/api/oscal/system-security-plans/${sspId.value}/profile`,
      {
        data: {
          profileId,
        },
      },
    );

    selectedProfileId.value = profileId;
    attachedProfileId.value = profileId;

    toast.add({
      severity: 'success',
      summary: 'Profile Updated',
      life: 2500,
    });

    return true;
  } catch (error) {
    selectedProfileId.value = previousProfileId;

    const errorResponse = error as AxiosError<ErrorResponse<ErrorBody>>;
    toast.add({
      severity: 'error',
      summary: 'Failed to Set Profile',
      detail:
        errorResponse.response?.data.errors.body ||
        'An error occurred while assigning this profile.',
      life: 3000,
    });

    return false;
  } finally {
    isAttachingProfile.value = false;
  }
}

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

  await Promise.allSettled([
    loadSystemSecurityPlan(`/api/oscal/system-security-plans/${sspId.value}`),
    loadAttachedProfile(sspId.value),
  ]);
}

async function copyUuid(): Promise<void> {
  if (!systemSecurityPlan.value?.uuid) {
    return;
  }

  try {
    await navigator.clipboard.writeText(systemSecurityPlan.value.uuid);
    toast.add({
      severity: 'success',
      summary: 'UUID Copied',
      life: 1800,
    });
  } catch {
    toast.add({
      severity: 'error',
      summary: 'Copy Failed',
      detail: 'Unable to copy UUID to clipboard.',
      life: 3000,
    });
  }
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

function normalizeProfileLabel(label?: string): string {
  if (!label) {
    return '';
  }

  return label.replace(/\s+/g, ' ').trim();
}
</script>
