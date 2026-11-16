<script setup lang="ts">
/**
 * Choose the findings, observations and risks behind a POA&M item, from the plan's own. Saves
 * the item with its new links and emits `saved`.
 */
import { computed, ref } from 'vue';
import { useToast } from '@/ds/toasts';
import type { Finding, Observation, POAMItem, Risk } from '@/oscal';
import { decamelizeKeys, useAuthenticatedInstance } from '@/composables/axios';
import { getErrorDetail } from '@/utils/httpErrors';
import { useApiQuery } from '@/ds/query';
import Button from '@/ds/components/Button/Button.vue';
import CheckboxGroup from '@/ds/components/CheckboxGroup/CheckboxGroup.vue';
import InlineMessage from '@/ds/components/InlineMessage/InlineMessage.vue';
import Text from '@/ds/components/Text/Text.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Stack from '@/ds/components/layout/Stack.vue';

const props = defineProps<{ poamId: string; item: POAMItem }>();
const emit = defineEmits<{ saved: [item: POAMItem]; cancel: [] }>();

const toast = useToast();
const api = useAuthenticatedInstance();
const plan = `/api/oscal/plan-of-action-and-milestones/${props.poamId}`;

const findings = useApiQuery<Finding[]>(`${plan}/findings`);
const observations = useApiQuery<Observation[]>(`${plan}/observations`);
const risks = useApiQuery<Risk[]>(`${plan}/risks`);

const chosen = ref({
  findings: (props.item.relatedFindings ?? []).map((f) => f.findingUuid),
  observations: (props.item.relatedObservations ?? []).map(
    (o) => o.observationUuid,
  ),
  risks: (props.item.relatedRisks ?? []).map((r) => r.riskUuid),
});

const groups = computed(() => [
  {
    key: 'findings' as const,
    legend: 'Findings',
    status: findings.status.value,
    options: (findings.data.value ?? []).map((f) => ({
      value: f.uuid,
      label: f.title || f.uuid,
      description: f.target?.status?.state,
    })),
  },
  {
    key: 'observations' as const,
    legend: 'Observations',
    status: observations.status.value,
    options: (observations.data.value ?? []).map((o) => ({
      value: o.uuid,
      label: o.title || o.description || o.uuid,
      description: o.methods?.join(', '),
    })),
  },
  {
    key: 'risks' as const,
    legend: 'Risks',
    status: risks.status.value,
    options: (risks.data.value ?? []).map((r) => ({
      value: r.uuid!,
      label: r.title || r.uuid!,
      description: r.status ? String(r.status) : undefined,
    })),
  },
]);

const saving = ref(false);
const saveError = ref('');

async function save() {
  saving.value = true;
  saveError.value = '';
  const body: POAMItem = {
    ...props.item,
    relatedFindings: chosen.value.findings.map((findingUuid) => ({
      findingUuid,
    })),
    relatedObservations: chosen.value.observations.map((observationUuid) => ({
      observationUuid,
    })),
    relatedRisks: chosen.value.risks.map((riskUuid) => ({ riskUuid })),
  } as POAMItem;
  try {
    const response = await api.put<{ data: POAMItem }>(
      `${plan}/poam-items/${props.item.uuid}`,
      body,
      { transformRequest: [decamelizeKeys] },
    );
    toast.add({ severity: 'success', summary: 'Links saved', life: 3000 });
    emit('saved', response.data.data ?? body);
  } catch (error) {
    saveError.value = await getErrorDetail(error, 'Try again.');
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <form novalidate @submit.prevent="save">
    <Stack gap="5">
      <template v-for="group in groups" :key="group.key">
        <Text v-if="group.status === 'loading'" variant="secondary"
          >Loading {{ group.legend.toLowerCase() }}…</Text
        >
        <InlineMessage
          v-else-if="group.status === 'error' || group.status === 'forbidden'"
          tone="error"
          :title="`${group.legend} didn't load`"
        />
        <CheckboxGroup
          v-else-if="group.options.length"
          v-model="chosen[group.key]"
          :legend="group.legend"
          :options="group.options"
        />
        <Text v-else variant="secondary"
          >This plan has no {{ group.legend.toLowerCase() }} yet.</Text
        >
      </template>
      <InlineMessage v-if="saveError" tone="error" title="Not saved">
        <p>{{ saveError }}</p>
      </InlineMessage>
      <Cluster justify="end" gap="2">
        <Button @click="emit('cancel')">Cancel</Button>
        <Button variant="primary" type="submit" :loading="saving"
          >Save links</Button
        >
      </Cluster>
    </Stack>
  </form>
</template>
