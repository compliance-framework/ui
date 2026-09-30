<template>
  <section
    class="space-y-3 rounded-md border border-ccf-300 p-4 dark:border-slate-700"
    data-test="flags-section"
  >
    <h4 class="text-sm font-semibold text-gray-900 dark:text-slate-200">
      Flags
    </h4>

    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div>
        <label class="form-label" for="cfg-verbosity">Verbosity</label>
        <div class="flex items-center gap-2">
          <Select
            input-id="cfg-verbosity"
            :model-value="verbosity"
            :options="verbosityOptions"
            option-label="label"
            option-value="value"
            :placeholder="verbosityPlaceholder"
            :disabled="disabled"
            class="w-48"
            size="small"
            data-test="verbosity"
            @update:model-value="setVerbosity"
          />
          <FieldHints
            ptr="/verbosity"
            :disabled="disabled"
            @reset="draft.unset('/verbosity')"
          />
        </div>
        <FieldIssues ptr="/verbosity" />
      </div>

      <div>
        <label class="form-label" for="cfg-interval">Evidence interval</label>
        <div class="flex items-center gap-2">
          <InputText
            id="cfg-interval"
            :model-value="
              (overlayValue('/agent_evidence/interval') as string) ?? ''
            "
            :placeholder="
              String(baseValue('/agent_evidence/interval') ?? 'file default')
            "
            :disabled="disabled"
            size="small"
            class="w-48"
            data-test="evidence-interval"
            @update:model-value="setText('/agent_evidence/interval', $event)"
          />
          <FieldHints
            ptr="/agent_evidence/interval"
            :disabled="disabled"
            @reset="draft.unset('/agent_evidence/interval')"
          />
        </div>
        <FieldIssues ptr="/agent_evidence/interval" />
      </div>

      <div v-for="b in bools" :key="b.ptr" class="flex items-center gap-2">
        <label
          class="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300"
        >
          <input
            type="checkbox"
            class="h-4 w-4 rounded border-ccf-300 dark:border-slate-700"
            :checked="effectiveValue(b.ptr) === true"
            :disabled="disabled"
            :data-test="b.test"
            @change="
              draft.set(b.ptr, ($event.target as HTMLInputElement).checked)
            "
          />
          {{ b.label }}
        </label>
        <FieldHints
          :ptr="b.ptr"
          :disabled="disabled"
          @reset="draft.unset(b.ptr)"
        />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import Select from '@/volt/Select.vue';
import InputText from '@/volt/InputText.vue';
import FieldHints from './FieldHints.vue';
import FieldIssues from './FieldIssues.vue';
import { useEditor } from './useEditor';
import { VERBOSITY_OPTIONS, verbosityLabel } from '../constants';

const { draft, policyOnly, overlayValue, baseValue, effectiveValue } =
  useEditor();

const disabled = computed(() => policyOnly.value);
const verbosityOptions = VERBOSITY_OPTIONS.map((o) => ({ ...o }));

const verbosity = computed(() => {
  const v = overlayValue('/verbosity');
  return typeof v === 'number' ? v : null;
});
// A base value outside 0–2 shows "Custom (n)" (read-only: the form only writes 0–2).
const verbosityPlaceholder = computed(
  () => `${verbosityLabel(baseValue('/verbosity'))} (file)`,
);

const bools = [
  {
    ptr: '/agent_evidence/enabled',
    label: 'Agent evidence enabled',
    test: 'evidence-enabled',
  },
  {
    ptr: '/agent_evidence/emit_on_run_completion',
    label: 'Emit on run completion',
    test: 'evidence-emit',
  },
];

function setVerbosity(v: number | null) {
  if (v === null || v === undefined) draft.unset('/verbosity');
  else draft.set('/verbosity', v);
}

/** Clearing a text input omits the key, so the field inherits the file value. */
function setText(ptr: string, v: string | undefined) {
  if (!v) draft.unset(ptr);
  else draft.set(ptr, v);
}
</script>

<style scoped>
@reference '@/assets/base.css';

.form-label {
  @apply mb-1 block text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-slate-400;
}
</style>
