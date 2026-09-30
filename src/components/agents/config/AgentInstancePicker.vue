<template>
  <div class="space-y-2" data-test="instance-picker">
    <div class="flex flex-wrap gap-2">
      <button
        v-for="item in freshItems"
        :key="item.inst.instanceId"
        type="button"
        :class="itemClass(item.inst.instanceId)"
        :aria-pressed="item.inst.instanceId === selectedId"
        :data-test="`pick-${item.inst.instanceId}`"
        @click="$emit('select', item.inst.instanceId)"
      >
        <span class="font-mono text-xs">{{ label(item.inst) }}</span>
        <InstanceStatusChip :state="item.state" />
      </button>
    </div>
    <div v-if="staleItems.length">
      <button
        type="button"
        class="text-xs text-gray-500 underline dark:text-slate-400"
        data-test="toggle-stale"
        @click="showStale = !showStale"
      >
        {{ showStale ? 'Hide' : 'Show' }} {{ staleItems.length }} stale
        instance{{ staleItems.length === 1 ? '' : 's' }}
      </button>
      <div v-if="showStale" class="mt-2 flex flex-wrap gap-2">
        <button
          v-for="item in staleItems"
          :key="item.inst.instanceId"
          type="button"
          class="opacity-70"
          :class="itemClass(item.inst.instanceId)"
          :data-test="`pick-${item.inst.instanceId}`"
          @click="$emit('select', item.inst.instanceId)"
        >
          <span class="font-mono text-xs">{{ label(item.inst) }}</span>
          <ConfigPill severity="secondary">stale</ConfigPill>
          <InstanceStatusChip :state="item.state" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { AgentInstanceSummary } from '@/types/agent-config';
import type { InstanceUiState } from '@/utils/agent-config/instance-status';
import InstanceStatusChip from './InstanceStatusChip.vue';
import ConfigPill from './ConfigPill.vue';

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

watch(
  () => props.selectedId,
  (id) => {
    if (staleItems.value.some((i) => i.inst.instanceId === id))
      showStale.value = true;
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
