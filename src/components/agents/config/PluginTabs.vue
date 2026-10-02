<template>
  <section class="space-y-2" data-test="plugin-tabs">
    <h4
      :id="headingId"
      class="text-sm font-semibold text-gray-900 dark:text-slate-200"
    >
      Plugins
    </h4>
    <div
      v-if="!cards.length"
      class="flex flex-wrap items-center justify-between gap-2 rounded-md border border-dashed border-ccf-300 p-4 dark:border-slate-700"
    >
      <p class="text-sm text-gray-500 dark:text-slate-400">
        No plugins configured.
      </p>
      <SecondaryButton
        v-if="canAddPlugin"
        size="small"
        data-test="add-plugin"
        @click="addPluginOpen = true"
      >
        <i class="pi pi-plus mr-1" />Add plugin
      </SecondaryButton>
    </div>
    <Tabs v-else :value="active" scrollable @update:value="onTab">
      <div ref="strip" class="flex items-end gap-1">
        <TabList class="min-w-0 flex-1">
          <Tab
            v-for="card in cards"
            :key="card.name"
            :value="card.name"
            class="flex items-center gap-1.5 px-3! py-2! text-sm"
            :data-test="`plugin-tab-${card.name}`"
          >
            <span
              class="font-mono"
              :class="{ 'line-through opacity-70': card.removed }"
              >{{ card.name }}</span
            >
            <span
              v-for="hint in hintsOf(card)"
              :key="hint.key"
              class="rounded-full px-1.5 text-[0.65rem] leading-4 font-medium"
              :class="HINT_CLASSES[hint.severity]"
              :data-test="`plugin-tab-hint-${hint.key}`"
              >{{ hint.label }}</span
            >
          </Tab>
        </TabList>
        <TertiaryButton
          v-if="canAddPlugin"
          size="small"
          class="mb-1 flex-shrink-0"
          data-test="add-plugin"
          @click="addPluginOpen = true"
        >
          <i class="pi pi-plus mr-1" />Add plugin
        </TertiaryButton>
      </div>
      <TabPanel
        v-for="card in cards"
        :key="card.name"
        :value="card.name"
        class="pt-3"
        :data-test="`plugin-panel-${card.name}`"
      >
        <PluginSummaryCard
          :name="card.name"
          :plugin="card.plugin"
          :base="base"
          :overlay="overlay"
          :removed="card.removed"
          :pending-new="card.pendingNew"
          :report="reportOf(card.name)"
        />
      </TabPanel>
    </Tabs>
    <AddPluginDialog
      v-if="canAddPlugin"
      v-model:visible="addPluginOpen"
      :existing="existingPluginNames"
      @add="addPlugin"
    />
  </section>
</template>

<script setup lang="ts">
// The plugins of the Effective view, one tab per plugin so the selected plugin's card gets
// the full width. PrimeVue (Volt) Tabs provide the ARIA tablist / tab / tabpanel roles and
// the keyboard model (←/→ move the focus, Home/End, Enter/Space select); `scrollable` adds
// scroll buttons when the strip overflows. Panels stay mounted (v-show), so an open inline
// editor keeps its state across tab switches. The "add" action sits after the tablist, not
// in it: it opens a dialog rather than showing a panel. Adding a plugin selects its tab.
import { computed, nextTick, ref, useId, watch } from 'vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import TertiaryButton from '@/volt/TertiaryButton.vue';
import Tabs from '@/volt/Tabs.vue';
import TabList from '@/volt/TabList.vue';
import Tab from '@/volt/Tab.vue';
import TabPanel from '@/volt/TabPanel.vue';
import type {
  ConfigDoc,
  OverlayDoc,
  PluginDoc,
  PluginReport,
} from '@/types/agent-config';
import { pointer } from '@/utils/agent-config/json-pointer';
import { useWorkspace } from '@/composables/agent-config/useConfigWorkspace';
import PluginSummaryCard from './PluginSummaryCard.vue';
import AddPluginDialog from './editor/AddPluginDialog.vue';

export interface PluginCard {
  name: string;
  plugin: PluginDoc | null;
  /** A base plugin the applied overlay removed. */
  removed: boolean;
  /** Added by the pending draft. */
  pendingNew: boolean;
}

const props = defineProps<{
  cards: PluginCard[];
  base: ConfigDoc | null;
  overlay: OverlayDoc | null;
  pluginReports?: PluginReport[] | null;
}>();

const ws = useWorkspace();
const headingId = `plugins-${useId()}`;

/** The selected plugin; falls back to the first tab when it disappears (e.g. discarded). */
const selected = ref('');
const active = computed(() =>
  props.cards.some((c) => c.name === selected.value)
    ? selected.value
    : (props.cards[0]?.name ?? ''),
);

function select(name: string): void {
  selected.value = name;
}
function onTab(value: string | number): void {
  select(String(value));
}

function reportOf(name: string): PluginReport | null {
  return props.pluginReports?.find((r) => r.name === name) ?? null;
}

type HintSeverity = 'info' | 'danger' | 'secondary';
const HINT_CLASSES: Record<HintSeverity, string> = {
  info: 'bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-200',
  danger: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
  secondary:
    'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
};

/** The card's status, condensed for the tab label. */
function hintsOf(card: PluginCard) {
  const hints: { key: string; label: string; severity: HintSeverity }[] = [];
  const ptr = pointer('plugins', card.name);
  const pending = !!ws && ws.ready.value && ws.draft.pendingAt(ptr);
  const effDraft = ws?.draft.effectiveDraft.value.plugins ?? {};
  if (card.pendingNew) {
    hints.push({ key: 'new', label: 'new', severity: 'info' });
  } else if (pending && !card.removed && !effDraft[card.name]) {
    hints.push({ key: 'removal', label: 'removal', severity: 'danger' });
  } else if (pending) {
    hints.push({ key: 'pending', label: 'pending', severity: 'info' });
  }
  if (card.removed) {
    hints.push({ key: 'removed', label: 'removed', severity: 'secondary' });
  } else if (card.plugin?.enabled === false) {
    hints.push({ key: 'disabled', label: 'disabled', severity: 'secondary' });
  }
  return hints;
}

// ---- Add plugin (agent:configure; a pending change) ----
const canAddPlugin = computed(
  () => !!ws && ws.ready.value && ws.canConfigure.value,
);
const addPluginOpen = ref(false);
const existingPluginNames = computed(() => {
  const names = new Set(props.cards.map((c) => c.name));
  for (const b of ws?.bases.value ?? [])
    Object.keys(b.plugins ?? {}).forEach((n) => names.add(n));
  return Array.from(names);
});
/** Adds the plugin to the draft and selects its (new) tab. */
function addPlugin(plugin: {
  name: string;
  source: string;
  schedule?: string;
}) {
  ws?.draft.set(pointer('plugins', plugin.name), {
    source: plugin.source,
    ...(plugin.schedule ? { schedule: plugin.schedule } : {}),
    policies: [],
  });
  select(plugin.name);
}

// The Volt TabList keeps its pass-through theme private, so the tablist element is labelled
// by the "Plugins" heading once rendered.
const strip = ref<HTMLElement | null>(null);
watch(
  () => props.cards.length > 0,
  async () => {
    await nextTick();
    strip.value
      ?.querySelector('[role="tablist"]')
      ?.setAttribute('aria-labelledby', headingId);
  },
  { immediate: true },
);

defineExpose({ select, active });
</script>
