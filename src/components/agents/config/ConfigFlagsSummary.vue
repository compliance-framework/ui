<template>
  <section
    class="rounded-md border border-ccf-300 p-4 dark:border-slate-700"
    data-test="flags-summary"
  >
    <h4 class="mb-3 text-sm font-semibold text-gray-900 dark:text-slate-200">
      Flags
    </h4>
    <dl class="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
      <div v-for="row in rows" :key="row.ptr" class="flex items-center gap-2">
        <dt class="text-gray-500 dark:text-slate-400">{{ row.label }}</dt>
        <dd class="text-gray-900 dark:text-slate-200">{{ row.value }}</dd>
        <ProvenanceBadge
          v-if="row.provenance !== 'file'"
          :provenance="row.provenance"
        />
      </div>
    </dl>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ConfigDoc, OverlayDoc } from '@/types/agent-config';
import { provenanceOf } from '@/utils/agent-config/provenance';
import { getAt } from '@/utils/agent-config/json-pointer';
import ProvenanceBadge from './ProvenanceBadge.vue';
import { verbosityLabel } from './constants';

const props = defineProps<{
  effective: ConfigDoc | null;
  base: ConfigDoc | null;
  overlay: OverlayDoc | null;
}>();

const rows = computed(() => {
  const eff = props.effective ?? {};
  const show = (v: unknown) =>
    v === undefined || v === null ? '—' : String(v);
  const defs: {
    ptr: string;
    label: string;
    format?: (v: unknown) => string;
  }[] = [
    { ptr: '/verbosity', label: 'Verbosity', format: verbosityLabel },
    { ptr: '/agent_evidence/enabled', label: 'Agent evidence' },
    {
      ptr: '/agent_evidence/emit_on_run_completion',
      label: 'Emit on run completion',
    },
    { ptr: '/agent_evidence/interval', label: 'Evidence interval' },
  ];
  return defs.map((d) => ({
    ...d,
    value: (d.format ?? show)(getAt(eff, d.ptr)),
    provenance: provenanceOf(d.ptr, props.base ?? {}, props.overlay ?? {}),
  }));
});
</script>
