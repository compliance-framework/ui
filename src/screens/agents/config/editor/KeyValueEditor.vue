<script setup lang="ts">
// Rows of string keys and values (a plugin's config or labels), each with its access notes,
// reset and delete, and a form that adds a key. A locked row (no reporting instance would apply
// it) shows its value as text, and its actions say why they're unavailable.
import { computed, ref } from 'vue';
import Button from '@/ds/components/Button/Button.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import IconButton from '@/ds/components/IconButton/IconButton.vue';
import InfoTip from '@/ds/components/InfoTip/InfoTip.vue';
import Text from '@/ds/components/Text/Text.vue';
import TextInput from '@/ds/components/TextInput/TextInput.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import { TOOLTIPS } from '@/config/tooltips';
import ProvenanceBadge from '../ProvenanceBadge.vue';
import type { Provenance } from '@/utils/agent-config/provenance';
import type { Shield } from './useEditor';

export interface KeyValueRow {
  key: string;
  value: string;
  placeholder?: string;
  provenance: Provenance;
  removed?: boolean;
  /** R71 read-only: no reporting instance would apply a change to this key. */
  locked?: boolean;
  lockTooltip?: string;
  /** R71 restricted: why some reporting instances would not apply it. */
  restricted?: string;
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

const KEY_WARNING = TOOLTIPS['agents.config.plugin.configKeyCase'];
const RESET_TOOLTIP = TOOLTIPS['agents.config.field.resetToFile'];

const newKey = ref('');
const newValue = ref('');

function keyWarning(key: string): boolean {
  return !!props.warnKeys && (key.includes('.') || key !== key.toLowerCase());
}

/** Why a row's actions are unavailable, or undefined when they're available. */
function blocked(row: KeyValueRow): string | undefined {
  if (row.locked)
    return row.lockTooltip ?? 'No reporting instance would apply it.';
  if (props.disabled) return "This configuration can't be edited.";
  return undefined;
}

// Keys are trimmed: "foo " is the key "foo". An empty or duplicate key is a blocking error.
const trimmedKey = computed(() => newKey.value.trim());
const addError = computed(() => {
  if (!newKey.value) return '';
  if (!trimmedKey.value) return 'The key is empty';
  if (props.rows.some((r) => r.key === trimmedKey.value && !r.removed))
    return 'Duplicate key';
  return '';
});
const addBlocked = computed(() => {
  if (addError.value) return 'Fix the key first.';
  if (!newKey.value) return 'Enter a key first.';
  return undefined;
});

function add() {
  if (addError.value || !trimmedKey.value) return;
  emit('add', trimmedKey.value, newValue.value);
  newKey.value = '';
  newValue.value = '';
}
</script>

<template>
  <Stack gap="3" :data-test="testId">
    <Cluster v-for="row in rows" :key="row.key" gap="2" :data-row="row.key">
      <Text as="code" variant="code" :title="row.key">{{ row.key }}</Text>
      <InfoTip
        v-if="row.locked"
        icon="locked"
        :text="row.lockTooltip ?? ''"
        data-test="kv-lock"
      />
      <InfoTip
        v-if="row.restricted && !row.shield"
        icon="warning"
        tone="warning"
        :text="row.restricted"
        data-test="kv-restricted"
      />
      <InfoTip
        v-if="row.shield"
        :icon="row.shield.level === 'forbidden' ? 'forbidden' : 'warning'"
        :tone="row.shield.level === 'forbidden' ? 'error' : 'warning'"
        :text="row.shield.tooltip"
        data-test="kv-shield"
      />
      <InfoTip
        v-if="keyWarning(row.key)"
        icon="warning"
        tone="warning"
        :text="KEY_WARNING"
        data-test="kv-key-warning"
      />
      <Cluster gap="1" as="span" data-test="kv-actions">
        <IconButton
          v-if="row.provenance !== 'file'"
          icon="undo"
          size="sm"
          :label="`${RESET_TOOLTIP}: ${row.key}`"
          :disabled-reason="blocked(row)"
          data-test="kv-reset"
          @click="$emit('reset', row.key)"
        />
        <IconButton
          v-if="!row.removed"
          icon="delete"
          size="sm"
          :label="`Delete ${row.key}`"
          :disabled-reason="blocked(row)"
          data-test="kv-delete"
          @click="$emit('delete', row.key)"
        />
      </Cluster>
      <Text
        v-if="blocked(row)"
        as="span"
        variant="secondary"
        data-test="kv-value-readonly"
        >{{ row.value || row.placeholder || '—' }}</Text
      >
      <TextInput
        v-else
        :model-value="row.value"
        :placeholder="
          row.removed ? 'removed by overlay' : row.placeholder || undefined
        "
        :label="`${label} ${row.key}`"
        @update:model-value="emit('set', row.key, $event ?? '')"
      />
      <ProvenanceBadge
        v-if="row.provenance !== 'file'"
        :provenance="row.provenance"
      />
    </Cluster>
    <Text v-if="!rows.length" variant="secondary">None.</Text>
    <form v-if="!disabled" @submit.prevent="add">
      <Cluster gap="2" align="end">
        <FormField :label="`New ${label} key`" :error="addError || undefined">
          <TextInput
            v-model="newKey"
            placeholder="key"
            data-test="kv-new-key"
          />
        </FormField>
        <FormField :label="`New ${label} value`">
          <TextInput
            v-model="newValue"
            placeholder="value"
            data-test="kv-new-value"
          />
        </FormField>
        <Button
          size="sm"
          type="submit"
          :disabled-reason="addBlocked"
          data-test="kv-add"
          >Add</Button
        >
      </Cluster>
    </form>
  </Stack>
</template>
