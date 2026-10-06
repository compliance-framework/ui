<template>
  <div class="space-y-2" data-test="instance-picker">
    <div class="flex flex-wrap gap-2">
      <button
        v-for="item in pageItems"
        :key="item.inst.instanceId"
        type="button"
        :class="[
          itemClass(item.inst.instanceId),
          { 'opacity-70': item.inst.stale },
        ]"
        :aria-pressed="item.inst.instanceId === selectedId"
        :data-test="`pick-${item.inst.instanceId}`"
        @click="$emit('select', item.inst.instanceId)"
      >
        <span class="font-mono text-xs">{{ label(item.inst) }}</span>
        <ConfigPill v-if="item.inst.stale" severity="secondary"
          >stale</ConfigPill
        >
        <InstanceStatusChip :state="item.state" />
      </button>
    </div>
    <div
      v-if="pageCount > 1"
      class="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400"
      data-test="picker-pager"
    >
      <button
        type="button"
        class="underline disabled:no-underline disabled:opacity-40"
        :disabled="page === 0"
        data-test="picker-prev"
        @click="page--"
      >
        Previous
      </button>
      <span data-test="picker-range"
        >{{ page * PICKER_PAGE_SIZE + 1 }}–{{
          Math.min((page + 1) * PICKER_PAGE_SIZE, shown.length)
        }}
        of {{ shown.length }}</span
      >
      <button
        type="button"
        class="underline disabled:no-underline disabled:opacity-40"
        :disabled="page >= pageCount - 1"
        data-test="picker-next"
        @click="page++"
      >
        Next
      </button>
    </div>
    <button
      v-if="staleItems.length"
      type="button"
      class="text-xs text-gray-500 underline dark:text-slate-400"
      data-test="toggle-stale"
      @click="showStale = !showStale"
    >
      {{ showStale ? 'Hide' : 'Show' }} {{ staleItems.length }} stale instance{{
        staleItems.length === 1 ? '' : 's'
      }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { AgentInstanceSummary } from '@/types/agent-config';
import type { InstanceUiState } from '@/utils/agent-config/instance-status';
import InstanceStatusChip from './InstanceStatusChip.vue';
import ConfigPill from './ConfigPill.vue';

/** Instances per picker page (the API's page size). */
const PICKER_PAGE_SIZE = 25;

const props = defineProps<{
  instances: AgentInstanceSummary[];
  states: InstanceUiState[];
  selectedId: string | null;
}>();

defineEmits<{ select: [id: string] }>();

const items = computed(() =>
  props.instances.map((inst, i) => ({ inst, state: props.states[i] })),
);
// Staleness is the API's flag (R14); stale instances are collapsed.
const freshItems = computed(() => items.value.filter((i) => !i.inst.stale));
const staleItems = computed(() => items.value.filter((i) => i.inst.stale));
const showStale = ref(false);
/** Fresh instances, then the stale ones when shown; rendered a page at a time. */
const shown = computed(() =>
  showStale.value
    ? [...freshItems.value, ...staleItems.value]
    : freshItems.value,
);
const page = ref(0);
const pageCount = computed(() =>
  Math.max(1, Math.ceil(shown.value.length / PICKER_PAGE_SIZE)),
);
const pageItems = computed(() =>
  shown.value.slice(
    page.value * PICKER_PAGE_SIZE,
    (page.value + 1) * PICKER_PAGE_SIZE,
  ),
);
watch(pageCount, (n) => {
  if (page.value > n - 1) page.value = n - 1;
});

// The selected instance is always on the shown page (stale ones expand the list).
watch(
  () => props.selectedId,
  (id) => {
    if (staleItems.value.some((i) => i.inst.instanceId === id))
      showStale.value = true;
    const at = shown.value.findIndex((i) => i.inst.instanceId === id);
    if (at >= 0) page.value = Math.floor(at / PICKER_PAGE_SIZE);
  },
  { immediate: true },
);

function itemClass(id: string): string {
  const base =
    'inline-flex items-center gap-2 rounded-md border px-2 py-1 text-left hover:bg-slate-50 dark:hover:bg-slate-800';
  return id === props.selectedId
    ? `${base} border-sky-500 bg-sky-50 dark:border-sky-400 dark:bg-sky-500/10`
    : `${base} border-ccf-300 dark:border-slate-700`;
}

function label(inst: AgentInstanceSummary): string {
  return inst.hostname || inst.instanceId.slice(0, 8);
}
</script>
