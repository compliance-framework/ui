<template>
  <div class="space-y-1" :data-test="`module-editor-${path}`">
    <div
      class="flex items-center justify-between text-xs text-gray-500 dark:text-slate-400"
    >
      <span class="font-mono">{{ path }}</span>
      <span
        :class="size > LIMITS.moduleBytes ? 'text-red-600' : ''"
        data-test="module-size"
      >
        {{ humanBytes(size) }} / {{ humanBytes(LIMITS.moduleBytes) }}
      </span>
    </div>
    <CodeEditor
      :model-value="modelValue"
      :language="language"
      :readonly="readonly"
      :diagnostics="editorDiagnostics"
      min-height="200px"
      max-height="60vh"
      :label="`${bundle}/${path}`"
      @update:model-value="$emit('update:modelValue', $event)"
    />
    <ul v-if="unanchored.length" class="space-y-0.5 text-xs">
      <li
        v-for="(d, i) in unanchored"
        :key="i"
        :class="
          d.severity === 'error'
            ? 'text-red-600 dark:text-red-400'
            : 'text-amber-700 dark:text-amber-300'
        "
      >
        {{ d.message }}
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { CodeEditor, type EditorDiagnostic } from '@/components/code-editor';
import type { PolicyError } from '@/types/agent-config';
import { byteSize, LIMITS } from '@/utils/agent-config/validation';
import { humanBytes } from '@/utils/agent-config/display';

const props = defineProps<{
  bundle: string;
  path: string;
  modelValue: string;
  diagnostics: PolicyError[];
  readonly?: boolean;
}>();
defineEmits<{ 'update:modelValue': [value: string] }>();

const language = computed(() =>
  props.path.endsWith('.rego')
    ? 'rego'
    : props.path.endsWith('.json')
      ? 'json'
      : props.path.match(/\.ya?ml$/)
        ? 'yaml'
        : 'text',
);
const size = computed(() => byteSize(props.modelValue));
const editorDiagnostics = computed<EditorDiagnostic[]>(() =>
  props.diagnostics
    .filter((d) => d.row)
    .map((d) => ({
      row: d.row!,
      col: d.col,
      message: d.message,
      severity: d.severity,
    })),
);
// Problems without a position (e.g. a failing vendor test) are listed under the editor.
const unanchored = computed(() => props.diagnostics.filter((d) => !d.row));
</script>
