<script setup lang="ts" generic="T extends { value: string; label: string }">
import { nextTick, useId } from 'vue';

/**
 * Tabs within a page section that don't change the URL, e.g. one tab per plugin of a record.
 * (Page-level tabs are routes: use Tabs.) A tablist with v-model: arrow keys, Home and End move
 * between tabs and select them; only the selected tab is a tab stop. Every panel stays mounted
 * (hidden when not selected), so what's open in one keeps its state across switches.
 *
 * Name the tablist with `label`, or `labelledby` when a visible heading names it. The `tab`
 * slot renders a tab's content (default: its label); the `panel` slot a tab's panel; the `end`
 * slot holds actions after the tablist (e.g. "Add plugin"), outside it. A tab's `describedby`
 * names an element describing it. Each tab and panel carries `data-tab` / `data-panel` with its
 * value.
 */
const props = withDefaults(
  defineProps<{
    tabs: (T & { describedby?: string })[];
    label?: string;
    labelledby?: string;
  }>(),
  { label: undefined, labelledby: undefined },
);
const model = defineModel<string>({ required: true });
defineSlots<{
  tab?(props: { tab: T; selected: boolean }): unknown;
  panel?(props: { tab: T }): unknown;
  end?(): unknown;
}>();

const baseId = useId();
const tabId = (index: number) => `${baseId}-tab-${index}`;
const panelId = (index: number) => `${baseId}-panel-${index}`;

async function onKeydown(event: KeyboardEvent): Promise<void> {
  const last = props.tabs.length - 1;
  const current = props.tabs.findIndex((tab) => tab.value === model.value);
  const targets: Record<string, number> = {
    ArrowRight: current >= last ? 0 : current + 1,
    ArrowLeft: current <= 0 ? last : current - 1,
    Home: 0,
    End: last,
  };
  const target = targets[event.key];
  if (target === undefined || last < 0) return;
  event.preventDefault();
  model.value = props.tabs[target].value;
  await nextTick();
  document.getElementById(tabId(target))?.focus();
}
</script>

<template>
  <div class="inline-tabs">
    <div class="inline-tabs__bar">
      <div
        role="tablist"
        class="inline-tabs__list"
        :aria-label="labelledby ? undefined : label"
        :aria-labelledby="labelledby"
        @keydown="onKeydown"
      >
        <button
          v-for="(tab, index) in tabs"
          :id="tabId(index)"
          :key="tab.value"
          type="button"
          role="tab"
          class="inline-tabs__tab"
          :aria-selected="tab.value === model"
          :aria-controls="panelId(index)"
          :aria-describedby="tab.describedby"
          :tabindex="tab.value === model ? 0 : -1"
          :data-tab="tab.value"
          @click="model = tab.value"
        >
          <slot name="tab" :tab="tab" :selected="tab.value === model">{{
            tab.label
          }}</slot>
        </button>
      </div>
      <div v-if="$slots.end" class="inline-tabs__end"><slot name="end" /></div>
    </div>
    <div
      v-for="(tab, index) in tabs"
      v-show="tab.value === model"
      :id="panelId(index)"
      :key="tab.value"
      role="tabpanel"
      class="inline-tabs__panel"
      :aria-labelledby="tabId(index)"
      :data-panel="tab.value"
      tabindex="0"
    >
      <slot name="panel" :tab="tab" />
    </div>
  </div>
</template>

<style scoped>
.inline-tabs {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.inline-tabs__bar {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: var(--ds-space-2);
  border-bottom: var(--ds-border-width) solid var(--ds-color-border-subtle);
}

.inline-tabs__list {
  display: flex;
  flex: 1;
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: thin;
}

.inline-tabs__tab {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: var(--ds-space-2);
  min-height: var(--ds-size-target-min);
  padding: var(--ds-space-2) var(--ds-space-3);
  border: 0;
  border-bottom: var(--ds-border-width-indicator) solid transparent;
  background: transparent;
  color: var(--ds-color-text-secondary);
  font: inherit;
  font-size: var(--ds-font-size-body);
  cursor: pointer;
}

.inline-tabs__tab:hover {
  background: var(--ds-color-surface-hover);
  color: var(--ds-color-text-primary);
}

.inline-tabs__tab[aria-selected='true'] {
  border-bottom-color: var(--ds-color-indicator);
  color: var(--ds-color-text-primary);
  font-weight: var(--ds-font-weight-semibold);
}

.inline-tabs__tab:focus-visible {
  outline-offset: calc(var(--ds-focus-width) * -1);
}

.inline-tabs__end {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--ds-space-2);
  padding-bottom: var(--ds-space-1);
}

.inline-tabs__panel {
  padding-top: var(--ds-space-4);
}

.inline-tabs__panel:focus-visible {
  outline-offset: var(--ds-focus-offset);
}
</style>
