<template>
  <div
    class="flex flex-wrap items-center gap-2 text-xs"
    :data-test="`wiring-${bundle}`"
  >
    <span class="text-gray-500 dark:text-slate-400">Used by</span>
    <span v-if="!plugins.length" class="text-gray-400">no plugins</span>
    <button
      v-for="p in plugins"
      :key="p"
      type="button"
      class="rounded-full border px-2 py-0.5 font-mono"
      :class="
        isOn(p)
          ? 'border-sky-500 bg-sky-50 text-sky-700 dark:border-sky-400 dark:bg-sky-500/10 dark:text-sky-300'
          : 'border-ccf-300 text-gray-500 dark:border-slate-700 dark:text-slate-400'
      "
      :aria-pressed="isOn(p)"
      :data-test="`wire-${p}`"
      @click="ops.wire(p, bundle, !isOn(p))"
    >
      <i
        :class="isOn(p) ? 'pi pi-check' : 'pi pi-plus'"
        class="mr-1 text-[0.6rem]"
      />{{ p }}
    </button>
  </div>
</template>

<script setup lang="ts">
import type { BundleOps } from './useBundleOps';

const props = defineProps<{
  bundle: string;
  plugins: string[];
  ops: BundleOps;
}>();

function isOn(p: string): boolean {
  return props.ops.effectivePolicies(p).includes(`inline:${props.bundle}`);
}
</script>
