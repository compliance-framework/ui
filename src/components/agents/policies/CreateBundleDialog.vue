<template>
  <Dialog
    :visible="visible"
    modal
    header="Create a policy bundle"
    class="w-full max-w-xl"
    data-test="create-bundle-dialog"
    @update:visible="$emit('update:visible', $event)"
  >
    <form
      class="space-y-4"
      data-test="create-bundle-form"
      @submit.prevent="submit"
    >
      <fieldset class="space-y-2">
        <legend class="field-label">Start from</legend>
        <label class="flex items-start gap-2 text-sm">
          <input
            v-model="start"
            type="radio"
            value="source"
            :disabled="!sources.length"
            data-test="start-source"
          />
          <span class="flex-1">
            A source this agent's plugins use
            <select
              v-if="start === 'source'"
              v-model="source"
              class="form-select mt-1 font-mono"
              aria-label="Source to extend"
              data-test="cb-source"
            >
              <option v-for="s in sources" :key="s.source" :value="s.source">
                {{ s.source }} (used by {{ s.plugins.join(', ') }})
              </option>
            </select>
          </span>
        </label>
        <label class="flex items-start gap-2 text-sm">
          <input
            v-model="start"
            type="radio"
            value="other"
            data-test="start-other"
          />
          <span class="flex-1">
            Another source
            <InputText
              v-if="start === 'other'"
              v-model="otherSource"
              size="small"
              class="mt-1 w-full font-mono"
              placeholder="ghcr.io/org/policies:v1"
              aria-label="Source to extend"
              data-test="cb-other"
            />
            <span
              v-if="start === 'other' && otherError"
              class="mt-1 block text-xs text-red-600"
              >{{ otherError }}</span
            >
            <span
              v-else-if="start === 'other' && otherNeedsConfigure"
              class="mt-1 block text-xs text-amber-700 dark:text-amber-300"
              data-test="cb-r58"
            >
              Your role can only extend a source this agent already uses; saving
              a new source needs agent:configure.
            </span>
          </span>
        </label>
        <label class="flex items-start gap-2 text-sm">
          <input
            v-model="start"
            type="radio"
            value="scratch"
            data-test="start-scratch"
          />
          <span>From scratch (one module from the policy template)</span>
        </label>
      </fieldset>

      <div>
        <label class="field-label" for="cb-name">Bundle name</label>
        <InputText
          id="cb-name"
          v-model="name"
          size="small"
          class="w-full font-mono"
          data-test="cb-name"
        />
        <p v-if="name && nameError" class="mt-1 text-xs text-red-600">
          {{ nameError }}
        </p>
      </div>

      <PluginAssignmentRows
        v-model="assignments"
        :plugins="assignmentPlugins"
        :source="extendsSource"
        :bundle="name"
      />

      <div class="flex justify-end gap-2 pt-2">
        <TertiaryButton type="button" @click="$emit('update:visible', false)"
          >Cancel</TertiaryButton
        >
        <PrimaryButton type="submit" :disabled="!valid" data-test="cb-submit"
          >Create</PrimaryButton
        >
      </div>
    </form>
  </Dialog>
</template>

<script setup lang="ts">
// R68: create a bundle that extends a source plugins already use (the common case: tune a
// vendor bundle), another source, or from scratch; and assign it to plugins (R66 swap by
// default).
import { computed, ref, watch } from 'vue';
import Dialog from '@/volt/Dialog.vue';
import InputText from '@/volt/InputText.vue';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import TertiaryButton from '@/volt/TertiaryButton.vue';
import { NAME_RE, isInlineSource } from '@/utils/agent-config/validation';
import {
  bundleNameForSource,
  sanitizeBundleName,
  uniqueName,
  type AssignMode,
} from '../config/editor/useBundleOps';
import PluginAssignmentRows, {
  type AssignmentPlugin,
  type Assignments,
} from './PluginAssignmentRows.vue';

const props = defineProps<{
  visible: boolean;
  /** Non-inline sources plugins load, with the plugins loading each. */
  sources: { source: string; plugins: string[] }[];
  plugins: string[];
  taken: Set<string>;
  /** Preselected source (e.g. from the "Sources plugins use" list). */
  initialSource?: string | null;
  /** Policy-only users (R58) may only extend already-used sources. */
  policyOnly?: boolean;
  usedSources?: Set<string>;
  /** R79: per plugin, why it cannot get inline policies / a support warning. */
  inlineGate?: (plugin: string) => {
    blocked: string | null;
    warning: string | null;
  };
}>();
const emit = defineEmits<{
  'update:visible': [v: boolean];
  create: [
    b: {
      name: string;
      extends?: string;
      assignments: { plugin: string; mode: AssignMode }[];
    },
  ];
}>();

type Start = 'source' | 'other' | 'scratch';
const start = ref<Start>('source');
const source = ref('');
const otherSource = ref('');
const name = ref('');
const assignments = ref<Assignments>({});
let nameTouched = false;

const extendsSource = computed<string | null>(() => {
  if (start.value === 'source') return source.value || null;
  if (start.value === 'other') return otherSource.value.trim() || null;
  return null;
});

function defaultAssignments(): Assignments {
  const ext = extendsSource.value;
  const out: Assignments = {};
  for (const p of props.plugins) {
    const uses = !!ext && usersOf(ext).includes(p);
    out[p] = {
      assigned: uses && !props.inlineGate?.(p).blocked,
      mode: 'replace',
    };
  }
  return out;
}
function usersOf(src: string): string[] {
  return props.sources.find((s) => s.source === src)?.plugins ?? [];
}
function defaultName(): string {
  const ext = extendsSource.value;
  return ext
    ? bundleNameForSource(ext, props.taken)
    : uniqueName(sanitizeBundleName('policies'), props.taken);
}

watch(
  () => props.visible,
  (v) => {
    if (!v) return;
    nameTouched = false;
    otherSource.value = '';
    if (
      props.initialSource &&
      props.sources.some((s) => s.source === props.initialSource)
    ) {
      start.value = 'source';
      source.value = props.initialSource;
    } else if (props.sources.length) {
      start.value = 'source';
      source.value = props.sources[0].source;
    } else {
      start.value = 'scratch';
      source.value = '';
    }
    name.value = defaultName();
    assignments.value = defaultAssignments();
  },
  { immediate: true },
);
watch(extendsSource, () => {
  if (!props.visible) return;
  if (!nameTouched) name.value = defaultName();
  assignments.value = defaultAssignments();
});
watch(name, (n, old) => {
  if (old !== undefined && n !== defaultName()) nameTouched = true;
});

const assignmentPlugins = computed<AssignmentPlugin[]>(() =>
  props.plugins.map((p) => ({
    name: p,
    usesSource:
      !!extendsSource.value && usersOf(extendsSource.value).includes(p),
    assigned: false,
    inlineBlocked: props.inlineGate?.(p).blocked ?? null,
    inlineWarning: props.inlineGate?.(p).warning ?? null,
  })),
);

const nameError = computed(() => {
  if (!NAME_RE.test(name.value))
    return 'Use lowercase letters, digits, "_" and "-" (max 63)';
  if (props.taken.has(name.value)) return 'A bundle with this name exists';
  return '';
});
const otherError = computed(() => {
  const v = otherSource.value.trim();
  if (!v) return 'Enter an OCI reference or path';
  return isInlineSource(v)
    ? 'A bundle cannot extend another inline bundle'
    : '';
});
const otherNeedsConfigure = computed(
  () =>
    !!props.policyOnly &&
    !!otherSource.value.trim() &&
    !(props.usedSources?.has(otherSource.value.trim()) ?? false),
);
const valid = computed(
  () =>
    !!name.value &&
    !nameError.value &&
    (start.value !== 'source' || !!source.value) &&
    (start.value !== 'other' || !otherError.value),
);

function submit() {
  if (!valid.value) return;
  emit('create', {
    name: name.value,
    ...(extendsSource.value ? { extends: extendsSource.value } : {}),
    assignments: Object.entries(assignments.value)
      .filter(([p, a]) => a.assigned && !props.inlineGate?.(p).blocked)
      .map(([plugin, a]) => ({ plugin, mode: a.mode })),
  });
  emit('update:visible', false);
}
</script>

<style scoped>
@reference '@/assets/base.css';

.field-label {
  @apply mb-1 block text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-slate-400;
}

.form-select {
  @apply w-full rounded-md border border-gray-300 px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800;
}
</style>
