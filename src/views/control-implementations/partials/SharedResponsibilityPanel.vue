<template>
  <div class="space-y-4">
    <div class="flex items-center gap-x-4">
      <h4 class="font-medium text-xl">Shared Responsibility</h4>
      <Badge v-if="rollupLoading" severity="secondary">Loading…</Badge>
    </div>

    <!-- Provides -->
    <section>
      <h5 class="text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
        Provides
      </h5>
      <div
        v-if="!providesByStatement.length"
        class="text-sm text-gray-500 dark:text-slate-400"
      >
        This system exports nothing for this control.
      </div>
      <div
        v-for="group in providesByStatement"
        :key="group.statementId"
        class="mb-3 p-3 border border-ccf-200 dark:border-slate-600 rounded"
      >
        <div class="text-sm font-medium dark:text-slate-300">
          Statement {{ group.statementId }}
        </div>
        <!-- Grouped by by-component, not just by statement: one statement can export from
             several components, and each Edit has to open the by-component its rows actually
             belong to. -->
        <div
          v-for="component in group.components"
          :key="component.byComponentUuid"
          class="mt-2"
        >
          <div class="flex justify-between items-start">
            <div class="text-xs text-gray-500 dark:text-slate-400">
              {{ component.componentTitle ?? component.componentUuid }}
            </div>
            <!-- Authoring is reachable from here too, not only from the SSP editor: this is
                 the day-to-day surface, and the export editor was previously reachable from
                 exactly one place. -->
            <PermissionGate :resource="RESOURCES.SSP" :action="ACTIONS.UPDATE">
              <SecondaryButton
                type="button"
                size="small"
                @click="emit('editProvides', component.rows[0])"
              >
                Edit
              </SecondaryButton>
            </PermissionGate>
          </div>
          <div
            v-for="row in component.rows"
            :key="row.providedUuid"
            class="mt-1 text-xs"
          >
            <Badge severity="success">Provided</Badge>
            <div class="ml-2 text-green-600 dark:text-green-400">
              {{ row.description }}
            </div>
            <div
              v-for="responsibility in row.responsibilities ?? []"
              :key="responsibility.responsibilityUuid"
              class="ml-2 text-orange-600 dark:text-orange-400"
            >
              Consumer responsibility: {{ responsibility.description }}
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Inherits -->
    <section>
      <h5 class="text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
        Inherits
      </h5>
      <div
        v-if="!inherits.length"
        class="text-sm text-gray-500 dark:text-slate-400"
      >
        Nothing inherited for this control.
      </div>
      <div
        v-for="row in inherits"
        :key="row.inheritedUuid"
        class="mb-2 p-3 border border-ccf-200 dark:border-slate-600 rounded"
      >
        <div class="flex items-center gap-2 flex-wrap">
          <span class="text-sm dark:text-slate-300">
            Statement {{ row.statementId }}
          </span>
          <Badge v-if="row.satisfaction" :severity="satisfactionSeverity(row)">
            {{ row.satisfaction }}
          </Badge>
          <Badge v-if="row.status" :severity="statusSeverity(row.status)">
            {{ row.status }}
          </Badge>
          <RouterLink
            v-if="row.driftRiskId"
            :to="{
              name: 'system-security-plan-risk-detail',
              params: { id: sspId, riskId: row.driftRiskId },
            }"
            class="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400"
          >
            View drift risk
          </RouterLink>
        </div>
        <div class="text-xs text-purple-600 dark:text-purple-400 mt-1">
          {{ row.description }}
        </div>
        <div
          v-if="row.leverageLinkId"
          class="text-xs text-gray-500 dark:text-slate-400 mt-1"
        >
          Leverage link: {{ row.leverageLinkId }}
        </div>
      </div>
    </section>

    <!-- Satisfies -->
    <section>
      <h5 class="text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
        Satisfies
      </h5>
      <div
        v-if="!satisfies.length"
        class="text-sm text-gray-500 dark:text-slate-400"
      >
        No upstream responsibilities discharged for this control.
      </div>
      <div
        v-for="row in satisfies"
        :key="row.satisfiedUuid"
        class="mb-2 p-3 border border-ccf-200 dark:border-slate-600 rounded"
      >
        <div class="flex items-center gap-2 flex-wrap">
          <span class="text-sm dark:text-slate-300">
            Statement {{ row.statementId }}
          </span>
          <Badge v-if="row.status" :severity="statusSeverity(row.status)">
            {{ row.status }}
          </Badge>
          <RouterLink
            v-if="row.driftRiskId"
            :to="{
              name: 'system-security-plan-risk-detail',
              params: { id: sspId, riskId: row.driftRiskId },
            }"
            class="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400"
          >
            View drift risk
          </RouterLink>
        </div>
        <div class="text-xs text-blue-600 dark:text-blue-400 mt-1">
          {{ row.description }}
        </div>
      </div>
    </section>

    <!-- Legacy -->
    <section v-if="legacy.length">
      <h5 class="text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
        Legacy
      </h5>
      <p class="text-xs text-gray-500 dark:text-slate-400 mb-2">
        Legacy — shared responsibility is tracked per statement. These
        requirement-level rows are read-only; delete them once their exports
        live on a statement.
      </p>
      <div
        v-for="row in legacy"
        :key="row.byComponentUuid"
        class="mb-2 p-3 border border-ccf-200 dark:border-slate-600 rounded flex justify-between items-start"
      >
        <div class="text-xs dark:text-slate-300">
          <div class="font-medium">
            {{ row.componentTitle ?? row.componentUuid }}
          </div>
          <div class="text-gray-500 dark:text-slate-400">
            {{ row.description }}
          </div>
        </div>
        <PermissionGate :resource="RESOURCES.SSP" :action="ACTIONS.DELETE">
          <button
            type="button"
            class="text-red-500 hover:text-red-700 text-sm shrink-0 ml-2"
            @click="
              confirmDeleteDialog(() => deleteLegacy(row), {
                itemName: row.componentTitle ?? row.componentUuid,
                itemType: 'legacy component implementation',
              })
            "
          >
            Delete
          </button>
        </PermissionGate>
      </div>
    </section>

    <!-- Available to import -->
    <section>
      <h5 class="text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
        Available to import
      </h5>
      <div
        v-if="!offers?.length"
        class="text-sm text-gray-500 dark:text-slate-400"
      >
        No upstream system exports this control.
      </div>
      <div
        v-for="offer in offers ?? []"
        :key="`${offer.offeringId}:${offer.itemId}`"
        class="mb-2 p-3 border border-ccf-200 dark:border-slate-600 rounded"
      >
        <div class="flex justify-between items-start gap-2">
          <div class="text-sm dark:text-slate-300">
            <div class="font-medium">
              {{ offer.offeringTitle }} v{{ offer.offeringVersion }}
            </div>
            <div class="text-xs text-gray-500 dark:text-slate-400">
              {{ offer.upstreamSspTitle ?? offer.upstreamSspId }} · Statement
              {{ offer.statementId }}
            </div>
            <div class="text-xs text-green-600 dark:text-green-400 mt-1">
              {{ offer.providedDescription }}
            </div>
            <div
              v-for="responsibility in offer.responsibilities ?? []"
              :key="responsibility.responsibilityUuid"
              class="text-xs text-orange-600 dark:text-orange-400"
            >
              You would take on: {{ responsibility.description }}
            </div>
          </div>
          <!-- Same double gate as the Leverage catalog: subscribing writes to this SSP. -->
          <PermissionGate
            :resource="RESOURCES.SSP_EXPORT_OFFERING"
            :action="ACTIONS.SUBSCRIBE"
          >
            <PermissionGate :resource="RESOURCES.SSP" :action="ACTIONS.UPDATE">
              <SecondaryButton
                type="button"
                size="small"
                @click="openImport(offer)"
              >
                Import implementation
              </SecondaryButton>
            </PermissionGate>
          </PermissionGate>
        </div>
      </div>
    </section>

    <Dialog
      v-model:visible="showImportModal"
      size="xl"
      modal
      :header="`Import — ${importingOffer?.offeringTitle ?? ''}`"
    >
      <div
        v-if="importingOffer && !importingOffering"
        class="text-sm text-gray-500 dark:text-slate-400"
      >
        Loading the offering…
      </div>
      <SubscribeOfferingWizard
        v-else-if="importingOffer && importingOffering"
        :ssp-id="sspId"
        :offering="importingOffering"
        :scoped-item-ids="[importingOffer.itemId]"
        :preselected-item-ids="[importingOffer.itemId]"
        @cancel="closeImport"
        @subscribed="handleSubscribed"
      />
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, toRef } from 'vue';
import { RouterLink } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import type { AxiosError } from 'axios';
import Badge from '@/volt/Badge.vue';
import Dialog from '@/volt/Dialog.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import PermissionGate from '@/components/auth/PermissionGate.vue';
import SubscribeOfferingWizard from '@/components/system-security-plans/SubscribeOfferingWizard.vue';
import { RESOURCES, ACTIONS } from '@/constants/permissions';
import { useAuthenticatedInstance } from '@/composables/axios';
import { useSharedResponsibility } from '@/composables/useSharedResponsibility';
import { useDeleteConfirmationDialog } from '@/utils/delete-dialog';
import type { DataResponse, ErrorBody, ErrorResponse } from '@/stores/types';
import type {
  CatalogOffering,
  ControlExportOffer,
} from '@/types/ssp-export-offerings';
import type {
  SharedResponsibilityLegacy,
  SharedResponsibilityProvided,
  SSPLeverageLink,
  SSPLeverageStatus,
  SubscribeResponseMeta,
} from '@/types/ssp-leverage';

const props = defineProps<{
  sspId: string;
  controlId: string;
}>();

const emit = defineEmits<{
  editProvides: [row: SharedResponsibilityProvided];
  imported: [
    payload: { links: SSPLeverageLink[]; meta?: SubscribeResponseMeta },
  ];
}>();

const toast = useToast();
const axiosInstance = useAuthenticatedInstance();
const { confirmDeleteDialog } = useDeleteConfirmationDialog();

const { rollup, rollupLoading, offers, refresh } = useSharedResponsibility(
  toRef(props, 'sspId'),
  toRef(props, 'controlId'),
);

// The rollup is already control-scoped by the query param, but filter anyway: the panel is
// keyed on one control and must never render another's rows if the API widens.
function forThisControl<T extends { controlId: string }>(rows: T[]): T[] {
  const target = props.controlId.trim().toLowerCase();
  return rows.filter((row) => row.controlId.trim().toLowerCase() === target);
}

const provides = computed(() => forThisControl(rollup.value?.provides ?? []));
const inherits = computed(() => forThisControl(rollup.value?.inherits ?? []));
const satisfies = computed(() => forThisControl(rollup.value?.satisfies ?? []));
const legacy = computed(() => forThisControl(rollup.value?.legacy ?? []));

// Statement -> by-component -> its provided rows. The by-component level matters: it is the
// unit the editor opens, and one statement may export from several components.
const providesByStatement = computed(() => {
  const byStatement = new Map<
    string,
    Map<string, SharedResponsibilityProvided[]>
  >();
  for (const row of provides.value) {
    let components = byStatement.get(row.statementId);
    if (!components) {
      components = new Map();
      byStatement.set(row.statementId, components);
    }
    const rows = components.get(row.byComponentUuid);
    if (rows) {
      rows.push(row);
    } else {
      components.set(row.byComponentUuid, [row]);
    }
  }
  return [...byStatement.entries()].map(([statementId, components]) => ({
    statementId,
    components: [...components.entries()].map(([byComponentUuid, rows]) => ({
      byComponentUuid,
      componentUuid: rows[0].componentUuid,
      componentTitle: rows[0].componentTitle,
      rows,
    })),
  }));
});

function satisfactionSeverity(row: { satisfaction?: string }) {
  return row.satisfaction === 'full' ? 'success' : 'warn';
}

function statusSeverity(status: SSPLeverageStatus) {
  switch (status) {
    case 'active':
      return 'success';
    case 'drifted':
      return 'warn';
    case 'revoked':
      return 'danger';
    default:
      return 'secondary';
  }
}

function errorDetail(error: unknown, fallback: string): string {
  const errorResponse = error as AxiosError<ErrorResponse<ErrorBody>>;
  return errorResponse.response?.data?.errors?.body || fallback;
}

async function deleteLegacy(row: SharedResponsibilityLegacy) {
  try {
    await axiosInstance.delete(
      `/api/oscal/system-security-plans/${props.sspId}/control-implementation/implemented-requirements/${row.requirementUuid}/by-components/${row.byComponentUuid}`,
    );
    await refresh();
    toast.add({
      severity: 'success',
      summary: 'Legacy component implementation deleted.',
      life: 3000,
    });
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: errorDetail(
        error,
        'Failed to delete the legacy component implementation.',
      ),
      life: 5000,
    });
  }
}

const showImportModal = ref(false);
const importingOffer = ref<ControlExportOffer | null>(null);
const importingOffering = ref<CatalogOffering | null>(null);

// The wizard needs the full catalog offering (items + their upstream responsibilities). The
// flat catalog is the only cross-SSP read that respects the leverage trust boundary — the
// same single fetch the Leverage view makes — so resolve the offering from it rather than
// reaching for an upstream-scoped endpoint.
async function openImport(offer: ControlExportOffer) {
  importingOffer.value = offer;
  importingOffering.value = null;
  showImportModal.value = true;
  try {
    const response = await axiosInstance.get<DataResponse<CatalogOffering[]>>(
      '/api/oscal/ssp-export-offerings',
    );
    importingOffering.value =
      response.data.data?.find((o) => o.id === offer.offeringId) ?? null;
    if (!importingOffering.value) {
      throw new Error('The offering is no longer published.');
    }
  } catch (error) {
    showImportModal.value = false;
    importingOffer.value = null;
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: errorDetail(error, 'Failed to load the export offering.'),
      life: 5000,
    });
  }
}

function closeImport() {
  showImportModal.value = false;
  importingOffer.value = null;
  importingOffering.value = null;
}

async function handleSubscribed(payload: {
  links: SSPLeverageLink[];
  meta?: SubscribeResponseMeta;
}) {
  closeImport();
  await refresh();
  emit('imported', payload);
}
</script>
