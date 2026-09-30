<template>
  <section class="space-y-2" data-test="bundles-summary">
    <h4 class="text-sm font-semibold text-gray-900 dark:text-slate-200">
      Policy bundles
    </h4>
    <p v-if="!rows.length" class="text-sm text-gray-500 dark:text-slate-400">
      No inline policy bundles.
    </p>
    <div
      v-for="row in rows"
      :id="`agent-bundle-${row.name}`"
      :key="row.name"
      class="rounded-md border border-ccf-300 p-3 text-sm dark:border-slate-700"
      :class="{ 'ring-2 ring-sky-400': highlight === row.name }"
    >
      <div class="flex flex-wrap items-center gap-2">
        <span class="font-mono font-semibold">{{ row.name }}</span>
        <ProvenanceBadge :provenance="row.provenance" />
        <span v-if="row.extends" class="text-gray-500 dark:text-slate-400">
          extends
          <span class="font-mono text-xs break-all">{{ row.extends }}</span>
        </span>
      </div>
      <p class="mt-1 text-xs text-gray-500 dark:text-slate-400">
        {{ row.modules }} module{{ row.modules === 1 ? '' : 's' }} ·
        {{ row.deleted }} deleted
        <template v-if="row.age"> · added {{ row.age }}</template>
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ConfigDoc, OverlayDoc } from '@/types/agent-config';
import { bundleProvenance } from '@/utils/agent-config/provenance';
import { formatRelative } from '@/utils/agent-config/display';
import ProvenanceBadge from './ProvenanceBadge.vue';

const props = defineProps<{
  effective: ConfigDoc | null;
  base: ConfigDoc | null;
  overlay: OverlayDoc | null;
  bundlesFirstSeen?: Record<string, string>;
  highlight?: string | null;
}>();

const rows = computed(() =>
  Object.entries(props.effective?.policy_bundles ?? {})
    .filter(([, b]) => b && typeof b === 'object')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, b]) => ({
      name,
      extends: b?.extends ?? null,
      modules: Object.keys(b?.modules ?? {}).length,
      deleted: (b?.delete ?? []).length,
      provenance: bundleProvenance(name, props.base ?? {}, props.overlay ?? {}),
      age: formatRelative(props.bundlesFirstSeen?.[name]),
    })),
);
</script>
