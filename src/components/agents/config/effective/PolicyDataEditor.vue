<template>
  <div class="space-y-2">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <SelectButton
        :model-value="mode"
        :options="modeOptions"
        option-label="label"
        option-value="value"
        option-disabled="disabled"
        :allow-empty="false"
        :aria-label="`Policy data editor for ${plugin}`"
        data-test="policy-data-mode"
        @update:model-value="setMode"
      />
      <span
        v-if="mode === 'raw' && error"
        class="text-xs text-gray-500 dark:text-slate-400"
        >Fix the JSON to switch back to the structured view.</span
      >
    </div>
    <PolicyDataTree
      v-if="mode === 'structured'"
      :model-value="current"
      editable
      :label="`Policy data of ${plugin}`"
      test-id="policy-data-structured"
      @update:model-value="commit"
    />
    <template v-else>
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
        {{ error }}
      </p>
    </template>
    <div class="flex justify-end">
      <button
        v-if="has(ptr)"
        type="button"
        class="text-xs text-sky-700 hover:underline dark:text-sky-300"
        data-test="policy-data-reset"
        @click="reset"
      >
        Use the file value
      </button>
    </div>
    <FieldIssues :ptr="ptr" />
  </div>
</template>

<script setup lang="ts">
// Inline editor of a plugin's `policy_data` (R69): a structured view (PolicyDataTree) by
// default, and the raw JSON editor for power users. Both edit the same target, the effective
// policy_data, and write it through `commit`, which records only the real changes (a minimal
// merge patch; a masked report value is never copied into the overlay, R25). The raw editor
// writes on valid JSON only, and follows external changes (structured edits, undo, raw YAML).
import { computed, ref, watch } from 'vue';
import SelectButton from '@/volt/SelectButton.vue';
import { CodeEditor } from '@/components/code-editor';
import { pointer } from '@/utils/agent-config/json-pointer';
import {
  deepEqual,
  isPlainObject,
  mergePatch,
  type PlainObject,
} from '@/utils/agent-config/merge-patch';
import { diffOps } from '@/utils/agent-config/policy-data-patch';
import FieldIssues from '../editor/FieldIssues.vue';
import { useEditor } from '../editor/useEditor';
import PolicyDataTree from './PolicyDataTree.vue';

const props = defineProps<{ plugin: string }>();
const { draft, has, effectiveValue } = useEditor();

const ptr = computed(() => pointer('plugins', props.plugin, 'policy_data'));
const error = ref('');

/** The effective policy_data (the editors' target). */
const current = computed<PlainObject>(() => {
  const v = effectiveValue(ptr.value);
  return isPlainObject(v) ? v : {};
});

function currentText(): string {
  return JSON.stringify(current.value, null, 2);
}
const text = ref(currentText());

const mode = ref<'structured' | 'raw'>('structured');
const modeOptions = computed(() => [
  { label: 'Structured', value: 'structured', disabled: !!error.value },
  { label: 'Raw JSON', value: 'raw', disabled: false },
]);
function setMode(next: 'structured' | 'raw') {
  if (next === 'structured' && error.value) return;
  if (next === 'raw') text.value = currentText();
  mode.value = next;
}

// Follow external changes without clobbering in-progress invalid text.
watch(
  () => effectiveValue(ptr.value),
  (v) => {
    if (error.value) return;
    try {
      if (deepEqual(mergePatch({}, JSON.parse(text.value)), v ?? {})) return;
    } catch {
      return;
    }
    text.value = currentText();
  },
);

/**
 * Records only what changes from the current effective policy_data to `target`, at the
 * pointers that change (policy-data-patch.ts): nothing for unchanged keys or untouched masked
 * values, null for a removed file key, a changed array whole.
 */
function commit(target: PlainObject) {
  draft.applyOps(diffOps(ptr.value, current.value, target), ptr.value);
}

function onInput(value: string) {
  text.value = value;
  let parsed: unknown;
  try {
    parsed = value.trim() ? JSON.parse(value) : {};
  } catch (e) {
    error.value = `Invalid JSON: ${(e as Error).message}`;
    return;
  }
  if (!isPlainObject(parsed)) {
    error.value = 'Policy data must be a JSON object';
    return;
  }
  error.value = '';
  commit(parsed);
}

function reset() {
  draft.unset(ptr.value);
  error.value = '';
  text.value = currentText();
}
</script>
