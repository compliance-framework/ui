<script setup lang="ts">
/**
 * The Compliance Map's scope: one system (or all), one of its components, and which catalog types
 * to show (standards, policies, procedures), kept in the lineage scope store; with when the data
 * was loaded and Refresh. The script is the classic scope bar's.
 */
import { computed, onMounted, ref, watch } from 'vue';
import { useTimeAgo } from '@vueuse/core';
import Button from '@/ds/components/Button/Button.vue';
import CheckboxGroup from '@/ds/components/CheckboxGroup/CheckboxGroup.vue';
import Combobox from '@/ds/components/Combobox/Combobox.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import Text from '@/ds/components/Text/Text.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import { useSystemSecurityPlanStore } from '@/stores/system-security-plans';
import { useLineageScopeStore } from '@/stores/lineageScope';

interface Option {
  label: string;
  value: string;
}

const props = defineProps<{
  /** When the data on screen was loaded by the API; null hides the label. */
  generatedAt?: Date | null;
  /** True while the view reloads, disabling the refresh button. */
  refreshing?: boolean;
}>();

const emit = defineEmits<{ refresh: [] }>();

const updatedAgo = useTimeAgo(computed(() => props.generatedAt ?? new Date()));

const scopeStore = useLineageScopeStore();
const sspStore = useSystemSecurityPlanStore();

const sspOptions = ref<Option[]>([]);
const componentOptions = ref<Option[]>([]);
const loadingSsps = ref(false);
const loadingComponents = ref(false);

const typeOptions: Option[] = [
  { label: 'Standard', value: 'standard' },
  { label: 'Policy', value: 'policy' },
  { label: 'Procedure', value: 'procedure' },
];

async function loadSsps() {
  loadingSsps.value = true;
  try {
    const res = await sspStore.list();
    sspOptions.value = (res.data ?? []).map((ssp) => ({
      label: ssp.metadata?.title || ssp.uuid,
      value: ssp.uuid,
    }));
  } catch (err) {
    console.warn('[LineageScopeFilters] failed to load SSPs', err);
    sspOptions.value = [];
  } finally {
    loadingSsps.value = false;
  }
}

async function loadComponents(sspId: string | null) {
  componentOptions.value = [];
  if (!sspId) return;
  loadingComponents.value = true;
  try {
    const res = await sspStore.getSystemImplementationComponents(sspId);
    componentOptions.value = (res.data ?? []).map((c) => ({
      label: c.title || c.uuid,
      value: c.uuid,
    }));
  } catch (err) {
    console.warn('[LineageScopeFilters] failed to load components', err);
    componentOptions.value = [];
  } finally {
    loadingComponents.value = false;
  }
}

function onSsp(value: string) {
  scopeStore.setSspId(value || null);
}

function onComponent(value: string) {
  scopeStore.setComponentId(value || null);
}

const ALL_SSPS: Option = { label: 'All systems', value: '' };
const ALL_COMPONENTS: Option = { label: 'All components', value: '' };

function onTypes(value: string[]) {
  scopeStore.setTypes(value ?? []);
}

onMounted(() => {
  loadSsps();
  loadComponents(scopeStore.sspId);
});

watch(
  () => scopeStore.sspId,
  (id) => loadComponents(id),
);
</script>

<template>
  <Cluster gap="4" align="end">
    <FormField label="System">
      <Combobox
        :model-value="scopeStore.sspId ?? ''"
        :options="[ALL_SSPS, ...sspOptions]"
        :loading="loadingSsps"
        placeholder="All systems"
        @update:model-value="onSsp"
      />
    </FormField>
    <FormField
      label="Component"
      :hint="scopeStore.sspId ? undefined : 'Choose a system first.'"
    >
      <Combobox
        v-if="scopeStore.sspId"
        :model-value="scopeStore.componentId ?? ''"
        :options="[ALL_COMPONENTS, ...componentOptions]"
        :loading="loadingComponents"
        placeholder="All components"
        @update:model-value="onComponent"
      />
      <Text v-else as="span" variant="secondary">All components</Text>
    </FormField>
    <CheckboxGroup
      :model-value="scopeStore.types"
      legend="Types"
      :options="typeOptions"
      @update:model-value="onTypes"
    />
    <Cluster gap="3" align="center">
      <Text
        v-if="generatedAt"
        as="span"
        variant="caption"
        data-testid="lineage-updated"
        >Updated {{ updatedAgo }}</Text
      >
      <Button
        icon="refresh"
        :loading="refreshing"
        data-testid="lineage-refresh"
        @click="emit('refresh')"
        >Refresh</Button
      >
    </Cluster>
  </Cluster>
</template>
