<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import Select from '@/volt/Select.vue';
import SelectButton from '@/volt/SelectButton.vue';
import { useSystemSecurityPlanStore } from '@/stores/system-security-plans';
import { useLineageScopeStore } from '@/stores/lineageScope';

interface Option {
  label: string;
  value: string;
}

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
    console.warn('[LineageScopeBar] failed to load SSPs', err);
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
    console.warn('[LineageScopeBar] failed to load components', err);
    componentOptions.value = [];
  } finally {
    loadingComponents.value = false;
  }
}

function onSsp(value: string | null) {
  scopeStore.setSspId(value ?? null);
}

function onComponent(value: string | null) {
  scopeStore.setComponentId(value ?? null);
}

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
  <div class="flex flex-wrap items-end gap-4">
    <label class="flex flex-col gap-1 text-sm">
      <span class="font-medium text-surface-600 dark:text-surface-300"
        >SSP</span
      >
      <Select
        :modelValue="scopeStore.sspId"
        :options="sspOptions"
        optionLabel="label"
        optionValue="value"
        :loading="loadingSsps"
        showClear
        filter
        placeholder="All SSPs"
        class="min-w-56"
        @update:modelValue="onSsp"
      />
    </label>

    <label class="flex flex-col gap-1 text-sm">
      <span class="font-medium text-surface-600 dark:text-surface-300"
        >Component</span
      >
      <Select
        :modelValue="scopeStore.componentId"
        :options="componentOptions"
        optionLabel="label"
        optionValue="value"
        :loading="loadingComponents"
        :disabled="!scopeStore.sspId"
        showClear
        filter
        placeholder="All components"
        class="min-w-56"
        @update:modelValue="onComponent"
      />
    </label>

    <label class="flex flex-col gap-1 text-sm">
      <span class="font-medium text-surface-600 dark:text-surface-300"
        >Types</span
      >
      <SelectButton
        :modelValue="scopeStore.types"
        :options="typeOptions"
        optionLabel="label"
        optionValue="value"
        multiple
        @update:modelValue="onTypes"
      />
    </label>
  </div>
</template>
