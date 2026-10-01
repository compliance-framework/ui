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
      :min-height="minHeight"
      :max-height="maxHeight"
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
        <span v-if="d.code" class="mr-1 font-medium">
          <CodeLabel :labels="POLICY_ERROR_CODE_LABELS" :code="d.code" />:
        </span>
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
import CodeLabel from '../CodeLabel.vue';
import { POLICY_ERROR_CODE_LABELS } from '../constants';

const props = withDefaults(
  defineProps<{
    bundle: string;
    path: string;
    modelValue: string;
    diagnostics: PolicyError[];
    readonly?: boolean;
    minHeight?: string;
    maxHeight?: string;
  }>(),
  { readonly: false, minHeight: '200px', maxHeight: '60vh' },
);
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
      // R63: the code leads the marker text so contract problems read clearly.
      message: d.code ? `[${d.code}] ${d.message}` : d.message,
      severity: d.severity,
    })),
);
// Problems without a position (e.g. a failing vendor test) are listed under the editor.
const unanchored = computed(() => props.diagnostics.filter((d) => !d.row));
</script>
