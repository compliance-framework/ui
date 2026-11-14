<script setup lang="ts">
/**
 * Configure System → Inherited Capabilities (reached by link): the controls this plan inherits
 * through export-offering subscriptions, each with the offering it comes from, how fully it is
 * satisfied, any drift or revocation (with a link to the drift risk and Re-attest), and the
 * upstream responsibilities still outstanding. Drifted and revoked ones start open. The
 * leveraged-controls projection is the only fetch: no catalog controls are looked up here.
 */
import { computed, ref, watch } from 'vue';
import { useToast } from 'primevue/usetoast';
import { useAuthenticatedInstance } from '@/composables/axios';
import { LEVERAGED_CONTROLS_STOP_PATHS } from '@/composables/useLeveragedControls';
import { usePermissions } from '@/composables/usePermissions';
import { RESOURCES, ACTIONS } from '@/constants/permissions';
import type {
  LeveragedControl,
  ResponsibilityPostureValue,
} from '@/types/ssp-leverage';
import { getErrorDetail } from '@/utils/httpErrors';
import { useApiQuery } from '@/ds/query';
import Button from '@/ds/components/Button/Button.vue';
import ConfirmDialog from '@/ds/components/ConfirmDialog/ConfirmDialog.vue';
import DataState from '@/ds/components/DataState/DataState.vue';
import Disclosure from '@/ds/components/Disclosure/Disclosure.vue';
import InlineMessage from '@/ds/components/InlineMessage/InlineMessage.vue';
import StatusBadge from '@/ds/components/StatusBadge/StatusBadge.vue';
import Tag from '@/ds/components/Tag/Tag.vue';
import Text from '@/ds/components/Text/Text.vue';
import TextLink from '@/ds/components/TextLink/TextLink.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Stack from '@/ds/components/layout/Stack.vue';

const props = defineProps<{ sspId: string }>();

const toast = useToast();
const api = useAuthenticatedInstance();
const { can } = usePermissions();

const url = `/api/oscal/system-security-plans/${props.sspId}/leveraged-controls`;
const controls = useApiQuery<LeveragedControl[]>(url, {
  isEmpty: (list) => list.length === 0,
  // Without them the posture map's UUID keys are camelCased (dashes dropped) and never match.
  config: { camelcaseStopPaths: [...LEVERAGED_CONTROLS_STOP_PATHS] },
});

const attestDenied = computed(() =>
  can(RESOURCES.SSP, ACTIONS.UPDATE)
    ? undefined
    : "Your access doesn't include changing this security plan.",
);

/** Drifted and revoked capabilities start open, so their warnings are seen. */
const open = ref<Record<string, boolean>>({});
watch(
  () => controls.data.value,
  (list) => {
    for (const control of list ?? [])
      open.value[control.id] ??= control.status !== 'active';
  },
  { immediate: true },
);

const label = (control: LeveragedControl) =>
  control.statementId
    ? `${control.controlId} · Statement ${control.statementId}`
    : control.controlId;

const posture = (
  control: LeveragedControl,
  responsibilityUuid: string,
): ResponsibilityPostureValue =>
  control.responsibilityPosture[responsibilityUuid] ?? 'unknown';

// Re-attest ----------------------------------------------------------------------------------

const attesting = ref<LeveragedControl>();
const attestOpen = computed({
  get: () => Boolean(attesting.value),
  set: (open: boolean) => {
    if (!open) attesting.value = undefined;
  },
});

async function reAttest() {
  const control = attesting.value;
  attesting.value = undefined;
  if (!control) return;
  try {
    // The response is the raw leverage link, not this projection, so reload the projection.
    await api.post(`${url}/${control.id}/attest`);
    controls.retry();
    toast.add({
      severity: 'success',
      summary: 'Re-attested',
      detail: `${label(control)} reflects the upstream offering again.`,
      life: 3000,
    });
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: `${label(control)} wasn't re-attested`,
      detail: await getErrorDetail(error, 'Try again.'),
      life: 5000,
    });
  }
}
</script>

<template>
  <DataState
    :status="controls.status.value"
    subject="inherited capabilities"
    empty-title="No inherited capabilities yet"
    empty-body="Subscribe to another system's export offering under Leverage to inherit its controls."
    icon="frameworks"
    @retry="controls.retry"
  >
    <Stack gap="3">
      <Disclosure
        v-for="control in controls.data.value"
        :key="control.id"
        v-model:open="open[control.id]"
        :label="label(control)"
      >
        <Stack gap="4">
          <Cluster gap="1">
            <Tag
              :label="`Covered by ${control.inheritedFrom.offeringTitle} v${control.inheritedFrom.offeringVersion}`"
            />
            <Tag :label="`${control.satisfaction} satisfaction`" />
          </Cluster>
          <InlineMessage
            v-if="control.status !== 'active'"
            tone="warning"
            :title="`This capability is ${control.status}`"
          >
            <Stack gap="2">
              <p>It may no longer reflect the upstream offering.</p>
              <Cluster gap="3">
                <TextLink
                  v-if="control.driftRiskId"
                  :to="{
                    name: 'system-security-plan-risk-detail',
                    params: { id: sspId, riskId: control.driftRiskId },
                  }"
                  >View drift risk</TextLink
                >
                <Button
                  v-if="control.status === 'drifted'"
                  :disabled-reason="attestDenied"
                  @click="attesting = control"
                  >Re-attest</Button
                >
              </Cluster>
            </Stack>
          </InlineMessage>
          <Stack v-if="control.outstandingResponsibilities.length" gap="2">
            <Text variant="label">Outstanding responsibilities</Text>
            <Cluster
              v-for="responsibility in control.outstandingResponsibilities"
              :key="responsibility.responsibilityUuid"
              gap="2"
            >
              <StatusBadge
                :status="posture(control, responsibility.responsibilityUuid)"
                compact
              />
              <Text as="span">{{ responsibility.description }}</Text>
            </Cluster>
          </Stack>
          <Text v-else variant="secondary"
            >No outstanding responsibilities.</Text
          >
        </Stack>
      </Disclosure>
    </Stack>

    <ConfirmDialog
      v-model:open="attestOpen"
      :title="`Re-attest ${attesting ? label(attesting) : 'this capability'}?`"
      confirm-label="Re-attest"
      tone="primary"
      @confirm="reAttest"
      ><Text
        >Confirm that it still reflects the upstream offering.</Text
      ></ConfirmDialog
    >
  </DataState>
</template>
