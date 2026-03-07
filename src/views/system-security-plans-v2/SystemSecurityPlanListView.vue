<template>
  <V2ListPageTemplate
    :loading="loading"
    :has-items="hasPlans"
    :error-message="loadErrorMessage"
    loading-description="Retrieving system security plans..."
  >
    <template #header>
      <V2PageHeader eyebrow="Dashboard" title="System Security Plan Library">
        <template #actions>
          <div class="flex flex-wrap items-center gap-2">
            <RouterLink
              :to="{ name: 'admin-import' }"
              class="ui-v2-nav inline-flex h-10 items-center justify-center border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] px-4 font-bold text-[var(--ui-v2-foreground)]"
            >
              IMPORT
            </RouterLink>
            <RouterLink
              :to="{ name: 'system-security-plans-create' }"
              class="ui-v2-nav inline-flex h-10 items-center justify-center border border-[var(--ui-v2-primary)] bg-[var(--ui-v2-primary)] px-4 font-bold text-[var(--ui-v2-primary-foreground)]"
            >
              CREATE SSP
            </RouterLink>
          </div>
        </template>
      </V2PageHeader>
    </template>

    <template #error-actions>
      <button
        type="button"
        class="ui-v2-nav border border-[var(--ui-v2-error)] bg-[var(--ui-v2-error)] px-4 py-2 font-semibold text-[var(--ui-v2-background)]"
        @click="refreshPlans"
      >
        Retry
      </button>
    </template>

    <template #empty>
      <section
        class="border border-[var(--ui-v2-border)] bg-[var(--ui-v2-card)] p-6"
      >
        <p class="ui-v2-label mb-2 text-[var(--ui-v2-secondary-foreground)]">
          PREREQUISITE REQUIRED
        </p>
        <h2 class="ui-v2-section-title text-[var(--ui-v2-foreground)]">
          No system security plans available
        </h2>
        <p class="mt-3 max-w-[70ch] text-[var(--ui-v2-muted-foreground)]">
          Create or import a System Security Plan before continuing with system,
          controls, and compliance workflows.
        </p>

        <div class="mt-5 flex flex-wrap gap-3">
          <RouterLink
            :to="{ name: 'system-security-plans-create' }"
            class="ui-v2-nav inline-flex items-center border border-[var(--ui-v2-primary)] bg-[var(--ui-v2-primary)] px-4 py-2 font-semibold text-[var(--ui-v2-primary-foreground)]"
          >
            CREATE SSP
          </RouterLink>

          <RouterLink
            :to="{ name: 'admin-import' }"
            class="ui-v2-nav inline-flex items-center border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] px-4 py-2 font-semibold text-[var(--ui-v2-foreground)]"
          >
            GO TO IMPORT
          </RouterLink>
        </div>

        <p class="ui-v2-meta mt-3 text-[var(--ui-v2-tertiary-foreground)]">
          You can return here after create or import to set your active SSP.
        </p>
      </section>
    </template>

    <section
      class="overflow-hidden border border-[var(--ui-v2-border)] bg-[var(--ui-v2-card)]"
    >
      <div class="overflow-x-auto">
        <table class="min-w-full border-collapse">
          <thead
            class="border-b border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)]"
          >
            <tr>
              <th
                class="ui-v2-label px-3 py-3 text-left font-semibold text-[var(--ui-v2-secondary-foreground)] sm:px-5"
              >
                Title
              </th>
              <th
                class="ui-v2-label px-3 py-3 text-left font-semibold text-[var(--ui-v2-secondary-foreground)] sm:px-5"
              >
                Version
              </th>
              <th
                class="ui-v2-label px-3 py-3 text-left font-semibold text-[var(--ui-v2-secondary-foreground)] sm:px-5"
              >
                Last Modified
              </th>
              <th
                class="ui-v2-label px-3 py-3 text-right font-semibold text-[var(--ui-v2-secondary-foreground)] sm:px-5"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="ssp in systemSecurityPlans"
              :key="ssp.uuid"
              class="border-b border-[var(--ui-v2-border)] align-top last:border-0"
            >
              <td class="px-3 py-3 sm:px-5">
                <div class="flex items-start gap-2">
                  <RouterLink
                    :to="`/system-security-plans/${ssp.uuid}`"
                    class="ui-v2-link ui-v2-nav font-semibold"
                  >
                    {{
                      isActive(ssp)
                        ? `${ssp.metadata.title} [ACTIVE]`
                        : ssp.metadata.title
                    }}
                  </RouterLink>
                </div>
                <p
                  class="ui-v2-meta mt-1 text-[var(--ui-v2-tertiary-foreground)]"
                >
                  UUID: {{ ssp.uuid }}
                </p>
              </td>
              <td
                class="ui-v2-meta px-3 py-3 text-[var(--ui-v2-muted-foreground)] sm:px-5"
              >
                {{ ssp.metadata.version || 'N/A' }}
              </td>
              <td
                class="ui-v2-meta px-3 py-3 text-[var(--ui-v2-muted-foreground)] sm:px-5"
              >
                {{ formatDate(ssp.metadata.lastModified) }}
              </td>
              <td class="px-3 py-3 sm:px-5">
                <div class="ui-v2-label flex justify-end gap-3">
                  <RouterLink
                    :to="`/system-security-plans/${ssp.uuid}`"
                    class="text-[var(--ui-v2-info)] transition-colors hover:text-[var(--ui-v2-primary)]"
                  >
                    View
                  </RouterLink>
                  <button
                    class="text-[var(--ui-v2-info)] transition-colors hover:text-[var(--ui-v2-primary)]"
                    type="button"
                    @click="downloadJson(ssp.uuid, ssp.metadata.title)"
                  >
                    JSON
                  </button>
                  <button
                    class="text-[var(--ui-v2-info)] transition-colors hover:text-[var(--ui-v2-primary)]"
                    :class="
                      isActive(ssp)
                        ? 'cursor-default text-[var(--ui-v2-tertiary-foreground)] hover:text-[var(--ui-v2-tertiary-foreground)]'
                        : ''
                    "
                    type="button"
                    :disabled="isActive(ssp)"
                    @click="setActivePlan(ssp)"
                  >
                    Set
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </V2ListPageTemplate>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { AxiosError } from 'axios';
import decamelizeKeys from 'decamelize-keys';
import { useToast } from 'primevue/usetoast';
import { useRoute, useRouter } from 'vue-router';
import type { ErrorBody, ErrorResponse } from '@/stores/types.ts';
import type { SystemSecurityPlan } from '@/oscal';
import { useDataApi } from '@/composables/axios';
import { useSystemStore } from '@/stores/system.ts';
import V2ListPageTemplate from '@/components/v2/patterns/V2ListPageTemplate.vue';
import V2PageHeader from '@/components/v2/patterns/V2PageHeader.vue';

const toast = useToast();
const route = useRoute();
const router = useRouter();
const systemStore = useSystemStore();

const {
  data: systemSecurityPlans,
  isLoading: loading,
  error,
  execute: reloadSystemSecurityPlans,
} = useDataApi<SystemSecurityPlan[]>('/api/oscal/system-security-plans');

const { data: systemSecurityPlanJSON, execute } =
  useDataApi<SystemSecurityPlan>(undefined, undefined, { immediate: false });

const activePlanUuid = computed(
  () => systemStore.system.securityPlan?.uuid ?? null,
);
const hasPlans = computed(() => (systemSecurityPlans.value?.length ?? 0) > 0);

function isSafeRelativePath(path: string): boolean {
  if (!path.startsWith('/') || path.startsWith('//')) {
    return false;
  }
  return !/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(path);
}

const nextTargetPath = computed(() => {
  const queryValue = route.query.next;
  const candidate = Array.isArray(queryValue) ? queryValue[0] : queryValue;

  if (typeof candidate !== 'string' || candidate.length === 0) {
    return null;
  }

  if (!isSafeRelativePath(candidate)) {
    return null;
  }

  return candidate;
});

const errorMessage = computed(() => {
  if (!error.value) {
    return 'Unable to load System Security Plans.';
  }
  if (typeof error.value === 'string') {
    return error.value;
  }
  if (error.value instanceof Error) {
    return error.value.message;
  }
  return 'Unable to load System Security Plans.';
});

const loadErrorMessage = computed(() =>
  error.value ? errorMessage.value : null,
);

function isActive(ssp: SystemSecurityPlan): boolean {
  return activePlanUuid.value === ssp.uuid;
}

async function refreshPlans(): Promise<void> {
  await reloadSystemSecurityPlans('/api/oscal/system-security-plans');
}

async function setActivePlan(ssp: SystemSecurityPlan): Promise<void> {
  if (isActive(ssp)) {
    return;
  }

  systemStore.setSecurityPlan(ssp);

  toast.add({
    severity: 'success',
    summary: 'Active SSP Updated',
    detail: `"${ssp.metadata.title}" is now active.`,
    life: 2500,
  });

  if (nextTargetPath.value) {
    await router.push(nextTargetPath.value);
  }
}

function formatDate(dateString?: string): string {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString();
}

async function downloadJson(uuid: string, title: string): Promise<void> {
  try {
    await execute(`/api/oscal/system-security-plans/${uuid}/full`);

    const dataStr = JSON.stringify(
      decamelizeKeys(systemSecurityPlanJSON.value!),
      null,
      2,
    );
    const dataBlob = new Blob([dataStr], { type: 'application/json' });

    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.replace(/[^a-zA-Z0-9]/g, '_')}-ssp.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.add({
      severity: 'success',
      summary: 'SSP JSON Downloaded',
      detail: `System Security Plan "${title}" JSON downloaded successfully`,
      life: 3000,
    });
  } catch (err) {
    const errorResponse = err as AxiosError<ErrorResponse<ErrorBody>>;
    toast.add({
      severity: 'error',
      summary: 'Download Failed',
      detail: `Failed to download SSP JSON: ${errorResponse.response?.data.errors.body ?? 'Full SSP export may not be available.'}`,
      life: 3000,
    });
  }
}
</script>
