<script setup lang="ts">
// One plugin on the Effective view, with an inline editor per editable field (R69) and the
// field states of R71.
import { computed } from 'vue';
import { useConfirm } from '@/ds/confirm';
import Button from '@/ds/components/Button/Button.vue';
import InfoTip from '@/ds/components/InfoTip/InfoTip.vue';
import Tag from '@/ds/components/Tag/Tag.vue';
import Text from '@/ds/components/Text/Text.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Grid from '@/ds/components/layout/Grid.vue';
import Panel from '@/ds/components/layout/Panel.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import { TOOLTIPS } from '@/config/tooltips';
import type {
  ConfigDoc,
  OverlayDoc,
  PluginDoc,
  PluginReport,
} from '@/types/agent-config';
import { pointer } from '@/utils/agent-config/json-pointer';
import { getOwn } from '@/utils/agent-config/merge-patch';
import {
  pluginProvenance,
  provenanceOf,
  type Provenance,
} from '@/utils/agent-config/provenance';
import { describeCron5 } from '@/utils/agent-config/cron5';
import { addPluginTooltip } from '@/utils/agent-config/field-access';
import { useWorkspace } from '@/composables/agent-config/useConfigWorkspace';
import ProvenanceBadge from './ProvenanceBadge.vue';
import AccessIcon from './effective/AccessIcon.vue';
import EditableField from './effective/EditableField.vue';
import MapFieldEditor from './effective/MapFieldEditor.vue';
import PolicyDataSection from './effective/PolicyDataSection.vue';
import PolicySourcesEditor from './editor/PolicySourcesEditor.vue';

const props = defineProps<{
  name: string;
  /** Effective plugin, or the base plugin when the overlay removed it. */
  plugin: PluginDoc | null;
  base: ConfigDoc | null;
  overlay: OverlayDoc | null;
  removed?: boolean;
  /** Added by the pending draft (not reported yet). */
  pendingNew?: boolean;
  /** R76: this plugin's report on the shown instance (agent lib). */
  report?: PluginReport | null;
}>();

const ws = useWorkspace();
const confirm = useConfirm();

function p(...rest: string[]): string {
  return pointer('plugins', props.name, ...rest);
}

const cardProvenance = computed<Provenance>(() =>
  pluginProvenance(props.name, props.base ?? {}, props.overlay ?? {}),
);

function field(key: string): Provenance {
  return provenanceOf(p(key), props.base ?? {}, props.overlay ?? {});
}

const policies = computed(() => props.plugin?.policies ?? []);
const scheduleText = computed(() =>
  describeCron5(props.plugin?.schedule ?? '* * * * *'),
);
const configKeys = computed(() =>
  Object.keys(props.plugin?.config ?? {}).sort(),
);
const labelEntries = computed(() =>
  Object.entries(props.plugin?.labels ?? {}).sort(([a], [b]) =>
    a.localeCompare(b),
  ),
);

// ---- Plugin-level actions (agent:configure) ----
const canManage = computed(
  () => !!ws && ws.ready.value && ws.canConfigure.value,
);
/** R71 for a plugin the draft adds: would the reporting instances install it? */
const installAccess = computed(() =>
  props.pendingNew && canManage.value ? ws!.accessAt(p()) : null,
);
const installText = computed(() =>
  installAccess.value
    ? addPluginTooltip(installAccess.value, props.plugin?.source ?? props.name)
    : '',
);

/** The draft removes a plugin the instance still runs. */
const pendingRemoval = computed(() => {
  if (!ws || props.removed || props.pendingNew) return false;
  // Own properties only: a plugin may be named like an Object.prototype member ("constructor").
  const eff = ws.draft.effectiveDraft.value.plugins ?? {};
  return ws.draft.pendingAt(p()) && !getOwn(eff, props.name);
});
/** Removal nulls the plugin where any host's file has it: it needs every file (else why not). */
const removeBlocked = computed(() => ws?.basesBlockedReason.value ?? '');

function confirmRemove() {
  confirm.require({
    header: 'Remove plugin',
    message: `Remove the plugin "${props.name}" from this agent's effective configuration? This is a pending change until you review and save.`,
    rejectProps: { label: 'Cancel', severity: 'secondary', outlined: true },
    acceptProps: { label: 'Remove', severity: 'danger' },
    accept: () => ws?.draft.makeAbsent(p()),
  });
}

/** Undo a pending removal / addition, or restore a plugin the saved overlay removed. */
function undoPlugin() {
  if (!ws) return;
  if (props.removed && !ws.draft.pendingAt(p())) ws.draft.unset(p());
  else ws.draft.revertPointer(p());
}

/** R76: the agent library the plugin's build was built with, when reported. */
const libVersion = computed(() => props.report?.libVersion || '');
const LIB_TOOLTIP = TOOLTIPS['agents.config.plugin.libVersion'];
</script>

<template>
  <Panel :title="name" :level="3" dense :data-test="`plugin-card-${name}`">
    <template v-if="canManage" #actions>
      <Cluster gap="2" data-test="plugin-actions">
        <Button
          v-if="pendingRemoval || removed || pendingNew"
          variant="tertiary"
          size="sm"
          icon="undo"
          data-test="plugin-undo-removal"
          @click="undoPlugin"
        >
          {{
            pendingNew ? 'Discard plugin' : removed ? 'Restore' : 'Undo removal'
          }}
        </Button>
        <Button
          v-else
          variant="tertiary"
          size="sm"
          icon="delete"
          :disabled-reason="removeBlocked || undefined"
          data-test="remove-plugin"
          @click="confirmRemove"
        >
          Remove
        </Button>
      </Cluster>
    </template>
    <Stack gap="4">
      <Cluster gap="2">
        <ProvenanceBadge v-if="!pendingNew" :provenance="cardProvenance" />
        <Tag v-if="plugin?.enabled === false" label="Disabled" />
        <Cluster v-if="libVersion" gap="1" as="span" data-test="plugin-lib">
          <Tag :label="`agent ${libVersion}`" />
          <InfoTip :text="`${LIB_TOOLTIP} ${libVersion}`" />
        </Cluster>
        <Tag v-if="removed" label="Removed by overlay" />
        <Tag
          v-if="pendingNew"
          label="Pending: new plugin"
          data-test="pending-new"
        />
        <AccessIcon
          v-if="installText"
          :state="installAccess?.state"
          :text="installText"
          blocked
          :data-state="installAccess?.state"
          test-id="plugin-install-access"
        />
        <Tag
          v-if="pendingRemoval"
          label="Pending: removal"
          data-test="pending-removal"
        />
      </Cluster>
      <EditableField :ptr="p('source')" label="source">
        <template #label
          ><Text as="span" variant="secondary">Source</Text></template
        >
        <Text as="code" variant="code">{{ plugin?.source ?? '—' }}</Text>
        <ProvenanceBadge
          v-if="field('source') !== 'file'"
          :provenance="field('source')"
        />
      </EditableField>
      <Grid min="sm" gap="3">
        <EditableField :ptr="p('enabled')" label="enabled" kind="bool">
          <template #label
            ><Text as="span" variant="secondary">Enabled</Text></template
          >
          <Text as="span">{{ plugin?.enabled === false ? 'No' : 'Yes' }}</Text>
          <ProvenanceBadge
            v-if="field('enabled') !== 'file'"
            :provenance="field('enabled')"
          />
        </EditableField>
        <EditableField :ptr="p('schedule')" label="schedule" kind="cron">
          <template #label
            ><Text as="span" variant="secondary">Schedule</Text></template
          >
          <Text as="span"
            ><Text as="code" variant="code">{{
              plugin?.schedule ?? '* * * * *'
            }}</Text>
            ({{ scheduleText }})</Text
          >
          <ProvenanceBadge
            v-if="field('schedule') !== 'file'"
            :provenance="field('schedule')"
          />
        </EditableField>
        <EditableField
          :ptr="p('protocol_version')"
          label="protocol"
          kind="protocol"
        >
          <template #label
            ><Text as="span" variant="secondary">Protocol</Text></template
          >
          <Text as="span">{{ plugin?.protocol_version ?? 'auto' }}</Text>
          <ProvenanceBadge
            v-if="field('protocol_version') !== 'file'"
            :provenance="field('protocol_version')"
          />
        </EditableField>
      </Grid>
      <EditableField
        :ptr="p('policies')"
        label="policies"
        kind="custom"
        :show-pending-value="false"
      >
        <template #label
          ><Text as="span" variant="secondary">Policies</Text></template
        >
        <Text v-if="!policies.length" as="span" variant="secondary">None</Text>
        <Tag v-for="pol in policies" :key="pol" :label="pol" />
        <ProvenanceBadge
          v-if="field('policies') !== 'file'"
          :provenance="field('policies')"
        />
        <template #editor>
          <PolicySourcesEditor :plugin="name" />
        </template>
      </EditableField>
      <Stack gap="2">
        <EditableField
          :ptr="p('config')"
          label="config"
          kind="custom"
          :show-pending-value="false"
        >
          <template #label
            ><Text as="span" variant="secondary"
              >Config ({{ configKeys.length }})</Text
            ></template
          >
          <ProvenanceBadge
            v-if="field('config') !== 'file'"
            :provenance="field('config')"
          />
          <template #editor>
            <MapFieldEditor :plugin="name" field="config" />
          </template>
        </EditableField>
        <EditableField
          v-for="k in configKeys"
          :key="k"
          :ptr="p('config', k)"
          :label="`config ${k}`"
          removable
        >
          <template #label
            ><Text as="code" variant="code">{{ k }}</Text></template
          >
          <Text as="span">{{ plugin?.config?.[k] ?? '—' }}</Text>
        </EditableField>
      </Stack>
      <EditableField
        :ptr="p('labels')"
        label="labels"
        kind="custom"
        :show-pending-value="false"
      >
        <template #label
          ><Text as="span" variant="secondary">Labels</Text></template
        >
        <Text v-if="!labelEntries.length" as="span" variant="secondary"
          >None</Text
        >
        <Tag v-for="[k, v] in labelEntries" :key="k" :label="`${k}=${v}`" />
        <ProvenanceBadge
          v-if="field('labels') !== 'file'"
          :provenance="field('labels')"
        />
        <template #editor>
          <MapFieldEditor :plugin="name" field="labels" />
        </template>
      </EditableField>
      <PolicyDataSection
        :plugin="name"
        :reported="plugin?.policy_data"
        :provenance="field('policy_data')"
      />
    </Stack>
  </Panel>
</template>
