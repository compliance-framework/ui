<script setup lang="ts">
// R70: the raw overlay is edited here and feeds the same pending-changes draft, preview and
// save flow. Forbidden keys (R71) are highlighted and block Apply client-side; the API's 422
// `locked-key` stays authoritative. Closing with edits that were not applied asks first (the
// Dialog's discard prompt); Escape inside the editor only leaves the editor.
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import Button from '@/ds/components/Button/Button.vue';
import { CodeEditor, type EditorDiagnostic } from '@/ds/components/CodeEditor';
import Dialog from '@/ds/components/Dialog/Dialog.vue';
import InlineMessage from '@/ds/components/InlineMessage/InlineMessage.vue';
import Text from '@/ds/components/Text/Text.vue';
import Stack from '@/ds/components/layout/Stack.vue';
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

const dialog = ref<InstanceType<typeof Dialog>>();
const open = computed({
  get: () => props.visible,
  set: (v: boolean) => emit('update:visible', v),
});

const text = ref('');
/** The text the dialog opened with: anything else is an edit closing would lose. */
const openedWith = ref('');
const dirty = computed(() => text.value !== openedWith.value);
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
    openedWith.value = text.value;
    parseNow(text.value);
  },
  { immediate: true },
);

/** Cancel / ×: closes, after confirming when the text was edited. */
function requestClose() {
  if (!dirty.value) {
    emit('update:visible', false);
    return;
  }
  dialog.value?.requestClose();
}

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
const applyBlocked = computed(() => {
  if (parseError.value || !parsed.value) return 'Fix the YAML first.';
  if (forbidden.value.length) return 'Remove the locked keys first.';
  if (canApply.value) return undefined;
  return 'Nothing has changed.';
});

function apply() {
  flush();
  if (!canApply.value || !parsed.value) return;
  ws.draft.replaceAll(parsed.value);
  // Applied: nothing left to lose, so close without the discard prompt.
  openedWith.value = text.value;
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

defineExpose({ text, onInput, flush, apply, requestClose, dirty });
</script>

<template>
  <Dialog
    ref="dialog"
    v-model:open="open"
    title="Advanced: edit raw overlay (YAML)"
    size="l"
    :dirty="dirty"
    data-test="raw-overlay-dialog"
  >
    <Stack gap="3">
      <Text variant="secondary">
        The overlay is a JSON Merge Patch over each agent's local file:
        <Text as="code" variant="code">null</Text> deletes a key, an omitted key
        keeps the file value. Applying replaces the pending changes with this
        document; nothing is saved until you review and save.
      </Text>
      <Text variant="caption">{{ OVERLAY_SECRETS_NOTICE }}</Text>
      <CodeEditor
        :model-value="text"
        language="yaml"
        :diagnostics="diagnostics"
        min-height="360px"
        max-height="60vh"
        label="Overlay YAML"
        @update:model-value="onInput"
      />
      <InlineMessage v-if="parseError" tone="error" data-test="yaml-error">
        Line {{ parseError.line + 1 }}, column {{ parseError.column + 1 }}:
        {{ parseError.message }}
      </InlineMessage>
      <InlineMessage
        v-if="forbidden.length"
        tone="error"
        data-test="yaml-forbidden"
      >
        <Text as="code" variant="code">{{ forbidden.join('`, `') }}</Text
        >: {{ FORBIDDEN_TOOLTIP }}. Remove
        {{ forbidden.length === 1 ? 'it' : 'them' }} to apply.
      </InlineMessage>
      <Text v-if="coerced.length" variant="caption" data-test="yaml-coerced">
        {{ coerced.length }} value{{ coerced.length === 1 ? '' : 's' }} will be
        sent as a string: {{ coerced.join(', ') }}
      </Text>
      <Stack v-if="issues.length" gap="1" data-test="yaml-issues">
        <Text v-for="(i, idx) in issues" :key="idx" variant="caption"
          >{{ i.blocking ? 'Error' : 'Warning' }}: {{ i.ptr || '/' }} —
          {{ i.message }}</Text
        >
      </Stack>
    </Stack>
    <template #footer>
      <Button
        v-if="hasSavedOverlay"
        variant="danger"
        :disabled-reason="ws.saveDisabledReason.value || undefined"
        data-test="clear-overlay"
        @click="clearOverlay"
        >Clear overlay</Button
      >
      <Button variant="tertiary" data-test="raw-cancel" @click="requestClose"
        >Cancel</Button
      >
      <Button
        variant="primary"
        :disabled-reason="applyBlocked"
        data-test="raw-apply"
        @click="apply"
        >Apply to pending changes</Button
      >
    </template>
  </Dialog>
</template>
