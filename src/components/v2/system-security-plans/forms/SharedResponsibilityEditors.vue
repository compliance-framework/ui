<script setup lang="ts">
// Shared responsibility (export, inherited, satisfied) for an existing
// statement-level by-component. The by-component PUT ignores these subtrees,
// so each part saves through its own endpoint via main's editors, which also
// enforce the leverage bookkeeping (backlog M0-01). The editors are V1-styled;
// restyling them is a follow-up (M1-05).
import { ref, watch } from 'vue';
import type { ByComponent, ImplementedRequirement, Statement } from '@/oscal';
import type { DataResponse } from '@/stores/types';
import type { UpstreamResponsibility } from '@/types/ssp-export-offerings';
import type { LeveragedControl } from '@/types/ssp-leverage';
import { useAuthenticatedInstance } from '@/composables/axios';
import { latestRequest } from '@/utils/latest-request';
import ByComponentExportEditor from '@/components/system-security-plans/ByComponentExportEditor.vue';
import ByComponentInheritedEditor from '@/components/system-security-plans/ByComponentInheritedEditor.vue';
import ByComponentSatisfiedEditor from '@/components/system-security-plans/ByComponentSatisfiedEditor.vue';

const props = defineProps<{
  sspId: string;
  requirement: ImplementedRequirement;
  statement: Statement;
  byComponentId: string;
}>();

const exportBlock = defineModel<ByComponent['export']>('export');
const inherited = defineModel<ByComponent['inherited']>('inherited');
const satisfied = defineModel<ByComponent['satisfied']>('satisfied');

const axiosInstance = useAuthenticatedInstance();

// Ported from main's ByComponentEditForm: a satisfied entry may only reference
// a responsibility from an export this statement inherits (anything else is a
// 400), so the picker's options come from the leveraged-controls projection,
// narrowed to this statement. Labels use the full set, including satisfied ones.
const satisfiableResponsibilities = ref<UpstreamResponsibility[]>([]);
const knownResponsibilities = ref<UpstreamResponsibility[]>([]);
const satisfiableLoadFailed = ref(false);
const satisfiableGate = latestRequest();

const normalizeId = (value: string | undefined) =>
  (value ?? '').trim().toLowerCase();

async function loadSatisfiableResponsibilities(): Promise<void> {
  const token = satisfiableGate.begin();
  const targetControlId = normalizeId(props.requirement.controlId);
  const targetStatementId = normalizeId(props.statement.statementId);
  try {
    const response = await axiosInstance.get<DataResponse<LeveragedControl[]>>(
      `/api/oscal/system-security-plans/${props.sspId}/leveraged-controls`,
    );
    const outstanding = new Map<string, UpstreamResponsibility>();
    const known = new Map<string, UpstreamResponsibility>();
    for (const control of response.data.data ?? []) {
      if (normalizeId(control.controlId) !== targetControlId) continue;
      if (normalizeId(control.statementId) !== targetStatementId) continue;
      for (const responsibility of control.outstandingResponsibilities ?? []) {
        outstanding.set(responsibility.responsibilityUuid, responsibility);
      }
      for (const responsibility of control.responsibilities ??
        control.outstandingResponsibilities ??
        []) {
        known.set(responsibility.responsibilityUuid, responsibility);
      }
    }
    if (satisfiableGate.isStale(token)) return;
    satisfiableResponsibilities.value = [...outstanding.values()];
    knownResponsibilities.value = [...known.values()];
    satisfiableLoadFailed.value = false;
  } catch {
    if (satisfiableGate.isStale(token)) return;
    satisfiableResponsibilities.value = [];
    knownResponsibilities.value = [];
    satisfiableLoadFailed.value = true;
  }
}

// Inheriting a capability is what makes its responsibilities satisfiable.
watch(inherited, () => void loadSatisfiableResponsibilities(), {
  immediate: true,
});
</script>

<template>
  <div class="space-y-3">
    <div
      class="border border-[var(--ui-v2-border)] bg-[var(--ui-v2-background)] p-3"
    >
      <ByComponentExportEditor
        v-model="exportBlock"
        :ssp-id="sspId"
        :req-id="requirement.uuid"
        :stmt-id="statement.uuid"
        :by-component-id="byComponentId"
      />
    </div>
    <div
      class="border border-[var(--ui-v2-border)] bg-[var(--ui-v2-background)] p-3"
    >
      <ByComponentInheritedEditor
        v-model="inherited"
        :ssp-id="sspId"
        :req-id="requirement.uuid"
        :stmt-id="statement.uuid"
        :by-component-id="byComponentId"
      />
    </div>
    <div
      class="border border-[var(--ui-v2-border)] bg-[var(--ui-v2-background)] p-3"
    >
      <ByComponentSatisfiedEditor
        v-model="satisfied"
        :ssp-id="sspId"
        :req-id="requirement.uuid"
        :stmt-id="statement.uuid"
        :by-component-id="byComponentId"
        :responsibility-options="satisfiableResponsibilities"
        :responsibility-labels="knownResponsibilities"
        :responsibility-options-failed="satisfiableLoadFailed"
      />
    </div>
  </div>
</template>
