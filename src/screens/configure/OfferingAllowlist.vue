<script setup lang="ts">
/**
 * The systems allowed to subscribe to an export offering: each with Remove, and a picker of the
 * other systems to allow one more. The offering's own system can't be its own downstream.
 */
import { computed, ref } from 'vue';
import { useToast } from '@/ds/toasts';
import type { SystemSecurityPlan } from '@/oscal';
import { useAuthenticatedInstance } from '@/composables/axios';
import { usePermissions } from '@/composables/usePermissions';
import { ACTIONS, RESOURCES } from '@/constants/permissions';
import type { AllowedDownstream } from '@/types/ssp-export-offerings';
import { getErrorDetail } from '@/utils/httpErrors';
import { useApiQuery } from '@/ds/query';
import Button from '@/ds/components/Button/Button.vue';
import Combobox from '@/ds/components/Combobox/Combobox.vue';
import DataState from '@/ds/components/DataState/DataState.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import IconButton from '@/ds/components/IconButton/IconButton.vue';
import Text from '@/ds/components/Text/Text.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Stack from '@/ds/components/layout/Stack.vue';

const props = defineProps<{ sspId: string; offeringId: string }>();

const toast = useToast();
const api = useAuthenticatedInstance();
const { can } = usePermissions();
const exportDenied = computed(() =>
  can(RESOURCES.SSP, ACTIONS.EXPORT)
    ? undefined
    : "Your access doesn't include exporting from this security plan.",
);

const url = `/api/oscal/system-security-plans/${props.sspId}/export-offerings/${props.offeringId}/allowed-downstreams`;
const allowed = useApiQuery<AllowedDownstream[]>(url, {
  isEmpty: (list) => list.length === 0,
});
const systems = useApiQuery<SystemSecurityPlan[]>(
  '/api/oscal/system-security-plans',
);

const titleOf = (id: string) =>
  systems.data.value?.find((s) => s.uuid === id)?.metadata?.title ?? id;
const options = computed(() => {
  const already = new Set(
    (allowed.data.value ?? []).map((a) => a.downstreamSspId),
  );
  return (systems.data.value ?? [])
    .filter((s) => s.uuid !== props.sspId && !already.has(s.uuid))
    .map((s) => ({ value: s.uuid, label: s.metadata?.title ?? s.uuid }));
});

const chosen = ref('');
const adding = ref(false);

async function add() {
  if (!chosen.value) return;
  adding.value = true;
  try {
    const response = await api.post<{ data: AllowedDownstream }>(url, {
      downstreamSspId: chosen.value,
    });
    allowed.data.value = [...(allowed.data.value ?? []), response.data.data];
    toast.add({
      severity: 'success',
      summary: 'System allowed',
      detail: `${titleOf(chosen.value)} can subscribe.`,
      life: 3000,
    });
    chosen.value = '';
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: "The system wasn't allowed",
      detail: await getErrorDetail(error, 'Try again.'),
      life: 5000,
    });
  } finally {
    adding.value = false;
  }
}

async function remove(entry: AllowedDownstream) {
  try {
    await api.delete(`${url}/${entry.downstreamSspId}`);
    allowed.data.value = (allowed.data.value ?? []).filter(
      (a) => a.downstreamSspId !== entry.downstreamSspId,
    );
    toast.add({ severity: 'success', summary: 'System removed', life: 3000 });
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: "The system wasn't removed",
      detail: await getErrorDetail(error, 'Try again.'),
      life: 5000,
    });
  }
}
</script>

<template>
  <Stack gap="4">
    <DataState
      :status="allowed.status.value"
      subject="the allowed systems"
      empty-title="Any system may subscribe"
      empty-body="No systems are listed. Allow one below to limit the offering to an allow-list."
      icon="systems"
      skeleton="text"
      @retry="allowed.retry"
    >
      <Stack gap="2" as="ul">
        <li v-for="entry in allowed.data.value" :key="entry.downstreamSspId">
          <Cluster justify="between" gap="2">
            <Text as="span">{{ titleOf(entry.downstreamSspId) }}</Text>
            <IconButton
              icon="close"
              :label="`Remove ${titleOf(entry.downstreamSspId)}`"
              :disabled-reason="exportDenied"
              @click="remove(entry)"
            />
          </Cluster>
        </li>
      </Stack>
    </DataState>
    <Cluster gap="2">
      <FormField label="Allow a system">
        <Combobox
          v-model="chosen"
          :options="options"
          :loading="systems.status.value === 'loading'"
          placeholder="System name"
        />
      </FormField>
      <Button
        icon="add"
        :loading="adding"
        :disabled-reason="
          exportDenied ?? (chosen ? undefined : 'Choose a system first.')
        "
        @click="add"
        >Allow</Button
      >
    </Cluster>
  </Stack>
</template>
