<template>
  <!-- A failed leveraged-controls fetch must not render as "nothing inherited": `links` is
       `?? []`, so a broken request and a genuinely empty result are indistinguishable by the
       time they get here. The error state is checked first and carries the Retry — the same
       rule the rollup follows in SharedResponsibilityPanel. -->
  <InlineMessage
    v-if="controlsError"
    tone="error"
    title="Could not load inherited responsibilities for this control."
  >
    <template #actions>
      <Button size="sm" @click="leveraged.refresh">Retry</Button>
    </template>
  </InlineMessage>

  <Stack v-else-if="links.length" gap="4">
    <Stack gap="1">
      <Text as="span" variant="label">Inherited responsibilities</Text>
      <Text variant="caption"
        >What upstream systems leave to your team for this statement, and how
        you handle it.</Text
      >
    </Stack>

    <Panel
      v-for="link in links"
      :key="link.id"
      :aria-label="`Inherited from ${link.inheritedFrom.offeringTitle}`"
      dense
    >
      <Stack gap="3">
        <Cluster gap="2">
          <Text as="span" variant="label"
            >{{ link.inheritedFrom.offeringTitle }} v{{
              link.inheritedFrom.offeringVersion
            }}</Text
          >
          <StatusBadge v-bind="satisfactionBadge(link.satisfaction)" />
        </Cluster>
        <Text variant="secondary"
          >{{ link.inheritedFrom.offeringTitle }} covers part of this control.
          These are the parts your team still handles.</Text
        >

        <InlineMessage
          v-if="link.status === 'drifted'"
          tone="warning"
          title="The provider's implementation changed since you imported it."
        >
          <template v-if="canUpdate" #actions>
            <Button
              size="sm"
              :loading="reattestingLinkId === link.id"
              @click="reAttest(link)"
              >Re-attest</Button
            >
          </template>
        </InlineMessage>
        <InlineMessage
          v-else-if="link.status === 'revoked'"
          tone="error"
          title="The provider revoked this capability — its inherited coverage no longer applies."
        />

        <Stack as="ul" gap="4">
          <li v-for="row in rowsFor(link)" :key="row.responsibilityUuid">
            <Stack gap="3">
              <Cluster gap="2">
                <!-- Once an evidence filter is linked below, its evidence count carries the
                     coverage signal; the posture badge would just duplicate it. -->
                <StatusBadge
                  v-if="!filtersFor(row.responsibilityUuid).length"
                  v-bind="responsibilityBadge(row.posture)"
                />
                <Text as="span">{{ row.description }}</Text>
              </Cluster>

              <!-- How we handle this → the statement's satisfied entry for this responsibility -->
              <Stack v-if="anchorFor(link)" gap="2">
                <FormField label="How we handle this">
                  <Textarea
                    :model-value="draftFor(row)"
                    :rows="2"
                    :readonly="!canUpdate"
                    placeholder="Describe what your team does to meet this responsibility…"
                    @update:model-value="
                      setDraft(row.responsibilityUuid, $event)
                    "
                  />
                </FormField>
                <Cluster v-if="canUpdate" justify="end" gap="2">
                  <Button
                    v-if="row.satisfiedUuid"
                    size="sm"
                    variant="danger"
                    @click="removeSatisfied(link, row)"
                    >Remove</Button
                  >
                  <Button
                    size="sm"
                    :loading="savingResponsibility === row.responsibilityUuid"
                    @click="saveSatisfied(link, row)"
                    >Save</Button
                  >
                </Cluster>
              </Stack>
              <Text v-else variant="caption"
                >This inherited entry is missing its component record —
                re-import the capability to manage it here.</Text
              >

              <!-- Evidence filters attached to this responsibility -->
              <Stack gap="2">
                <Text as="span" variant="label">Evidence filters</Text>
                <Stack
                  v-if="filtersFor(row.responsibilityUuid).length"
                  as="ul"
                  gap="2"
                >
                  <li
                    v-for="filter in filtersFor(row.responsibilityUuid)"
                    :key="filter.filterId"
                  >
                    <Cluster gap="2">
                      <Text as="span">{{ filter.filterName }}</Text>
                      <DashboardEvidenceCounter
                        :dashboard-id="filter.filterId"
                      />
                      <Button
                        v-if="canUpdate"
                        size="sm"
                        variant="danger"
                        :aria-label="`Unlink ${filter.filterName}`"
                        @click="detachFilter(row.responsibilityUuid, filter)"
                        >Unlink</Button
                      >
                    </Cluster>
                    <Text
                      v-if="canUpdate && filter.controlLinkCreated"
                      variant="caption"
                      >Unlinking also stops counting it toward the
                      control.</Text
                    >
                  </li>
                </Stack>
                <!-- `filtersByResponsibility` is built from `responsibilityFilters ?? []`, so a
                     failed filters fetch is empty exactly as "genuinely none" is. Telling a
                     responsibility that DOES have filters that it has none contradicts reality
                     rather than merely under-reporting it, so the error case is checked first. -->
                <Text v-else-if="responsibilityFiltersError" variant="caption"
                  >Could not load linked evidence filters for this
                  responsibility.</Text
                >
                <Text v-else variant="caption"
                  >No evidence filters linked — link one and this
                  responsibility's coverage follows its evidence.</Text
                >

                <template v-if="canUpdate">
                  <DashboardLinkForm
                    v-if="linkingResponsibility === row.responsibilityUuid"
                    v-model:selected-dashboard="selectedDashboard"
                    :dashboards="linkableDashboards(row.responsibilityUuid)"
                    :is-submitting="attaching"
                    @submit="attachFilter(row.responsibilityUuid)"
                    @cancel="closeLinkPicker"
                  />
                  <EvidenceDashboardForm
                    v-else-if="
                      creatingForResponsibility === row.responsibilityUuid
                    "
                    v-model:name="dashboardName"
                    v-model:selected-baseline-evidence="
                      selectedBaselineEvidence
                    "
                    v-model:new-label-name="newLabelName"
                    v-model:new-label-value="newLabelValue"
                    v-model:follow-ssp-scope="followSspScope"
                    :unique-evidence-titles="uniqueEvidenceTitles"
                    :evidence-loading="evidenceLoading"
                    :label-conditions="labelConditions"
                    :available-label-names="availableLabelNames"
                    :available-label-values="availableLabelValues"
                    :computed-filter="computedFilter"
                    :scope-followable="scopeFollowable"
                    :is-submitting="creatingDashboard"
                    :server-error="createDashboardError"
                    @submit="createDashboard(row.responsibilityUuid)"
                    @cancel="closeCreatePicker"
                    @add-condition="addLabelCondition"
                    @remove-condition="removeLabelCondition"
                  />
                  <Cluster v-else gap="2">
                    <Button
                      size="sm"
                      icon="link"
                      @click="openLinkPicker(row.responsibilityUuid)"
                      >Link evidence filter</Button
                    >
                    <Button
                      size="sm"
                      icon="add"
                      @click="openCreatePicker(row.responsibilityUuid)"
                      >Create evidence filter</Button
                    >
                  </Cluster>
                </template>
              </Stack>
            </Stack>
          </li>
        </Stack>
      </Stack>
    </Panel>
  </Stack>
</template>

<script setup lang="ts">
/**
 * A statement's inherited responsibilities, in the statement editor: per upstream capability, its
 * satisfaction and drift (with Re-attest), and per responsibility its evidence posture, "How we
 * handle this" (the statement's satisfied entry) and the evidence filters linked to it.
 */
import { computed, inject, reactive, ref } from 'vue';
import { useToast } from 'primevue/usetoast';
import type { AxiosError } from 'axios';
import Button from '@/ds/components/Button/Button.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import InlineMessage from '@/ds/components/InlineMessage/InlineMessage.vue';
import StatusBadge from '@/ds/components/StatusBadge/StatusBadge.vue';
import Text from '@/ds/components/Text/Text.vue';
import Textarea from '@/ds/components/Textarea/Textarea.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Panel from '@/ds/components/layout/Panel.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import { usePermissions } from '@/composables/usePermissions';
import DashboardEvidenceCounter from './DashboardEvidenceCounter.vue';
import DashboardLinkForm from './DashboardLinkForm.vue';
import EvidenceDashboardForm from './EvidenceDashboardForm.vue';
import { useEvidenceDashboardForm } from '@/composables/useEvidenceDashboardForm';
import { FilterParser } from '@/parsers/labelfilter';
import { RESOURCES, ACTIONS } from '@/constants/permissions';
import {
  useAuthenticatedInstance,
  useDataApi,
  decamelizeKeys,
} from '@/composables/axios';
import {
  LeveragedControlsKey,
  linkKey,
  useLeveragedControls,
} from '@/composables/useLeveragedControls';
import { uuid as newUuid } from '@/utils/uuid';
import { useDeleteConfirmationDialog } from '@/utils/delete-dialog';
import {
  inheritedResponsibilityRows,
  responsibilityBadge,
  satisfactionBadge,
  type InheritedResponsibilityRow,
} from './responsibility-posture';
import type { ImplementedRequirement, Statement } from '@/oscal';
import type { Dashboard } from '@/stores/filters';
import type { ErrorBody, ErrorResponse } from '@/stores/types';
import type {
  AttachFilterResponsibilityRequest,
  LeveragedControl,
  ResponsibilityFilter,
} from '@/types/ssp-leverage';

const props = defineProps<{
  statement: Statement;
  implementation: ImplementedRequirement;
  sspId: string;
}>();

const emit = defineEmits<{
  // Satisfied entries changed — the host should refetch the statement (satisfaction and
  // outstanding responsibilities are recomputed server-side).
  changed: [];
}>();

const toast = useToast();
const { can } = usePermissions();
const canUpdate = computed(() => can(RESOURCES.SSP, ACTIONS.UPDATE));
const axiosInstance = useAuthenticatedInstance();
const { confirmDeleteDialog } = useDeleteConfirmationDialog();

// Shared page-level fetch when the /controls IndexView provides it; standalone on other
// surfaces (SSP editor drawers).
const leveraged =
  inject(LeveragedControlsKey, null) ??
  useLeveragedControls(computed(() => props.sspId));

const { controlsError, responsibilityFiltersError } = leveraged;

const links = computed<LeveragedControl[]>(
  () =>
    leveraged.linksByStatement.value.get(
      linkKey(props.implementation.controlId, props.statement.statementId),
    ) ?? [],
);

function rowsFor(link: LeveragedControl) {
  return inheritedResponsibilityRows(link, props.statement);
}

function filtersFor(responsibilityUuid: string) {
  return leveraged.filtersByResponsibility.value.get(responsibilityUuid) ?? [];
}

// The downstream by-component the link's inherited entry hangs off — the anchor for
// satisfied CRUD, resolved exactly by uuid (never by heuristics).
function anchorFor(link: LeveragedControl) {
  if (!link.byComponentId) return undefined;
  return props.statement.byComponents?.find(
    (bc) => bc.uuid === link.byComponentId,
  );
}

function errorDetail(error: unknown, fallback: string): string {
  const errorResponse = error as AxiosError<ErrorResponse<ErrorBody>>;
  return errorResponse.response?.data?.errors?.body || fallback;
}

// ---- "How we handle this" → satisfied entries (OSCAL subtree: kebab-case wire) ----

const drafts = reactive(new Map<string, string>());
const savingResponsibility = ref<string | null>(null);

function draftFor(row: InheritedResponsibilityRow): string {
  return drafts.get(row.responsibilityUuid) ?? row.satisfiedDescription ?? '';
}

function setDraft(responsibilityUuid: string, value: string) {
  drafts.set(responsibilityUuid, value);
}

function satisfiedBaseUrl(link: LeveragedControl): string {
  return `/api/oscal/system-security-plans/${props.sspId}/control-implementation/implemented-requirements/${props.implementation.uuid}/statements/${props.statement.uuid}/by-components/${link.byComponentId}/satisfied`;
}

async function saveSatisfied(
  link: LeveragedControl,
  row: InheritedResponsibilityRow,
) {
  const description = draftFor(row).trim();
  if (!description) {
    toast.add({
      severity: 'warn',
      summary: 'Describe how you handle it first.',
      life: 3000,
    });
    return;
  }
  savingResponsibility.value = row.responsibilityUuid;
  try {
    if (row.satisfiedUuid) {
      await axiosInstance.put(
        `${satisfiedBaseUrl(link)}/${row.satisfiedUuid}`,
        { description },
        { transformRequest: [decamelizeKeys] },
      );
    } else {
      await axiosInstance.post(
        satisfiedBaseUrl(link),
        {
          uuid: newUuid(),
          responsibilityUuid: row.responsibilityUuid,
          description,
        },
        { transformRequest: [decamelizeKeys] },
      );
    }
    drafts.delete(row.responsibilityUuid);
    toast.add({
      severity: 'success',
      summary: 'Saved how this responsibility is handled.',
      life: 3000,
    });
    await leveraged.refresh();
    emit('changed');
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: errorDetail(error, 'Failed to save the description.'),
      life: 5000,
    });
  } finally {
    savingResponsibility.value = null;
  }
}

function removeSatisfied(
  link: LeveragedControl,
  row: InheritedResponsibilityRow,
) {
  confirmDeleteDialog(
    async () => {
      try {
        await axiosInstance.delete(
          `${satisfiedBaseUrl(link)}/${row.satisfiedUuid}`,
        );
        drafts.delete(row.responsibilityUuid);
        toast.add({
          severity: 'success',
          summary: 'Removed — the responsibility is open again.',
          life: 3000,
        });
        await leveraged.refresh();
        emit('changed');
      } catch (error) {
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: errorDetail(error, 'Failed to remove the description.'),
          life: 5000,
        });
      }
    },
    {
      itemName: row.description,
      itemType: 'handled-responsibility note',
    },
  );
}

// ---- Evidence dashboards ↔ responsibility (camelCase filters API — NO decamelize) ----

const { data: allDashboards, execute: fetchDashboards } = useDataApi<
  Dashboard[]
>(null, {}, { immediate: false });

const linkingResponsibility = ref<string | null>(null);
const selectedDashboard = ref<Dashboard | null>(null);
const attaching = ref(false);
let dashboardsLoaded = false;

async function openLinkPicker(responsibilityUuid: string) {
  closeCreatePicker();
  linkingResponsibility.value = responsibilityUuid;
  selectedDashboard.value = null;
  if (!dashboardsLoaded) {
    try {
      await fetchDashboards(`/api/filters?sspId=${props.sspId}`);
      dashboardsLoaded = true;
    } catch {
      // The picker shows an empty list; linking can be retried.
    }
  }
}

function closeLinkPicker() {
  linkingResponsibility.value = null;
  selectedDashboard.value = null;
}

function linkableDashboards(responsibilityUuid: string): Dashboard[] {
  const attached = new Set(
    filtersFor(responsibilityUuid).map((f) => f.filterId),
  );
  return (allDashboards.value ?? []).filter(
    (dashboard) =>
      !!dashboard.id &&
      !attached.has(dashboard.id) &&
      // Component-scoped dashboards can't also be control-scoped.
      !dashboard.components?.length,
  );
}

async function attachFilter(responsibilityUuid: string) {
  const dashboard = selectedDashboard.value;
  if (!dashboard?.id) return;
  attaching.value = true;
  try {
    const body: AttachFilterResponsibilityRequest = {
      responsibilityUuid,
      sspId: props.sspId,
      controlId: props.implementation.controlId,
    };
    await axiosInstance.post(
      `/api/filters/${dashboard.id}/responsibilities`,
      body,
    );
    toast.add({
      severity: 'success',
      summary: 'Evidence filter linked — coverage now follows its evidence.',
      life: 3000,
    });
    closeLinkPicker();
    await leveraged.refresh();
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: errorDetail(error, 'Failed to link the evidence filter.'),
      life: 5000,
    });
  } finally {
    attaching.value = false;
  }
}

async function detachFilter(
  responsibilityUuid: string,
  filter: ResponsibilityFilter,
) {
  try {
    await axiosInstance.delete(
      `/api/filters/${filter.filterId}/responsibilities/${responsibilityUuid}`,
      { params: { sspId: props.sspId } },
    );
    toast.add({
      severity: 'success',
      summary: 'Evidence filter unlinked.',
      life: 3000,
    });
    await leveraged.refresh();
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: errorDetail(error, 'Failed to unlink the evidence filter.'),
      life: 5000,
    });
  }
}

// ---- Create a new evidence dashboard for a responsibility ----
// Mirrors the control statement's "New Evidence Dashboard" flow, then attaches the
// freshly-created dashboard to this responsibility (which also links the control).

const {
  name: dashboardName,
  selectedBaselineEvidence,
  evidenceLoading,
  labelConditions,
  newLabelName,
  newLabelValue,
  uniqueEvidenceTitles,
  availableLabelNames,
  availableLabelValues,
  computedFilter,
  scopeFollowable,
  followSspScope,
  loadAvailableEvidence,
  addLabelCondition,
  removeLabelCondition,
  reset: resetDashboardForm,
} = useEvidenceDashboardForm(() => props.sspId);

const creatingForResponsibility = ref<string | null>(null);
const creatingDashboard = ref(false);
const createDashboardError = ref('');

async function openCreatePicker(responsibilityUuid: string) {
  closeLinkPicker();
  resetDashboardForm();
  createDashboardError.value = '';
  creatingForResponsibility.value = responsibilityUuid;
  await loadAvailableEvidence();
}

function closeCreatePicker() {
  creatingForResponsibility.value = null;
  createDashboardError.value = '';
  resetDashboardForm();
}

async function createDashboard(responsibilityUuid: string) {
  createDashboardError.value = '';
  if (!dashboardName.value.trim()) {
    toast.add({
      severity: 'warn',
      summary: 'Give the evidence filter a name first.',
      life: 3000,
    });
    return;
  }
  if (!computedFilter.value.trim()) {
    createDashboardError.value =
      'Add at least one label condition before creating the evidence filter.';
    return;
  }
  let parsedFilter;
  try {
    parsedFilter = new FilterParser(computedFilter.value.trim()).parse();
  } catch (parseError) {
    console.error('Failed to parse label filter:', parseError);
    createDashboardError.value =
      'The label filter is invalid. Check its syntax and try again.';
    return;
  }
  creatingDashboard.value = true;
  try {
    // /api/filters is a camelCase API — no decamelize (matches attachFilter). Omit
    // controls: attaching to the responsibility below is what links the control.
    const res = await axiosInstance.post('/api/filters', {
      name: dashboardName.value.trim(),
      filter: parsedFilter,
      sspId: props.sspId,
      ...(scopeFollowable.value && followSspScope.value
        ? { followSspScope: true }
        : {}),
    });
    const created = (res.data?.data ?? res.data) as Dashboard | undefined;
    if (!created?.id) {
      throw new Error('The created evidence filter did not return an id.');
    }
    const body: AttachFilterResponsibilityRequest = {
      responsibilityUuid,
      sspId: props.sspId,
      controlId: props.implementation.controlId,
    };
    await axiosInstance.post(
      `/api/filters/${created.id}/responsibilities`,
      body,
    );
    toast.add({
      severity: 'success',
      summary:
        'Evidence filter created and linked — coverage now follows its evidence.',
      life: 3000,
    });
    closeCreatePicker();
    // A subsequent "Link existing" reload should include the new dashboard.
    dashboardsLoaded = false;
    await leveraged.refresh();
  } catch (error) {
    createDashboardError.value = errorDetail(
      error,
      'Failed to create the evidence filter.',
    );
  } finally {
    creatingDashboard.value = false;
  }
}

// ---- Re-attest (drifted links only) ----

const reattestingLinkId = ref<string | null>(null);

async function reAttest(link: LeveragedControl) {
  reattestingLinkId.value = link.id;
  try {
    await axiosInstance.post(
      `/api/oscal/system-security-plans/${props.sspId}/leveraged-controls/${link.id}/attest`,
    );
    toast.add({
      severity: 'success',
      summary: 'Re-attested against the provider’s current version.',
      life: 3000,
    });
    await leveraged.refresh();
    emit('changed');
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: errorDetail(error, 'Failed to re-attest.'),
      life: 5000,
    });
  } finally {
    reattestingLinkId.value = null;
  }
}
</script>
