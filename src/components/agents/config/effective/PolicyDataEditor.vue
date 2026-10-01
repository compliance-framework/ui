<template>
  <div class="space-y-1">
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
// Inline JSON editor of a plugin's `policy_data` (R69). Objects MERGE under RFC 7396, so the
// draft gets the full target plus nulls for file keys the user removed (replacingPatch); a
// masked report value is never copied into the overlay (R25). Written on valid JSON only.
import { computed, ref, watch } from 'vue';
import { CodeEditor } from '@/components/code-editor';
import { pointer } from '@/utils/agent-config/json-pointer';
import {
  deepEqual,
  isPlainObject,
  mergePatch,
} from '@/utils/agent-config/merge-patch';
import { replacingPatch } from '@/utils/agent-config/overlay-ops';
import FieldIssues from '../editor/FieldIssues.vue';
import { useEditor } from '../editor/useEditor';

const props = defineProps<{ plugin: string }>();
const { draft, has, baseValue, effectiveValue } = useEditor();

const ptr = computed(() => pointer('plugins', props.plugin, 'policy_data'));
const error = ref('');

function currentText(): string {
  const v = effectiveValue(ptr.value);
  return isPlainObject(v) ? JSON.stringify(v, null, 2) : '{}';
}
const text = ref(currentText());

// Follow external changes (undo, raw YAML) without clobbering in-progress invalid text.
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
  const base = baseValue(ptr.value);
  if (!has(ptr.value) && deepEqual(parsed, base ?? {})) return;
  draft.set(ptr.value, replacingPatch(base, parsed));
}

function reset() {
  draft.unset(ptr.value);
  error.value = '';
  text.value = currentText();
}
</script>
