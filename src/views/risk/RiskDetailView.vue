<template>
  <div class="p-6 space-y-6">
    <PageHeader>{{ pageTitle }}</PageHeader>

    <Message v-if="contextMissing" severity="error" variant="outlined">
      <h4 class="font-bold">{{ missingContextTitle }}</h4>
      <p class="text-sm">{{ missingContextDetail }}</p>
    </Message>

    <div v-else class="space-y-6">
      <div v-if="loading" class="text-sm text-gray-600 dark:text-slate-400">
        Loading risk details...
      </div>

      <Message v-else-if="loadError" severity="error" variant="outlined">
        <h4 class="font-bold">Error loading risk</h4>
        <p class="text-sm">{{ loadError }}</p>
      </Message>

      <Message v-else-if="notFound" severity="warn" variant="outlined">
        <h4 class="font-bold">Risk not found</h4>
        <p class="text-sm">The requested risk could not be located.</p>
      </Message>

      <div v-else-if="risk" class="space-y-6">
        <div
          class="bg-white dark:bg-slate-900 border border-ccf-300 dark:border-slate-700 rounded-lg p-6 space-y-4"
        >
          <div class="flex flex-col gap-2">
            <h2 class="text-xl font-semibold text-gray-900 dark:text-slate-200">
              {{ risk.title || 'Untitled Risk' }}
            </h2>
            <div class="text-sm text-gray-700 dark:text-slate-300">
              {{ risk.description || 'No description provided.' }}
            </div>
            <div
              v-if="risk.statement"
              class="text-sm text-gray-600 dark:text-slate-300"
            >
              <span class="font-semibold">Statement:</span>
              <span class="ml-1">{{ risk.statement }}</span>
            </div>
          </div>

          <div
            class="flex flex-wrap gap-4 text-sm text-gray-700 dark:text-slate-300"
          >
            <div>
              <span class="font-semibold">Status:</span>
              <span class="ml-1">{{ riskStatusDisplay }}</span>
            </div>
            <div>
              <span class="font-semibold">Review Deadline:</span>
              <span class="ml-1">{{ formatDate(overviewReviewDeadline) }}</span>
            </div>
            <div>
              <span class="font-semibold">Threat IDs:</span>
              <span class="ml-1">
                <template v-if="risk.threatIds?.length">
                  {{
                    risk.threatIds
                      .map((item) =>
                        typeof item === 'string' ? item : item.id,
                      )
                      .filter(Boolean)
                      .join(', ')
                  }}
                </template>
                <template v-else>None</template>
              </span>
            </div>
          </div>
        </div>

        <div
          class="border-b border-ccf-300 dark:border-slate-700 flex flex-wrap gap-2 pb-2"
        >
          <button
            v-for="tab in tabs"
            :key="tab.id"
            @click="activeTab = tab.id"
            class="px-3 py-1 rounded-md text-sm"
            :class="
              tab.id === activeTab
                ? 'bg-blue-600 text-white'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            "
          >
            {{ tab.label }}
          </button>
        </div>

        <div>
          <div v-if="activeTab === 'overview'" class="space-y-4">
            <div
              class="bg-white dark:bg-slate-900 border border-ccf-300 dark:border-slate-700 rounded-lg p-4 space-y-4"
            >
              <div class="flex flex-wrap items-center justify-between gap-3">
                <h3
                  class="text-sm font-semibold text-gray-800 dark:text-slate-200"
                >
                  Lifecycle
                </h3>
                <div v-if="isSspContext" class="flex flex-wrap gap-2">
                  <button
                    v-if="canStartInvestigationAction"
                    class="px-3 py-1 rounded-md text-sm bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-60"
                    :disabled="workflowSubmitting"
                    @click="startInvestigation"
                  >
                    Start Investigation
                  </button>
                  <button
                    v-if="canCloseAction"
                    class="px-3 py-1 rounded-md text-sm bg-rose-700 hover:bg-rose-800 text-white disabled:opacity-60"
                    :disabled="workflowSubmitting"
                    @click="closeRiskFromOpen"
                  >
                    Close Risk
                  </button>
                  <button
                    v-if="canAcceptAction"
                    class="px-3 py-1 rounded-md text-sm bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60"
                    :disabled="workflowSubmitting"
                    @click="showAcceptModal = true"
                  >
                    Accept Risk
                  </button>
                  <button
                    v-if="canReviewAction"
                    class="px-3 py-1 rounded-md text-sm bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-60"
                    :disabled="workflowSubmitting"
                    @click="showReviewModal = true"
                  >
                    Review Risk
                  </button>
                </div>
              </div>

              <div
                class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 text-sm text-gray-700 dark:text-slate-300"
              >
                <div>
                  <p
                    class="text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400"
                  >
                    Status
                  </p>
                  <p class="font-medium text-gray-900 dark:text-slate-100">
                    {{ riskStatusDisplay }}
                  </p>
                </div>

                <div>
                  <p
                    class="text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400"
                  >
                    Review Deadline
                  </p>
                  <p class="font-medium text-gray-900 dark:text-slate-100">
                    {{ formatDate(overviewReviewDeadline) }}
                  </p>
                </div>

                <div>
                  <p
                    class="text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400"
                  >
                    Last Reviewed At
                  </p>
                  <p class="font-medium text-gray-900 dark:text-slate-100">
                    {{ formatDate(overviewLastReviewedAt) }}
                  </p>
                </div>

                <div>
                  <p
                    class="text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400"
                  >
                    Source Type
                  </p>
                  <p class="font-medium text-gray-900 dark:text-slate-100">
                    {{ sourceTypeDisplay }}
                  </p>
                </div>

                <div>
                  <p
                    class="text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400"
                  >
                    First Seen
                  </p>
                  <p class="font-medium text-gray-900 dark:text-slate-100">
                    {{ formatDate(overviewFirstSeenAt) }}
                  </p>
                </div>

                <div>
                  <p
                    class="text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400"
                  >
                    Last Seen
                  </p>
                  <p class="font-medium text-gray-900 dark:text-slate-100">
                    {{ formatDate(overviewLastSeenAt) }}
                  </p>
                </div>
              </div>

              <div
                class="rounded-md border border-ccf-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-3"
              >
                <p
                  class="text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400"
                >
                  Acceptance Justification
                </p>
                <p
                  class="mt-1 text-sm text-gray-700 dark:text-slate-300 whitespace-pre-wrap"
                >
                  {{ overviewAcceptanceJustification || 'N/A' }}
                </p>
              </div>
            </div>

            <div
              class="bg-white dark:bg-slate-900 border border-ccf-300 dark:border-slate-700 rounded-lg p-4 space-y-3"
            >
              <h3
                class="text-sm font-semibold text-gray-800 dark:text-slate-200"
              >
                Workflow State
              </h3>

              <p class="text-sm text-gray-700 dark:text-slate-300">
                <span class="font-semibold"
                  >{{ workflowStageSummary.title }}:</span
                >
                <span class="ml-1">{{ workflowStageSummary.description }}</span>
              </p>

              <p class="text-sm text-gray-700 dark:text-slate-300">
                <span class="font-semibold">Allowed next transitions:</span>
                <span class="ml-1">{{ workflowNextTransitionsSummary }}</span>
              </p>

              <ul
                class="list-disc list-inside text-sm text-gray-600 dark:text-slate-400 space-y-1"
              >
                <li v-for="hint in workflowHints" :key="hint">
                  {{ hint }}
                </li>
              </ul>

              <div
                class="border border-ccf-300 dark:border-slate-700 rounded-md overflow-hidden"
              >
                <div
                  class="px-3 py-2 bg-slate-100 dark:bg-slate-800 text-xs uppercase tracking-wide text-gray-600 dark:text-slate-300"
                >
                  Transition Matrix
                </div>
                <div class="divide-y divide-ccf-300 dark:divide-slate-700">
                  <div
                    v-for="row in workflowTransitionRows"
                    :key="row.status"
                    class="px-3 py-2 text-sm flex flex-col md:flex-row md:items-center md:justify-between gap-1"
                    :class="
                      row.status === normalizedRiskStatus
                        ? 'bg-blue-50 dark:bg-blue-900/20'
                        : ''
                    "
                  >
                    <span class="font-medium text-gray-800 dark:text-slate-200">
                      {{ riskStatusLabel(row.status) }}
                    </span>
                    <span class="text-gray-600 dark:text-slate-400">
                      {{
                        row.next.length
                          ? row.next
                              .map((item) => riskStatusLabel(item))
                              .join(', ')
                          : 'No direct status transitions'
                      }}
                    </span>
                  </div>
                </div>
              </div>

              <p class="text-xs text-gray-500 dark:text-slate-400">
                Review decision outcomes for Risk Accepted:
                <span class="font-semibold">Extend</span> keeps risk accepted
                with a new review deadline;
                <span class="font-semibold">Reopen</span>
                transitions the risk back to Investigating.
              </p>
            </div>

            <RiskOwnerAssignment
              v-if="isSspContext"
              :initial-value="ownerAssignmentsDraft"
              :reset-key="ownerAssignmentsResetKey"
              :disabled="workflowSubmitting"
              mode="overview"
              @change="onOverviewOwnerAssignmentsChange"
              @save="saveOverviewOwnerAssignments"
            />

            <Message v-if="ownerSaveError" severity="error" variant="outlined">
              {{ ownerSaveError }}
            </Message>

            <div
              v-if="risk.remarks"
              class="bg-white dark:bg-slate-900 border border-ccf-300 dark:border-slate-700 rounded-lg p-4"
            >
              <h3
                class="text-sm font-semibold text-gray-800 dark:text-slate-200"
              >
                Remarks
              </h3>
              <p class="text-sm text-gray-700 dark:text-slate-300 mt-2">
                {{ risk.remarks }}
              </p>
            </div>

            <div
              v-if="risk.relatedObservations?.length"
              class="bg-white dark:bg-slate-900 border border-ccf-300 dark:border-slate-700 rounded-lg p-4"
            >
              <h3
                class="text-sm font-semibold text-gray-800 dark:text-slate-200"
              >
                Related Observations
              </h3>
              <ul
                class="list-disc list-inside text-sm text-gray-700 dark:text-slate-300 mt-2"
              >
                <li
                  v-for="obs in risk.relatedObservations"
                  :key="obs.observationUuid"
                >
                  {{ obs.observationUuid }}
                </li>
              </ul>
            </div>
          </div>

          <div v-else-if="activeTab === 'evidence'" class="space-y-4">
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-medium text-gray-900 dark:text-slate-200">
                Evidence
              </h3>
              <button
                class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm"
                :disabled="saving"
                @click="openAssociationPicker('evidence')"
              >
                Add Evidence
              </button>
            </div>

            <div
              v-if="!evidenceAssociations.length"
              class="text-sm text-gray-600 dark:text-slate-400"
            >
              No evidence linked to this risk.
            </div>

            <div v-else class="space-y-3">
              <div
                v-for="(item, associationIndex) in evidenceAssociations"
                :key="evidenceAssociationKey(item, associationIndex)"
                class="border border-ccf-300 dark:border-slate-700 rounded-lg p-4"
              >
                <div class="flex flex-col md:flex-row md:justify-between gap-4">
                  <div class="space-y-1">
                    <p class="font-medium text-gray-800 dark:text-slate-200">
                      {{ item.title }}
                    </p>
                    <p class="text-sm text-gray-600 dark:text-slate-400">
                      {{ item.description || 'No description.' }}
                    </p>
                    <p class="text-xs text-gray-500 dark:text-slate-500">
                      {{ formatDate(item.start) }}
                      <template v-if="item.end">
                        → {{ formatDate(item.end) }}
                      </template>
                    </p>
                  </div>
                  <div class="flex flex-col gap-3 self-start md:items-end">
                    <div
                      v-if="item.labels?.length"
                      class="flex flex-wrap gap-1.5 md:justify-end"
                    >
                      <span
                        v-for="(label, labelIndex) in evidenceLabelChips(item)"
                        :key="`${evidenceAssociationKey(item, associationIndex)}:label:${labelIndex}`"
                        class="inline-flex items-center rounded-full border border-emerald-300/70 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200"
                      >
                        {{ label }}
                      </span>
                    </div>
                    <div class="flex gap-2 self-start md:self-end">
                      <RouterLinkButton
                        v-if="item.evidenceId || item.evidenceUuid || item.id"
                        variant="text"
                        :to="{
                          name: 'evidence:history',
                          params: {
                            uuid:
                              item.evidenceId || item.evidenceUuid || item.id,
                          },
                        }"
                      >
                        Open
                      </RouterLinkButton>
                      <button
                        class="px-3 py-1 rounded-md text-sm bg-red-600 hover:bg-red-700 text-white"
                        :disabled="saving"
                        @click="unlinkAssociation('evidence', item)"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-else-if="activeTab === 'controls'" class="space-y-4">
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-medium text-gray-900 dark:text-slate-200">
                Controls
              </h3>
              <button
                class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm"
                :disabled="saving"
                @click="openAssociationPicker('controls')"
              >
                Add Control
              </button>
            </div>

            <div
              v-if="!controlAssociations.length"
              class="text-sm text-gray-600 dark:text-slate-400"
            >
              No controls linked to this risk.
            </div>

            <div v-else class="space-y-3">
              <div
                v-for="item in controlAssociations"
                :key="`${item.catalogId || 'default'}:${item.controlId || item.id}`"
                class="border border-ccf-300 dark:border-slate-700 rounded-lg p-4"
              >
                <div class="flex flex-col md:flex-row md:justify-between gap-4">
                  <div class="space-y-1">
                    <p class="font-medium text-gray-800 dark:text-slate-200">
                      {{ item.controlId || item.id }} - {{ item.title }}
                    </p>
                    <p class="text-sm text-gray-600 dark:text-slate-400">
                      Catalog: {{ item.catalogName || 'N/A' }}
                    </p>
                    <p
                      v-if="item.description"
                      class="text-sm text-gray-600 dark:text-slate-400"
                    >
                      {{ item.description }}
                    </p>
                  </div>
                  <div class="flex gap-2 self-start">
                    <RouterLinkButton variant="text" :to="controlRoute(item)">
                      Open
                    </RouterLinkButton>
                    <button
                      class="px-3 py-1 rounded-md text-sm bg-red-600 hover:bg-red-700 text-white"
                      :disabled="saving"
                      @click="unlinkAssociation('controls', item)"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-else-if="activeTab === 'components'" class="space-y-4">
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-medium text-gray-900 dark:text-slate-200">
                Components
              </h3>
              <button
                class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm"
                :disabled="saving"
                @click="openAssociationPicker('components')"
              >
                Add Component
              </button>
            </div>

            <div
              v-if="!componentAssociations.length"
              class="text-sm text-gray-600 dark:text-slate-400"
            >
              No components linked to this risk.
            </div>

            <div v-else class="space-y-3">
              <div
                v-for="item in componentAssociations"
                :key="item.id"
                class="border border-ccf-300 dark:border-slate-700 rounded-lg p-4"
              >
                <div class="flex flex-col md:flex-row md:justify-between gap-4">
                  <div class="space-y-1">
                    <p class="font-medium text-gray-800 dark:text-slate-200">
                      {{ item.title }}
                    </p>
                    <p class="text-sm text-gray-600 dark:text-slate-400">
                      Type: {{ item.type || 'N/A' }}
                    </p>
                    <p class="text-sm text-gray-600 dark:text-slate-400">
                      {{ item.description || 'No description.' }}
                    </p>
                  </div>
                  <div class="flex gap-2 self-start">
                    <RouterLinkButton variant="text" :to="componentRoute(item)">
                      Open
                    </RouterLinkButton>
                    <button
                      class="px-3 py-1 rounded-md text-sm bg-red-600 hover:bg-red-700 text-white"
                      :disabled="saving"
                      @click="unlinkAssociation('components', item)"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-else-if="activeTab === 'history-events'" class="space-y-4">
            <h3 class="text-lg font-medium text-gray-900 dark:text-slate-200">
              History &amp; Events
            </h3>

            <div
              v-if="loadingEvents"
              class="text-sm text-gray-600 dark:text-slate-400"
            >
              Loading risk events...
            </div>

            <div
              v-else-if="!riskEvents.length"
              class="text-sm text-gray-600 dark:text-slate-400"
            >
              No events have been recorded for this risk.
            </div>

            <ol
              v-else
              class="relative border-s border-ccf-300 dark:border-slate-700 ps-5 space-y-6"
            >
              <li v-for="event in riskEvents" :key="event.id" class="relative">
                <span
                  class="absolute -left-[27px] top-1 inline-flex h-3 w-3 rounded-full bg-blue-600"
                ></span>
                <p class="text-xs text-gray-500 dark:text-slate-400">
                  {{ formatDate(event.timestamp) }}
                  <template v-if="event.actor"> • {{ event.actor }}</template>
                </p>
                <p
                  class="text-sm font-semibold text-gray-800 dark:text-slate-200 mt-1"
                >
                  {{ event.type }}
                </p>
                <p class="text-sm text-gray-600 dark:text-slate-400 mt-1">
                  {{ event.details || 'No additional details provided.' }}
                </p>
              </li>
            </ol>
          </div>

          <RiskLogTab
            v-else-if="activeTab === 'log'"
            :entries="risk.riskLog?.entries"
          />
        </div>
      </div>
    </div>

    <RiskAcceptModal
      v-if="risk && isSspContext"
      v-model:visible="showAcceptModal"
      :submitting="workflowSubmitting"
      :initial-owner-assignments="ownerAssignmentsSnapshot"
      @submit="submitAcceptRisk"
    />

    <RiskReviewModal
      v-if="risk && isSspContext"
      v-model:visible="showReviewModal"
      :submitting="workflowSubmitting"
      :acceptance-justification="overviewAcceptanceJustification"
      :review-deadline="overviewReviewDeadline"
      @submit="submitReviewRisk"
    />

    <Dialog
      v-model:visible="showAssociationPicker"
      modal
      size="lg"
      :header="associationPickerTitle"
    >
      <div class="space-y-4">
        <input
          v-model="pickerSearch"
          type="text"
          placeholder="Search items..."
          class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md dark:bg-slate-800 dark:text-slate-200"
        />

        <div
          v-if="pickerLoading"
          class="text-sm text-gray-600 dark:text-slate-400"
        >
          Loading options...
        </div>

        <div
          v-else-if="!filteredPickerOptions.length"
          class="text-sm text-gray-600 dark:text-slate-400"
        >
          No available {{ associationLabel(pickerKind) }} to link.
        </div>

        <div v-else class="max-h-96 overflow-y-auto space-y-2">
          <button
            v-for="option in filteredPickerOptions"
            :key="option.id"
            class="w-full text-left border border-ccf-300 dark:border-slate-700 rounded-md p-3 hover:bg-slate-50 dark:hover:bg-slate-800"
            @click="linkAssociation(option)"
          >
            <p class="text-sm font-medium text-gray-800 dark:text-slate-200">
              {{ option.title }}
            </p>
            <p class="text-xs text-gray-500 dark:text-slate-400 mt-1">
              {{ pickerOptionSubtitle(option) }}
            </p>
          </button>
        </div>

        <div class="flex justify-end pt-2">
          <TertiaryButton @click="showAssociationPicker = false"
            >Close</TertiaryButton
          >
        </div>
      </div>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { cloneFnJSON as cloneDeep } from '@vueuse/core';
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import PageHeader from '@/components/PageHeader.vue';
import Message from '@/volt/Message.vue';
import Dialog from '@/volt/Dialog.vue';
import TertiaryButton from '@/volt/TertiaryButton.vue';
import RouterLinkButton from '@/components/RouterLinkButton.vue';
import RiskLogTab from '@/components/risk/RiskLogTab.vue';
import RiskAcceptModal from '@/components/risk/RiskAcceptModal.vue';
import RiskReviewModal from '@/components/risk/RiskReviewModal.vue';
import RiskOwnerAssignment from '@/components/risk/RiskOwnerAssignment.vue';
import { useSystemStore } from '@/stores/system';
import type { Profile, Risk, SystemComponent } from '@/oscal';
import type { Evidence, EvidenceLabel } from '@/stores/evidence';
import { useToast } from 'primevue/usetoast';
import {
  useDataApi,
  decamelizeKeys,
  useAuthenticatedInstance,
} from '@/composables/axios';
import {
  ALLOWED_RISK_TRANSITIONS,
  canAcceptRisk,
  canReviewRisk,
  getAllowedRiskTransitions,
  normalizeRiskRegisterStatus,
  normalizeOwnerAssignments,
  ownerAssignmentsSignature,
  riskStatusLabel,
  riskWorkflowHints,
  riskWorkflowStage,
  riskWorkflowStageSummary,
  type RiskOwnerAssignmentsPayload,
  type RiskReviewDecision,
} from '@/utils/risk-workflow';
import { getRiskReviewDeadline } from '@/utils/risk-register';
import {
  buildRiskCollectionEndpoint,
  buildRiskItemEndpoint,
  resolveRiskContext,
  type RiskContext,
} from '@/utils/risk-context';
import {
  getRiskAssociations,
  normalizeRiskEvents,
  type RiskAssociationItem,
  type RiskAssociationKind,
  type RiskEventItem,
} from '@/utils/risk-detail';
import { getRiskIdentifier } from '@/utils/risk-id';
import type { DataResponse } from '@/stores/types';

interface AssociationPickerOption extends RiskAssociationItem {
  subtitle?: string;
  catalogId?: string;
  labels?: EvidenceLabel[];
}

interface RiskEvidenceLink {
  riskId: string;
  evidenceId: string;
}

interface RiskControlLink {
  riskId: string;
  catalogId: string | undefined;
  controlId: string;
}

interface RiskComponentLink {
  riskId: string;
  componentId: string;
}

interface ResolvedControlWithCatalog {
  controlId: string;
  catalogId: string;
  title?: string;
  class?: string;
}

interface RiskAcceptSubmitPayload {
  justification: string;
  reviewDeadline: string;
  ownerUpdate?: RiskOwnerAssignmentsPayload;
}

interface RiskReviewSubmitPayload {
  decision: RiskReviewDecision;
  notes?: string;
  nextReviewDeadline?: string;
}

const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'evidence', label: 'Evidence' },
  { id: 'controls', label: 'Controls' },
  { id: 'components', label: 'Components' },
  { id: 'history-events', label: 'History & Events' },
  { id: 'log', label: 'Log' },
] as const;

type TabId = (typeof tabs)[number]['id'];

const route = useRoute();
const toast = useToast();
const systemStore = useSystemStore();
const authenticatedApi = useAuthenticatedInstance();

const riskId = computed(() => route.params.riskId as string | undefined);

const context = computed<RiskContext | null>(() =>
  resolveRiskContext({
    routeName: route.name,
    routeId: (route.params.id as string | undefined) ?? null,
    selectedPoamId: systemStore.system.poam?.uuid,
    selectedSspId: systemStore.system.securityPlan?.uuid,
  }),
);

const isSspRoute = computed(
  () =>
    route.name === 'system-security-plan-risks' ||
    route.name === 'system-security-plan-risk-detail' ||
    route.name === 'risks:index' ||
    route.name === 'risks:detail',
);

const isSspContext = computed(() => context.value?.scope === 'ssp');

const missingContextTitle = computed(() =>
  isSspRoute.value
    ? 'System Security Plan context missing'
    : 'Plan of Action and Milestones context missing',
);
const missingContextDetail = computed(() =>
  isSspRoute.value
    ? 'Unable to determine the System Security Plan that owns this risk.'
    : 'Unable to determine the Plan of Action and Milestones that owns this risk.',
);

const contextMissing = computed(() => !context.value || !riskId.value);

const listEndpoint = computed(() => {
  if (!context.value) return null;
  return buildRiskCollectionEndpoint(context.value);
});

const {
  data: fetchedRisk,
  isLoading: loadingRisk,
  execute: executeFetchRisk,
} = useDataApi<Risk>(null, {}, { immediate: false });

const {
  data: fetchedRisks,
  isLoading: loadingRiskList,
  execute: executeFetchRisks,
} = useDataApi<Risk[]>(null, {}, { immediate: false });

const { data: fetchedAssociationLinks, execute: executeFetchAssociationLinks } =
  useDataApi<unknown[]>(null, {}, { immediate: false });

const { data: fetchedComponentDetail, execute: executeLoadComponentDetail } =
  useDataApi<SystemComponent>(null, {}, { immediate: false });

const { isLoading: savingAssociation, execute: executeAssociationMutation } =
  useDataApi<unknown>(
    null,
    { transformRequest: [decamelizeKeys] },
    { immediate: false },
  );

const {
  data: mutatedRisk,
  isLoading: mutatingRisk,
  execute: executeRiskMutation,
} = useDataApi<Risk>(
  null,
  { transformRequest: [decamelizeKeys] },
  { immediate: false },
);

const {
  data: fetchedEvents,
  isLoading: loadingEvents,
  execute: executeFetchEvents,
} = useDataApi<unknown>(null, {}, { immediate: false });

const {
  data: availableEvidence,
  isLoading: loadingEvidence,
  execute: executeLoadEvidence,
} = useDataApi<Evidence[]>(
  '/api/evidence/search',
  { method: 'POST' },
  { immediate: false },
);

const {
  data: availableComponents,
  isLoading: loadingComponents,
  execute: executeLoadComponents,
} = useDataApi<SystemComponent[]>(null, {}, { immediate: false });

const {
  data: profile,
  isLoading: loadingProfile,
  execute: executeLoadProfile,
} = useDataApi<Profile>(null, {}, { immediate: false });

const {
  data: availableControlsWithCatalog,
  isLoading: loadingResolvedControls,
  execute: executeLoadResolvedControls,
} = useDataApi<ResolvedControlWithCatalog[]>(null, {}, { immediate: false });

const risk = ref<Risk | null>(null);
const riskEvents = ref<RiskEventItem[]>([]);
const evidenceAssociations = ref<AssociationPickerOption[]>([]);
const controlAssociations = ref<AssociationPickerOption[]>([]);
const componentAssociations = ref<AssociationPickerOption[]>([]);
const notFound = ref(false);
const loadError = ref('');

const activeTab = ref<TabId>('overview');
const showAcceptModal = ref(false);
const showReviewModal = ref(false);
const ownerAssignmentsDraft = ref<RiskOwnerAssignmentsPayload>({
  ownerAssignments: [],
});
const ownerAssignmentsSnapshot = ref<RiskOwnerAssignmentsPayload>({
  ownerAssignments: [],
});
const ownerAssignmentsSnapshotSignature = ref('');
const ownerAssignmentsResetKey = ref(0);
const ownerSaveError = ref('');

const resolvedRiskId = computed(
  () => getRiskIdentifier(risk.value) || riskId.value || '',
);

const detailEndpoint = computed(() => {
  if (!context.value || !resolvedRiskId.value) return null;
  return buildRiskItemEndpoint(context.value, resolvedRiskId.value);
});

const pageTitle = computed(() =>
  risk.value?.title ? `Risk: ${risk.value.title}` : 'Risk Detail',
);

const loading = computed(() => loadingRisk.value || loadingRiskList.value);
const saving = computed(() => savingAssociation.value || mutatingRisk.value);
const workflowSubmitting = computed(() => mutatingRisk.value);

function isCanceledError(err: unknown): boolean {
  const maybeError = err as { message?: string; code?: string };
  return (
    maybeError?.code === 'ERR_CANCELED' ||
    maybeError?.message?.toLowerCase() === 'canceled'
  );
}

function extractErrorMessage(
  err: unknown,
  fallback = 'Unable to complete request.',
): string {
  const maybeError = err as {
    message?: string;
    response?: { data?: { errors?: { body?: string } } };
  };

  return (
    maybeError?.response?.data?.errors?.body || maybeError?.message || fallback
  );
}

const riskEventEndpoints = computed(() => {
  if (!context.value || !resolvedRiskId.value) return [];

  const base = buildRiskItemEndpoint(context.value, resolvedRiskId.value);
  return [
    `${base}/events`,
    `${base}/history`,
    `/api/oscal/risks/${resolvedRiskId.value}/events`,
    `/api/oscal/risk-register/risks/${resolvedRiskId.value}/events`,
  ];
});

async function loadRiskEvents() {
  if (!risk.value) {
    riskEvents.value = [];
    return;
  }

  for (const endpoint of riskEventEndpoints.value) {
    try {
      await executeFetchEvents(endpoint);
      const normalizedApiEvents = normalizeRiskEvents(fetchedEvents.value, []);
      if (normalizedApiEvents.length > 0) {
        riskEvents.value = normalizedApiEvents;
        return;
      }
    } catch (err) {
      if (isCanceledError(err)) return;
    }
  }

  riskEvents.value = normalizeRiskEvents([], risk.value.riskLog?.entries);
}

async function loadRisk() {
  loadError.value = '';
  notFound.value = false;
  risk.value = null;
  riskEvents.value = [];
  evidenceAssociations.value = [];
  controlAssociations.value = [];
  componentAssociations.value = [];
  showAcceptModal.value = false;
  showReviewModal.value = false;
  ownerSaveError.value = '';
  ownerAssignmentsDraft.value = { ownerAssignments: [] };
  ownerAssignmentsSnapshot.value = { ownerAssignments: [] };
  ownerAssignmentsSnapshotSignature.value = '';
  let detailFetchError: unknown = null;

  if (contextMissing.value || !detailEndpoint.value || !listEndpoint.value) {
    return;
  }

  try {
    await executeFetchRisk(detailEndpoint.value);
    if (fetchedRisk.value) {
      risk.value = cloneDeep(fetchedRisk.value);
    }
  } catch (err) {
    if (isCanceledError(err)) return;
    detailFetchError = err;
  }

  if (!risk.value) {
    try {
      await executeFetchRisks(listEndpoint.value);
      const match = fetchedRisks.value?.find(
        (item) => getRiskIdentifier(item) === riskId.value,
      );
      if (match) {
        risk.value = cloneDeep(match);
      }
    } catch (err) {
      if (isCanceledError(err)) return;
      loadError.value = extractErrorMessage(err, 'Unable to load risk.');
      return;
    }
  }

  if (!risk.value) {
    const detailStatus = (
      detailFetchError as { response?: { status?: number } }
    )?.response?.status;
    if (detailFetchError && detailStatus !== 404) {
      loadError.value = extractErrorMessage(
        detailFetchError,
        'Unable to load risk.',
      );
      return;
    }
    notFound.value = true;
    return;
  }

  syncAssociationsFromRisk();
  syncOwnerAssignmentsFromRisk();
  await refreshAllAssociationLinks();
  await loadRiskEvents();
}

watch(
  [detailEndpoint, listEndpoint, riskId],
  () => {
    void loadRisk();
  },
  { immediate: true },
);

function notifyRiskUpdated(updatedRisk: Risk) {
  if (typeof window === 'undefined' || !context.value) return;

  window.dispatchEvent(
    new CustomEvent('risk-updated', {
      detail: {
        risk: cloneDeep(updatedRisk),
        context: {
          scope: context.value.scope,
          id: context.value.id,
        },
        poamId: context.value.scope === 'poam' ? context.value.id : undefined,
        sspId: context.value.scope === 'ssp' ? context.value.id : undefined,
      },
    }),
  );
}

const associationsSspId = computed(() => {
  if (context.value?.scope === 'ssp') {
    return context.value.id;
  }
  return systemStore.system.securityPlan?.uuid || '';
});

const associationBaseEndpoint = computed(() => {
  if (!associationsSspId.value || !resolvedRiskId.value) return null;
  return `/api/oscal/system-security-plans/${associationsSspId.value}/risks/${resolvedRiskId.value}`;
});

const normalizedRiskStatus = computed(() =>
  normalizeRiskRegisterStatus(risk.value?.status),
);

const riskStatusDisplay = computed(() => riskStatusLabel(risk.value?.status));

const overviewReviewDeadline = computed(() =>
  risk.value ? getRiskReviewDeadline(risk.value) : undefined,
);

const overviewLastReviewedAt = computed(() =>
  readRiskString(['lastReviewedAt', 'lastReviewed']),
);

const overviewAcceptanceJustification = computed(() =>
  readRiskString(['acceptanceJustification']),
);

const overviewFirstSeenAt = computed(() =>
  readRiskString(['firstSeenAt', 'firstObservedAt']),
);

const overviewLastSeenAt = computed(() =>
  readRiskString(['lastSeenAt', 'lastObservedAt']),
);

const sourceTypeDisplay = computed(() =>
  formatTokenLabel(readRiskString(['sourceType']) || 'manual'),
);

const workflowStage = computed(() => riskWorkflowStage(risk.value?.status));

const workflowStageSummary = computed(() =>
  riskWorkflowStageSummary(workflowStage.value),
);

const workflowHints = computed(() => riskWorkflowHints(risk.value?.status));

const workflowNextTransitions = computed(() =>
  getAllowedRiskTransitions(risk.value?.status),
);

const workflowNextTransitionsSummary = computed(() =>
  workflowNextTransitions.value.length
    ? workflowNextTransitions.value
        .map((status) => riskStatusLabel(status))
        .join(', ')
    : 'No direct status transitions available.',
);

const workflowTransitionRows = computed(() =>
  (
    Object.entries(ALLOWED_RISK_TRANSITIONS) as Array<
      [keyof typeof ALLOWED_RISK_TRANSITIONS, string[]]
    >
  ).map(([status, next]) => ({
    status,
    next,
  })),
);

const canAcceptAction = computed(
  () => isSspContext.value && canAcceptRisk(risk.value?.status),
);

const canReviewAction = computed(
  () => isSspContext.value && canReviewRisk(risk.value?.status),
);

const canStartInvestigationAction = computed(
  () => isSspContext.value && normalizedRiskStatus.value === 'open',
);

const canCloseAction = computed(
  () => isSspContext.value && workflowNextTransitions.value.includes('closed'),
);

// TODO(BCH-1206): add mitigation workflow actions once POA&M implementation lands.
// Planned gaps: investigating -> mitigating-planned and
// mitigating-planned -> mitigating-implemented.
const ownerAssignmentsDirty = computed(
  () =>
    ownerAssignmentsSignature(ownerAssignmentsDraft.value) !==
    ownerAssignmentsSnapshotSignature.value,
);

const loadedComponentsSspId = ref('');
const loadedControlsSspId = ref('');
const evidenceOptionsLoaded = ref(false);
const evidenceDetailCache = new Map<string, AssociationPickerOption>();
const componentDetailCache = new Map<string, AssociationPickerOption>();

watch(associationsSspId, (next, prev) => {
  if (next === prev) return;

  loadedComponentsSspId.value = '';
  loadedControlsSspId.value = '';
  evidenceOptionsLoaded.value = false;
  availableComponents.value = undefined;
  availableEvidence.value = undefined;
  profile.value = undefined;
  availableControlsWithCatalog.value = undefined;
  evidenceDetailCache.clear();
  componentDetailCache.clear();
});

function toRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  return value as Record<string, unknown>;
}

function readString(
  value: Record<string, unknown>,
  keys: string[],
): string | undefined {
  for (const key of keys) {
    const candidate = value[key];
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }
  return undefined;
}

function setAssociations(
  kind: RiskAssociationKind,
  items: AssociationPickerOption[],
) {
  if (kind === 'evidence') {
    evidenceAssociations.value = items;
    return;
  }
  if (kind === 'controls') {
    controlAssociations.value = items;
    return;
  }
  componentAssociations.value = items;
}

function getAssociations(kind: RiskAssociationKind): AssociationPickerOption[] {
  if (kind === 'evidence') return evidenceAssociations.value;
  if (kind === 'controls') return controlAssociations.value;
  return componentAssociations.value;
}

function syncAssociationsFromRisk() {
  evidenceAssociations.value = getRiskAssociations(risk.value, 'evidence').map(
    (item) => ({ ...item }),
  );
  controlAssociations.value = getRiskAssociations(risk.value, 'controls').map(
    (item) => ({ ...item }),
  );
  componentAssociations.value = getRiskAssociations(
    risk.value,
    'components',
  ).map((item) => ({ ...item }));
}

function readRiskString(keys: string[]): string | undefined {
  const source = toRecord(risk.value);
  if (!source) return undefined;
  return readString(source, keys);
}

function formatTokenLabel(value?: string): string {
  const normalized = (value || '').trim();
  if (!normalized) return 'N/A';
  return normalized
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function ownerAssignmentsFromRisk(
  currentRisk: Risk | null,
): RiskOwnerAssignmentsPayload {
  const source = toRecord(currentRisk) || {};
  const primaryOwnerUserId = readString(source, ['primaryOwnerUserId']);
  const rawAssignments = Array.isArray(source.ownerAssignments)
    ? source.ownerAssignments
    : [];

  const ownerAssignments = rawAssignments
    .map((entry) => {
      const assignment = toRecord(entry);
      if (!assignment) return null;
      const ownerKind = readString(assignment, ['ownerKind']) || '';
      const ownerRef = readString(assignment, ['ownerRef']) || '';
      const isPrimary = Boolean(assignment.isPrimary);
      if (ownerKind !== 'user' || !ownerRef) return null;
      return {
        ownerKind: 'user' as const,
        ownerRef,
        isPrimary,
      };
    })
    .filter(
      (
        assignment,
      ): assignment is RiskOwnerAssignmentsPayload['ownerAssignments'][number] =>
        !!assignment,
    );

  return normalizeOwnerAssignments({
    primaryOwnerUserId,
    ownerAssignments,
  });
}

function syncOwnerAssignmentsFromRisk() {
  const normalized = ownerAssignmentsFromRisk(risk.value);
  ownerAssignmentsDraft.value = cloneDeep(normalized);
  ownerAssignmentsSnapshot.value = cloneDeep(normalized);
  ownerAssignmentsSnapshotSignature.value =
    ownerAssignmentsSignature(normalized);
  ownerAssignmentsResetKey.value += 1;
  ownerSaveError.value = '';
}

function onOverviewOwnerAssignmentsChange(
  payload: RiskOwnerAssignmentsPayload,
) {
  ownerAssignmentsDraft.value = normalizeOwnerAssignments(payload);
  ownerSaveError.value = '';
}

function applyRiskUpdate(updated: Risk | undefined) {
  if (!updated) return;
  risk.value = cloneDeep(updated);
  syncOwnerAssignmentsFromRisk();
  notifyRiskUpdated(risk.value);
}

function buildRiskPutPayload(
  overrides: Record<string, unknown>,
): Record<string, unknown> | null {
  if (!risk.value) return null;
  return {
    ...(cloneDeep(risk.value) as Record<string, unknown>),
    ...overrides,
  };
}

async function saveOwnerAssignments(
  payload: RiskOwnerAssignmentsPayload,
  options: { showSuccessToast?: boolean } = {},
): Promise<boolean> {
  if (!isSspContext.value || !detailEndpoint.value) {
    return false;
  }

  const normalized = normalizeOwnerAssignments(payload);
  if (!normalized.primaryOwnerUserId) {
    const detail = 'Primary owner is required before saving owner assignments.';
    ownerSaveError.value = detail;
    toast.add({
      severity: 'error',
      summary: 'Owner update failed',
      detail,
      life: 4000,
    });
    return false;
  }
  const updatePayload = buildRiskPutPayload({
    primaryOwnerUserId: normalized.primaryOwnerUserId,
    ownerAssignments: normalized.ownerAssignments,
  });
  if (!updatePayload) {
    ownerSaveError.value =
      'Unable to update owners: risk details are unavailable.';
    return false;
  }
  ownerSaveError.value = '';

  try {
    await executeRiskMutation(detailEndpoint.value, {
      method: 'PUT',
      data: updatePayload,
    });
    const updatedRisk = mutatedRisk.value;
    applyRiskUpdate(updatedRisk);
    if (options.showSuccessToast !== false) {
      toast.add({
        severity: 'success',
        summary: 'Saved',
        detail: 'Owner assignments updated',
        life: 3000,
      });
    }
    return true;
  } catch (err) {
    const detail = extractErrorMessage(err);
    ownerSaveError.value = detail;
    toast.add({
      severity: 'error',
      summary: 'Owner update failed',
      detail,
      life: 4000,
    });
    return false;
  }
}

async function saveOverviewOwnerAssignments() {
  if (!ownerAssignmentsDirty.value) {
    ownerAssignmentsResetKey.value += 1;
    return;
  }
  await saveOwnerAssignments(ownerAssignmentsDraft.value);
}

async function updateRiskStatus(
  status: 'investigating' | 'closed',
  summary: string,
  detail: string,
) {
  if (!isSspContext.value || !detailEndpoint.value) return;

  const updatePayload = buildRiskPutPayload({ status });
  if (!updatePayload) {
    toast.add({
      severity: 'error',
      summary: 'Status update failed',
      detail: 'Unable to update status: risk details are unavailable.',
      life: 4000,
    });
    return;
  }

  try {
    await executeRiskMutation(detailEndpoint.value, {
      method: 'PUT',
      data: updatePayload,
    });
    const updatedRisk = mutatedRisk.value;
    applyRiskUpdate(updatedRisk);
    await loadRiskEvents();
    toast.add({
      severity: 'success',
      summary,
      detail,
      life: 3000,
    });
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Status update failed',
      detail: extractErrorMessage(err),
      life: 4000,
    });
  }
}

async function startInvestigation() {
  await updateRiskStatus(
    'investigating',
    'Investigation started',
    'Risk status updated to Investigating.',
  );
}

async function closeRiskFromOpen() {
  await updateRiskStatus(
    'closed',
    'Risk closed',
    'Risk status updated to Closed.',
  );
}

async function submitAcceptRisk(payload: RiskAcceptSubmitPayload) {
  if (!isSspContext.value || !detailEndpoint.value) return;

  try {
    if (payload.ownerUpdate) {
      const ownerSaved = await saveOwnerAssignments(payload.ownerUpdate, {
        showSuccessToast: false,
      });
      if (!ownerSaved) {
        return;
      }
    }

    await executeRiskMutation(`${detailEndpoint.value}/accept`, {
      method: 'POST',
      data: {
        justification: payload.justification,
        reviewDeadline: payload.reviewDeadline,
      },
    });
    const updatedRisk = mutatedRisk.value;
    applyRiskUpdate(updatedRisk);
    showAcceptModal.value = false;
    await loadRiskEvents();

    toast.add({
      severity: 'success',
      summary: 'Risk accepted',
      detail: 'Risk acceptance has been recorded.',
      life: 3000,
    });
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Accept failed',
      detail: extractErrorMessage(err),
      life: 4000,
    });
  }
}

async function submitReviewRisk(payload: RiskReviewSubmitPayload) {
  if (!isSspContext.value || !detailEndpoint.value) return;

  if (payload.decision === 'extend' && !payload.nextReviewDeadline) {
    toast.add({
      severity: 'error',
      summary: 'Validation Error',
      detail: 'Next review deadline is required when decision is extend.',
      life: 3500,
    });
    return;
  }

  if (payload.decision === 'reopen' && payload.nextReviewDeadline) {
    toast.add({
      severity: 'error',
      summary: 'Validation Error',
      detail: 'Next review deadline must be empty when decision is reopen.',
      life: 3500,
    });
    return;
  }

  try {
    await executeRiskMutation(`${detailEndpoint.value}/review`, {
      method: 'POST',
      data: {
        decision: payload.decision,
        notes: payload.notes,
        nextReviewDeadline: payload.nextReviewDeadline,
      },
    });
    const updatedRisk = mutatedRisk.value;
    applyRiskUpdate(updatedRisk);
    showReviewModal.value = false;
    await loadRiskEvents();

    toast.add({
      severity: 'success',
      summary: 'Review recorded',
      detail: 'Risk review has been saved.',
      life: 3000,
    });
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Review failed',
      detail: extractErrorMessage(err),
      life: 4000,
    });
  }
}

function associationCollectionEndpoint(kind: RiskAssociationKind) {
  if (!associationBaseEndpoint.value) return null;
  return `${associationBaseEndpoint.value}/${kind}`;
}

function controlCompositeKey(catalogId?: string, controlId?: string) {
  if (!catalogId || !controlId) return '';
  return `${catalogId}:${controlId}`;
}

async function ensureEvidenceOptions() {
  if (evidenceOptionsLoaded.value) return;
  const payload = {
    filter: {
      scope: {},
    },
  };

  await executeLoadEvidence({
    data: payload,
  });
  evidenceOptionsLoaded.value = true;
}

async function ensureComponentOptions() {
  const sspId = associationsSspId.value;
  if (!sspId) return;

  if (loadedComponentsSspId.value === sspId) {
    return;
  }

  await executeLoadComponents(
    `/api/oscal/system-security-plans/${sspId}/system-implementation/components`,
  );
  loadedComponentsSspId.value = sspId;
}

async function ensureControlOptions() {
  const sspId = associationsSspId.value;
  if (!sspId) return;

  if (loadedControlsSspId.value !== sspId) {
    loadedControlsSspId.value = sspId;
    profile.value = undefined;
    availableControlsWithCatalog.value = undefined;
  }

  if (availableControlsWithCatalog.value !== undefined) return;

  if (!profile.value) {
    await executeLoadProfile(
      `/api/oscal/system-security-plans/${sspId}/profile`,
    );
  }

  if (!profile.value?.uuid) return;

  const endpoints = [
    `/api/oscal/profile/${profile.value.uuid}/resolved-with-catalogs`,
    `/api/oscal/profiles/${profile.value.uuid}/resolved-with-catalogs`,
  ];

  for (const endpoint of endpoints) {
    try {
      await executeLoadResolvedControls(endpoint);
      if (availableControlsWithCatalog.value !== undefined) {
        return;
      }
    } catch (err) {
      if (isCanceledError(err)) {
        throw err;
      }
    }
  }

  availableControlsWithCatalog.value = [];
}

async function ensurePickerData(kind: RiskAssociationKind) {
  if (kind === 'evidence') {
    await ensureEvidenceOptions();
    return;
  }

  if (kind === 'controls') {
    await ensureControlOptions();
    return;
  }

  if (kind === 'components') {
    await ensureComponentOptions();
  }
}

const controlPickerOptions = computed<AssociationPickerOption[]>(() =>
  (availableControlsWithCatalog.value || []).map((item) => ({
    id: item.controlId,
    title: item.title || item.controlId,
    controlId: item.controlId,
    catalogId: item.catalogId,
    catalogName: item.catalogId,
    subtitle: `${item.class || 'control'} • ${item.controlId}`,
  })),
);

const componentPickerOptions = computed<AssociationPickerOption[]>(() =>
  (availableComponents.value || []).map((component) => ({
    id: component.uuid,
    title: component.title,
    type: component.type,
    description: component.description,
    subtitle: `${component.type || 'component'} • ${component.uuid}`,
  })),
);

const evidencePickerOptions = computed<AssociationPickerOption[]>(() =>
  (availableEvidence.value || []).map((item) => ({
    id: item.id || item.uuid,
    evidenceId: item.uuid || item.id,
    evidenceUuid: item.uuid,
    title: item.title || item.uuid || item.id,
    description: item.description,
    start: item.start,
    end: item.end,
    labels: normalizeEvidenceLabels(item.labels),
    subtitle: item.uuid || item.id,
  })),
);

const evidencePickerLookup = computed(() => {
  const map = new Map<string, AssociationPickerOption>();
  evidencePickerOptions.value.forEach((item) => {
    [item.evidenceId, item.evidenceUuid, item.id]
      .filter(Boolean)
      .forEach((key) => map.set(key as string, item));
  });
  return map;
});

const controlPickerLookup = computed(() => {
  const composite = new Map<string, AssociationPickerOption>();
  const plainControl = new Map<string, AssociationPickerOption>();

  controlPickerOptions.value.forEach((item) => {
    const controlId = item.controlId || item.id;
    const compositeKey = controlCompositeKey(item.catalogId, controlId);
    if (compositeKey) composite.set(compositeKey, item);
    if (controlId && !plainControl.has(controlId)) {
      plainControl.set(controlId, item);
    }
  });

  return {
    composite,
    plainControl,
  };
});

const componentPickerLookup = computed(() => {
  const map = new Map<string, AssociationPickerOption>();
  componentPickerOptions.value.forEach((item) => {
    if (item.id) {
      map.set(item.id, item);
    }
  });
  return map;
});

function normalizeIdLink(entry: unknown, keys: string[]): string | undefined {
  if (typeof entry === 'string' && entry.trim()) {
    return entry.trim();
  }

  const record = toRecord(entry);
  if (!record) return undefined;

  return readString(record, keys);
}

function parseEvidenceLinks(rows: unknown[]): RiskEvidenceLink[] {
  return rows
    .map((entry) => {
      const evidenceId = normalizeIdLink(entry, [
        'evidenceId',
        'evidenceUuid',
        'id',
        'uuid',
      ]);
      if (!evidenceId) return null;

      const record = toRecord(entry);
      return {
        riskId: record
          ? readString(record, ['riskId']) || resolvedRiskId.value
          : resolvedRiskId.value,
        evidenceId,
      };
    })
    .filter((item): item is RiskEvidenceLink => !!item);
}

function normalizeEvidenceLabels(input: unknown): EvidenceLabel[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((entry) => {
      const record = toRecord(entry);
      if (!record) {
        return null;
      }
      const name = readString(record, ['name']);
      const value = readString(record, ['value']);
      if (!name || !value) {
        return null;
      }
      return { name, value };
    })
    .filter((label): label is EvidenceLabel => !!label);
}

function parseControlLinks(rows: unknown[]): RiskControlLink[] {
  return rows
    .map((entry) => {
      if (typeof entry === 'string' && entry.trim()) {
        return {
          riskId: resolvedRiskId.value,
          controlId: entry.trim(),
          catalogId: undefined,
        };
      }

      const record = toRecord(entry);
      if (!record) return null;

      const controlId = readString(record, ['controlId', 'id']);
      if (!controlId) return null;

      return {
        riskId: readString(record, ['riskId']) || resolvedRiskId.value,
        catalogId: readString(record, ['catalogId', 'catalogUuid', 'catalog']),
        controlId,
      };
    })
    .filter((item): item is RiskControlLink => !!item);
}

function parseComponentLinks(rows: unknown[]): RiskComponentLink[] {
  return rows
    .map((entry) => {
      const componentId = normalizeIdLink(entry, ['componentId', 'id', 'uuid']);
      if (!componentId) return null;

      const record = toRecord(entry);
      return {
        riskId: record
          ? readString(record, ['riskId']) || resolvedRiskId.value
          : resolvedRiskId.value,
        componentId,
      };
    })
    .filter((item): item is RiskComponentLink => !!item);
}

async function loadEvidenceAssociationOption(
  evidenceId: string,
): Promise<AssociationPickerOption> {
  const cached = evidenceDetailCache.get(evidenceId);
  if (cached) return cached;

  const pickerOption = evidencePickerLookup.value.get(evidenceId);
  let detail = pickerOption;

  try {
    const response = await authenticatedApi.get<DataResponse<Evidence>>(
      `/api/evidence/latest/${evidenceId}`,
    );
    const evidence = response?.data?.data;
    if (evidence) {
      detail = {
        id: evidence.id || evidence.uuid || evidenceId,
        evidenceId,
        evidenceUuid: evidence.uuid || evidenceId,
        title: evidence.title || evidence.uuid || evidence.id || evidenceId,
        description: evidence.description,
        start: evidence.start,
        end: evidence.end,
        labels: normalizeEvidenceLabels(evidence.labels),
        subtitle: evidence.uuid || evidence.id || evidenceId,
      };
    }
  } catch (err) {
    if (!isCanceledError(err)) {
      detail = pickerOption;
    }
  }

  const normalized: AssociationPickerOption = {
    ...(detail || {}),
    id: detail?.id || evidenceId,
    evidenceId,
    evidenceUuid: detail?.evidenceUuid || evidenceId,
    title: detail?.title || evidenceId,
    description: detail?.description,
    start: detail?.start,
    end: detail?.end,
    labels: normalizeEvidenceLabels(detail?.labels),
    subtitle: detail?.subtitle || evidenceId,
  };

  evidenceDetailCache.set(evidenceId, normalized);
  return normalized;
}

async function loadComponentAssociationOption(
  componentId: string,
): Promise<AssociationPickerOption> {
  const cached = componentDetailCache.get(componentId);
  if (cached) return cached;

  const pickerOption = componentPickerLookup.value.get(componentId);
  if (pickerOption) {
    componentDetailCache.set(componentId, pickerOption);
    return pickerOption;
  }

  const sspId = associationsSspId.value;
  if (!sspId) {
    return {
      id: componentId,
      title: componentId,
      subtitle: componentId,
    };
  }

  try {
    await executeLoadComponentDetail(
      `/api/oscal/system-security-plans/${sspId}/system-implementation/components/${componentId}`,
    );
    const component = fetchedComponentDetail.value;
    if (component) {
      const normalized: AssociationPickerOption = {
        id: component.uuid || componentId,
        title: component.title || componentId,
        type: component.type,
        description: component.description,
        subtitle: `${component.type || 'component'} • ${component.uuid || componentId}`,
      };
      componentDetailCache.set(componentId, normalized);
      return normalized;
    }
  } catch (err) {
    if (isCanceledError(err)) {
      throw err;
    }
  }

  return {
    id: componentId,
    title: componentId,
    subtitle: componentId,
  };
}

async function refreshAssociationLinks(
  kind: RiskAssociationKind,
  notifyError = false,
) {
  const endpoint = associationCollectionEndpoint(kind);
  if (!endpoint) return;

  try {
    if (kind !== 'evidence') {
      await ensurePickerData(kind);
    }
    await executeFetchAssociationLinks(endpoint);
    const rows = Array.isArray(fetchedAssociationLinks.value)
      ? fetchedAssociationLinks.value
      : [];

    if (kind === 'evidence') {
      const links = parseEvidenceLinks(rows);

      const evidenceIds = Array.from(
        new Set(links.map((link) => link.evidenceId).filter(Boolean)),
      );
      const mapped = await Promise.all(
        evidenceIds.map((evidenceId) =>
          loadEvidenceAssociationOption(evidenceId),
        ),
      );

      setAssociations('evidence', mapped);
      return;
    }

    if (kind === 'controls') {
      const links = parseControlLinks(rows);

      const seen = new Set<string>();
      const mapped: AssociationPickerOption[] = [];

      links.forEach((link) => {
        const catalogId = link.catalogId;
        const controlId = link.controlId;

        const option =
          (catalogId
            ? controlPickerLookup.value.composite.get(
                controlCompositeKey(catalogId, controlId),
              )
            : undefined) ||
          controlPickerLookup.value.plainControl.get(controlId);
        const resolvedCatalogId = catalogId || option?.catalogId;
        const dedupeKey =
          controlCompositeKey(resolvedCatalogId, controlId) || controlId;
        if (!controlId || seen.has(dedupeKey)) return;
        seen.add(dedupeKey);

        mapped.push({
          ...(option || {}),
          id: controlId,
          controlId,
          catalogId: resolvedCatalogId,
          title: option?.title || controlId,
          catalogName: option?.catalogName || resolvedCatalogId || 'Catalog',
          description: option?.description,
          subtitle:
            option?.subtitle ||
            `${option?.catalogName || resolvedCatalogId || 'Catalog'} • ${controlId}`,
        });
      });

      setAssociations('controls', mapped);
      return;
    }

    const links = parseComponentLinks(rows);

    const seen = new Set<string>();
    const mapped: AssociationPickerOption[] = [];

    for (const link of links) {
      const componentId = link.componentId;
      if (!componentId || seen.has(componentId)) continue;
      seen.add(componentId);

      const option = await loadComponentAssociationOption(componentId);
      mapped.push({
        ...(option || {}),
        id: componentId,
        title: option?.title || componentId,
        type: option?.type,
        description: option?.description,
        subtitle: option?.subtitle || componentId,
      });
    }

    setAssociations('components', mapped);
  } catch (err) {
    if (isCanceledError(err)) return;
    if (notifyError) {
      toast.add({
        severity: 'error',
        summary: `Failed to load ${associationLabel(kind).toLowerCase()}`,
        detail: extractErrorMessage(err),
        life: 4000,
      });
    }
  }
}

async function refreshAllAssociationLinks() {
  for (const kind of ['evidence', 'controls', 'components'] as const) {
    await refreshAssociationLinks(kind);
  }
}

function buildAssociationCreatePayload(
  kind: RiskAssociationKind,
  item: AssociationPickerOption,
) {
  if (kind === 'evidence') {
    const evidenceId = item.evidenceId || item.evidenceUuid || item.id;
    return evidenceId ? { evidenceId } : null;
  }

  if (kind === 'controls') {
    const controlId = item.controlId || item.id;
    if (!item.catalogId || !controlId) return null;
    return {
      catalogId: item.catalogId,
      controlId,
    };
  }

  return item.id ? { componentId: item.id } : null;
}

function buildAssociationDeleteEndpoint(
  kind: RiskAssociationKind,
  item: AssociationPickerOption,
) {
  const base = associationCollectionEndpoint(kind);
  if (!base) return null;

  if (kind === 'evidence') {
    const evidenceId = item.evidenceId || item.evidenceUuid || item.id;
    return evidenceId ? `${base}/${encodeURIComponent(evidenceId)}` : null;
  }

  if (kind === 'controls') {
    const controlId = item.controlId || item.id;
    if (!item.catalogId || !controlId) return null;
    return `${base}/${encodeURIComponent(item.catalogId)}/${encodeURIComponent(controlId)}`;
  }

  return item.id ? `${base}/${encodeURIComponent(item.id)}` : null;
}

const showAssociationPicker = ref(false);
const pickerKind = ref<RiskAssociationKind>('evidence');
const pickerSearch = ref('');

const associationLabelMap: Record<RiskAssociationKind, string> = {
  evidence: 'Evidence',
  controls: 'Control',
  components: 'Component',
};

function associationLabel(kind: RiskAssociationKind): string {
  return associationLabelMap[kind];
}

const associationPickerTitle = computed(
  () => `Link ${associationLabel(pickerKind.value)}`,
);

const pickerLoading = computed(() => {
  switch (pickerKind.value) {
    case 'evidence':
      return loadingEvidence.value;
    case 'controls':
      return loadingProfile.value || loadingResolvedControls.value;
    case 'components':
      return loadingComponents.value;
    default:
      return false;
  }
});

const pickerOptions = computed<AssociationPickerOption[]>(() => {
  switch (pickerKind.value) {
    case 'evidence':
      return evidencePickerOptions.value;
    case 'controls':
      return controlPickerOptions.value;
    case 'components':
      return componentPickerOptions.value;
    default:
      return [];
  }
});

function associationKeys(
  kind: RiskAssociationKind,
  item: AssociationPickerOption,
): string[] {
  const keys =
    kind === 'evidence'
      ? [item.evidenceUuid, item.evidenceId, item.id]
      : kind === 'controls'
        ? [
            controlCompositeKey(item.catalogId, item.controlId || item.id),
            item.controlId,
            item.id,
          ]
        : [item.id];

  return Array.from(new Set(keys.filter(Boolean) as string[]));
}

const linkedAssociationIds = computed(() => {
  const linked = new Set<string>();
  getAssociations(pickerKind.value).forEach((item) => {
    associationKeys(pickerKind.value, item).forEach((key) => linked.add(key));
  });
  return linked;
});

const filteredPickerOptions = computed(() => {
  const search = pickerSearch.value.trim().toLowerCase();

  return pickerOptions.value.filter((option) => {
    const optionKeys = associationKeys(pickerKind.value, option);
    if (optionKeys.some((key) => linkedAssociationIds.value.has(key))) {
      return false;
    }

    if (!search) return true;

    const blob = [
      option.id,
      option.title,
      option.description,
      option.type,
      option.catalogName,
      option.controlId,
      option.subtitle,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return blob.includes(search);
  });
});

function pickerOptionSubtitle(option: AssociationPickerOption): string {
  if (option.subtitle) return option.subtitle;

  const parts = [
    option.type,
    option.catalogName,
    option.controlId,
    option.id,
  ].filter(Boolean);

  return parts.join(' • ');
}

async function openAssociationPicker(kind: RiskAssociationKind) {
  pickerKind.value = kind;
  pickerSearch.value = '';
  showAssociationPicker.value = true;

  try {
    await ensurePickerData(kind);
  } catch (err) {
    if (isCanceledError(err)) return;
    toast.add({
      severity: 'error',
      summary: 'Load failed',
      detail: extractErrorMessage(err),
      life: 4000,
    });
  }
}

async function linkAssociation(item: AssociationPickerOption) {
  if (!risk.value) {
    return;
  }

  const current = getAssociations(pickerKind.value);
  const itemKeys = associationKeys(pickerKind.value, item);
  const hasDuplicate = current.some((entry) =>
    associationKeys(pickerKind.value, entry).some((key) =>
      itemKeys.includes(key),
    ),
  );
  if (hasDuplicate) {
    return;
  }

  const endpoint = associationCollectionEndpoint(pickerKind.value);
  const payload = buildAssociationCreatePayload(pickerKind.value, item);
  if (!endpoint || !payload) {
    toast.add({
      severity: 'error',
      summary: 'Link failed',
      detail: `Unable to resolve the ${associationLabel(pickerKind.value).toLowerCase()} link payload.`,
      life: 4000,
    });
    return;
  }

  try {
    await executeAssociationMutation(endpoint, {
      method: 'POST',
      data: payload,
    });
    await refreshAssociationLinks(pickerKind.value, true);
    if (risk.value) {
      notifyRiskUpdated(risk.value);
    }
    toast.add({
      severity: 'success',
      summary: 'Saved',
      detail: `${associationLabel(pickerKind.value)} linked`,
      life: 3000,
    });
    showAssociationPicker.value = false;
  } catch (err) {
    if (isCanceledError(err)) return;
    toast.add({
      severity: 'error',
      summary: 'Link failed',
      detail: extractErrorMessage(err),
      life: 4000,
    });
  }
}

async function unlinkAssociation(
  kind: RiskAssociationKind,
  item: AssociationPickerOption,
) {
  if (!risk.value) return;

  const confirmed = window.confirm(
    `Remove ${associationLabel(kind).toLowerCase()} "${item.title}" from this risk?`,
  );
  if (!confirmed) return;

  const endpoint = buildAssociationDeleteEndpoint(kind, item);
  if (!endpoint) {
    toast.add({
      severity: 'error',
      summary: 'Remove failed',
      detail: `Unable to resolve the ${associationLabel(kind).toLowerCase()} delete endpoint.`,
      life: 4000,
    });
    return;
  }

  try {
    await executeAssociationMutation(endpoint, {
      method: 'DELETE',
    });
    await refreshAssociationLinks(kind, true);
    if (risk.value) {
      notifyRiskUpdated(risk.value);
    }
    toast.add({
      severity: 'success',
      summary: 'Saved',
      detail: `${associationLabel(kind)} removed`,
      life: 3000,
    });
  } catch (err) {
    if (isCanceledError(err)) return;
    toast.add({
      severity: 'error',
      summary: 'Remove failed',
      detail: extractErrorMessage(err),
      life: 4000,
    });
  }
}

function controlRoute(item: RiskAssociationItem) {
  return {
    name: 'controls:index',
    query: {
      controlId: item.controlId || item.id,
    },
  };
}

function componentRoute(item: RiskAssociationItem) {
  return {
    name: 'system:components',
    query: {
      componentId: item.id,
    },
  };
}

function formatDate(value?: string) {
  if (!value) return 'N/A';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

function evidenceAssociationKey(
  item: AssociationPickerOption,
  index: number,
): string {
  const stableIdentifiers = [
    item.evidenceId,
    item.evidenceUuid,
    item.id,
    item.subtitle,
  ].filter(Boolean);
  if (stableIdentifiers.length) {
    return stableIdentifiers.join(':');
  }
  return `evidence-association:${index}`;
}

function evidenceLabelChips(item: AssociationPickerOption): string[] {
  if (!item.labels?.length) {
    return [];
  }
  return item.labels.map((label) => `${label.name}=${label.value}`);
}
</script>
