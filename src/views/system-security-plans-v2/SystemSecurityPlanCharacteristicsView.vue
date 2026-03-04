<template>
  <div class="space-y-6">
    <section
      v-if="characteristicsLoading"
      class="border border-[var(--ui-v2-border)] bg-[var(--ui-v2-card)] p-6"
    >
      <p class="ui-v2-nav text-[var(--ui-v2-secondary-foreground)]">Loading</p>
      <p class="mt-2 text-[var(--ui-v2-muted-foreground)]">
        Loading system characteristics...
      </p>
    </section>

    <section
      v-else-if="error"
      class="border border-[var(--ui-v2-error)] bg-[var(--ui-v2-error-tint-10)] p-6"
    >
      <p class="ui-v2-nav text-[var(--ui-v2-error)]">Load failed</p>
      <p class="mt-2 text-[var(--ui-v2-foreground)]">{{ errorMessage }}</p>
    </section>

    <template v-else>
      <V2PageHeader
        eyebrow="Characteristics"
        title="System Characteristics"
        description="Review architecture boundaries, authorization posture, and profile completeness."
      />

      <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div
          v-for="card in metricCards"
          :key="card.label"
          class="border border-[var(--ui-v2-border)] bg-[var(--ui-v2-card)] p-4"
        >
          <p class="ui-v2-label text-[var(--ui-v2-secondary-foreground)]">
            {{ card.label }}
          </p>
          <p class="ui-v2-metric mt-2 text-[var(--ui-v2-foreground)]">
            {{ card.value }}
          </p>
          <p class="ui-v2-meta mt-2 text-[var(--ui-v2-tertiary-foreground)]">
            {{ card.helper }}
          </p>
        </div>
      </section>

      <section
        v-if="hasCoreCharacteristics"
        class="border border-[var(--ui-v2-border)] bg-[var(--ui-v2-card)] p-6"
      >
        <p class="ui-v2-label mb-3 text-[var(--ui-v2-secondary-foreground)]">
          Core Fields
        </p>

        <div class="grid gap-6 md:grid-cols-2">
          <div>
            <p class="ui-v2-label text-[var(--ui-v2-secondary-foreground)]">
              System Name
            </p>
            <p class="mt-1 text-[var(--ui-v2-foreground)]">
              {{ characteristics?.systemName || 'N/A' }}
            </p>
          </div>

          <div>
            <p class="ui-v2-label text-[var(--ui-v2-secondary-foreground)]">
              System Name (Short)
            </p>
            <p class="mt-1 text-[var(--ui-v2-foreground)]">
              {{ characteristics?.systemNameShort || 'N/A' }}
            </p>
          </div>

          <div>
            <p class="ui-v2-label text-[var(--ui-v2-secondary-foreground)]">
              Security Sensitivity
            </p>
            <p class="mt-1 text-[var(--ui-v2-foreground)]">
              {{ characteristics?.securitySensitivityLevel || 'N/A' }}
            </p>
          </div>

          <div>
            <p class="ui-v2-label text-[var(--ui-v2-secondary-foreground)]">
              Date Authorized
            </p>
            <p class="mt-1 text-[var(--ui-v2-foreground)]">
              {{ formatDate(characteristics?.dateAuthorized?.toString()) }}
            </p>
          </div>

          <div class="md:col-span-2" v-if="characteristics?.description">
            <p class="ui-v2-label text-[var(--ui-v2-secondary-foreground)]">
              Description
            </p>
            <p class="mt-1 text-[var(--ui-v2-foreground)]">
              {{ characteristics.description }}
            </p>
          </div>

          <div class="md:col-span-2" v-if="characteristics?.remarks">
            <p class="ui-v2-label text-[var(--ui-v2-secondary-foreground)]">
              Remarks
            </p>
            <p class="mt-1 text-[var(--ui-v2-muted-foreground)] italic">
              {{ characteristics.remarks }}
            </p>
          </div>
        </div>
      </section>

      <V2StatePanel
        v-else
        kind="empty"
        title="No characteristics data"
        description="No core system characteristics have been recorded for this plan yet."
      />

      <section class="grid gap-4 xl:grid-cols-3">
        <article
          v-for="diagramSet in diagramSets"
          :key="diagramSet.key"
          class="border border-[var(--ui-v2-border)] bg-[var(--ui-v2-card)] p-5"
        >
          <h3 class="ui-v2-card-title text-[var(--ui-v2-foreground)]">
            {{ diagramSet.label }}
          </h3>

          <p
            class="mt-2 text-[var(--ui-v2-muted-foreground)]"
            v-if="diagramSet.model?.description"
          >
            {{ diagramSet.model.description }}
          </p>

          <p
            v-if="diagramSet.loading"
            class="ui-v2-meta mt-3 text-[var(--ui-v2-tertiary-foreground)]"
          >
            Loading diagrams...
          </p>

          <p
            v-else-if="diagramSet.count === 0"
            class="ui-v2-meta mt-3 text-[var(--ui-v2-tertiary-foreground)]"
          >
            No diagrams defined.
          </p>

          <div v-else class="mt-3 space-y-3">
            <div
              v-for="diagram in diagramSet.model?.diagrams || []"
              :key="diagram.uuid"
              class="border border-[var(--ui-v2-border)] bg-[var(--ui-v2-background)] p-3"
            >
              <p class="ui-v2-nav text-[var(--ui-v2-foreground)]">
                {{ diagram.caption || 'Untitled Diagram' }}
              </p>
              <p
                v-if="diagram.description"
                class="ui-v2-meta mt-2 text-[var(--ui-v2-muted-foreground)]"
              >
                {{ diagram.description }}
              </p>
            </div>
          </div>
        </article>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useDataApi } from '@/composables/axios';
import type { SystemCharacteristics } from '@/oscal';
import type { Diagrammable } from '@/stores/system-security-plans';
import V2PageHeader from '@/components/v2/patterns/V2PageHeader.vue';
import V2StatePanel from '@/components/v2/system/V2StatePanel.vue';

const route = useRoute();
const sspId = computed(() => String(route.params.id || ''));

const {
  data: characteristics,
  isLoading: characteristicsLoading,
  error,
  execute: loadCharacteristics,
} = useDataApi<SystemCharacteristics>(null, null, { immediate: false });

const {
  data: networkArchitecture,
  isLoading: networkArchitectureLoading,
  execute: loadNetworkArchitecture,
} = useDataApi<Diagrammable | null>(null, null, { immediate: false });

const {
  data: authorizationBoundary,
  isLoading: authorizationBoundaryLoading,
  execute: loadAuthorizationBoundary,
} = useDataApi<Diagrammable | null>(null, null, { immediate: false });

const {
  data: dataFlow,
  isLoading: dataFlowLoading,
  execute: loadDataFlow,
} = useDataApi<Diagrammable | null>(null, null, { immediate: false });

watch(
  sspId,
  async (id) => {
    if (!id) {
      return;
    }

    await Promise.allSettled([
      loadCharacteristics(
        `/api/oscal/system-security-plans/${id}/system-characteristics`,
      ),
      loadNetworkArchitecture(
        `/api/oscal/system-security-plans/${id}/system-characteristics/network-architecture`,
      ),
      loadAuthorizationBoundary(
        `/api/oscal/system-security-plans/${id}/system-characteristics/authorization-boundary`,
      ),
      loadDataFlow(
        `/api/oscal/system-security-plans/${id}/system-characteristics/data-flow`,
      ),
    ]);
  },
  { immediate: true },
);

const errorMessage = computed(() => {
  if (!error.value) {
    return 'Unable to load system characteristics.';
  }
  if (typeof error.value === 'string') {
    return error.value;
  }
  if (error.value instanceof Error) {
    return error.value.message;
  }
  return 'Unable to load system characteristics.';
});

const hasCoreCharacteristics = computed(() => {
  if (!characteristics.value) {
    return false;
  }

  const model = characteristics.value;
  return Boolean(
    model.systemName ||
      model.systemNameShort ||
      model.securitySensitivityLevel ||
      model.dateAuthorized ||
      model.description ||
      model.remarks,
  );
});

const authorizationStatus = computed(() => {
  if (!characteristics.value?.dateAuthorized) {
    return 'Not Authorized';
  }

  const authDate = new Date(characteristics.value.dateAuthorized.toString());
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - authDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays > 365) {
    return 'Needs Review';
  }

  return 'Authorized';
});

const daysSinceAuthorization = computed(() => {
  if (!characteristics.value?.dateAuthorized) {
    return null;
  }

  const authDate = new Date(characteristics.value.dateAuthorized.toString());
  const now = new Date();
  return Math.floor(
    (now.getTime() - authDate.getTime()) / (1000 * 60 * 60 * 24),
  );
});

const totalDiagrams = computed(() => {
  const networkCount = networkArchitecture.value?.diagrams?.length || 0;
  const dataFlowCount = dataFlow.value?.diagrams?.length || 0;
  const boundaryCount = authorizationBoundary.value?.diagrams?.length || 0;
  return networkCount + dataFlowCount + boundaryCount;
});

const diagramCategories = computed(() => {
  let categories = 0;
  if ((networkArchitecture.value?.diagrams?.length || 0) > 0) categories++;
  if ((dataFlow.value?.diagrams?.length || 0) > 0) categories++;
  if ((authorizationBoundary.value?.diagrams?.length || 0) > 0) categories++;
  return categories;
});

const fieldsCompleted = computed(() => {
  let completed = 0;
  if (characteristics.value?.systemName) completed++;
  if (characteristics.value?.systemNameShort) completed++;
  if (characteristics.value?.securitySensitivityLevel) completed++;
  if (characteristics.value?.dateAuthorized) completed++;
  if (characteristics.value?.description) completed++;
  if (characteristics.value?.remarks) completed++;
  if (networkArchitecture.value) completed++;
  if (dataFlow.value) completed++;
  if (authorizationBoundary.value) completed++;
  return completed;
});

const totalFields = 9;

const completenessPercentage = computed(() =>
  Math.round((fieldsCompleted.value / totalFields) * 100),
);

const metricCards = computed(() => [
  {
    label: 'Security Level',
    value: characteristics.value?.securitySensitivityLevel || 'N/A',
    helper: 'Current sensitivity designation',
  },
  {
    label: 'Authorization Status',
    value: authorizationStatus.value,
    helper:
      daysSinceAuthorization.value === null
        ? 'No authorization date set'
        : `${daysSinceAuthorization.value} days since authorization`,
  },
  {
    label: 'Architecture Diagrams',
    value: totalDiagrams.value,
    helper: `${diagramCategories.value} category${diagramCategories.value === 1 ? '' : 'ies'} covered`,
  },
  {
    label: 'Profile Completeness',
    value: `${completenessPercentage.value}%`,
    helper: `${fieldsCompleted.value} of ${totalFields} fields complete`,
  },
]);

const diagramSets = computed(() => [
  {
    key: 'network-architecture',
    label: 'Network Architecture',
    model: networkArchitecture.value,
    loading: networkArchitectureLoading.value,
    count: networkArchitecture.value?.diagrams?.length || 0,
  },
  {
    key: 'data-flow',
    label: 'Data Flow',
    model: dataFlow.value,
    loading: dataFlowLoading.value,
    count: dataFlow.value?.diagrams?.length || 0,
  },
  {
    key: 'authorization-boundary',
    label: 'Authorization Boundary',
    model: authorizationBoundary.value,
    loading: authorizationBoundaryLoading.value,
    count: authorizationBoundary.value?.diagrams?.length || 0,
  },
]);

function formatDate(dateString?: string): string {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString();
}
</script>
