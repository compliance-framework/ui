<script setup lang="ts">
import { computed } from 'vue';
import type { Dashboard } from '@/stores/filters';
import V2LucideIcon from '@/components/v2/primitives/V2LucideIcon.vue';
import DashboardMiniStatusChartV2 from './DashboardMiniStatusChartV2.vue';

const props = withDefaults(
  defineProps<{
    dashboard: Dashboard;
    deleting?: boolean;
    canEdit?: boolean;
    canDelete?: boolean;
    editTooltip?: string;
    deleteTooltip?: string;
  }>(),
  { canEdit: true, canDelete: true, editTooltip: '', deleteTooltip: '' },
);

const emit = defineEmits<{
  (event: 'edit', dashboard: Dashboard): void;
  (event: 'delete', dashboard: Dashboard): void;
}>();

const chips = computed(() => {
  // Controls and components are optional on a filter (main #315).
  const controlChips = (props.dashboard.controls ?? []).map((control) => ({
    key: `control-${control.id}`,
    label: control.id,
    title: control.title || control.id,
  }));
  const componentChips = (props.dashboard.components ?? []).map(
    (component) => ({
      key: `component-${component.uuid}`,
      label: component.title,
      title: component.title,
    }),
  );

  return [...controlChips, ...componentChips];
});

function requestEdit(): void {
  emit('edit', props.dashboard);
}

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

      <div class="flex shrink-0 gap-1">
        <button
          v-tooltip.top="{ value: editTooltip, disabled: canEdit }"
          type="button"
          class="inline-flex h-[22px] w-[22px] items-center justify-center bg-[var(--ui-v2-primary-tint-15)] text-[var(--ui-v2-foreground)] transition-colors hover:bg-[var(--ui-v2-primary-tint-25,var(--ui-v2-primary-tint-15))] disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="!canEdit"
          :aria-label="`Edit ${dashboard.name}`"
          :title="canEdit ? `Edit ${dashboard.name}` : undefined"
          @click="requestEdit"
        >
          <V2LucideIcon name="pencil" :size="12" />
        </button>
        <button
          v-tooltip.top="{ value: deleteTooltip, disabled: canDelete }"
          type="button"
          class="inline-flex h-[22px] w-[22px] items-center justify-center bg-[#d20f3910] text-[var(--ui-v2-error)] transition-colors hover:bg-[#d20f391a] disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="deleting || !canDelete"
          :aria-label="`Delete ${dashboard.name}`"
          :title="canDelete ? `Delete ${dashboard.name}` : undefined"
          @click="requestDelete"
        >
          <V2LucideIcon name="trash-2" :size="12" />
        </button>
      </div>
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
