<template>
  <article
    class="rounded-md border border-ccf-300 p-4 dark:border-slate-700"
    :class="{
      'opacity-60': removed,
      'border-dashed border-sky-400 dark:border-sky-600': pendingNew,
    }"
    :data-test="`plugin-card-${name}`"
  >
    <header class="mb-2 flex flex-wrap items-center gap-2">
      <h4
        class="font-mono text-sm font-semibold text-gray-900 dark:text-slate-200"
      >
        {{ name }}
      </h4>
      <ProvenanceBadge v-if="!pendingNew" :provenance="cardProvenance" />
      <ConfigPill v-if="plugin?.enabled === false" severity="secondary">
        Disabled
      </ConfigPill>
      <span
        v-if="libVersion"
        v-tooltip.top="`Built on agent library ${libVersion}`"
        tabindex="0"
        class="rounded bg-slate-200 px-1.5 text-[0.7rem] text-gray-700 dark:bg-slate-700 dark:text-slate-300"
        data-test="plugin-lib"
        >agent {{ libVersion }}</span
      >
      <span v-if="removed" class="text-xs text-red-600 dark:text-red-400">
        Removed by overlay
      </span>
      <ConfigPill v-if="pendingNew" severity="info" data-test="pending-new"
        >pending: new plugin</ConfigPill
      >
      <ConfigPill
        v-if="pendingRemoval"
        severity="danger"
        data-test="pending-removal"
        >pending: removal</ConfigPill
      >
      <span v-if="canManage" class="ml-auto flex gap-2">
        <TertiaryButton
          v-if="pendingRemoval || removed || pendingNew"
          size="small"
          data-test="plugin-undo-removal"
          @click="undoPlugin"
        >
          {{
            pendingNew ? 'Discard plugin' : removed ? 'Restore' : 'Undo removal'
          }}
        </TertiaryButton>
        <TertiaryButton
          v-else
          size="small"
          data-test="remove-plugin"
          @click="confirmRemove"
        >
          Remove
        </TertiaryButton>
      </span>
    </header>
    <div class="grid grid-cols-1 gap-x-6 gap-y-2 text-sm md:grid-cols-2">
      <div class="md:col-span-2">
        <EditableField :ptr="p('source')" label="source">
          <template #label
            ><span class="text-gray-500 dark:text-slate-400"
              >Source</span
            ></template
          >
          <span class="font-mono text-xs break-all">
            {{ plugin?.source ?? '—' }}
          </span>
          <ProvenanceBadge
            v-if="field('source') !== 'file'"
            :provenance="field('source')"
          />
        </EditableField>
      </div>
      <EditableField :ptr="p('enabled')" label="enabled" kind="bool">
        <template #label
          ><span class="text-gray-500 dark:text-slate-400"
            >Enabled</span
          ></template
        >
        <span>{{ plugin?.enabled === false ? 'no' : 'yes' }}</span>
        <ProvenanceBadge
          v-if="field('enabled') !== 'file'"
          :provenance="field('enabled')"
        />
      </EditableField>
      <EditableField :ptr="p('schedule')" label="schedule" kind="cron">
        <template #label
          ><span class="text-gray-500 dark:text-slate-400"
            >Schedule</span
          ></template
        >
        <span>
          <span class="font-mono text-xs">{{
            plugin?.schedule ?? '* * * * *'
          }}</span>
          <span class="ml-1 text-xs text-gray-500">({{ scheduleText }})</span>
        </span>
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
          ><span class="text-gray-500 dark:text-slate-400"
            >Protocol</span
          ></template
        >
        <span>{{ plugin?.protocol_version ?? 'auto' }}</span>
        <ProvenanceBadge
          v-if="field('protocol_version') !== 'file'"
          :provenance="field('protocol_version')"
        />
      </EditableField>
      <div class="md:col-span-2">
        <EditableField
          :ptr="p('policies')"
          label="policies"
          kind="custom"
          :show-pending-value="false"
        >
          <template #label
            ><span class="text-gray-500 dark:text-slate-400">
              Policies
            </span></template
          >
          <span class="flex flex-wrap gap-1">
            <span v-if="!policies.length" class="text-gray-500">none</span>
            <template v-for="pol in policies" :key="pol">
              <a
                v-if="pol.startsWith('inline:')"
                :href="`#agent-bundle-${pol.slice(7)}`"
                class="rounded bg-sky-100 px-1.5 font-mono text-xs text-sky-700 hover:underline dark:bg-sky-500/15 dark:text-sky-300"
                @click.prevent="$emit('show-bundle', pol.slice(7))"
                >{{ pol }}</a
              >
              <span
                v-else
                class="rounded bg-slate-200 px-1.5 font-mono text-xs break-all dark:bg-slate-700"
                >{{ pol }}</span
              >
            </template>
          </span>
          <ProvenanceBadge
            v-if="field('policies') !== 'file'"
            :provenance="field('policies')"
          />
          <template #editor>
            <PolicySourcesEditor :plugin="name" />
            <p class="mt-2 text-xs text-gray-500 dark:text-slate-400">
              To customize a bundle's files, use the
              <RouterLink
                v-if="policiesRoute"
                :to="policiesRoute"
                class="text-sky-700 hover:underline dark:text-sky-300"
                >Policies view</RouterLink
              ><template v-else>Policies view</template>.
            </p>
          </template>
        </EditableField>
      </div>
      <div class="md:col-span-2">
        <EditableField
          :ptr="p('config')"
          label="config"
          kind="custom"
          :show-pending-value="false"
        >
          <template #label
            ><span class="text-gray-500 dark:text-slate-400">
              Config ({{ configKeys.length }})
            </span></template
          >
          <ProvenanceBadge
            v-if="field('config') !== 'file'"
            :provenance="field('config')"
          />
          <template #editor>
            <MapFieldEditor :plugin="name" field="config" />
          </template>
        </EditableField>
        <div v-if="configKeys.length" class="mt-1 space-y-1 pl-3">
          <EditableField
            v-for="k in configKeys"
            :key="k"
            :ptr="p('config', k)"
            :label="`config ${k}`"
            removable
          >
            <template #label
              ><span class="font-mono text-xs text-gray-500">{{
                k
              }}</span></template
            >
            <span class="font-mono text-xs break-all">{{
              plugin?.config?.[k] ?? '—'
            }}</span>
          </EditableField>
        </div>
      </div>
      <div class="md:col-span-2">
        <EditableField
          :ptr="p('labels')"
          label="labels"
          kind="custom"
          :show-pending-value="false"
        >
          <template #label
            ><span class="text-gray-500 dark:text-slate-400"
              >Labels</span
            ></template
          >
          <span class="flex flex-wrap gap-1">
            <span v-if="!labelEntries.length" class="text-gray-500">none</span>
            <span
              v-for="[k, v] in labelEntries"
              :key="k"
              class="rounded bg-slate-200 px-1.5 font-mono text-xs dark:bg-slate-700"
              >{{ k }}={{ v }}</span
            >
          </span>
          <ProvenanceBadge
            v-if="field('labels') !== 'file'"
            :provenance="field('labels')"
          />
          <template #editor>
            <MapFieldEditor :plugin="name" field="labels" />
          </template>
        </EditableField>
      </div>
      <div class="md:col-span-2">
        <EditableField
          :ptr="p('policy_data')"
          label="policy data"
          kind="custom"
          :show-pending-value="false"
        >
          <template #label
            ><span class="text-gray-500 dark:text-slate-400">
              Policy data
            </span></template
          >
          <span>{{ count(plugin?.policy_data) }} keys</span>
          <ProvenanceBadge
            v-if="field('policy_data') !== 'file'"
            :provenance="field('policy_data')"
          />
          <template #editor>
            <PolicyDataEditor :plugin="name" />
          </template>
        </EditableField>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
// One plugin on the Effective view, with an inline editor per editable field (R69) and the
// field states of R71.
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { useConfirm } from 'primevue/useconfirm';
import TertiaryButton from '@/volt/TertiaryButton.vue';
import type {
  ConfigDoc,
  OverlayDoc,
  PluginDoc,
  PluginReport,
} from '@/types/agent-config';
import { pointer } from '@/utils/agent-config/json-pointer';
import {
  pluginProvenance,
  provenanceOf,
  type Provenance,
} from '@/utils/agent-config/provenance';
import { describeCron5 } from '@/utils/agent-config/cron5';
import { useWorkspace } from '@/composables/agent-config/useConfigWorkspace';
import ProvenanceBadge from './ProvenanceBadge.vue';
import ConfigPill from './ConfigPill.vue';
import EditableField from './effective/EditableField.vue';
import MapFieldEditor from './effective/MapFieldEditor.vue';
import PolicyDataEditor from './effective/PolicyDataEditor.vue';
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

defineEmits<{ 'show-bundle': [name: string] }>();

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
const policiesRoute = computed(() =>
  ws ? { name: 'admin-agent-policies', params: { id: ws.agentId } } : null,
);

// ---- Plugin-level actions (agent:configure) ----
const canManage = computed(
  () => !!ws && ws.ready.value && ws.canConfigure.value,
);
/** The draft removes a plugin the instance still runs. */
const pendingRemoval = computed(() => {
  if (!ws || props.removed || props.pendingNew) return false;
  const eff = ws.draft.effectiveDraft.value.plugins ?? {};
  return ws.draft.pendingAt(p()) && !eff[props.name];
});

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

function count(v: unknown): number {
  return v && typeof v === 'object' ? Object.keys(v).length : 0;
}
</script>
