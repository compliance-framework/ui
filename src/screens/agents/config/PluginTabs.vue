<script setup lang="ts">
// The plugins of the Effective view, one tab per plugin so the selected plugin's card gets
// the full width. InlineTabs provide the tablist / tab / tabpanel roles and the keyboard
// model; panels stay mounted, so an open inline editor keeps its state across tab switches.
// The "add" action sits after the tablist, not in it: it opens a dialog rather than showing
// a panel. Adding a plugin selects its tab. A tab is a button, so it holds no focusable
// markers: an install problem shows as a text hint on the tab and in full on the card.
import { computed, ref } from 'vue';
import InlineTabs from '@/ds/components/InlineTabs/InlineTabs.vue';
import Tag from '@/ds/components/Tag/Tag.vue';
import Text from '@/ds/components/Text/Text.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Panel from '@/ds/components/layout/Panel.vue';
import type {
  ConfigDoc,
  OverlayDoc,
  PluginDoc,
  PluginReport,
} from '@/types/agent-config';
import { pointer } from '@/utils/agent-config/json-pointer';
import { getOwn, isPlainObject } from '@/utils/agent-config/merge-patch';
import { useWorkspace } from '@/composables/agent-config/useConfigWorkspace';
import PluginSummaryCard from './PluginSummaryCard.vue';
import AddPluginDialog from './editor/AddPluginDialog.vue';
import AddPluginAction from './editor/AddPluginAction.vue';

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
const activeModel = computed({
  get: () => active.value,
  set: (v: string) => select(v),
});
const tabs = computed(() =>
  props.cards.map((card) => ({ value: card.name, label: card.name, card })),
);

function reportOf(name: string): PluginReport | null {
  return props.pluginReports?.find((r) => r.name === name) ?? null;
}

/** The card's status, condensed for the tab label. */
function hintsOf(card: PluginCard) {
  const hints: { key: string; label: string }[] = [];
  const ptr = pointer('plugins', card.name);
  const pending = !!ws && ws.ready.value && ws.draft.pendingAt(ptr);
  const effDraft = ws?.draft.effectiveDraft.value.plugins ?? {};
  if (card.pendingNew) {
    hints.push({ key: 'new', label: 'new' });
  } else if (pending && !card.removed && !getOwn(effDraft, card.name)) {
    hints.push({ key: 'removal', label: 'removal' });
  } else if (pending) {
    hints.push({ key: 'pending', label: 'pending' });
  }
  if (card.removed) {
    hints.push({ key: 'removed', label: 'removed' });
  } else if (card.plugin?.enabled === false) {
    hints.push({ key: 'disabled', label: 'disabled' });
  }
  return hints;
}

/**
 * R71 for a plugin the draft adds: whether the reporting instances would install it with its
 * source (readonly = none would). Only for editors.
 */
function installAccess(card: PluginCard) {
  if (!card.pendingNew || !ws?.canConfigure.value) return null;
  return ws.accessAt(pointer('plugins', card.name));
}
function installState(card: PluginCard) {
  return installAccess(card)?.state ?? 'editable';
}

// ---- Add plugin (agent:configure; a pending change), gated by R71 (addPluginAccess) ----
const canAddPlugin = computed(
  () => !!ws && ws.ready.value && ws.canConfigure.value,
);
const addAccess = computed(() =>
  canAddPlugin.value ? ws!.addPluginAccess() : null,
);
/** Adding computes the install access over every instance's file: it waits for all of them. */
const addBlockedReason = computed(() => ws?.basesBlockedReason.value ?? '');
const addPluginOpen = ref(false);
/**
 * Names the dialog refuses: adding writes the whole plugin, so it would replace one that a
 * host's file, the saved overlay or the draft already defines (even one this instance does
 * not run yet).
 */
const existingPluginNames = computed(() => {
  const names = new Set(props.cards.map((c) => c.name));
  for (const b of ws?.bases.value ?? [])
    Object.keys(b.plugins ?? {}).forEach((n) => names.add(n));
  for (const o of [ws?.draft.original.value, ws?.draft.overlay.value]) {
    const plugins = o?.plugins;
    if (!isPlainObject(plugins)) continue;
    for (const [n, v] of Object.entries(plugins)) if (v !== null) names.add(n);
  }
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

defineExpose({ select, active });
</script>

<template>
  <Panel title="Plugins" data-test="plugin-tabs">
    <Cluster v-if="!cards.length" justify="between" gap="2">
      <Text variant="secondary">No plugins configured.</Text>
      <AddPluginAction
        v-if="canAddPlugin && addAccess"
        :access="addAccess"
        :blocked-reason="addBlockedReason"
        @open="addPluginOpen = true"
      />
    </Cluster>
    <InlineTabs v-else v-model="activeModel" :tabs="tabs" label="Plugins">
      <template #tab="{ tab }">
        <Cluster as="span" gap="1">
          <Text as="code" variant="code">{{ tab.value }}</Text>
          <Tag
            v-for="hint in hintsOf(tab.card)"
            :key="hint.key"
            :label="hint.label"
            :data-test="`plugin-tab-hint-${hint.key}`"
          />
          <Tag
            v-if="installState(tab.card) === 'restricted'"
            label="Some instances"
            data-test="plugin-tab-restricted"
          />
          <Tag
            v-else-if="installState(tab.card) === 'readonly'"
            label="Not installed"
            data-test="plugin-tab-not-installed"
          />
        </Cluster>
      </template>
      <template #panel="{ tab }">
        <PluginSummaryCard
          :name="tab.card.name"
          :plugin="tab.card.plugin"
          :base="base"
          :overlay="overlay"
          :removed="tab.card.removed"
          :pending-new="tab.card.pendingNew"
          :report="reportOf(tab.card.name)"
        />
      </template>
      <template v-if="canAddPlugin && addAccess" #end>
        <AddPluginAction
          :access="addAccess"
          :blocked-reason="addBlockedReason"
          @open="addPluginOpen = true"
        />
      </template>
    </InlineTabs>
    <AddPluginDialog
      v-if="canAddPlugin"
      v-model:visible="addPluginOpen"
      :existing="existingPluginNames"
      @add="addPlugin"
    />
  </Panel>
</template>
