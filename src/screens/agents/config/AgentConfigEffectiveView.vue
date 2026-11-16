<script setup lang="ts">
import { computed, ref } from 'vue';
import Button from '@/ds/components/Button/Button.vue';
import InlineMessage from '@/ds/components/InlineMessage/InlineMessage.vue';
import RadioGroup from '@/ds/components/RadioGroup/RadioGroup.vue';
import Text from '@/ds/components/Text/Text.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import type { ConfigDoc, OverlayDoc, PluginReport } from '@/types/agent-config';
import { sanitizeForDisplay } from '@/utils/agent-config/display';
import { getOwn, isPlainObject } from '@/utils/agent-config/merge-patch';
import { pointer } from '@/utils/agent-config/json-pointer';
import { useWorkspace } from '@/composables/agent-config/useConfigWorkspace';
import LockedKeysPanel from './LockedKeysPanel.vue';
import ConfigFlagsSummary from './ConfigFlagsSummary.vue';
import PluginTabs, { type PluginCard } from './PluginTabs.vue';
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
  /** R76: the instance's plugins and the agent library each was built with. */
  pluginReports?: PluginReport[] | null;
}>();

/** 'summary' or 'yaml'. */
const mode = ref('summary');
const modeOptions = [
  { label: 'Summary', value: 'summary' },
  { label: 'YAML', value: 'yaml' },
];

const effective = computed(() =>
  props.effectiveDoc ? sanitizeForDisplay(props.effectiveDoc) : null,
);

const ws = useWorkspace();
/** Why editing waits (instance files loading or failed): editors only. */
const basesNotice = computed(() =>
  ws && ws.ready.value && ws.canConfigure.value
    ? ws.basesBlockedReason.value
    : '',
);

const pluginCards = computed(() => {
  const cards: PluginCard[] = [];
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
      // Own properties only: a plugin may be named "constructor".
      const basePlugin = getOwn(props.base?.plugins ?? {}, name);
      if (
        v === null &&
        isPlainObject(basePlugin) &&
        getOwn(eff, name) === undefined
      ) {
        cards.push({
          name,
          plugin: basePlugin as PluginCard['plugin'],
          removed: true,
          pendingNew: false,
        });
      }
    }
  }
  // Plugins the pending draft adds (R69), shown from the draft. A plugin the saved desired
  // revision adds but this instance has not applied yet is not "pending" and is not shown.
  if (ws?.ready.value) {
    for (const [name, plugin] of Object.entries(
      ws.draft.effectiveDraft.value.plugins ?? {},
    )) {
      if (
        isPlainObject(plugin) &&
        !cards.some((c) => c.name === name) &&
        ws.draft.pendingAt(pointer('plugins', name))
      ) {
        cards.push({
          name,
          plugin: plugin as PluginCard['plugin'],
          removed: false,
          pendingNew: true,
        });
      }
    }
  }
  return cards.sort((a, b) => a.name.localeCompare(b.name));
});
</script>

<template>
  <Stack gap="4" data-test="effective-view">
    <Text v-if="!effective" variant="secondary" data-test="effective-empty">
      {{ NOT_REPORTED_TEXT }}
    </Text>
    <template v-else>
      <!-- Editing waits for every reporting instance's file (useConfigWorkspace). -->
      <template v-if="basesNotice">
        <InlineMessage
          v-if="ws!.failedBaseIds.value.length"
          tone="warning"
          data-test="bases-failed"
        >
          <Cluster gap="3">
            <span>{{ basesNotice }}</span>
            <Button
              size="sm"
              :loading="ws!.detailsLoading.value"
              data-test="bases-retry"
              @click="ws!.loadDetails()"
              >Retry</Button
            >
          </Cluster>
        </InlineMessage>
        <Text v-else variant="caption" data-test="bases-loading">
          {{ basesNotice }}
        </Text>
      </template>
      <Cluster justify="between" gap="2">
        <Text v-if="appliedRevisionNote !== null" data-test="provenance-note">
          <template v-if="provenanceFallback">
            Could not load r{{ appliedRevisionNote }}, the revision this
            instance runs; provenance is shown against the desired revision.
          </template>
          <template v-else>
            Provenance reflects r{{ appliedRevisionNote }}, the revision this
            instance runs.
          </template>
        </Text>
        <span v-else />
        <RadioGroup
          v-model="mode"
          legend="Effective configuration display"
          legend-hidden
          variant="segmented"
          :options="modeOptions"
          data-test="effective-mode"
        />
      </Cluster>

      <template v-if="mode === 'summary'">
        <LockedKeysPanel :doc="effective" />
        <ConfigFlagsSummary
          :effective="effective"
          :base="base"
          :overlay="appliedOverlay"
        />
        <PluginTabs
          :cards="pluginCards"
          :base="base"
          :overlay="appliedOverlay"
          :plugin-reports="pluginReports"
        />
      </template>
      <ConfigYamlViewer
        v-else
        :doc="effective"
        :filename="filename"
        :empty-text="NOT_REPORTED_TEXT"
        :legend="LOCKED_LEGEND"
      />
    </template>
  </Stack>
</template>
