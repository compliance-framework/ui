<script setup lang="ts">
/**
 * Configure System → Characteristics: the system's name, description, sensitivity and
 * authorization, how complete its characteristics are, and its architecture, boundary and data
 * flow descriptions. Edit opens the characteristics form in a dialog. The script is the classic page's.
 */
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import type { SystemCharacteristics } from '@/oscal';
import { useDataApi } from '@/composables/axios';
import type { Diagrammable } from '@/stores/system-security-plans';
import SystemCharacteristicsForm from '@/components/SystemCharacteristicsForm.vue';
import { formatDate as formatDay, plural } from '@/ds/format';
import Button from '@/ds/components/Button/Button.vue';
import DataState from '@/ds/components/DataState/DataState.vue';
import DescriptionList from '@/ds/components/DescriptionList/DescriptionList.vue';
import Dialog from '@/ds/components/Dialog/Dialog.vue';
import Text from '@/ds/components/Text/Text.vue';
import Grid from '@/ds/components/layout/Grid.vue';
import Panel from '@/ds/components/layout/Panel.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import { useToast } from 'primevue/usetoast';
import { usePermissions } from '@/composables/usePermissions';
import { RESOURCES, ACTIONS } from '@/constants/permissions';

const { can } = usePermissions();
const editDenied = computed(() =>
  can(RESOURCES.SSP, ACTIONS.UPDATE)
    ? undefined
    : "Your access doesn't include changing this system.",
);

const props = defineProps<{ sspId?: string }>();
const route = useRoute();
const toast = useToast();
const showEditCharacteristicsModal = ref(false);

const sspId = computed(() => props.sspId || String(route.params.id || ''));

const {
  data: characteristics,
  isLoading: loading,
  error,
} = useDataApi<SystemCharacteristics>(
  `/api/oscal/system-security-plans/${sspId.value}/system-characteristics`,
);
const { data: networkArchitecture, isLoading: networkArchitectureLoading } =
  useDataApi<Diagrammable | null>(
    `/api/oscal/system-security-plans/${sspId.value}/system-characteristics/network-architecture`,
  );
const { data: authorizationBoundary, isLoading: authorizationBoundaryLoading } =
  useDataApi<Diagrammable | null>(
    `/api/oscal/system-security-plans/${sspId.value}/system-characteristics/authorization-boundary`,
  );
const { data: dataFlow, isLoading: dataFlowLoading } =
  useDataApi<Diagrammable | null>(
    `/api/oscal/system-security-plans/${sspId.value}/system-characteristics/data-flow`,
  );

// Computed properties for metrics
const authorizationStatus = computed(() => {
  if (!characteristics.value?.dateAuthorized) return 'Not Authorized';
  const authDate = new Date(characteristics.value.dateAuthorized.toString());
  const now = new Date();
  const diffTime = now.getTime() - authDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  // Consider re-authorization needed after 365 days
  if (diffDays > 365) return 'Needs Review';
  return 'Authorized';
});

const daysSinceAuthorization = computed(() => {
  if (!characteristics.value?.dateAuthorized) return null;
  const authDate = new Date(characteristics.value.dateAuthorized.toString());
  const now = new Date();
  const diffTime = now.getTime() - authDate.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
});

const totalDiagrams = computed(() => {
  let count = 0;
  if (networkArchitecture.value?.diagrams?.length)
    count += networkArchitecture.value.diagrams.length;
  if (dataFlow.value?.diagrams?.length) count += dataFlow.value.diagrams.length;
  if (authorizationBoundary.value?.diagrams?.length)
    count += authorizationBoundary.value.diagrams.length;
  return count;
});

const diagramCategories = computed(() => {
  let categories = 0;
  if (networkArchitecture.value?.diagrams?.length) categories++;
  if (dataFlow.value?.diagrams?.length) categories++;
  if (authorizationBoundary.value?.diagrams?.length) categories++;
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

const totalFields = 9; // Total possible fields to complete

const completenessPercentage = computed(() => {
  return Math.round((fieldsCompleted.value / totalFields) * 100);
});

const handleCharacteristicsUpdated = (updated: SystemCharacteristics) => {
  showEditCharacteristicsModal.value = false;

  if (!updated || Object.keys(updated).length === 0) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load or save system characteristics.',
      life: 3000,
    });
    return;
  }

  characteristics.value = updated;
};

// Design-system view ---------------------------------------------------------------------------

const metrics = computed(() => [
  {
    key: 'sensitivity',
    label: 'Security sensitivity',
    value: characteristics.value?.securitySensitivityLevel,
  },
  {
    key: 'authorization',
    label: 'Authorization',
    value:
      daysSinceAuthorization.value !== null
        ? `${authorizationStatus.value}, ${plural(daysSinceAuthorization.value, 'day')} ago`
        : authorizationStatus.value,
  },
  {
    key: 'diagrams',
    label: 'Architecture diagrams',
    value: `${totalDiagrams.value} across ${plural(diagramCategories.value, 'category', 'categories')}`,
  },
  {
    key: 'completeness',
    label: 'Completeness',
    value: `${completenessPercentage.value}% (${fieldsCompleted.value} of ${totalFields} fields)`,
  },
]);
const details = computed(() => {
  const c = characteristics.value;
  if (!c) return [];
  return [
    { key: 'name', label: 'System name', value: c.systemName },
    { key: 'short', label: 'Short name', value: c.systemNameShort },
    {
      key: 'authorized',
      label: 'Date authorized',
      value: c.dateAuthorized ? formatDay(String(c.dateAuthorized)) : '',
    },
    { key: 'description', label: 'Description', value: c.description },
    { key: 'remarks', label: 'Remarks', value: c.remarks },
  ];
});
const architecture = computed(() => [
  {
    key: 'network',
    title: 'Network architecture',
    data: networkArchitecture.value,
    loading: networkArchitectureLoading.value,
  },
  {
    key: 'boundary',
    title: 'Authorization boundary',
    data: authorizationBoundary.value,
    loading: authorizationBoundaryLoading.value,
  },
  {
    key: 'flow',
    title: 'Data flow',
    data: dataFlow.value,
    loading: dataFlowLoading.value,
  },
]);
</script>

<template>
  <Stack gap="5">
    <DescriptionList :items="metrics" />
    <Panel title="System information" :level="2">
      <template #actions>
        <Button
          icon="edit"
          :disabled-reason="editDenied"
          @click="showEditCharacteristicsModal = true"
          >Edit</Button
        >
      </template>
      <DataState
        :status="
          characteristics
            ? 'ready'
            : loading
              ? 'loading'
              : error
                ? 'error'
                : 'empty'
        "
        subject="system characteristics"
        empty-title="No characteristics yet"
        empty-body="Describe the system: its name, purpose, sensitivity and authorization."
        skeleton="text"
      >
        <DescriptionList :items="details" layout="stacked" />
      </DataState>
    </Panel>
    <Grid min="sm" gap="4">
      <Panel
        v-for="part in architecture"
        :key="part.key"
        :title="part.title"
        :level="2"
      >
        <Text v-if="part.loading" variant="caption">Loading…</Text>
        <Stack v-else-if="part.data" gap="2">
          <Text v-if="part.data.description">{{ part.data.description }}</Text>
          <Text variant="caption">{{
            plural(part.data.diagrams?.length ?? 0, 'diagram')
          }}</Text>
          <Text
            v-for="(diagram, index) in part.data.diagrams ?? []"
            :key="diagram.uuid"
            variant="caption"
            >{{ diagram.caption || `Diagram ${index + 1}`
            }}<template v-if="diagram.description">
              — {{ diagram.description }}</template
            ></Text
          >
        </Stack>
        <Text v-else variant="caption">Not described yet.</Text>
      </Panel>
    </Grid>
    <Dialog
      v-model:open="showEditCharacteristicsModal"
      title="Edit system characteristics"
      size="l"
    >
      <SystemCharacteristicsForm
        v-if="showEditCharacteristicsModal"
        :system-security-plan-id="sspId"
        @updated="handleCharacteristicsUpdated"
        @cancel="showEditCharacteristicsModal = false"
      />
    </Dialog>
  </Stack>
</template>
