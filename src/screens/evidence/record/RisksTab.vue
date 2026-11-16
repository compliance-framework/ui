<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useToast } from '@/ds/toasts';
import { useAuthenticatedInstance, decamelizeKeys } from '@/composables/axios';
import { RESOURCES, ACTIONS } from '@/constants/permissions';
import type { Risk } from '@/oscal';
import { usePermissionsStore } from '@/stores/permissions';
import { useSystemStore } from '@/stores/system';
import type { DataResponse } from '@/stores/types';
import { getErrorStatus } from '@/utils/httpErrors';
import { riskStatusLabel } from '@/utils/risk-workflow';
import type { QueryStatus } from '@/ds/query';
import Button from '@/ds/components/Button/Button.vue';
import DataState from '@/ds/components/DataState/DataState.vue';
import DataTable from '@/ds/components/DataTable/DataTable.vue';
import InlineMessage from '@/ds/components/InlineMessage/InlineMessage.vue';
import Panel from '@/ds/components/layout/Panel.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import StatusBadge from '@/ds/components/StatusBadge/StatusBadge.vue';
import Tag from '@/ds/components/Tag/Tag.vue';
import Text from '@/ds/components/Text/Text.vue';
import TextLink from '@/ds/components/TextLink/TextLink.vue';
import RiskFormDialog from '../../risks/RiskFormDialog.vue';
import { riskBadge } from '../../risks/risks';
import { ZERO_UUID, useEvidenceRecord } from './evidenceRecord';

/**
 * Risks linked to this evidence stream, across every system. Create risk adds one (in this
 * system, or a chosen one on a global record) and links it to the stream.
 */
interface EvidenceRisk {
  id: string;
  title: string;
  description?: string;
  status: string;
  likelihood?: string;
  impact?: string;
  sspId: string;
  sspTitle?: string;
  sourceType?: string;
}

const route = useRoute();
const { evidence } = useEvidenceRecord();
const api = useAuthenticatedInstance();

const hasStream = computed(
  () => Boolean(evidence.value?.uuid) && evidence.value!.uuid !== ZERO_UUID,
);
const status = ref<QueryStatus>('loading');
const risks = ref<EvidenceRisk[]>([]);

async function load(): Promise<void> {
  if (!hasStream.value) return;
  status.value = 'loading';
  try {
    const response = await api.get<DataResponse<EvidenceRisk[]>>(
      `/api/evidence/${evidence.value!.id}/risks`,
    );
    risks.value = response.data.data ?? [];
    status.value = risks.value.length ? 'ready' : 'empty';
  } catch (error) {
    status.value = getErrorStatus(error) === 403 ? 'forbidden' : 'error';
  }
}
void load();

const rows = computed(() =>
  risks.value.map((risk) => ({
    ...risk,
    system: risk.sspTitle || risk.sspId,
    statusKey: riskBadge(risk.status),
    likelihoodKey: riskBadge(risk.likelihood),
    impactKey: riskBadge(risk.impact),
  })),
);

// Create a risk from this evidence ------------------------------------------------------------

const permissions = usePermissionsStore();
const systemStore = useSystemStore();
const toast = useToast();
/** Inside a system the risk goes in that system; on a global record the user chooses one. */
const systemId =
  typeof route.params.systemId === 'string' ? route.params.systemId : undefined;
const systems = computed(() =>
  systemStore.availablePlans.map((plan) => ({
    value: plan.uuid,
    label: plan.metadata.title,
  })),
);
const creating = ref(false);
const createDenied = computed(() => {
  if (!hasStream.value)
    return 'This evidence has no stream, so risks can’t be linked to it.';
  return permissions.can(RESOURCES.RISK, ACTIONS.CREATE)
    ? undefined
    : "Your access doesn't include creating risks.";
});

/** Link the new risk to this evidence stream, as the classic page did. */
async function created(
  risk: (Risk & { id?: string }) | undefined,
  sspId: string,
): Promise<void> {
  const riskId = risk?.id;
  if (riskId && evidence.value?.uuid) {
    try {
      await api.post(
        `/api/oscal/system-security-plans/${sspId}/risks/${riskId}/evidence`,
        { evidenceId: evidence.value.uuid },
        { transformRequest: [decamelizeKeys] },
      );
    } catch {
      toast.add({
        severity: 'warn',
        summary: 'Risk created, not linked',
        detail:
          "The risk was created, but it couldn't be linked to this evidence.",
        life: 5000,
      });
    }
  }
  await load();
}
</script>

<template>
  <Panel
    title="Associated risks"
    description="Risks linked to this evidence stream, across every system."
  >
    <template #actions>
      <Button
        icon="add"
        :disabled-reason="createDenied"
        @click="creating = true"
        >Create risk</Button
      >
    </template>
    <InlineMessage v-if="!hasStream" tone="warning" title="No evidence stream">
      <p>
        This record has no stream identifier, so risks can't be associated with
        it.
      </p>
    </InlineMessage>
    <DataState
      v-else
      :status="status"
      subject="risks"
      empty-title="No risks yet"
      empty-body="No risk is linked to this evidence stream."
      icon="risks"
      heading-level="none"
      @retry="load"
    >
      <DataTable
        caption="Risks linked to this evidence"
        caption-hidden
        :columns="[
          { key: 'title', label: 'Risk', minWidth: 'md' },
          { key: 'status', label: 'Status', nowrap: true },
          { key: 'likelihood', label: 'Likelihood', nowrap: true },
          { key: 'impact', label: 'Impact', nowrap: true },
          { key: 'system', label: 'System' },
        ]"
        :rows="rows"
        :row-key="(r) => r.id"
      >
        <template #cell-title="{ row: r }">
          <Stack gap="1">
            <TextLink
              :to="{
                name: 'system-security-plan-risk-detail',
                params: { id: r.sspId, riskId: r.id },
              }"
              >{{ r.title || 'Untitled risk' }}</TextLink
            >
            <Text v-if="r.description" variant="caption">{{
              r.description
            }}</Text>
            <Tag
              v-if="r.sourceType === 'evidence-auto'"
              label="Created automatically"
            />
          </Stack>
        </template>
        <template #cell-status="{ row: r }">
          <StatusBadge v-if="r.statusKey" :status="r.statusKey" />
          <template v-else>{{ riskStatusLabel(r.status) }}</template>
        </template>
        <template #cell-likelihood="{ row: r }">
          <StatusBadge v-if="r.likelihoodKey" :status="r.likelihoodKey" />
          <template v-else>{{ r.likelihood || 'Not rated' }}</template>
        </template>
        <template #cell-impact="{ row: r }">
          <StatusBadge v-if="r.impactKey" :status="r.impactKey" />
          <template v-else>{{ r.impact || 'Not rated' }}</template>
        </template>
      </DataTable>
    </DataState>
  </Panel>

  <RiskFormDialog
    v-model:open="creating"
    :system-id="systemId"
    :systems="systems"
    @saved="created"
  />
</template>
