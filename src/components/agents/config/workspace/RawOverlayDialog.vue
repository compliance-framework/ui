<template>
  <Dialog
    :visible="visible"
    modal
    header="Advanced: edit raw overlay (YAML)"
    class="w-full max-w-4xl"
    data-test="raw-overlay-dialog"
    @update:visible="$emit('update:visible', $event)"
  >
    <div class="space-y-3">
      <p class="text-xs text-gray-500 dark:text-slate-400">
        The overlay is a JSON Merge Patch over each agent's local file:
        <code>null</code> deletes a key, an omitted key keeps the file value.
        Applying replaces the pending changes with this document; nothing is
        saved until you review and save.
      </p>
      <p class="text-xs text-gray-500 dark:text-slate-400">
        <i class="pi pi-info-circle mr-1" />{{ OVERLAY_SECRETS_NOTICE }}
      </p>
      <CodeEditor
        :model-value="text"
        language="yaml"
        :diagnostics="diagnostics"
        min-height="360px"
        max-height="60vh"
        label="Overlay YAML"
        @update:model-value="onInput"
      />
      <p
        v-if="parseError"
        class="rounded-md border border-red-300 bg-red-50 p-2 text-sm text-red-700 dark:border-red-700 dark:bg-red-500/10 dark:text-red-300"
        data-test="yaml-error"
      >
        Line {{ parseError.line + 1 }}, column {{ parseError.column + 1 }}:
        {{ parseError.message }}
      </p>
      <p
        v-if="forbidden.length"
        class="rounded-md border border-red-300 bg-red-50 p-2 text-sm text-red-700 dark:border-red-700 dark:bg-red-500/10 dark:text-red-300"
        data-test="yaml-forbidden"
      >
        <i class="pi pi-lock mr-1" />
        <code>{{ forbidden.join('`, `') }}</code
        >: {{ FORBIDDEN_TOOLTIP }}. Remove
        {{ forbidden.length === 1 ? 'it' : 'them' }} to apply.
      </p>
      <p
        v-if="coerced.length"
        class="text-xs text-sky-700 dark:text-sky-300"
        data-test="yaml-coerced"
      >
        {{ coerced.length }} value{{ coerced.length === 1 ? '' : 's' }} will be
        sent as a string: {{ coerced.join(', ') }}
      </p>
      <ul
        v-if="issues.length"
        class="space-y-1 text-xs"
        data-test="yaml-issues"
      >
        <li
          v-for="(i, idx) in issues"
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
    <template #footer>
      <div class="flex w-full flex-wrap items-center gap-2">
        <span
          v-if="hasSavedOverlay"
          v-tooltip.top="{
            value: ws.saveDisabledReason.value,
            disabled: !ws.saveDisabledReason.value,
          }"
        >
          <Button
            severity="danger"
            size="small"
            :disabled="!!ws.saveDisabledReason.value"
            data-test="clear-overlay"
            @click="clearOverlay"
          >
            Clear overlay
          </Button>
        </span>
        <span class="flex-1" />
        <TertiaryButton
          data-test="raw-cancel"
          @click="$emit('update:visible', false)"
          >Cancel</TertiaryButton
        >
        <PrimaryButton
          :disabled="!canApply"
          data-test="raw-apply"
          @click="apply"
        >
          Apply to pending changes
        </PrimaryButton>
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
// R70: the structured drawer is gone; the raw overlay is edited here and feeds the same
// pending-changes draft, preview and save flow. Forbidden keys (R71) are highlighted and
// block Apply client-side; the API's 422 `locked-key` stays authoritative.
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import Button from '@/volt/Button.vue';
import Dialog from '@/volt/Dialog.vue';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import TertiaryButton from '@/volt/TertiaryButton.vue';
import { CodeEditor, type EditorDiagnostic } from '@/components/code-editor';
import { LOCKED_KEYS, type OverlayDoc } from '@/types/agent-config';
import { useWorkspace } from '@/composables/agent-config/useConfigWorkspace';
import { parseYaml, toYaml, type YamlError } from '@/utils/agent-config/yaml';
import {
  coerceStringMaps,
  validateOverlayClientSide,
} from '@/utils/agent-config/validation';
import { deepEqual, isPlainObject } from '@/utils/agent-config/merge-patch';
import { FORBIDDEN_TOOLTIP } from '@/utils/agent-config/field-access';
import { OVERLAY_SECRETS_NOTICE } from '../constants';

const props = defineProps<{ visible: boolean }>();
const emit = defineEmits<{ 'update:visible': [v: boolean] }>();

const ws = useWorkspace()!;
const PARSE_DEBOUNCE_MS = 250;

const text = ref('');
const parsed = ref<OverlayDoc | null>(null);
const coerced = ref<string[]>([]);
const parseError = ref<YamlError | null>(null);
let timer: ReturnType<typeof setTimeout> | null = null;

function parseNow(value: string) {
  const res = parseYaml(value);
  if (!res.ok) {
    parseError.value = res.error;
    parsed.value = null;
    coerced.value = [];
    return;
  }
  parseError.value = null;
  const doc = (res.value ?? {}) as OverlayDoc;
  if (!isPlainObject(doc)) {
    parseError.value = {
      line: 0,
      column: 0,
      message: 'The overlay must be a mapping',
    };
    parsed.value = null;
    return;
  }
  const c = coerceStringMaps(doc);
  parsed.value = c.overlay;
  coerced.value = c.coerced;
}

watch(
  () => props.visible,
  (v) => {
    if (!v) return;
    text.value = toYaml(ws.draft.overlay.value);
    parseNow(text.value);
  },
  { immediate: true },
);

function onInput(value: string) {
  text.value = value;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    parseNow(value);
  }, PARSE_DEBOUNCE_MS);
}

onBeforeUnmount(() => {
  if (timer) clearTimeout(timer);
  timer = null;
});

function flush() {
  if (timer) {
    clearTimeout(timer);
    timer = null;
    parseNow(text.value);
  }
}

/** Locked top-level keys present in the parsed document (even with a null value). */
const forbidden = computed(() =>
  parsed.value
    ? LOCKED_KEYS.filter((k) =>
        Object.prototype.hasOwnProperty.call(parsed.value, k),
      )
    : [],
);

/** Line of each top-level forbidden key, for editor markers. */
const diagnostics = computed<EditorDiagnostic[]>(() => {
  const out: EditorDiagnostic[] = [];
  const e = parseError.value;
  if (e) {
    out.push({
      row: e.line + 1,
      col: e.column + 1,
      message: e.message,
      severity: 'error',
    });
  }
  if (forbidden.value.length) {
    text.value.split('\n').forEach((line, i) => {
      const m = /^(["']?)([A-Za-z_]+)\1\s*:/.exec(line);
      if (m && forbidden.value.includes(m[2] as (typeof LOCKED_KEYS)[number])) {
        out.push({
          row: i + 1,
          col: 1,
          message: `${m[2]}: ${FORBIDDEN_TOOLTIP}`,
          severity: 'error',
        });
      }
    });
  }
  return out;
});

const issues = computed(() =>
  parsed.value && !forbidden.value.length
    ? validateOverlayClientSide(parsed.value)
    : [],
);

const canApply = computed(
  () =>
    !parseError.value &&
    !!parsed.value &&
    !forbidden.value.length &&
    !deepEqual(parsed.value, ws.draft.overlay.value),
);

function apply() {
  flush();
  if (!canApply.value || !parsed.value) return;
  ws.draft.replaceAll(parsed.value);
  emit('update:visible', false);
}

const hasSavedOverlay = computed(
  () => Object.keys(ws.draft.original.value).length > 0,
);

// "Clear overlay" only fills the editor with {}; it is a pending change like any other.
function clearOverlay() {
  if (ws.saveDisabledReason.value) return;
  text.value = '{}\n';
  parseNow(text.value);
}

defineExpose({ text, onInput, flush, apply });
</script>
