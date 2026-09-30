<template>
  <div class="space-y-2" :data-test="testId">
    <div
      v-for="row in rows"
      :key="row.key"
      class="flex flex-wrap items-center gap-2 rounded-md border border-ccf-300 px-2 py-1.5 dark:border-slate-700"
      :class="{ 'opacity-60': row.removed }"
      :data-row="row.key"
    >
      <span class="w-40 truncate font-mono text-xs" :title="row.key">{{
        row.key
      }}</span>
      <i
        v-if="row.locked"
        v-tooltip.top="row.lockTooltip"
        class="pi pi-lock text-xs text-gray-400"
        :aria-label="row.lockTooltip"
        data-test="kv-lock"
      />
      <i
        v-if="row.shield"
        v-tooltip.top="row.shield.tooltip"
        class="pi pi-shield text-xs"
        :class="
          row.shield.level === 'forbidden' ? 'text-red-600' : 'text-amber-600'
        "
        :aria-label="row.shield.tooltip"
        data-test="kv-shield"
      />
      <i
        v-if="keyWarning(row.key)"
        v-tooltip.top="KEY_WARNING"
        class="pi pi-exclamation-triangle text-xs text-amber-500"
        :aria-label="KEY_WARNING"
        data-test="kv-key-warning"
      />
      <InputText
        :model-value="row.value"
        :placeholder="
          row.removed ? 'removed by overlay' : (row.placeholder ?? '')
        "
        :disabled="disabled"
        size="small"
        class="min-w-40 flex-1"
        :aria-label="`${label} ${row.key}`"
        @update:model-value="$emit('set', row.key, $event ?? '')"
      />
      <ProvenanceBadge
        v-if="row.provenance !== 'file'"
        :provenance="row.provenance"
      />
      <button
        v-if="row.provenance !== 'file'"
        v-tooltip.top="'Reset to file value'"
        type="button"
        class="text-xs text-sky-700 disabled:opacity-40 dark:text-sky-300"
        :disabled="disabled"
        :aria-label="`Reset ${row.key}`"
        data-test="kv-reset"
        @click="$emit('reset', row.key)"
      >
        ↺
      </button>
      <button
        v-if="!row.removed"
        type="button"
        class="text-xs text-red-600 disabled:opacity-40 dark:text-red-400"
        :disabled="disabled"
        :aria-label="`Delete ${row.key}`"
        data-test="kv-delete"
        @click="$emit('delete', row.key)"
      >
        <i class="pi pi-trash" />
      </button>
    </div>
    <p v-if="!rows.length" class="text-xs text-gray-500 dark:text-slate-400">
      None.
    </p>
    <form
      v-if="!disabled"
      class="flex flex-wrap items-center gap-2"
      @submit.prevent="add"
    >
      <InputText
        v-model="newKey"
        size="small"
        placeholder="key"
        class="w-40"
        :aria-label="`New ${label} key`"
        data-test="kv-new-key"
      />
      <InputText
        v-model="newValue"
        size="small"
        placeholder="value"
        class="min-w-40 flex-1"
        :aria-label="`New ${label} value`"
        data-test="kv-new-value"
      />
      <SecondaryButton
        size="small"
        type="submit"
        :disabled="!!addError || !newKey"
        data-test="kv-add"
      >
        Add
      </SecondaryButton>
      <span v-if="addError" class="text-xs text-red-600 dark:text-red-400">{{
        addError
      }}</span>
    </form>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import InputText from '@/volt/InputText.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import ProvenanceBadge from '../ProvenanceBadge.vue';
import type { Provenance } from '@/utils/agent-config/provenance';
import type { Shield } from './useEditor';

export interface KeyValueRow {
  key: string;
  value: string;
  placeholder?: string;
  provenance: Provenance;
  removed?: boolean;
  locked?: boolean;
  lockTooltip?: string;
  shield?: Shield | null;
}

const props = defineProps<{
  rows: KeyValueRow[];
  label: string;
  disabled?: boolean;
  /** Warn on keys with dots or upper case (plugin config keys, R28). */
  warnKeys?: boolean;
  testId?: string;
}>();

const emit = defineEmits<{
  set: [key: string, value: string];
  reset: [key: string];
  delete: [key: string];
  add: [key: string, value: string];
}>();

const KEY_WARNING =
  "The agent lowercases and dot-splits keys that come from its file, and globs match case-sensitively; this key may not match the file's key";

const newKey = ref('');
const newValue = ref('');

function keyWarning(key: string): boolean {
  return !!props.warnKeys && (key.includes('.') || key !== key.toLowerCase());
}

// An empty or duplicate key is a blocking error.
const addError = computed(() => {
  if (!newKey.value) return '';
  if (!newKey.value.trim()) return 'The key is empty';
  if (props.rows.some((r) => r.key === newKey.value && !r.removed))
    return 'Duplicate key';
  return '';
});

function add() {
  if (addError.value || !newKey.value) return;
  emit('add', newKey.value, newValue.value);
  newKey.value = '';
  newValue.value = '';
}
</script>
