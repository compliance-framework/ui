<template>
  <fieldset class="space-y-2" data-test="assignment-rows">
    <legend
      class="mb-1 text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-slate-400"
    >
      Assign to plugins
    </legend>
    <p v-if="!plugins.length" class="text-xs text-gray-500">
      This agent has no plugins.
    </p>
    <div
      v-for="p in plugins"
      :key="p.name"
      class="rounded-md border border-ccf-300 px-2 py-1.5 text-sm dark:border-slate-700"
      :data-test="`assign-${p.name}`"
    >
      <label class="flex items-center gap-2">
        <input
          type="checkbox"
          class="h-4 w-4"
          :checked="model[p.name]?.assigned ?? false"
          :data-test="`assign-check-${p.name}`"
          @change="
            setAssigned(p.name, ($event.target as HTMLInputElement).checked)
          "
        />
        <span class="font-mono">{{ p.name }}</span>
        <span
          v-if="p.usesSource && source"
          class="text-xs text-gray-500 dark:text-slate-400"
          >loads {{ source }}</span
        >
      </label>
      <div
        v-if="model[p.name]?.assigned && p.usesSource && source && !p.assigned"
        class="mt-1 ml-6 space-y-1 text-xs"
      >
        <label class="flex items-start gap-2">
          <input
            type="radio"
            :name="`mode-${p.name}`"
            value="replace"
            :checked="model[p.name].mode === 'replace'"
            :data-test="`assign-replace-${p.name}`"
            @change="setMode(p.name, 'replace')"
          />
          <span
            >Replace <code class="font-mono">{{ source }}</code> with
            <code class="font-mono">inline:{{ bundle || '…' }}</code> at the
            same position (recommended)</span
          >
        </label>
        <label class="flex items-start gap-2">
          <input
            type="radio"
            :name="`mode-${p.name}`"
            value="alongside"
            :checked="model[p.name].mode === 'alongside'"
            :data-test="`assign-alongside-${p.name}`"
            @change="setMode(p.name, 'alongside')"
          />
          <span>Add it alongside the source</span>
        </label>
        <p
          v-if="model[p.name].mode === 'alongside'"
          class="text-amber-700 dark:text-amber-300"
          :data-test="`duplicate-warning-${p.name}`"
        >
          <i class="pi pi-exclamation-triangle mr-1" />Both
          <code class="font-mono">{{ source }}</code> and the bundle define the
          same packages: {{ p.name }} would evaluate each of them twice and
          produce duplicate evidence.
        </p>
      </div>
      <p
        v-if="p.assigned && !model[p.name]?.assigned"
        class="mt-1 ml-6 text-xs text-gray-500 dark:text-slate-400"
      >
        Unassigning
        <template v-if="source && !p.usesSource"
          >puts <code class="font-mono">{{ source }}</code> back in its
          place.</template
        ><template v-else>removes the reference.</template>
      </p>
    </div>
  </fieldset>
</template>

<script setup lang="ts">
// Per-plugin assignment of a bundle (R66). For a bundle that extends S and a plugin that
// loads S, the default is to REPLACE S at the same index (the R22 swap, allowed for
// policy-only users); adding alongside is an explicit choice with a duplicate-evidence
// warning.
import type { AssignMode } from '../config/editor/useBundleOps';

export interface AssignmentPlugin {
  name: string;
  /** The plugin loads the bundle's extends source directly. */
  usesSource: boolean;
  /** inline:<bundle> is already in the plugin's policies. */
  assigned: boolean;
}

export type Assignments = Record<
  string,
  { assigned: boolean; mode: AssignMode }
>;

defineProps<{
  plugins: AssignmentPlugin[];
  /** The source the bundle extends, if any. */
  source: string | null;
  bundle: string;
}>();
const model = defineModel<Assignments>({ required: true });

function setAssigned(plugin: string, assigned: boolean) {
  model.value = {
    ...model.value,
    [plugin]: { mode: model.value[plugin]?.mode ?? 'replace', assigned },
  };
}
function setMode(plugin: string, mode: AssignMode) {
  model.value = {
    ...model.value,
    [plugin]: { assigned: model.value[plugin]?.assigned ?? true, mode },
  };
}
</script>
