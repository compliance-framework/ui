<template>
  <section
    class="rounded-md border border-ccf-300 p-4 dark:border-slate-700"
    data-test="flags-summary"
  >
    <h4 class="mb-3 text-sm font-semibold text-gray-900 dark:text-slate-200">
      Flags
    </h4>
    <div class="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
      <EditableField
        v-for="row in rows"
        :key="row.ptr"
        :ptr="row.ptr"
        :label="row.label"
        :kind="row.kind"
      >
        <template #label
          ><span class="text-gray-500 dark:text-slate-400">{{
            row.label
          }}</span></template
        >
        <span class="text-gray-900 dark:text-slate-200">{{ row.value }}</span>
        <ProvenanceBadge
          v-if="row.provenance !== 'file'"
          :provenance="row.provenance"
        />
      </EditableField>
    </div>
  </section>
</template>

<script setup lang="ts">
// Agent-wide flags on the Effective view; each is editable inline (R69).
import { computed } from 'vue';
import type { ConfigDoc, OverlayDoc } from '@/types/agent-config';
import { provenanceOf } from '@/utils/agent-config/provenance';
import { getAt } from '@/utils/agent-config/json-pointer';
import ProvenanceBadge from './ProvenanceBadge.vue';
import EditableField from './effective/EditableField.vue';
import type { ScalarKind } from './effective/scalar';
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
    kind: ScalarKind;
    format?: (v: unknown) => string;
  }[] = [
    {
      ptr: '/verbosity',
      label: 'Verbosity',
      kind: 'verbosity',
      format: verbosityLabel,
    },
    { ptr: '/agent_evidence/enabled', label: 'Agent evidence', kind: 'bool' },
    {
      ptr: '/agent_evidence/emit_on_run_completion',
      label: 'Emit on run completion',
      kind: 'bool',
    },
    {
      ptr: '/agent_evidence/interval',
      label: 'Evidence interval',
      kind: 'duration',
    },
  ];
  return defs.map((d) => ({
    ...d,
    value: (d.format ?? show)(getAt(eff, d.ptr)),
    provenance: provenanceOf(d.ptr, props.base ?? {}, props.overlay ?? {}),
  }));
});
</script>
