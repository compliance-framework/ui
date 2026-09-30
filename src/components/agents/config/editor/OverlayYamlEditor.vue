<template>
  <div class="space-y-3" data-test="overlay-yaml">
    <Message severity="info" variant="outlined">
      Locked keys (<code>api</code>, <code>daemon</code>,
      <code>remote_config</code>) cannot be set here. They are rejected on save.
    </Message>
    <Message
      v-if="policyOnly"
      severity="warn"
      variant="outlined"
      data-test="yaml-readonly"
    >
      YAML mode is read-only for your role: mixed edits cannot be checked field
      by field. Use the form's Policies section.
    </Message>
    <CodeEditor
      :model-value="draft.yamlText.value"
      language="yaml"
      :readonly="policyOnly"
      :diagnostics="diagnostics"
      min-height="360px"
      max-height="65vh"
      label="Overlay YAML"
      @update:model-value="draft.onYamlInput"
    />
    <p
      v-if="draft.yamlError.value"
      class="rounded-md border border-red-300 bg-red-50 p-2 text-sm text-red-700 dark:border-red-700 dark:bg-red-500/10 dark:text-red-300"
      data-test="yaml-error"
    >
      Line {{ draft.yamlError.value.line + 1 }}, column
      {{ draft.yamlError.value.column + 1 }}:
      {{ draft.yamlError.value.message }}
    </p>
    <p
      v-if="draft.coerced.value.length"
      class="text-xs text-sky-700 dark:text-sky-300"
      data-test="yaml-coerced"
    >
      Converted {{ draft.coerced.value.length }} value{{
        draft.coerced.value.length === 1 ? '' : 's'
      }}
      to a string: {{ draft.coerced.value.join(', ') }}
    </p>
    <ul
      v-if="draft.clientIssues.value.length"
      class="space-y-1 text-xs"
      data-test="yaml-issues"
    >
      <li
        v-for="(i, idx) in draft.clientIssues.value"
        :key="idx"
        :class="
          i.blocking
            ? 'text-red-600 dark:text-red-400'
            : 'text-amber-700 dark:text-amber-300'
        "
      >
        <code class="font-mono">{{ i.ptr || '/' }}</code> — {{ i.message }}
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import Message from '@/volt/Message.vue';
import { CodeEditor } from '@/components/code-editor';
import type { EditorDiagnostic } from '@/components/code-editor';
import { useEditor } from './useEditor';

const { draft, policyOnly } = useEditor();

const diagnostics = computed<EditorDiagnostic[]>(() => {
  const e = draft.yamlError.value;
  return e
    ? [
        {
          row: e.line + 1,
          col: e.column + 1,
          message: e.message,
          severity: 'error',
        },
      ]
    : [];
});
</script>
