<template>
  <article
    class="space-y-3 rounded-md border border-ccf-300 p-4 dark:border-slate-700"
    :class="{ 'opacity-60': removed }"
    :data-test="`plugin-editor-${name}`"
  >
    <header class="flex flex-wrap items-center gap-2">
      <h4
        class="font-mono text-sm font-semibold text-gray-900 dark:text-slate-200"
      >
        {{ name }}
      </h4>
      <ProvenanceBadge :provenance="provenance" />
      <span v-if="removed" class="text-xs text-red-600 dark:text-red-400"
        >Removed by overlay</span
      >
      <span class="ml-auto flex gap-2">
        <TertiaryButton
          v-if="removed"
          size="small"
          :disabled="disabled"
          data-test="restore-plugin"
          @click="draft.unset(pluginPtr)"
        >
          Restore
        </TertiaryButton>
        <template v-else>
          <TertiaryButton
            v-if="inBase && has(pluginPtr)"
            size="small"
            :disabled="disabled"
            data-test="reset-plugin"
            @click="draft.unset(pluginPtr)"
          >
            Reset to file
          </TertiaryButton>
          <TertiaryButton
            size="small"
            :disabled="disabled"
            data-test="remove-plugin"
            @click="confirmRemove"
          >
            Remove
          </TertiaryButton>
        </template>
      </span>
    </header>

    <template v-if="!removed">
      <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div class="flex items-center gap-2">
          <label class="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              class="h-4 w-4 rounded border-ccf-300 dark:border-slate-700"
              :checked="effectiveValue(p('enabled')) !== false"
              :disabled="disabled"
              data-test="plugin-enabled"
              @change="
                draft.set(
                  p('enabled'),
                  ($event.target as HTMLInputElement).checked,
                )
              "
            />
            Enabled
          </label>
          <FieldHints
            :ptr="p('enabled')"
            :disabled="disabled"
            @reset="draft.unset(p('enabled'))"
          />
        </div>

        <div>
          <label class="field-label" :for="`${id}-protocol`">Protocol</label>
          <div class="flex items-center gap-2">
            <Select
              :input-id="`${id}-protocol`"
              :model-value="protocolChoice"
              :options="protocolOptions"
              option-label="label"
              option-value="value"
              :disabled="disabled"
              size="small"
              class="w-48"
              data-test="plugin-protocol"
              @update:model-value="setProtocol"
            />
            <FieldHints :ptr="p('protocol_version')" hide-reset />
          </div>
          <FieldIssues :ptr="p('protocol_version')" />
        </div>

        <div class="md:col-span-2">
          <label class="field-label" :for="`${id}-source`">Source</label>
          <div class="flex items-center gap-2">
            <InputText
              :id="`${id}-source`"
              :model-value="(overlayValue(p('source')) as string) ?? ''"
              :placeholder="String(baseValue(p('source')) ?? '')"
              :disabled="disabled"
              size="small"
              class="flex-1 font-mono"
              data-test="plugin-source"
              @update:model-value="setText(p('source'), $event)"
            />
            <FieldHints
              :ptr="p('source')"
              :disabled="disabled"
              @reset="draft.unset(p('source'))"
            />
          </div>
          <p
            v-if="sourceHint"
            class="mt-1 text-xs"
            :class="
              sourceHint.safe === sourceHint.total
                ? 'text-green-700 dark:text-green-300'
                : 'text-amber-700 dark:text-amber-300'
            "
            data-test="source-trust-hint"
          >
            trusted on {{ sourceHint.safe }}/{{ sourceHint.total }} instances ·
            {{ sourceHint.label }}
          </p>
          <FieldIssues :ptr="p('source')" />
        </div>

        <div class="md:col-span-2">
          <label class="field-label" :for="`${id}-schedule`">Schedule</label>
          <div class="flex flex-wrap items-center gap-2">
            <InputText
              :id="`${id}-schedule`"
              :model-value="scheduleText"
              :placeholder="schedulePlaceholder"
              :disabled="disabled"
              size="small"
              class="w-56 font-mono"
              data-test="plugin-schedule"
              @update:model-value="setText(p('schedule'), $event)"
            />
            <span
              class="text-xs text-gray-500 dark:text-slate-400"
              data-test="schedule-hint"
              >{{ scheduleDescription }}</span
            >
            <FieldHints
              :ptr="p('schedule')"
              :disabled="disabled"
              @reset="draft.unset(p('schedule'))"
            />
            <button
              type="button"
              class="text-xs text-sky-700 hover:underline disabled:opacity-40 dark:text-sky-300"
              :disabled="disabled || scheduleIsNull"
              data-test="schedule-agent-default"
              @click="draft.remove(p('schedule'))"
            >
              Use agent default (every minute)
            </button>
          </div>
          <FieldIssues :ptr="p('schedule')" />
        </div>
      </div>

      <PolicySourcesEditor :plugin="name" :disabled="false" />

      <div>
        <p class="field-label">Config</p>
        <KeyValueEditor
          label="config"
          :rows="configRows"
          :disabled="disabled"
          warn-keys
          :test-id="`config-${name}`"
          @set="(k, v) => setMapValue('config', k, v)"
          @add="(k, v) => draft.set(p('config', k), v)"
          @reset="(k) => draft.unset(p('config', k))"
          @delete="(k) => draft.makeAbsent(p('config', k))"
        />
        <FieldIssues v-for="k in configKeys" :key="k" :ptr="p('config', k)" />
      </div>

      <div>
        <p class="field-label">Labels</p>
        <KeyValueEditor
          label="labels"
          :rows="labelRows"
          :disabled="disabled"
          :test-id="`labels-${name}`"
          @set="(k, v) => setMapValue('labels', k, v)"
          @add="(k, v) => draft.set(p('labels', k), v)"
          @reset="(k) => draft.unset(p('labels', k))"
          @delete="(k) => draft.makeAbsent(p('labels', k))"
        />
      </div>

      <div>
        <div class="flex items-center gap-2">
          <p class="field-label">Policy data</p>
          <FieldHints
            :ptr="p('policy_data')"
            :disabled="disabled"
            @reset="resetPolicyData"
          />
        </div>
        <CodeEditor
          :model-value="policyDataText"
          language="json"
          :readonly="disabled"
          min-height="160px"
          max-height="320px"
          :label="`Policy data for ${name}`"
          @update:model-value="onPolicyData"
        />
        <p
          v-if="policyDataError"
          class="mt-1 text-xs text-red-600 dark:text-red-400"
          data-test="policy-data-error"
        >
          {{ policyDataError }}
        </p>
        <FieldIssues :ptr="p('policy_data')" />
      </div>

      <p
        v-if="behaviourCount"
        class="text-xs text-gray-500 dark:text-slate-400"
        data-test="policy-behavior"
      >
        {{ behaviourCount }} behaviour{{
          behaviourCount === 1 ? '' : 's'
        }}
        (edit in YAML)
      </p>
    </template>
  </article>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useConfirm } from 'primevue/useconfirm';
import InputText from '@/volt/InputText.vue';
import Select from '@/volt/Select.vue';
import TertiaryButton from '@/volt/TertiaryButton.vue';
import { CodeEditor } from '@/components/code-editor';
import { pointer } from '@/utils/agent-config/json-pointer';
import {
  pluginProvenance,
  provenanceOf,
} from '@/utils/agent-config/provenance';
import { describeCron5 } from '@/utils/agent-config/cron5';
import { deepEqual, isPlainObject } from '@/utils/agent-config/merge-patch';
import { replacingPatch } from '@/utils/agent-config/overlay-ops';
import ProvenanceBadge from '../ProvenanceBadge.vue';
import { CONFIG_KEY_LOCK_TOOLTIP } from '../constants';
import FieldHints from './FieldHints.vue';
import FieldIssues from './FieldIssues.vue';
import KeyValueEditor, { type KeyValueRow } from './KeyValueEditor.vue';
import PolicySourcesEditor from './PolicySourcesEditor.vue';
import { useEditor } from './useEditor';

const props = defineProps<{
  name: string;
  /** The base plugin was nulled by the overlay. */
  removed?: boolean;
}>();

const confirm = useConfirm();
const {
  draft,
  ctx,
  policyOnly,
  has,
  overlayValue,
  baseValue,
  effectiveValue,
  configKeyLocked,
  shield,
  trustHint,
} = useEditor();

const id = computed(() => `plugin-${props.name.replace(/[^a-z0-9_-]/gi, '-')}`);
const disabled = computed(() => policyOnly.value);
const pluginPtr = computed(() => pointer('plugins', props.name));
const inBase = computed(() => baseValue(pluginPtr.value) != null);
const provenance = computed(() =>
  pluginProvenance(
    props.name,
    ctx.placeholderBase.value ?? {},
    draft.overlay.value,
  ),
);

function p(...rest: string[]): string {
  return pointer('plugins', props.name, ...rest);
}

/** Clearing a text input omits the key, so the field inherits the file value. */
function setText(ptr: string, v: string | undefined) {
  if (!v) draft.unset(ptr);
  else draft.set(ptr, v);
}

// ---- Protocol (R56): File value / Auto / 1 / 2 ----
const protocolOptions = [
  { label: 'File value', value: 'file' },
  { label: 'Auto', value: 'auto' },
  { label: '1', value: 1 },
  { label: '2', value: 2 },
];
const protocolChoice = computed(() => {
  const ptr = p('protocol_version');
  if (!has(ptr)) return 'file';
  const v = overlayValue(ptr);
  return v === null ? 'auto' : v;
});
function setProtocol(v: 'file' | 'auto' | 1 | 2) {
  const ptr = p('protocol_version');
  if (v === 'file')
    draft.unset(ptr); // key omitted: the file value (or auto-detect) applies
  else if (v === 'auto')
    draft.remove(ptr); // null: deleted from the effective config
  else draft.set(ptr, v); // 0 is never sent (R9)
}

// ---- Schedule ----
const scheduleIsNull = computed(
  () => has(p('schedule')) && overlayValue(p('schedule')) === null,
);
const scheduleText = computed(() => {
  const v = overlayValue(p('schedule'));
  return typeof v === 'string' ? v : '';
});
const schedulePlaceholder = computed(() => {
  if (scheduleIsNull.value) return 'agent default (every minute)';
  const b = baseValue(p('schedule'));
  return typeof b === 'string' && b ? b : 'every minute (default)';
});
const scheduleDescription = computed(() => {
  const v = effectiveValue(p('schedule'));
  return describeCron5(typeof v === 'string' && v ? v : '* * * * *');
});

// ---- Config / labels ----
function mapRows(field: 'config' | 'labels'): KeyValueRow[] {
  const base = baseValue(p(field));
  const ov = overlayValue(p(field));
  const keys = new Set<string>([
    ...Object.keys(isPlainObject(base) ? base : {}),
    ...Object.keys(isPlainObject(ov) ? ov : {}),
  ]);
  return Array.from(keys)
    .sort()
    .map((k) => {
      const ptr = p(field, k);
      const bv = isPlainObject(base) ? base[k] : undefined;
      const oVal = isPlainObject(ov) ? ov[k] : undefined;
      const locked = field === 'config' && configKeyLocked(props.name, k);
      return {
        key: k,
        value: typeof oVal === 'string' ? oVal : '',
        placeholder: typeof bv === 'string' ? bv : '',
        provenance: provenanceOf(
          ptr,
          ctx.placeholderBase.value ?? {},
          draft.overlay.value,
        ),
        removed: isPlainObject(ov) && oVal === null,
        locked,
        lockTooltip: locked ? CONFIG_KEY_LOCK_TOOLTIP : undefined,
        shield: shield(ptr),
      };
    });
}
const configRows = computed(() => mapRows('config'));
const labelRows = computed(() => mapRows('labels'));
const configKeys = computed(() => configRows.value.map((r) => r.key));

function setMapValue(field: 'config' | 'labels', k: string, v: string) {
  if (!v) draft.unset(p(field, k));
  else draft.set(p(field, k), v);
}

// ---- policy_data (JSON editor; written on valid JSON only) ----
const policyDataError = ref('');
function currentPolicyDataText(): string {
  const v = effectiveValue(p('policy_data'));
  return isPlainObject(v) ? JSON.stringify(v, null, 2) : '{}';
}
const policyDataText = ref(currentPolicyDataText());
watch(
  () => effectiveValue(p('policy_data')),
  (v) => {
    // Keep the editor in sync with external changes (reset, YAML), but never clobber the
    // user's in-progress (possibly invalid) text.
    try {
      if (deepEqual(JSON.parse(policyDataText.value), v ?? {})) return;
    } catch {
      if (policyDataError.value) return;
    }
    policyDataText.value = currentPolicyDataText();
    policyDataError.value = '';
  },
);
function onPolicyData(text: string) {
  policyDataText.value = text;
  let parsed: unknown;
  try {
    parsed = text.trim() ? JSON.parse(text) : {};
  } catch (e) {
    policyDataError.value = `Invalid JSON: ${(e as Error).message}`;
    return;
  }
  if (!isPlainObject(parsed)) {
    policyDataError.value = 'Policy data must be a JSON object';
    return;
  }
  policyDataError.value = '';
  const base = baseValue(p('policy_data'));
  if (!has(p('policy_data')) && deepEqual(parsed, base ?? {})) return;
  draft.set(p('policy_data'), replacingPatch(base, parsed));
}
function resetPolicyData() {
  draft.unset(p('policy_data'));
  policyDataError.value = '';
  policyDataText.value = currentPolicyDataText();
}

const behaviourCount = computed(() => {
  const v = effectiveValue(p('policy_behavior'));
  return isPlainObject(v) ? Object.keys(v).length : 0;
});

const sourceHint = computed(() => {
  const v = overlayValue(p('source'));
  return typeof v === 'string' && v ? trustHint(p('source'), v) : null;
});

function confirmRemove() {
  confirm.require({
    header: 'Remove plugin',
    message: `Remove the plugin "${props.name}" from this agent's effective configuration?`,
    rejectProps: { label: 'Cancel', severity: 'secondary', outlined: true },
    acceptProps: { label: 'Remove', severity: 'danger' },
    accept: () => draft.makeAbsent(pluginPtr.value),
  });
}
</script>

<style scoped>
@reference '@/assets/base.css';

.field-label {
  @apply mb-1 block text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-slate-400;
}
</style>
