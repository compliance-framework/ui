<template>
  <div v-if="links.length" class="mt-8">
    <div class="flex items-center mb-4 gap-x-4">
      <TooltipTitle
        text="Inherited responsibilities"
        tooltip-key="control.implementation.inherited-responsibilities"
        position="bottom"
        underline-class="font-medium text-xl underline decoration-dotted cursor-help"
      />
    </div>

    <div
      v-for="link in links"
      :key="link.id"
      class="mb-4 rounded border border-purple-200 p-3 dark:border-purple-900"
    >
      <div class="flex flex-wrap items-center gap-2">
        <span class="text-sm font-medium dark:text-slate-300">
          {{ link.inheritedFrom.offeringTitle }} v{{
            link.inheritedFrom.offeringVersion
          }}
        </span>
        <Badge :severity="satisfactionSeverity(link.satisfaction)">
          {{ satisfactionLabel(link.satisfaction) }}
        </Badge>
      </div>
      <p class="mt-1 text-xs text-gray-500 dark:text-slate-400">
        {{ link.inheritedFrom.offeringTitle }} covers part of this control.
        These are the parts your team still handles.
      </p>

      <Message
        v-if="link.status === 'drifted'"
        severity="warn"
        variant="outlined"
        class="mt-2"
      >
        <div class="flex items-center justify-between gap-3">
          <span>
            The provider's implementation changed since you imported it.
          </span>
          <PermissionGate :resource="RESOURCES.SSP" :action="ACTIONS.UPDATE">
            <SecondaryButton
              type="button"
              size="small"
              :disabled="reattestingLinkId === link.id"
              @click="reAttest(link)"
            >
              {{
                reattestingLinkId === link.id ? 'Re-attesting…' : 'Re-attest'
              }}
            </SecondaryButton>
          </PermissionGate>
        </div>
      </Message>
      <Message
        v-else-if="link.status === 'revoked'"
        severity="error"
        variant="outlined"
        class="mt-2"
      >
        The provider revoked this capability — its inherited coverage no longer
        applies.
      </Message>

      <div
        v-for="row in rowsFor(link)"
        :key="row.responsibilityUuid"
        class="mt-3 rounded border border-ccf-200 p-3 dark:border-slate-600"
      >
        <div class="flex flex-wrap items-center gap-2">
          <!-- Once a dashboard is linked below, its evidence count carries the
               coverage signal; the posture badge would just duplicate it. -->
          <Badge
            v-if="!filtersFor(row.responsibilityUuid).length"
            :severity="postureSeverity(row.posture)"
          >
            {{ postureLabel(row.posture) }}
          </Badge>
          <span class="text-sm dark:text-slate-300">
            {{ row.description }}
          </span>
        </div>

        <template v-if="anchorFor(link)">
          <!-- How we handle this → the statement's satisfied entry for this responsibility -->
          <div class="mt-2">
            <Label :for="`handled-${row.responsibilityUuid}`">
              How we handle this
            </Label>
            <Textarea
              :id="`handled-${row.responsibilityUuid}`"
              :model-value="draftFor(row)"
              class="w-full"
              rows="2"
              placeholder="Describe what your team does to meet this responsibility…"
              @update:model-value="setDraft(row.responsibilityUuid, $event)"
            />
            <PermissionGate :resource="RESOURCES.SSP" :action="ACTIONS.UPDATE">
              <div class="mt-1 flex justify-end gap-2">
                <button
                  v-if="row.satisfiedUuid"
                  type="button"
                  class="text-red-500 hover:text-red-700 text-sm"
                  @click="removeSatisfied(link, row)"
                >
                  Remove
                </button>
                <SecondaryButton
                  type="button"
                  size="small"
                  :disabled="savingResponsibility === row.responsibilityUuid"
                  @click="saveSatisfied(link, row)"
                >
                  {{
                    savingResponsibility === row.responsibilityUuid
                      ? 'Saving…'
                      : 'Save'
                  }}
                </SecondaryButton>
              </div>
            </PermissionGate>
          </div>
        </template>
        <p v-else class="mt-2 text-xs text-gray-500 dark:text-slate-400">
          This inherited entry is missing its component record — re-import the
          capability to manage it here.
        </p>

        <!-- Evidence dashboards attached to this responsibility -->
        <div class="mt-3">
          <div class="text-xs font-medium text-gray-700 dark:text-slate-300">
            Evidence dashboards
          </div>
          <div
            v-for="filter in filtersFor(row.responsibilityUuid)"
            :key="filter.filterId"
            class="mt-1 flex flex-wrap items-center gap-2 text-xs"
          >
            <span class="dark:text-slate-300">{{ filter.filterName }}</span>
            <DashboardEvidenceCounter :dashboard-id="filter.filterId" />
            <PermissionGate :resource="RESOURCES.SSP" :action="ACTIONS.UPDATE">
              <button
                type="button"
                class="text-red-500 hover:text-red-700"
                :title="
                  filter.controlLinkCreated
                    ? 'Also stops counting it toward the control'
                    : undefined
                "
                @click="detachFilter(row.responsibilityUuid, filter)"
              >
                Unlink
              </button>
            </PermissionGate>
          </div>
          <div
            v-if="!filtersFor(row.responsibilityUuid).length"
            class="mt-1 text-xs text-gray-500 dark:text-slate-400"
          >
            No dashboards linked — link one and this responsibility's coverage
            follows its evidence.
          </div>

          <PermissionGate :resource="RESOURCES.SSP" :action="ACTIONS.UPDATE">
            <!-- Link an existing dashboard -->
            <div
              v-if="linkingResponsibility === row.responsibilityUuid"
              class="mt-2 flex flex-wrap items-center gap-2"
            >
              <Select
                v-model="selectedDashboard"
                :options="linkableDashboards(row.responsibilityUuid)"
                option-label="name"
                filter
                placeholder="Select a dashboard…"
                class="w-64"
              />
              <SecondaryButton
                type="button"
                size="small"
                :disabled="!selectedDashboard || attaching"
                @click="attachFilter(row.responsibilityUuid)"
              >
                {{ attaching ? 'Linking…' : 'Link' }}
              </SecondaryButton>
              <button
                type="button"
                class="text-sm text-gray-500 hover:text-gray-700 dark:text-slate-400"
                @click="closeLinkPicker"
              >
                Cancel
              </button>
            </div>

            <!-- Create a new evidence dashboard, then link it to this responsibility -->
            <EvidenceDashboardForm
              v-else-if="creatingForResponsibility === row.responsibilityUuid"
              v-model:name="dashboardName"
              v-model:selected-baseline-evidence="selectedBaselineEvidence"
              v-model:new-label-name="newLabelName"
              v-model:new-label-value="newLabelValue"
              :unique-evidence-titles="uniqueEvidenceTitles"
              :evidence-loading="evidenceLoading"
              :label-conditions="labelConditions"
              :available-label-names="availableLabelNames"
              :available-label-values="availableLabelValues"
              :computed-filter="computedFilter"
              :is-submitting="creatingDashboard"
              :server-error="createDashboardError"
              @submit="createDashboard(row.responsibilityUuid)"
              @cancel="closeCreatePicker"
              @add-condition="addLabelCondition"
              @remove-condition="removeLabelCondition"
            />

            <!-- Default: link an existing dashboard or create a new one -->
            <div v-else class="mt-2 flex flex-wrap items-center gap-2">
              <SecondaryButton
                type="button"
                size="small"
                @click="openLinkPicker(row.responsibilityUuid)"
              >
                Link dashboard
              </SecondaryButton>
              <SecondaryButton
                type="button"
                size="small"
                @click="openCreatePicker(row.responsibilityUuid)"
              >
                Create dashboard
              </SecondaryButton>
            </div>
          </PermissionGate>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, reactive, ref } from 'vue';
import { useToast } from 'primevue/usetoast';
import type { AxiosError } from 'axios';
import Badge from '@/volt/Badge.vue';
import Label from '@/volt/Label.vue';
import Message from '@/volt/Message.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import Select from '@/volt/Select.vue';
import Textarea from '@/volt/Textarea.vue';
import PermissionGate from '@/components/auth/PermissionGate.vue';
import TooltipTitle from '@/components/TooltipTitle.vue';
import DashboardEvidenceCounter from './DashboardEvidenceCounter.vue';
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
  postureLabel,
  postureSeverity,
  satisfactionLabel,
  satisfactionSeverity,
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
const axiosInstance = useAuthenticatedInstance();
const { confirmDeleteDialog } = useDeleteConfirmationDialog();

// Shared page-level fetch when the /controls IndexView provides it; standalone on other
// surfaces (SSP editor drawers).
const leveraged =
  inject(LeveragedControlsKey, null) ??
  useLeveragedControls(computed(() => props.sspId));

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
      summary: 'Dashboard linked — coverage now follows its evidence.',
      life: 3000,
    });
    closeLinkPicker();
    await leveraged.refresh();
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: errorDetail(error, 'Failed to link the dashboard.'),
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
      summary: 'Dashboard unlinked.',
      life: 3000,
    });
    await leveraged.refresh();
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: errorDetail(error, 'Failed to unlink the dashboard.'),
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
  loadAvailableEvidence,
  addLabelCondition,
  removeLabelCondition,
  reset: resetDashboardForm,
} = useEvidenceDashboardForm();

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
      summary: 'Give the dashboard a name first.',
      life: 3000,
    });
    return;
  }
  if (!computedFilter.value.trim()) {
    createDashboardError.value =
      'Add at least one label condition before creating the dashboard.';
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
    });
    const created = (res.data?.data ?? res.data) as Dashboard | undefined;
    if (!created?.id) {
      throw new Error('The created dashboard did not return an id.');
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
        'Dashboard created and linked — coverage now follows its evidence.',
      life: 3000,
    });
    closeCreatePicker();
    // A subsequent "Link existing" reload should include the new dashboard.
    dashboardsLoaded = false;
    await leveraged.refresh();
  } catch (error) {
    createDashboardError.value = errorDetail(
      error,
      'Failed to create the dashboard.',
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
