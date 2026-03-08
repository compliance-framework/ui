<script setup lang="ts">
import { computed } from 'vue';
import type { Dashboard } from '@/stores/filters';
import V2LucideIcon from '@/components/v2/primitives/V2LucideIcon.vue';
import DashboardMiniStatusChartV2 from './DashboardMiniStatusChartV2.vue';

const props = defineProps<{
  dashboard: Dashboard;
  deleting?: boolean;
}>();

const emit = defineEmits<{
  (event: 'delete', dashboard: Dashboard): void;
}>();

const chips = computed(() => {
  const controlChips = props.dashboard.controls.map((control) => ({
    key: `control-${control.id}`,
    label: control.id,
    title: control.title || control.id,
  }));
  const componentChips = props.dashboard.components.map((component) => ({
    key: `component-${component.uuid}`,
    label: component.title,
    title: component.title,
  }));

  return [...controlChips, ...componentChips];
});

function requestDelete(): void {
  emit('delete', props.dashboard);
}
</script>

<template>
  <article
    class="space-y-3 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-card)] p-4"
  >
    <div class="flex items-start justify-between gap-3">
      <h3
        class="min-w-0 flex-1 truncate font-[var(--ui-v2-font-primary)] text-[16px] font-bold text-[var(--ui-v2-foreground)]"
        :title="dashboard.name"
      >
        {{ dashboard.name }}
      </h3>

      <button
        type="button"
        class="inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center bg-[#d20f3910] text-[var(--ui-v2-error)] transition-colors hover:bg-[#d20f391a] disabled:cursor-not-allowed disabled:opacity-50"
        :disabled="deleting"
        :aria-label="`Delete ${dashboard.name}`"
        :title="`Delete ${dashboard.name}`"
        @click="requestDelete"
      >
        <V2LucideIcon name="trash-2" :size="12" />
      </button>
    </div>

    <div v-if="chips.length" class="flex flex-wrap gap-2">
      <span
        v-for="chip in chips"
        :key="chip.key"
        class="ui-v2-label inline-flex max-w-full items-center border border-[#df8e1d40] bg-[#df8e1d15] px-2 py-1 text-[var(--ui-v2-foreground)]"
        :title="chip.title"
      >
        <span class="truncate">{{ chip.label }}</span>
      </span>
    </div>

    <DashboardMiniStatusChartV2 :filter="dashboard.filter" />
  </article>
</template>
