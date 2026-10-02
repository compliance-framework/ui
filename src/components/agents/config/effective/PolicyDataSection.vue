<template>
  <div
    class="min-w-0"
    :data-test="`field-${ptr}`"
    :data-state="access.state"
    :data-pending="pending ? 'true' : undefined"
  >
    <div class="flex flex-wrap items-center gap-2">
      <span class="text-gray-500 dark:text-slate-400">Policy data</span>
      <span>{{ keyCount }} key{{ keyCount === 1 ? '' : 's' }}</span>
      <ProvenanceBadge v-if="provenance !== 'file'" :provenance="provenance" />
      <i
        v-if="showAccess && access.state === 'restricted'"
        v-tooltip.top="accessText"
        role="img"
        tabindex="0"
        class="pi pi-shield text-xs text-amber-600 dark:text-amber-400"
        :aria-label="accessText"
        data-test="field-restricted"
      />
      <i
        v-else-if="showAccess && access.state === 'readonly'"
        v-tooltip.top="accessText"
        role="img"
        tabindex="0"
        class="pi pi-info-circle text-xs text-gray-400 dark:text-slate-500"
        :aria-label="accessText"
        data-test="field-readonly"
      />
      <span
        v-if="pending"
        class="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-xs text-sky-800 dark:bg-sky-500/15 dark:text-sky-200"
        :data-test="`pending-${ptr}`"
      >
        pending
        <button
          type="button"
          class="ml-0.5"
          aria-label="Undo the pending changes to policy data"
          :data-test="`undo-${ptr}`"
          @click="ws!.draft.revertPointer(ptr)"
        >
          ↺
        </button>
      </span>
      <SelectButton
        v-if="editable"
        class="ml-auto"
        :model-value="mode"
        :options="modeOptions"
        option-label="label"
        option-value="value"
        option-disabled="disabled"
        :allow-empty="false"
        :aria-label="`Policy data view for ${plugin}`"
        data-test="policy-data-mode"
        @update:model-value="setMode"
      />
    </div>
    <PolicyDataTree
      v-if="mode === 'structured' && (keyCount || editable)"
      class="mt-1 pl-3"
      :value="shown"
      :ptr="ptr"
      :label="`Policy data of ${plugin}`"
      :test-id="`policy-data-view-${plugin}`"
    />
    <div v-else-if="mode === 'raw'" class="mt-2 space-y-1">
      <CodeEditor
        :model-value="text"
        language="json"
        min-height="140px"
        max-height="320px"
        :label="`Policy data for ${plugin}`"
        @update:model-value="onInput"
      />
      <p
        v-if="error"
        class="text-xs text-red-600 dark:text-red-400"
        data-test="policy-data-error"
      >
        {{ error }} Fix the JSON to switch back to the structured view.
      </p>
      <div class="flex justify-end">
        <button
          v-if="inOverlay"
          type="button"
          class="text-xs text-sky-700 hover:underline dark:text-sky-300"
          data-test="policy-data-reset"
          @click="reset"
        >
          Use the file value
        </button>
      </div>
    </div>
    <FieldIssues v-if="editable" :ptr="ptr" />
  </div>
</template>

<script setup lang="ts">
// A plugin's policy_data on the Effective view (R69, R71): a structured tree in which each key
// and list item is edited, removed or added on its own (PolicyDataNode), and a raw JSON view
// for type changes and bulk edits. Both record only the real changes as a minimal merge patch
// (policy-data-patch.ts, through the draft's setValue / removeValue / applyOps); an untouched
// masked report value never reaches the overlay (R25). Each pointer carries its R71 access
// (the tree notes a pointer only where it differs from this section's state). Without a
// workspace or agent:configure it is a read-only view of the reported value.
import { computed, provide, ref, watch } from 'vue';
import SelectButton from '@/volt/SelectButton.vue';
import { CodeEditor } from '@/components/code-editor';
import { useWorkspace } from '@/composables/agent-config/useConfigWorkspace';
import { getAt, hasAt, pointer } from '@/utils/agent-config/json-pointer';
import {
  deepEqual,
  isPlainObject,
  type PlainObject,
} from '@/utils/agent-config/merge-patch';
import { diffOps } from '@/utils/agent-config/policy-data-patch';
import { accessTooltip, fieldAccess } from '@/utils/agent-config/field-access';
import type { Provenance } from '@/utils/agent-config/provenance';
import ProvenanceBadge from '../ProvenanceBadge.vue';
import FieldIssues from '../editor/FieldIssues.vue';
import PolicyDataTree from './PolicyDataTree.vue';
import { POLICY_DATA_TREE_KEY } from './policyDataContext';

const props = defineProps<{
  plugin: string;
  /** The reported (effective) policy_data of the shown instance. */
  reported: unknown;
  provenance: Provenance;
}>();

const ws = useWorkspace();
const ptr = computed(() => pointer('plugins', props.plugin, 'policy_data'));

const access = computed(() =>
  ws ? ws.accessAt(ptr.value) : fieldAccess(ptr.value, []),
);
const accessText = computed(() => accessTooltip(access.value));
const showAccess = computed(
  () => !!ws && ws.ready.value && ws.canConfigure.value,
);
const editable = computed(
  () => !!ws && ws.ready.value && ws.canEditPointer(ptr.value),
);
const pending = computed(() => !!ws && ws.draft.pendingAt(ptr.value));
const inOverlay = computed(
  () => !!ws && hasAt(ws.draft.overlay.value, ptr.value),
);

/** Editors see the draft's effective value (their edits included); readers the report. */
const shown = computed<PlainObject>(() => {
  const v = editable.value
    ? getAt(ws!.draft.effectiveDraft.value, ptr.value)
    : props.reported;
  return isPlainObject(v) ? v : {};
});
const keyCount = computed(() => Object.keys(shown.value).length);

provide(POLICY_DATA_TREE_KEY, {
  canEdit: (p) => editable.value && ws!.canEditPointer(p),
  accessNote: (p) => {
    if (!showAccess.value) return null;
    const a = ws!.accessAt(p);
    if (a.state === access.value.state) return null;
    if (a.state !== 'restricted' && a.state !== 'readonly') return null;
    return { state: a.state, text: accessTooltip(a) };
  },
  changed: (p) => !!ws && ws.draft.changedPaths.value.includes(p),
  revert: (p) => ws?.draft.revertPointer(p),
  set: (p, v) => ws?.draft.setValue(p, v, ptr.value),
  remove: (p) => ws?.draft.removeValue(p),
});

// ---- Structured / raw JSON ----
const error = ref('');
const mode = ref<'structured' | 'raw'>('structured');
const modeOptions = computed(() => [
  { label: 'Structured', value: 'structured', disabled: !!error.value },
  { label: 'Raw JSON', value: 'raw', disabled: false },
]);
function currentText(): string {
  return JSON.stringify(shown.value, null, 2);
}
const text = ref(currentText());

function setMode(next: 'structured' | 'raw') {
  if (next === 'structured' && error.value) return;
  if (next === 'raw') text.value = currentText();
  mode.value = next;
}

// Follow external changes (structured edits, undo, raw YAML) without clobbering in-progress
// invalid text.
watch(shown, (v) => {
  if (error.value) return;
  try {
    if (deepEqual(JSON.parse(text.value), v)) return;
  } catch {
    return;
  }
  text.value = currentText();
});

function onInput(value: string) {
  text.value = value;
  let parsed: unknown;
  try {
    parsed = value.trim() ? JSON.parse(value) : {};
  } catch (e) {
    error.value = `Invalid JSON: ${(e as Error).message}.`;
    return;
  }
  if (!isPlainObject(parsed)) {
    error.value = 'Policy data must be a JSON object.';
    return;
  }
  error.value = '';
  // Only what really changed, at the pointers that changed.
  ws?.draft.applyOps(diffOps(ptr.value, shown.value, parsed), ptr.value);
}

function reset() {
  ws?.draft.unset(ptr.value);
  error.value = '';
  text.value = currentText();
}
</script>
