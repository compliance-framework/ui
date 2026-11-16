<script setup lang="ts">
// Adds a plugin to the pending changes: name, source and an optional schedule, with whether the
// reporting instances would install it from that source (R71).
import { computed, ref, useId, watch } from 'vue';
import Button from '@/ds/components/Button/Button.vue';
import Dialog from '@/ds/components/Dialog/Dialog.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import InlineMessage from '@/ds/components/InlineMessage/InlineMessage.vue';
import type { MessageTone } from '@/ds/components/InlineMessage/tone';
import TextInput from '@/ds/components/TextInput/TextInput.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import { NAME_RE } from '@/utils/agent-config/validation';
import { describeCron5, validateCron5 } from '@/utils/agent-config/cron5';
import {
  addPluginTooltip,
  type FieldState,
} from '@/utils/agent-config/field-access';
import { useWorkspace } from '@/composables/agent-config/useConfigWorkspace';

const props = defineProps<{ visible: boolean; existing: string[] }>();
const emit = defineEmits<{
  'update:visible': [v: boolean];
  add: [plugin: { name: string; source: string; schedule?: string }];
}>();

const formId = `add-plugin-${useId()}`;
const open = computed({
  get: () => props.visible,
  set: (v: boolean) => emit('update:visible', v),
});

const name = ref('');
const source = ref('');
const schedule = ref('');

watch(
  () => props.visible,
  (v) => {
    if (v) {
      name.value = '';
      source.value = '';
      schedule.value = '';
    }
  },
);

const nameError = computed(() => {
  if (!NAME_RE.test(name.value)) {
    return 'Use lowercase letters, digits, "_" and "-" (starting with a letter or digit, max 63)';
  }
  if (props.existing.includes(name.value))
    return 'A plugin with this name exists';
  return '';
});
const sourceError = computed(() => {
  if (!source.value.trim()) return 'A source is required';
  return '';
});
const scheduleError = computed(() =>
  schedule.value ? validateCron5(schedule.value) : null,
);
// R71 with the concrete source: would the reporting instances install this plugin?
const ws = useWorkspace();
const sourceAccess = computed(() => {
  const src = source.value.trim();
  return ws && src ? ws.addPluginAccess(src) : null;
});
/** No reporting instance would install it: adding it is blocked, as for read-only fields. */
const noneInstall = computed(() => sourceAccess.value?.state === 'readonly');
const accessText = computed(() => {
  const a = sourceAccess.value;
  if (!a) return '';
  if (!a.total) {
    return 'No instance has a fresh report: each instance installs it according to its own remote_config when it reports.';
  }
  if (a.state === 'editable') {
    return `All ${a.total} reporting instance${a.total === 1 ? '' : 's'} would install it.`;
  }
  return addPluginTooltip(a, source.value.trim());
});
const ACCESS_TONES: Record<FieldState, MessageTone> = {
  editable: 'success',
  forbidden: 'error',
  readonly: 'error',
  restricted: 'warning',
};

const valid = computed(
  () =>
    !!name.value &&
    !nameError.value &&
    !sourceError.value &&
    !scheduleError.value,
);
const submitBlocked = computed(() => {
  if (!name.value || !source.value.trim())
    return 'Enter a name and a source first.';
  if (!valid.value) return 'Fix the fields above first.';
  if (noneInstall.value)
    return 'No reporting instance would install this plugin.';
  return undefined;
});

function submit() {
  if (!valid.value || noneInstall.value) return;
  emit('add', {
    name: name.value,
    source: source.value.trim(),
    ...(schedule.value ? { schedule: schedule.value.trim() } : {}),
  });
  emit('update:visible', false);
}
</script>

<template>
  <Dialog v-model:open="open" title="Add plugin" size="s">
    <form :id="formId" data-test="add-plugin-form" @submit.prevent="submit">
      <Stack gap="4">
        <FormField
          label="Name"
          :error="name && nameError ? nameError : undefined"
          required
        >
          <TextInput v-model="name" data-test="add-plugin-name" />
        </FormField>
        <Stack gap="2">
          <FormField
            label="Source"
            :error="source && sourceError ? sourceError : undefined"
            required
          >
            <TextInput
              v-model="source"
              placeholder="ghcr.io/org/plugin:v1"
              data-test="add-plugin-source"
            />
          </FormField>
          <InlineMessage
            v-if="!sourceError && sourceAccess"
            :tone="ACCESS_TONES[sourceAccess.state]"
            :data-state="sourceAccess.state"
            data-test="add-plugin-access"
            >{{ accessText }}</InlineMessage
          >
        </Stack>
        <FormField
          label="Schedule (optional)"
          :error="scheduleError || undefined"
          :hint="
            !scheduleError && schedule ? describeCron5(schedule) : undefined
          "
        >
          <TextInput
            v-model="schedule"
            placeholder="*/5 * * * *"
            data-test="add-plugin-schedule"
          />
        </FormField>
      </Stack>
    </form>
    <template #footer="{ requestClose }">
      <Button variant="tertiary" @click="requestClose">Cancel</Button>
      <Button
        variant="primary"
        type="submit"
        :form="formId"
        :disabled-reason="submitBlocked"
        data-test="add-plugin-submit"
        >Add plugin</Button
      >
    </template>
  </Dialog>
</template>
