<template>
  <div class="space-y-6">
    <div
      class="bg-white dark:bg-slate-900 border border-ccf-300 dark:border-slate-700 rounded-lg p-6"
    >
      <h3 class="text-lg font-semibold text-gray-900 dark:text-slate-300 mb-4">
        Inherited Capabilities
      </h3>

      <div v-if="loading" class="text-center py-4">
        <p class="text-gray-500 dark:text-slate-400">
          Loading inherited capabilities...
        </p>
      </div>

      <div v-else-if="!controls?.length" class="text-center py-8">
        <p class="text-gray-500 dark:text-slate-400">
          No inherited capabilities yet.
        </p>
      </div>

      <div v-else class="space-y-4">
        <div
          v-for="control in controls"
          :key="control.id"
          class="border border-gray-200 dark:border-slate-700 rounded-lg p-4"
        >
          <div class="flex items-center gap-2 flex-wrap">
            <h4 class="font-medium text-gray-900 dark:text-slate-300">
              {{ control.controlId
              }}<span v-if="control.statementId">
                · Statement {{ control.statementId }}</span
              >
            </h4>
            <Badge severity="secondary">
              Covered by {{ control.inheritedFrom.offeringTitle }} v{{
                control.inheritedFrom.offeringVersion
              }}
            </Badge>
            <Badge
              :severity="control.satisfaction === 'full' ? 'success' : 'warn'"
            >
              {{ control.satisfaction }}
            </Badge>
          </div>

          <div
            v-if="control.status !== 'active'"
            class="mt-3 p-3 border border-orange-300 dark:border-orange-700 rounded bg-orange-50 dark:bg-orange-900/20"
          >
            <p class="text-sm text-orange-700 dark:text-orange-400">
              This capability is {{ control.status }} and may no longer reflect
              the upstream offering.
            </p>
            <div class="flex items-center gap-3 mt-2">
              <RouterLink
                v-if="control.driftRiskId"
                :to="{
                  name: 'system-security-plan-risk-detail',
                  params: { id: sspId, riskId: control.driftRiskId },
                }"
                class="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400"
              >
                View drift risk
              </RouterLink>
              <PermissionGate
                :resource="RESOURCES.SSP"
                :action="ACTIONS.UPDATE"
              >
                <SecondaryButton
                  v-if="control.status === 'drifted'"
                  type="button"
                  size="small"
                  @click="confirmReAttest(control)"
                >
                  Re-attest
                </SecondaryButton>
              </PermissionGate>
            </div>
          </div>

          <div v-if="control.outstandingResponsibilities.length" class="mt-3">
            <h5
              class="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1"
            >
              Outstanding responsibilities
            </h5>
            <div class="space-y-1">
              <div
                v-for="responsibility in control.outstandingResponsibilities"
                :key="responsibility.responsibilityUuid"
                class="flex items-center gap-2 text-sm"
              >
                <Badge
                  :severity="
                    postureSeverity(control, responsibility.responsibilityUuid)
                  "
                >
                  {{ posture(control, responsibility.responsibilityUuid) }}
                </Badge>
                <span class="text-gray-700 dark:text-slate-300">
                  {{ responsibility.description }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import Badge from '@/volt/Badge.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import PermissionGate from '@/components/auth/PermissionGate.vue';
import { RESOURCES, ACTIONS } from '@/constants/permissions';
import { useDataApi, useAuthenticatedInstance } from '@/composables/axios';
import { getIdFromRoute } from '@/utils/get-poam-id-from-route';
import type { DataResponse, ErrorBody, ErrorResponse } from '@/stores/types';
import type {
  LeveragedControl,
  ResponsibilityPostureValue,
} from '@/types/ssp-leverage';
import type { AxiosError } from 'axios';

const route = useRoute();
const toast = useToast();
const confirm = useConfirm();
const axiosInstance = useAuthenticatedInstance();

const sspId = computed(() => getIdFromRoute(route) ?? '');

// This projection endpoint is the only fetch this view makes — no catalog/profile lookup,
// per AC2 ("no catalog controls are synthesized in the UI; data comes only from the
// projection endpoint").
const {
  data: controls,
  isLoading: loading,
  execute: refetchControls,
} = useDataApi<LeveragedControl[]>(
  `/api/oscal/system-security-plans/${sspId.value}/leveraged-controls`,
);

function posture(
  control: LeveragedControl,
  responsibilityUuid: string,
): ResponsibilityPostureValue {
  return control.responsibilityPosture[responsibilityUuid] ?? 'unknown';
}

function postureSeverity(
  control: LeveragedControl,
  responsibilityUuid: string,
) {
  switch (posture(control, responsibilityUuid)) {
    case 'satisfied':
      return 'success';
    case 'not-satisfied':
      return 'danger';
    default:
      return 'secondary';
  }
}

function confirmReAttest(control: LeveragedControl) {
  confirm.require({
    message: `Re-attest that "${control.controlId}" still reflects the upstream offering?`,
    header: 'Confirm Re-attestation',
    rejectProps: { label: 'Cancel', severity: 'secondary', outlined: true },
    acceptProps: { label: 'Confirm' },
    accept: async () => {
      await reAttest(control);
    },
  });
}

async function reAttest(control: LeveragedControl) {
  try {
    // ReAttest returns the raw SSPLeverageLink, not the richer LeveragedControl
    // projection shape (inheritedFrom/outstandingResponsibilities/responsibilityPosture) —
    // refetch the projection rather than trying to merge a mismatched response in place.
    await axiosInstance.post<DataResponse<unknown>>(
      `/api/oscal/system-security-plans/${sspId.value}/leveraged-controls/${control.id}/attest`,
    );
    await refetchControls();
    toast.add({
      severity: 'success',
      summary: 'Re-attested successfully.',
      life: 3000,
    });
  } catch (error) {
    const errorResponse = error as AxiosError<ErrorResponse<ErrorBody>>;
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail:
        errorResponse.response?.data?.errors?.body || 'Failed to re-attest.',
      life: 5000,
    });
  }
}
</script>
