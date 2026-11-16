<script setup lang="ts">
// Agent-wide flags on the Effective view; each is editable inline (R69).
import { computed } from 'vue';
import type { ConfigDoc, OverlayDoc } from '@/types/agent-config';
import { provenanceOf } from '@/utils/agent-config/provenance';
import { getAt } from '@/utils/agent-config/json-pointer';
import Text from '@/ds/components/Text/Text.vue';
import Grid from '@/ds/components/layout/Grid.vue';
import Panel from '@/ds/components/layout/Panel.vue';
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

<template>
  <Panel title="Flags" dense data-test="flags-summary">
    <Grid min="md" gap="3">
      <EditableField
        v-for="row in rows"
        :key="row.ptr"
        :ptr="row.ptr"
        :label="row.label"
        :kind="row.kind"
      >
        <template #label
          ><Text as="span" variant="secondary">{{ row.label }}</Text></template
        >
        <Text as="span">{{ row.value }}</Text>
        <ProvenanceBadge
          v-if="row.provenance !== 'file'"
          :provenance="row.provenance"
        />
      </EditableField>
    </Grid>
  </Panel>
</template>
