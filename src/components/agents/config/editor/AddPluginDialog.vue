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
        <p
          v-else-if="sourceAccess"
          class="mt-1 flex items-start gap-1.5 text-xs"
          :class="ACCESS_CLASSES[sourceAccess.state]"
          role="status"
          :data-state="sourceAccess.state"
          data-test="add-plugin-access"
        >
          <i
            class="pi mt-0.5 text-xs"
            :class="ACCESS_ICONS[sourceAccess.state]"
          />
          <span>{{ accessText }}</span>
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
          :disabled="!valid || noneInstall"
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
const ACCESS_CLASSES: Record<FieldState, string> = {
  editable: 'text-gray-500 dark:text-slate-400',
  forbidden: 'text-red-600 dark:text-red-400',
  readonly: 'text-red-600 dark:text-red-400',
  restricted: 'text-amber-700 dark:text-amber-300',
};
const ACCESS_ICONS: Record<FieldState, string> = {
  editable: 'pi-check-circle',
  forbidden: 'pi-ban',
  readonly: 'pi-ban',
  restricted: 'pi-shield',
};

const valid = computed(
  () =>
    !!name.value &&
    !nameError.value &&
    !sourceError.value &&
    !scheduleError.value,
);

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

<style scoped>
@reference '@/assets/base.css';

.field-label {
  @apply mb-1 block text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-slate-400;
}
</style>
