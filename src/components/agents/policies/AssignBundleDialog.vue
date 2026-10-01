<template>
  <Dialog
    :visible="visible"
    modal
    :header="`Assign ${bundle} to plugins`"
    class="w-full max-w-xl"
    data-test="assign-dialog"
    @update:visible="$emit('update:visible', $event)"
  >
    <form class="space-y-4" @submit.prevent="submit">
      <PluginAssignmentRows
        v-model="assignments"
        :plugins="plugins"
        :source="source"
        :bundle="bundle"
      />
      <div class="flex justify-end gap-2">
        <TertiaryButton type="button" @click="$emit('update:visible', false)"
          >Cancel</TertiaryButton
        >
        <PrimaryButton
          type="submit"
          :disabled="!changed"
          data-test="assign-apply"
          >Apply</PrimaryButton
        >
      </div>
    </form>
  </Dialog>
</template>

<script setup lang="ts">
// R66: assign an existing bundle to plugins; swap-by-default for plugins that load the
// source the bundle extends.
import { computed, ref, watch } from 'vue';
import Dialog from '@/volt/Dialog.vue';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import TertiaryButton from '@/volt/TertiaryButton.vue';
import type { AssignMode } from '../config/editor/useBundleOps';
import PluginAssignmentRows, {
  type AssignmentPlugin,
  type Assignments,
} from './PluginAssignmentRows.vue';

const props = defineProps<{
  visible: boolean;
  bundle: string;
  source: string | null;
  plugins: AssignmentPlugin[];
}>();
const emit = defineEmits<{
  'update:visible': [v: boolean];
  apply: [changes: { plugin: string; assign: boolean; mode: AssignMode }[]];
}>();

const assignments = ref<Assignments>({});
function initial(): Assignments {
  return Object.fromEntries(
    props.plugins.map((p) => [
      p.name,
      { assigned: p.assigned, mode: 'replace' },
    ]),
  );
}
watch(
  () => props.visible,
  (v) => {
    if (v) assignments.value = initial();
  },
  { immediate: true },
);

const changes = computed(() =>
  props.plugins
    .filter(
      (p) => (assignments.value[p.name]?.assigned ?? false) !== p.assigned,
    )
    .map((p) => ({
      plugin: p.name,
      assign: !p.assigned,
      mode: assignments.value[p.name]?.mode ?? ('replace' as AssignMode),
    })),
);
const changed = computed(() => changes.value.length > 0);

function submit() {
  if (!changed.value) return;
  emit('apply', changes.value);
  emit('update:visible', false);
}
</script>
