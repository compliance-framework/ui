<template>
  <div class="space-y-4" data-test="effective-view">
    <p
      v-if="!effective"
      class="rounded-md border border-dashed border-ccf-300 p-4 text-sm text-gray-500 dark:border-slate-700 dark:text-slate-400"
      data-test="effective-empty"
    >
      {{ NOT_REPORTED_TEXT }}
    </p>
    <template v-else>
      <div class="flex flex-wrap items-center justify-between gap-2">
        <p
          v-if="appliedRevisionNote !== null"
          class="text-sm text-amber-700 dark:text-amber-300"
          data-test="provenance-note"
        >
          <template v-if="provenanceFallback">
            Could not load r{{ appliedRevisionNote }}, the revision this
            instance runs; provenance is shown against the desired revision.
          </template>
          <template v-else>
            Provenance reflects r{{ appliedRevisionNote }}, the revision this
            instance runs.
          </template>
        </p>
        <span v-else />
        <SelectButton
          v-model="mode"
          :options="modeOptions"
          option-label="label"
          option-value="value"
          :allow-empty="false"
          aria-label="Effective configuration display"
        />
      </div>

      <template v-if="mode === 'summary'">
        <LockedKeysPanel :doc="effective" />
        <ConfigFlagsSummary
          :effective="effective"
          :base="base"
          :overlay="appliedOverlay"
        />
        <section class="space-y-2">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h4 class="text-sm font-semibold text-gray-900 dark:text-slate-200">
              Plugins
            </h4>
            <SecondaryButton
              v-if="canAddPlugin"
              size="small"
              data-test="add-plugin"
              @click="addPluginOpen = true"
            >
              <i class="pi pi-plus mr-1" />Add plugin
            </SecondaryButton>
          </div>
          <p
            v-if="!pluginCards.length"
            class="text-sm text-gray-500 dark:text-slate-400"
          >
            No plugins configured.
          </p>
          <div class="grid grid-cols-1 gap-3 xl:grid-cols-2">
            <PluginSummaryCard
              v-for="card in pluginCards"
              :key="card.name"
              :name="card.name"
              :plugin="card.plugin"
              :base="base"
              :overlay="appliedOverlay"
              :removed="card.removed"
              :pending-new="card.pendingNew"
              @show-bundle="showBundle"
            />
          </div>
        </section>
        <slot name="bundles" :highlight="highlightBundle">
          <PolicyBundlesSummary
            :effective="effective"
            :base="base"
            :overlay="appliedOverlay"
            :bundles-first-seen="bundlesFirstSeen"
            :highlight="highlightBundle"
            :reports="policyBundles"
          />
        </slot>
      </template>
      <ConfigYamlViewer
        v-else
        :doc="effective"
        :filename="filename"
        :empty-text="NOT_REPORTED_TEXT"
        :legend="LOCKED_LEGEND"
      />
    </template>
    <AddPluginDialog
      v-if="canAddPlugin"
      v-model:visible="addPluginOpen"
      :existing="existingPluginNames"
      @add="addPlugin"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import SelectButton from '@/volt/SelectButton.vue';
import type {
  ConfigDoc,
  OverlayDoc,
  PluginDoc,
  PolicyBundleReport,
} from '@/types/agent-config';
import { sanitizeForDisplay } from '@/utils/agent-config/display';
import { isPlainObject } from '@/utils/agent-config/merge-patch';
import { pointer } from '@/utils/agent-config/json-pointer';
import { useWorkspace } from '@/composables/agent-config/useConfigWorkspace';
import AddPluginDialog from './editor/AddPluginDialog.vue';
import LockedKeysPanel from './LockedKeysPanel.vue';
import ConfigFlagsSummary from './ConfigFlagsSummary.vue';
import PluginSummaryCard from './PluginSummaryCard.vue';
import PolicyBundlesSummary from './PolicyBundlesSummary.vue';
import ConfigYamlViewer from './ConfigYamlViewer.vue';
import { LOCKED_LEGEND, NOT_REPORTED_TEXT } from './constants';

const props = defineProps<{
  /** The instance's reported effective config (null = not reported). */
  effectiveDoc: ConfigDoc | null;
  base: ConfigDoc | null;
  /** Overlay of the revision the instance runs (U1.3 appliedOverlay). */
  appliedOverlay: OverlayDoc | null;
  /** Applied revision when the instance is not in sync, else null. */
  appliedRevisionNote: number | null;
  /** The applied revision's overlay could not be loaded (desired overlay used instead). */
  provenanceFallback?: boolean;
  filename: string;
  bundlesFirstSeen?: Record<string, string>;
  /** The instance's reported policy bundles (vendor file lists). */
  policyBundles?: PolicyBundleReport[] | null;
}>();

const mode = ref<'summary' | 'yaml'>('summary');
const modeOptions = [
  { label: 'Summary', value: 'summary' },
  { label: 'YAML', value: 'yaml' },
];
const highlightBundle = ref<string | null>(null);

const effective = computed(() =>
  props.effectiveDoc ? sanitizeForDisplay(props.effectiveDoc) : null,
);

const ws = useWorkspace();

const pluginCards = computed(() => {
  const cards: {
    name: string;
    plugin: PluginDoc | null;
    removed: boolean;
    pendingNew: boolean;
  }[] = [];
  const eff = effective.value?.plugins ?? {};
  for (const [name, plugin] of Object.entries(eff)) {
    cards.push({
      name,
      plugin: plugin ?? null,
      removed: false,
      pendingNew: false,
    });
  }
  // Base plugins the overlay removed render greyed ("Removed by overlay").
  const overlayPlugins = props.appliedOverlay?.plugins;
  if (isPlainObject(overlayPlugins)) {
    for (const [name, v] of Object.entries(overlayPlugins)) {
      const basePlugin = props.base?.plugins?.[name];
      if (v === null && basePlugin && !(name in eff)) {
        cards.push({
          name,
          plugin: basePlugin,
          removed: true,
          pendingNew: false,
        });
      }
    }
  }
  // Plugins the pending draft adds (R69): shown from the draft until an instance reports them.
  if (ws?.ready.value) {
    for (const [name, plugin] of Object.entries(
      ws.draft.effectiveDraft.value.plugins ?? {},
    )) {
      if (isPlainObject(plugin) && !cards.some((c) => c.name === name)) {
        cards.push({
          name,
          plugin: plugin as PluginDoc,
          removed: false,
          pendingNew: true,
        });
      }
    }
  }
  return cards.sort((a, b) => a.name.localeCompare(b.name));
});

// ---- Add plugin (agent:configure; a pending change) ----
const canAddPlugin = computed(
  () => !!ws && ws.ready.value && ws.canConfigure.value,
);
const addPluginOpen = ref(false);
const existingPluginNames = computed(() => {
  const names = new Set(pluginCards.value.map((c) => c.name));
  for (const b of ws?.bases.value ?? [])
    Object.keys(b.plugins ?? {}).forEach((n) => names.add(n));
  return Array.from(names);
});
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
}

async function showBundle(name: string) {
  highlightBundle.value = name;
  await nextTick();
  document
    .getElementById(`agent-bundle-${name}`)
    ?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
}
</script>
