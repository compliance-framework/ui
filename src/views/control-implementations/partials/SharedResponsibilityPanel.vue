<script setup lang="ts">
/**
 * A control's shared responsibility, in the Implementation drawer: what this system provides to
 * importers (with Edit, per component), what it inherits and satisfies, legacy requirement-level
 * rows (delete only), and upstream offerings available to import for this control.
 */
import { computed, ref, toRef } from 'vue';
import { useToast } from '@/ds/toasts';
import type { AxiosError } from 'axios';
import Button from '@/ds/components/Button/Button.vue';
import Dialog from '@/ds/components/Dialog/Dialog.vue';
import InlineMessage from '@/ds/components/InlineMessage/InlineMessage.vue';
import StatusBadge from '@/ds/components/StatusBadge/StatusBadge.vue';
import Tag from '@/ds/components/Tag/Tag.vue';
import Text from '@/ds/components/Text/Text.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Panel from '@/ds/components/layout/Panel.vue';
import PanelSection from '@/ds/components/layout/PanelSection.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import { usePermissions } from '@/composables/usePermissions';
import { satisfactionBadge } from './responsibility-posture';
import SubscribeOfferingForm from '@/screens/configure/SubscribeOfferingForm.vue';
import { RESOURCES, ACTIONS } from '@/constants/permissions';
import { useAuthenticatedInstance } from '@/composables/axios';
import { useSharedResponsibility } from '@/composables/useSharedResponsibility';
import { useDeleteConfirmationDialog } from '@/utils/delete-dialog';
import { latestRequest } from '@/utils/latest-request';
import type { ControlImplementation } from '@/oscal';
import type { StatusKey } from '@/ds/components/StatusBadge/statuses';
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
const { can } = usePermissions();
const canEdit = computed(() => can(RESOURCES.SSP, ACTIONS.UPDATE));
const canDelete = computed(() => can(RESOURCES.SSP, ACTIONS.DELETE));
// Same double gate as the Leverage catalog: subscribing writes to this SSP.
const canImport = computed(
  () =>
    can(RESOURCES.SSP_EXPORT_OFFERING, ACTIONS.SUBSCRIBE) &&
    can(RESOURCES.SSP, ACTIONS.UPDATE),
);
const axiosInstance = useAuthenticatedInstance();
const { confirmDeleteDialog } = useDeleteConfirmationDialog();

const {
  rollup,
  rollupLoading,
  rollupError,
  offers,
  offersLoading,
  offersError,
  refresh,
} = useSharedResponsibility(toRef(props, 'sspId'), toRef(props, 'controlId'));

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

// Statement -> by-component rows. Each rollup row already is one by-component with its
// provided/responsibilities nested; the by-component level matters because it is the unit
// the editor opens, and one statement may export from several components.
const providesByStatement = computed(() => {
  const byStatement = new Map<string, SharedResponsibilityProvided[]>();
  for (const row of provides.value) {
    const components = byStatement.get(row.statementId);
    if (components) {
      components.push(row);
    } else {
      byStatement.set(row.statementId, [row]);
    }
  }
  return [...byStatement.entries()].map(([statementId, components]) => ({
    statementId,
    components,
  }));
});

function responsibilitiesFor(
  component: SharedResponsibilityProvided,
  providedUuid: string,
) {
  return (component.responsibilities ?? []).filter(
    (responsibility) => responsibility.providedUuid === providedUuid,
  );
}

function componentTitle(component: SharedResponsibilityProvided) {
  return component.componentTitle || component.componentUuid;
}

const LINK_STATUSES: Partial<Record<SSPLeverageStatus, StatusKey>> = {
  active: 'capability-active',
  drifted: 'capability-drifted',
  revoked: 'capability-revoked',
  superseded: 'capability-superseded',
};

function statusBadge(status: SSPLeverageStatus) {
  const key = LINK_STATUSES[status];
  return key ? { status: key } : { status: 'unknown' as const, label: status };
}

function errorDetail(error: unknown, fallback: string): string {
  const errorResponse = error as AxiosError<ErrorResponse<ErrorBody>>;
  return errorResponse.response?.data?.errors?.body || fallback;
}

async function deleteLegacy(row: SharedResponsibilityLegacy) {
  try {
    // The rollup's legacy rows carry no requirement uuid — resolve it from the
    // control-implementation tree (control ids matched case-insensitively, as everywhere).
    const implementationResponse = await axiosInstance.get<
      DataResponse<ControlImplementation | null>
    >(`/api/oscal/system-security-plans/${props.sspId}/control-implementation`);
    const target = row.controlId.trim().toLowerCase();
    const requirement = (
      implementationResponse.data.data?.implementedRequirements ?? []
    ).find((r) => r.controlId.trim().toLowerCase() === target);
    if (!requirement) {
      throw new Error(
        'The implemented requirement this legacy row belongs to could not be found.',
      );
    }
    await axiosInstance.delete(
      `/api/oscal/system-security-plans/${props.sspId}/control-implementation/implemented-requirements/${requirement.uuid}/by-components/${row.byComponentUuid}`,
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
// Two Imports in flight (open A, close, open B — or A then B while A is still loading) and
// the slower one landing last would leave `importingOffering` on A while `importingOffer` is
// B: the wizard then mounts A's offering scoped to B's item id, so it either shows no items
// or subscribes against the wrong offering.
const importGate = latestRequest();

async function openImport(offer: ControlExportOffer) {
  const token = importGate.begin();
  importingOffer.value = offer;
  importingOffering.value = null;
  showImportModal.value = true;
  try {
    const response = await axiosInstance.get<DataResponse<CatalogOffering[]>>(
      '/api/oscal/ssp-export-offerings',
    );
    const found = response.data.data?.find((o) => o.id === offer.offeringId);
    if (importGate.isStale(token)) return;
    importingOffering.value = found ?? null;
    if (!importingOffering.value) {
      throw new Error('The offering is no longer published.');
    }
  } catch (error) {
    // Guarded too: a superseded openImport must not close the dialog the newer one just
    // opened, nor toast over it.
    if (importGate.isStale(token)) return;
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

<template>
  <Panel title="Shared responsibility" :level="3">
    <template v-if="rollupLoading" #actions>
      <Text as="span" variant="caption">Loading…</Text>
    </template>

    <!-- A failed fetch must never render as "this system exports nothing": in a compliance
         tool a reassuring negative that is really a broken request is the wrong way to fail.
         Only a successful, empty response reaches the empty copy below. -->
    <InlineMessage
      v-if="rollupError"
      tone="error"
      title="Could not load shared responsibility for this control."
    >
      <template #actions>
        <Button size="sm" :loading="rollupLoading" @click="refresh"
          >Retry</Button
        >
      </template>
    </InlineMessage>

    <template v-else>
      <PanelSection title="Provides" :level="4">
        <Text v-if="!providesByStatement.length" variant="secondary"
          >This system exports nothing for this control.</Text
        >
        <Stack v-else gap="4">
          <Stack
            v-for="group in providesByStatement"
            :key="group.statementId"
            gap="3"
          >
            <Text as="span" variant="label"
              >Statement {{ group.statementId }}</Text
            >
            <!-- One entry per by-component: a statement can export from several components,
                 and each Edit has to open the by-component its rows actually belong to. -->
            <Stack
              v-for="component in group.components"
              :key="component.byComponentUuid"
              gap="2"
            >
              <Cluster justify="between" gap="2">
                <Cluster gap="2">
                  <Text as="span" variant="secondary">{{
                    componentTitle(component)
                  }}</Text>
                  <Tag v-if="!component.offered" label="Not yet importable" />
                </Cluster>
                <Button
                  v-if="canEdit"
                  size="sm"
                  icon="edit"
                  :aria-label="`Edit what ${componentTitle(component)} provides`"
                  @click="emit('editProvides', component)"
                  >Edit</Button
                >
              </Cluster>
              <Stack as="ul" gap="2">
                <li
                  v-for="capability in component.provided"
                  :key="capability.uuid"
                >
                  <Stack gap="1">
                    <Text>{{ capability.description }}</Text>
                    <Text
                      v-for="responsibility in responsibilitiesFor(
                        component,
                        capability.uuid,
                      )"
                      :key="responsibility.uuid"
                      variant="secondary"
                      >Consumer responsibility:
                      {{ responsibility.description }}</Text
                    >
                  </Stack>
                </li>
              </Stack>
            </Stack>
          </Stack>
        </Stack>
      </PanelSection>

      <PanelSection title="Inherits" :level="4">
        <Text v-if="!inherits.length" variant="secondary"
          >Nothing inherited for this control.</Text
        >
        <Stack v-else as="ul" gap="4">
          <li v-for="row in inherits" :key="row.inheritedUuid">
            <Stack gap="1">
              <Cluster gap="2">
                <Text as="span" variant="label"
                  >Statement {{ row.statementId }}</Text
                >
                <StatusBadge
                  v-if="row.satisfaction"
                  v-bind="satisfactionBadge(row.satisfaction)"
                />
                <StatusBadge
                  v-if="row.status"
                  v-bind="statusBadge(row.status)"
                />
              </Cluster>
              <Text variant="caption"
                >From {{ row.upstreamSspTitle || row.upstreamSspId }} · v{{
                  row.offeringVersion
                }}</Text
              >
              <Text>{{ row.description }}</Text>
            </Stack>
          </li>
        </Stack>
      </PanelSection>

      <PanelSection title="Satisfies" :level="4">
        <Text v-if="!satisfies.length" variant="secondary"
          >No upstream responsibilities discharged for this control.</Text
        >
        <Stack v-else as="ul" gap="3">
          <li v-for="row in satisfies" :key="row.satisfiedUuid">
            <Stack gap="1">
              <Text as="span" variant="label"
                >Statement {{ row.statementId }}</Text
              >
              <Text>{{ row.description }}</Text>
            </Stack>
          </li>
        </Stack>
      </PanelSection>

      <PanelSection v-if="legacy.length" title="Legacy" :level="4">
        <Stack gap="3">
          <Text variant="secondary"
            >Legacy — shared responsibility is tracked per statement. These
            requirement-level rows are read-only; delete them once their exports
            live on a statement.</Text
          >
          <Stack as="ul" gap="3">
            <li v-for="row in legacy" :key="row.byComponentUuid">
              <Cluster justify="between" gap="2">
                <Stack gap="1">
                  <Text as="span" variant="label">{{ row.controlId }}</Text>
                  <Text variant="secondary">{{ row.reason }}</Text>
                </Stack>
                <Button
                  v-if="canDelete"
                  size="sm"
                  variant="danger"
                  icon="delete"
                  :aria-label="`Delete the ${row.controlId} legacy row`"
                  @click="
                    confirmDeleteDialog(() => deleteLegacy(row), {
                      itemName: `${row.controlId} legacy row`,
                      itemType: 'legacy component implementation',
                    })
                  "
                  >Delete</Button
                >
              </Cluster>
            </li>
          </Stack>
        </Stack>
      </PanelSection>
    </template>

    <!-- Available to import — its own fetch, so its own failure state. -->
    <PanelSection title="Available to import" :level="4">
      <InlineMessage
        v-if="offersError"
        tone="error"
        title="Could not load the offerings available to import."
      >
        <template #actions>
          <Button size="sm" :loading="offersLoading" @click="refresh"
            >Retry</Button
          >
        </template>
      </InlineMessage>
      <!-- Ahead of the empty copy: this is a cross-SSP read, and until it lands we do not
           know whether anything exports this control. Claiming "no upstream system" for the
           duration of the fetch is a reassuring negative produced by latency. -->
      <Text v-else-if="offersLoading" variant="secondary"
        >Looking for upstream systems that export this control…</Text
      >
      <Text v-else-if="!offers?.length" variant="secondary"
        >No upstream system exports this control.</Text
      >
      <Stack v-else as="ul" gap="4">
        <li
          v-for="offer in offers"
          :key="`${offer.offeringId}:${offer.itemId}`"
        >
          <Cluster justify="between" align="start" gap="2">
            <Stack gap="1">
              <Text as="span" variant="label"
                >{{ offer.offeringTitle }} v{{ offer.offeringVersion }}</Text
              >
              <Text variant="caption"
                >{{ offer.upstreamSspTitle || offer.upstreamSspId }} · Statement
                {{ offer.statementId }}</Text
              >
              <Text v-if="offer.provided">{{
                offer.provided.description
              }}</Text>
              <Text
                v-for="responsibility in offer.responsibilities ?? []"
                :key="responsibility.uuid"
                variant="secondary"
                >You would take on: {{ responsibility.description }}</Text
              >
            </Stack>
            <!-- Same double gate as the Leverage catalog: subscribing writes to this SSP. -->
            <Button
              v-if="canImport"
              size="sm"
              :aria-label="`Import ${offer.offeringTitle} for statement ${offer.statementId}`"
              @click="openImport(offer)"
              >Import implementation</Button
            >
          </Cluster>
        </li>
      </Stack>
    </PanelSection>

    <Dialog
      v-model:open="showImportModal"
      size="l"
      :title="`Import ${importingOffer?.offeringTitle ?? 'implementation'}`"
      @update:open="(open) => open || closeImport()"
    >
      <Text v-if="importingOffer && !importingOffering" variant="secondary"
        >Loading the offering…</Text
      >
      <SubscribeOfferingForm
        v-else-if="importingOffer && importingOffering"
        :ssp-id="sspId"
        :offering="importingOffering"
        :scoped-item-ids="[importingOffer.itemId]"
        :preselected-item-ids="[importingOffer.itemId]"
        @cancel="closeImport"
        @subscribed="handleSubscribed"
      />
    </Dialog>
  </Panel>
</template>
