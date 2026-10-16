<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useTimeAgo } from '@vueuse/core';
import Select from '@/volt/Select.vue';
import SelectButton from '@/volt/SelectButton.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
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
const updatedTitle = computed(() => props.generatedAt?.toLocaleString() ?? '');

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

    <div class="ml-auto flex items-center gap-3">
      <span
        v-if="generatedAt"
        class="text-sm text-surface-500 dark:text-surface-400"
        :title="updatedTitle"
        data-testid="lineage-updated"
        >Updated {{ updatedAgo }}</span
      >
      <SecondaryButton
        :disabled="refreshing"
        data-testid="lineage-refresh"
        @click="emit('refresh')"
      >
        <i class="pi pi-refresh mr-2" :class="{ 'pi-spin': refreshing }"></i>
        Refresh
      </SecondaryButton>
    </div>
  </div>
</template>
