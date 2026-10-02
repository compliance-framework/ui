<template>
  <Dialog
    :visible="visible"
    modal
    header="Add plugin"
    class="w-full max-w-lg"
    @update:visible="$emit('update:visible', $event)"
  >
    <form
      class="space-y-3"
      data-test="add-plugin-form"
      @submit.prevent="submit"
    >
      <div>
        <label class="field-label" for="add-plugin-name">Name</label>
        <InputText
          id="add-plugin-name"
          v-model="name"
          size="small"
          class="w-full font-mono"
          data-test="add-plugin-name"
        />
        <p
          v-if="name && nameError"
          class="mt-1 text-xs text-red-600 dark:text-red-400"
        >
          {{ nameError }}
        </p>
      </div>
      <div>
        <label class="field-label" for="add-plugin-source">Source</label>
        <InputText
          id="add-plugin-source"
          v-model="source"
          size="small"
          class="w-full font-mono"
          placeholder="ghcr.io/org/plugin:v1"
          data-test="add-plugin-source"
        />
        <p
          v-if="source && sourceError"
          class="mt-1 text-xs text-red-600 dark:text-red-400"
        >
          {{ sourceError }}
        </p>
      </div>
      <div>
        <label class="field-label" for="add-plugin-schedule"
          >Schedule (optional)</label
        >
        <InputText
          id="add-plugin-schedule"
          v-model="schedule"
          size="small"
          class="w-full font-mono"
          placeholder="*/5 * * * *"
          data-test="add-plugin-schedule"
        />
        <p
          v-if="scheduleError"
          class="mt-1 text-xs text-red-600 dark:text-red-400"
        >
          {{ scheduleError }}
        </p>
        <p v-else-if="schedule" class="mt-1 text-xs text-gray-500">
          {{ describeCron5(schedule) }}
        </p>
      </div>
      <div class="flex justify-end gap-2 pt-2">
        <TertiaryButton type="button" @click="$emit('update:visible', false)"
          >Cancel</TertiaryButton
        >
        <PrimaryButton
          type="submit"
          :disabled="!valid"
          data-test="add-plugin-submit"
          >Add plugin</PrimaryButton
        >
      </div>
    </form>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import Dialog from '@/volt/Dialog.vue';
import InputText from '@/volt/InputText.vue';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import TertiaryButton from '@/volt/TertiaryButton.vue';
import { NAME_RE } from '@/utils/agent-config/validation';
import { describeCron5, validateCron5 } from '@/utils/agent-config/cron5';

const props = defineProps<{ visible: boolean; existing: string[] }>();
const emit = defineEmits<{
  'update:visible': [v: boolean];
  add: [plugin: { name: string; source: string; schedule?: string }];
}>();

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
const valid = computed(
  () =>
    !!name.value &&
    !nameError.value &&
    !sourceError.value &&
    !scheduleError.value,
);

function submit() {
  if (!valid.value) return;
  emit('add', {
    name: name.value,
    source: source.value.trim(),
    ...(schedule.value ? { schedule: schedule.value.trim() } : {}),
  });
  emit('update:visible', false);
}
</script>

<style scoped>
@reference '@/assets/base.css';

.field-label {
  @apply mb-1 block text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-slate-400;
}
</style>
