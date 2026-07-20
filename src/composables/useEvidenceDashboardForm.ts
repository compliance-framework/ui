import { computed, ref, watch } from 'vue';
import type { ComputedRef, Ref } from 'vue';
import { useToast } from 'primevue/usetoast';
import { useDataApi } from '@/composables/axios';
import type { Evidence } from '@/stores/evidence';
import type {
  LabelCondition,
  SearchableEvidence,
} from '@/views/control-implementations/partials/form-options';

// Explicit so the declaration output names SearchableEvidence directly rather than
// inlining its OSCAL-derived (and un-nameable) sub-types.
export interface EvidenceDashboardFormApi {
  name: Ref<string>;
  availableEvidence: Ref<SearchableEvidence[]>;
  selectedBaselineEvidence: Ref<SearchableEvidence | null>;
  evidenceLoading: Ref<boolean>;
  labelConditions: Ref<LabelCondition[]>;
  newLabelName: Ref<string>;
  newLabelValue: Ref<string>;
  uniqueEvidenceTitles: ComputedRef<SearchableEvidence[]>;
  availableLabelNames: ComputedRef<string[]>;
  availableLabelValues: ComputedRef<string[]>;
  computedFilter: ComputedRef<string>;
  loadAvailableEvidence: (forceReload?: boolean) => Promise<void>;
  addLabelCondition: () => void;
  removeLabelCondition: (index: number) => void;
  reset: () => void;
}

// The label-condition builder behind the "New Evidence Dashboard" form. It owns the
// baseline-evidence dropdown, the label name/value pickers and the derived filter
// string — everything EvidenceDashboardForm.vue binds to. Extracted so the control
// statement editor and the inherited-responsibilities drawer drive it from one place
// instead of duplicating ~150 lines of intricate label logic.
export function useEvidenceDashboardForm(): EvidenceDashboardFormApi {
  const toast = useToast();

  const name = ref('');
  const availableEvidence = ref<SearchableEvidence[]>([]);
  const selectedBaselineEvidence = ref<SearchableEvidence | null>(null);
  const evidenceLoading = ref(false);
  const labelConditions = ref<LabelCondition[]>([]);
  const newLabelName = ref('');
  const newLabelValue = ref('');

  const { execute: fetchEvidenceForLabels } = useDataApi<Evidence[]>(
    '/api/evidence/search',
    { method: 'POST' },
    { immediate: false },
  );

  async function loadAvailableEvidence(forceReload = false) {
    if (!forceReload && availableEvidence.value.length > 0) return; // Already loaded
    evidenceLoading.value = true;
    try {
      const res = await fetchEvidenceForLabels({ data: { filter: {} } });
      const evidenceList = res.data.value?.data || res.data.value || [];
      availableEvidence.value = (evidenceList as Evidence[])
        .filter((ev) => ev.labels && ev.labels.length > 0)
        .map((ev) => ({
          ...ev,
          searchText: [
            ev.title,
            ...(ev.labels?.map((l) => `${l.name} ${l.value}`) || []),
          ].join(' '),
        }));
    } catch (error) {
      console.error('Failed to load evidence:', error);
      toast.add({
        severity: 'error',
        summary: 'Failed to load evidence',
        detail: 'Evidence could not be loaded. Please try again later.',
        life: 3000,
      });
    } finally {
      evidenceLoading.value = false;
    }
  }

  // Only show each title once in the baseline dropdown.
  const uniqueEvidenceTitles = computed(() => {
    const titleMap = new Map<string, SearchableEvidence>();
    for (const ev of availableEvidence.value) {
      if (!titleMap.has(ev.title)) {
        titleMap.set(ev.title, ev);
      }
    }
    return Array.from(titleMap.values());
  });

  // All evidence entries sharing the selected baseline's title.
  const evidenceEntriesForSelectedTitle = computed(() => {
    if (!selectedBaselineEvidence.value) return [];
    return availableEvidence.value.filter(
      (ev) => ev.title === selectedBaselineEvidence.value!.title,
    );
  });

  const availableLabelNames = computed(() => {
    if (evidenceEntriesForSelectedTitle.value.length === 0) return [];
    const names = new Set<string>();
    for (const ev of evidenceEntriesForSelectedTitle.value) {
      for (const label of ev.labels ?? []) {
        names.add(label.name);
      }
    }
    return Array.from(names).sort();
  });

  // Values for the selected label name, narrowed to entries matching the conditions
  // already added.
  const availableLabelValues = computed(() => {
    if (!newLabelName.value) return [];
    const values = new Set<string>();
    const relevantEvidence = evidenceEntriesForSelectedTitle.value.filter(
      (ev) => {
        if (!ev.labels) return false;
        return labelConditions.value.every((condition) =>
          ev.labels?.some(
            (l) => l.name === condition.name && l.value === condition.value,
          ),
        );
      },
    );
    for (const ev of relevantEvidence) {
      for (const label of ev.labels ?? []) {
        if (label.name === newLabelName.value) {
          values.add(label.value);
        }
      }
    }
    return Array.from(values).sort();
  });

  const computedFilter = computed(() => {
    if (labelConditions.value.length === 0) return '';
    return labelConditions.value
      .map((c) => `${c.name}=${c.value}`)
      .join(' and ');
  });

  // Selecting a baseline auto-seeds the _policy condition (its most useful facet) and
  // clears the in-progress name/value pickers.
  watch(selectedBaselineEvidence, (ev) => {
    if (!ev) {
      labelConditions.value = [];
      return;
    }
    const policyLabel = ev.labels?.find((l) => l.name === '_policy');
    labelConditions.value = policyLabel
      ? [{ name: '_policy', value: policyLabel.value }]
      : [];
    newLabelName.value = '';
    newLabelValue.value = '';
  });

  function addLabelCondition() {
    if (!newLabelName.value || !newLabelValue.value) return;
    const exists = labelConditions.value.some(
      (c) => c.name === newLabelName.value && c.value === newLabelValue.value,
    );
    if (!exists) {
      labelConditions.value.push({
        name: newLabelName.value,
        value: newLabelValue.value,
      });
    }
    newLabelName.value = '';
    newLabelValue.value = '';
  }

  function removeLabelCondition(index: number) {
    labelConditions.value.splice(index, 1);
  }

  function reset() {
    name.value = '';
    selectedBaselineEvidence.value = null;
    labelConditions.value = [];
    newLabelName.value = '';
    newLabelValue.value = '';
  }

  return {
    name,
    availableEvidence,
    selectedBaselineEvidence,
    evidenceLoading,
    labelConditions,
    newLabelName,
    newLabelValue,
    uniqueEvidenceTitles,
    availableLabelNames,
    availableLabelValues,
    computedFilter,
    loadAvailableEvidence,
    addLabelCondition,
    removeLabelCondition,
    reset,
  };
}
