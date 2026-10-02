<template>
  <form
    class="flex flex-wrap items-start gap-2"
    :data-test="`scalar-editor-${ptr}`"
    @submit.prevent="apply"
    @keydown.esc.prevent="$emit('done')"
  >
    <div class="min-w-48 flex-1">
      <Select
        v-if="isSelect"
        v-model="choice"
        :options="options"
        option-label="label"
        option-value="value"
        size="small"
        class="w-full"
        :aria-label="label"
        data-test="scalar-select"
      />
      <InputText
        v-else
        v-model="text"
        size="small"
        class="w-full font-mono"
        :placeholder="placeholder"
        :aria-label="label"
        data-test="scalar-input"
      />
      <p
        v-if="hint && !error"
        class="mt-1 text-xs text-gray-500 dark:text-slate-400"
        data-test="scalar-hint"
      >
        {{ hint }}
      </p>
      <p
        v-if="error"
        class="mt-1 text-xs text-red-600 dark:text-red-400"
        data-test="scalar-error"
      >
        {{ error }}
      </p>
    </div>
    <div class="flex flex-wrap gap-2">
      <PrimaryButton
        size="small"
        type="submit"
        :disabled="!!error"
        data-test="scalar-apply"
        >Apply</PrimaryButton
      >
      <SecondaryButton
        v-if="!isSelect && inOverlay"
        size="small"
        type="button"
        data-test="scalar-file-value"
        @click="fileValue"
        >Use file value</SecondaryButton
      >
      <SecondaryButton
        v-if="kind === 'cron'"
        size="small"
        type="button"
        data-test="scalar-agent-default"
        @click="agentDefault"
        >Agent default (every minute)</SecondaryButton
      >
      <SecondaryButton
        v-if="removable"
        size="small"
        type="button"
        data-test="scalar-remove"
        @click="removeKey"
        >Remove</SecondaryButton
      >
      <TertiaryButton
        size="small"
        type="button"
        data-test="scalar-cancel"
        @click="$emit('done')"
        >Cancel</TertiaryButton
      >
    </div>
  </form>
</template>

<script setup lang="ts">
// Small inline editor for one scalar field (R69). It edits a local value; Apply writes it to
// the pending-changes draft. R56 everywhere: "file value" omits the key, "agent default"
// (schedule) and protocol "Auto" write null.
import { computed, ref } from 'vue';
import InputText from '@/volt/InputText.vue';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import Select from '@/volt/Select.vue';
import TertiaryButton from '@/volt/TertiaryButton.vue';
import { REDACTED_MASK } from '@/types/agent-config';
import { useWorkspace } from '@/composables/agent-config/useConfigWorkspace';
import { getAt, hasAt } from '@/utils/agent-config/json-pointer';
import {
  describeCron5,
  GO_DURATION_RE,
  validateCron5,
} from '@/utils/agent-config/cron5';
import { VERBOSITY_OPTIONS } from '../constants';
import type { ScalarKind } from './scalar';

const props = defineProps<{
  ptr: string;
  kind: ScalarKind;
  label: string;
  removable?: boolean;
}>();
const emit = defineEmits<{ done: [] }>();

const ws = useWorkspace()!;
const draft = ws.draft;

const inOverlay = computed(() => hasAt(draft.overlay.value, props.ptr));
const overlayValue = getAt(draft.overlay.value, props.ptr);
const effectiveValue = getAt(draft.effectiveDraft.value, props.ptr);
const baseValue = getAt(ws.placeholderBase.value ?? {}, props.ptr);

// ---- text kinds ----
function initialText(): string {
  const v = typeof overlayValue === 'string' ? overlayValue : effectiveValue;
  // Never start from a masked report value (R25): the user types a new one.
  return typeof v === 'string' && v !== REDACTED_MASK ? v : '';
}
const text = ref(initialText());
const placeholder = computed(() => {
  if (effectiveValue === REDACTED_MASK) return 'masked; type a new value';
  if (props.kind === 'cron') return '* * * * *';
  if (props.kind === 'duration') return 'e.g. 5m';
  return typeof baseValue === 'string' ? baseValue : '';
});

// ---- select kinds ----
type Choice = string | number | boolean;
const FILE = '__file__';
const AUTO = '__auto__';
const options = computed<{ label: string; value: Choice }[]>(() => {
  switch (props.kind) {
    case 'bool':
      return [
        { label: 'Yes', value: true },
        { label: 'No', value: false },
        { label: 'File value', value: FILE },
      ];
    case 'verbosity':
      return [
        ...VERBOSITY_OPTIONS.map((o) => ({ label: o.label, value: o.value })),
        { label: 'File value', value: FILE },
      ];
    case 'protocol':
      return [
        { label: 'File value', value: FILE },
        { label: 'Auto', value: AUTO },
        { label: '1', value: 1 },
        { label: '2', value: 2 },
      ];
    default:
      return [];
  }
});
const isSelect = computed(() => options.value.length > 0);
function initialChoice(): Choice {
  if (!hasAt(draft.overlay.value, props.ptr)) {
    // A boolean shows its effective value so a click on Apply is meaningful.
    if (props.kind === 'bool' && typeof effectiveValue === 'boolean')
      return effectiveValue;
    return FILE;
  }
  if (overlayValue === null) return props.kind === 'protocol' ? AUTO : FILE;
  return overlayValue as Choice;
}
const startChoice = initialChoice();
const choice = ref<Choice>(startChoice);
const startText = text.value;

const error = computed(() => {
  if (isSelect.value) return '';
  const v = text.value.trim();
  if (v === REDACTED_MASK)
    return 'This is the masked report value; type the real value or use ${env:NAME}';
  if (!v) return '';
  if (props.kind === 'cron') {
    const e = validateCron5(v);
    return e ? `Invalid schedule: ${e}` : '';
  }
  if (props.kind === 'duration') {
    if (!GO_DURATION_RE.test(v))
      return 'Use a Go duration such as 30s, 5m or 1h';
    if (v.startsWith('-')) return 'The interval must not be negative';
  }
  return '';
});
const hint = computed(() => {
  if (props.kind === 'cron' && text.value.trim())
    return describeCron5(text.value.trim());
  if (!isSelect.value && !text.value.trim())
    return props.kind === 'text' && props.removable
      ? 'Empty: an empty string. Use "Remove" to delete the key.'
      : 'Empty: the file value applies.';
  return '';
});

function apply() {
  if (error.value) return;
  // An untouched field the overlay does not set: nothing to change (do not pin the file
  // value into the overlay).
  const untouched = isSelect.value
    ? choice.value === startChoice
    : text.value === startText;
  if (untouched && !inOverlay.value) {
    emit('done');
    return;
  }
  if (isSelect.value) {
    if (choice.value === FILE) draft.unset(props.ptr);
    else if (choice.value === AUTO) draft.remove(props.ptr);
    else draft.set(props.ptr, choice.value);
  } else {
    const v = props.kind === 'text' ? text.value : text.value.trim();
    // An empty text keeps an empty string only for overlay-only config/label keys.
    if (!v && !props.removable) draft.unset(props.ptr);
    else draft.set(props.ptr, v);
  }
  emit('done');
}
function fileValue() {
  draft.unset(props.ptr);
  emit('done');
}
function agentDefault() {
  draft.remove(props.ptr);
  emit('done');
}
function removeKey() {
  draft.makeAbsent(props.ptr);
  emit('done');
}
</script>
