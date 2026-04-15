<template>
  <div class="p-6 space-y-6">
    <div class="flex items-center justify-between gap-3">
      <div class="flex items-start gap-3">
        <RouterLink
          :to="{ name: 'evidence:index' }"
          class="mt-1 inline-flex h-8 w-8 items-center justify-center rounded-md border border-ccf-300 text-lg leading-none hover:bg-zinc-50 dark:border-slate-700 dark:hover:bg-slate-800"
          aria-label="Back to Evidence"
        >
          &lt;
        </RouterLink>
        <div>
          <PageHeader>{{ evidence?.title || 'Evidence Detail' }}</PageHeader>
          <PageSubHeader v-if="evidence">
            {{ evidence.uuid }}
          </PageSubHeader>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <SecondaryButton v-if="evidence" @click="directToUpdate()">
          Update Evidence
        </SecondaryButton>
      </div>
    </div>

    <div v-if="isLoading" class="text-sm text-gray-600 dark:text-slate-400">
      Loading evidence details...
    </div>

    <Message v-else-if="error" severity="error" variant="outlined">
      <h4 class="font-bold">Error loading evidence</h4>
      <p class="text-sm">The requested evidence record could not be loaded.</p>
    </Message>

    <Message v-else-if="!evidence" severity="warn" variant="outlined">
      <h4 class="font-bold">Evidence not found</h4>
      <p class="text-sm">The requested evidence record could not be located.</p>
    </Message>

    <template v-else>
      <div
        class="bg-white dark:bg-slate-900 border border-ccf-300 dark:border-slate-700 rounded-lg p-6 space-y-4"
      >
        <div class="flex flex-col gap-2">
          <div class="flex flex-wrap items-center gap-3">
            <h2 class="text-xl font-semibold text-gray-900 dark:text-slate-200">
              {{ evidence.title || 'Untitled Evidence' }}
            </h2>
            <span
              :class="[
                'inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide',
                getEvidenceStatusColor(evidence.status?.state),
              ]"
            >
              {{ evidence.status?.state || 'unknown' }}
            </span>
            <span
              v-tooltip.bottom="signatureTooltip"
              :class="[
                'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold',
                signatureBadgeClass,
              ]"
            >
              <component :is="signatureIcon" class="mr-1" />
              {{ signatureBadgeText }}
            </span>
          </div>

          <p class="text-sm text-gray-700 dark:text-slate-300">
            {{ evidence.description || 'No description provided.' }}
          </p>
        </div>

        <div
          class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 text-sm text-gray-700 dark:text-slate-300"
        >
          <div>
            <p
              class="text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400"
            >
              Collected
            </p>
            <p class="font-medium text-gray-900 dark:text-slate-100">
              {{ formatDateTime(evidence.end) }}
            </p>
          </div>

          <div>
            <p
              class="text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400"
            >
              {{ summaryLifecycleLabel }}
            </p>
            <template v-if="showLatestEvidenceLink">
              <RouterLink
                :to="latestEvidenceRoute"
                class="inline-flex items-center rounded-md border border-ccf-300 px-3 py-2 text-sm font-medium text-gray-900 hover:bg-zinc-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                Go to latest evidence
              </RouterLink>
            </template>
            <p v-else class="font-medium" :class="expirationTextClass">
              {{ expirationLabel }}
            </p>
          </div>

          <div>
            <p
              class="text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400"
            >
              Summary
            </p>
            <p class="font-medium text-gray-900 dark:text-slate-100">
              {{ evidence.labels.length }} labels,
              {{ metadataProps.length }} props,
              {{ metadataLinks.length }} links,
              {{ displayableMedia.length }} media items
            </p>
          </div>
        </div>
      </div>

      <div
        class="border-b border-ccf-300 dark:border-slate-700 flex flex-wrap gap-2 pb-2"
      >
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="px-3 py-1 rounded-md text-sm"
          :class="
            tab.id === activeTab
              ? 'bg-blue-600 text-white'
              : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
          "
          @click="activeTab = tab.id"
        >
          {{ tab.label }}
        </button>
      </div>

      <div v-if="activeTab === 'overview'" class="space-y-4">
        <PageCard>
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div class="space-y-2">
              <h3
                class="text-lg font-semibold text-zinc-700 dark:text-slate-200"
              >
                Overview
              </h3>
              <p class="text-sm text-gray-700 dark:text-slate-300">
                {{ evidence.description || 'No description provided.' }}
              </p>
            </div>

            <div class="space-y-2">
              <SecondaryButton @click="showActivities(evidence)">
                View Tasks
              </SecondaryButton>
            </div>
          </div>
        </PageCard>

        <PageCard>
          <h3 class="text-lg font-semibold text-zinc-700 dark:text-slate-200">
            Current State
          </h3>
          <div
            class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 text-sm text-gray-700 dark:text-slate-300"
          >
            <div>
              <p
                class="text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400"
              >
                Status Reason
              </p>
              <p class="font-medium text-gray-900 dark:text-slate-100">
                {{ evidence.status?.reason || 'No reason provided.' }}
              </p>
            </div>
            <div>
              <p
                class="text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400"
              >
                Labels
              </p>
              <p class="font-medium text-gray-900 dark:text-slate-100">
                {{ evidence.labels.length }}
              </p>
            </div>
            <div>
              <p
                class="text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400"
              >
                Tasks
              </p>
              <p class="font-medium text-gray-900 dark:text-slate-100">
                {{ evidence.activities?.length || 0 }}
              </p>
            </div>
            <div>
              <p
                class="text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400"
              >
                Metadata Links
              </p>
              <p class="font-medium text-gray-900 dark:text-slate-100">
                {{ metadataLinks.length }}
              </p>
            </div>
            <div>
              <p
                class="text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400"
              >
                Back Matter Resources
              </p>
              <p class="font-medium text-gray-900 dark:text-slate-100">
                {{ backMatterResources.length }}
              </p>
            </div>
            <div>
              <p
                class="text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400"
              >
                {{ overviewLifecycleLabel }}
              </p>
              <template v-if="showLatestEvidenceLink">
                <RouterLink
                  :to="latestEvidenceRoute"
                  class="inline-flex items-center rounded-md border border-ccf-300 px-3 py-2 text-sm font-medium text-gray-900 hover:bg-zinc-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
                >
                  Go to latest evidence
                </RouterLink>
              </template>
              <p v-else class="font-medium" :class="expirationTextClass">
                {{ expirationLabel }}
              </p>
            </div>
          </div>
        </PageCard>
      </div>

      <div v-else-if="activeTab === 'metadata'" class="space-y-4">
        <PageCard>
          <h3 class="text-lg font-semibold text-zinc-700 dark:text-slate-200">
            Labels
          </h3>
          <div class="mt-4">
            <LabelList
              v-if="evidence.labels.length"
              :labels="evidence.labels"
              show-all
            />
            <p v-else class="text-sm text-gray-600 dark:text-slate-400">
              No labels are available for this evidence record.
            </p>
          </div>
        </PageCard>

        <PageCard>
          <h3 class="text-lg font-semibold text-zinc-700 dark:text-slate-200">
            Props
          </h3>
          <div v-if="metadataProps.length" class="mt-4 space-y-3">
            <div
              v-for="(prop, index) in metadataProps"
              :key="`${prop.name || 'prop'}-${prop.value || ''}-${prop.class || ''}-${prop.ns || ''}-${index}`"
              class="rounded-md border border-ccf-300 p-3 dark:border-slate-700"
            >
              <p class="text-sm text-gray-900 dark:text-slate-200">
                {{ prop.name || 'Unnamed prop' }}: {{ prop.value || '-' }}
              </p>
              <p class="text-xs text-gray-500 dark:text-slate-400">
                class: {{ prop.class || '-' }} | ns: {{ prop.ns || '-' }}
              </p>
              <p
                v-if="prop.remarks"
                class="text-xs text-gray-500 dark:text-slate-400"
              >
                remarks: {{ prop.remarks }}
              </p>
            </div>
          </div>
          <p v-else class="mt-4 text-sm text-gray-600 dark:text-slate-400">
            No props are available for this evidence record.
          </p>
        </PageCard>

        <PageCard>
          <h3 class="text-lg font-semibold text-zinc-700 dark:text-slate-200">
            Links
          </h3>
          <div v-if="metadataLinks.length" class="mt-4 space-y-3">
            <div
              v-for="link in metadataLinks"
              :key="`${link.href}-${link.rel || ''}-${link.text || ''}`"
              class="rounded-md border border-ccf-300 p-3 dark:border-slate-700"
            >
              <div class="flex flex-wrap items-center gap-2 text-sm">
                <span class="font-medium text-gray-900 dark:text-slate-200">
                  {{ link.text || link.href }}
                </span>
                <span
                  v-if="link.rel"
                  class="rounded-full bg-slate-100 px-2 py-0.5 text-xs dark:bg-slate-800"
                >
                  {{ link.rel }}
                </span>
              </div>
              <div class="mt-2 text-sm text-gray-700 dark:text-slate-300">
                <template v-if="isInternalLink(link.href)">
                  Internal resource reference:
                  <code
                    class="rounded bg-slate-100 px-2 py-1 text-xs dark:bg-slate-800"
                  >
                    {{ normalizeLinkHref(link.href) }}
                  </code>
                </template>
                <a
                  v-else-if="getSafeExternalHref(link.href)"
                  :href="getSafeExternalHref(link.href)"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="underline text-blue-600 dark:text-blue-400"
                >
                  {{ normalizeLinkHref(link.href) }}
                </a>
                <template v-else>
                  Unsupported or unsafe link:
                  <code
                    class="rounded bg-slate-100 px-2 py-1 text-xs dark:bg-slate-800"
                  >
                    {{ normalizeLinkHref(link.href) || 'N/A' }}
                  </code>
                </template>
              </div>
            </div>
          </div>
          <p v-else class="mt-4 text-sm text-gray-600 dark:text-slate-400">
            No links are available for this evidence record.
          </p>
        </PageCard>
      </div>

      <div v-else-if="activeTab === 'media'" class="space-y-4">
        <PageCard>
          <h3 class="text-lg font-semibold text-zinc-700 dark:text-slate-200">
            Media
          </h3>

          <div
            v-if="displayableMedia.length"
            class="mt-4 flex flex-col gap-y-4"
          >
            <div
              v-for="media in displayableMedia"
              :key="media.uuid"
              class="border border-ccf-300 rounded-md overflow-hidden"
            >
              <BackMatterDisplay :resource="media" />
              <div
                class="border-t border-ccf-300 py-2 px-4 flex justify-between items-center"
              >
                <span>{{ media.title || media.uuid }}</span>
                <a
                  :download="media.title || media.uuid"
                  :href="`data:${media.base64?.mediaType};base64,${media.base64?.value}`"
                >
                  <BIconDownload />
                </a>
              </div>
            </div>
          </div>

          <p v-else class="mt-4 text-sm text-gray-600 dark:text-slate-400">
            No displayable media resources are linked to this evidence record.
          </p>
        </PageCard>
      </div>

      <div v-else-if="activeTab === 'signature'" class="space-y-4">
        <PageCard>
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3
                class="text-lg font-semibold text-zinc-700 dark:text-slate-200"
              >
                Verification
              </h3>
              <p class="mt-2 text-sm text-gray-700 dark:text-slate-300">
                Run a fresh verification against the current evidence content
                and the stored signed payload.
              </p>
            </div>

            <SecondaryButton :disabled="verifying" @click="runVerification">
              {{ verificationAttempted ? 'Re-verify' : 'Verify' }}
            </SecondaryButton>
          </div>

          <Message
            v-if="verifyError"
            severity="error"
            variant="outlined"
            class="mt-4"
          >
            Verification failed to run for this evidence record.
          </Message>

          <div v-else-if="verificationResult" class="mt-4 space-y-4">
            <div class="flex flex-wrap items-center gap-3">
              <span
                class="inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide"
                :class="
                  verificationResult.isValid
                    ? validBadgeClass
                    : invalidBadgeClass
                "
              >
                {{ verificationResult.isValid ? 'Valid' : 'Invalid' }}
              </span>
              <span class="text-sm text-gray-700 dark:text-slate-300">
                Verification status: {{ verificationResult.status }}
              </span>
            </div>

            <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div
                v-for="check in verificationChecks"
                :key="check.label"
                class="rounded-md border border-ccf-300 p-4 dark:border-slate-700"
              >
                <p
                  class="text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400"
                >
                  {{ check.label }}
                </p>
                <p
                  class="mt-2 text-sm font-semibold"
                  :class="
                    check.value
                      ? 'text-green-700 dark:text-green-400'
                      : 'text-red-700 dark:text-red-400'
                  "
                >
                  {{ check.value ? 'Pass' : 'Fail' }}
                </p>
              </div>
            </div>

            <div
              v-if="verificationResult.contentHash"
              class="rounded-md border border-ccf-300 p-4 dark:border-slate-700"
            >
              <h4 class="font-semibold text-gray-900 dark:text-slate-200">
                Verified Content Hash
              </h4>
              <p class="mt-2 text-sm text-gray-700 dark:text-slate-300">
                {{ verificationResult.contentHash.algorithm }}
              </p>
              <p
                class="mt-2 rounded bg-slate-100 p-3 text-xs break-all dark:bg-slate-800 dark:text-slate-300"
              >
                {{ verificationResult.contentHash.value }}
              </p>
            </div>

            <div
              v-if="verificationResult.errors?.length"
              class="rounded-md border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/30"
            >
              <h4 class="font-semibold text-red-800 dark:text-red-300">
                Verification Errors
              </h4>
              <ul
                class="mt-2 list-disc pl-5 text-sm text-red-700 dark:text-red-300"
              >
                <li
                  v-for="verificationError in verificationResult.errors"
                  :key="verificationError"
                >
                  {{ verificationError }}
                </li>
              </ul>
            </div>
          </div>

          <p v-else class="mt-4 text-sm text-gray-600 dark:text-slate-400">
            Run verification to compare the current evidence content with the
            stored signature payload.
          </p>
        </PageCard>

        <PageCard>
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div class="space-y-2">
              <h3
                class="text-lg font-semibold text-zinc-700 dark:text-slate-200"
              >
                Signature Details
              </h3>
              <p class="text-sm text-gray-700 dark:text-slate-300">
                Stored signature status:
                <span class="font-medium">{{ signatureSummary }}</span>
              </p>
            </div>
            <span
              v-tooltip.bottom="signatureTooltip"
              :class="[
                'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold',
                signatureBadgeClass,
              ]"
            >
              <component :is="signatureIcon" class="mr-1" />
              {{ signatureBadgeText }}
            </span>
          </div>

          <Message
            v-if="signatureError"
            severity="error"
            variant="outlined"
            class="mt-4"
          >
            Failed to load the stored signature for this evidence record.
          </Message>

          <div
            v-else-if="signatureDetail?.signature"
            class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2"
          >
            <div
              class="rounded-md border border-ccf-300 p-4 dark:border-slate-700"
            >
              <h4 class="font-semibold text-gray-900 dark:text-slate-200">
                Envelope
              </h4>
              <dl class="mt-3 space-y-2 text-sm">
                <div class="flex justify-between gap-4">
                  <dt class="text-gray-500 dark:text-slate-400">Version</dt>
                  <dd class="text-right text-gray-900 dark:text-slate-200">
                    {{ signatureDetail.signature.version }}
                  </dd>
                </div>
                <div class="flex justify-between gap-4">
                  <dt class="text-gray-500 dark:text-slate-400">Algorithm</dt>
                  <dd class="text-right text-gray-900 dark:text-slate-200">
                    {{ signatureDetail.signature.signatureAlgorithm }}
                  </dd>
                </div>
                <div class="flex justify-between gap-4">
                  <dt class="text-gray-500 dark:text-slate-400">Signed At</dt>
                  <dd class="text-right text-gray-900 dark:text-slate-200">
                    {{ formatDateTime(signatureDetail.signature.signedAt) }}
                  </dd>
                </div>
                <div class="flex justify-between gap-4">
                  <dt class="text-gray-500 dark:text-slate-400">
                    Content Hash
                  </dt>
                  <dd class="text-right text-gray-900 dark:text-slate-200">
                    {{ signatureDetail.signature.contentHash.algorithm }}
                  </dd>
                </div>
              </dl>
              <p
                class="mt-3 rounded bg-slate-100 p-3 text-xs break-all dark:bg-slate-800 dark:text-slate-300"
              >
                {{ signatureDetail.signature.contentHash.value }}
              </p>
            </div>

            <div
              class="rounded-md border border-ccf-300 p-4 dark:border-slate-700"
            >
              <h4 class="font-semibold text-gray-900 dark:text-slate-200">
                Signer
              </h4>
              <dl class="mt-3 space-y-2 text-sm">
                <div class="flex justify-between gap-4">
                  <dt class="text-gray-500 dark:text-slate-400">Type</dt>
                  <dd class="text-right text-gray-900 dark:text-slate-200">
                    {{ signatureDetail.signature.signer.type || 'N/A' }}
                  </dd>
                </div>
                <div class="flex justify-between gap-4">
                  <dt class="text-gray-500 dark:text-slate-400">Name</dt>
                  <dd class="text-right text-gray-900 dark:text-slate-200">
                    {{ signatureDetail.signature.signer.name || 'N/A' }}
                  </dd>
                </div>
                <div class="flex justify-between gap-4">
                  <dt class="text-gray-500 dark:text-slate-400">Email</dt>
                  <dd class="text-right text-gray-900 dark:text-slate-200">
                    {{ signatureDetail.signature.signer.email || 'N/A' }}
                  </dd>
                </div>
                <div class="flex justify-between gap-4">
                  <dt class="text-gray-500 dark:text-slate-400">ID</dt>
                  <dd class="text-right text-gray-900 dark:text-slate-200">
                    {{ signatureDetail.signature.signer.id || 'N/A' }}
                  </dd>
                </div>
                <div class="flex justify-between gap-4">
                  <dt class="text-gray-500 dark:text-slate-400">
                    Credential ID
                  </dt>
                  <dd class="text-right text-gray-900 dark:text-slate-200">
                    {{ signatureDetail.signature.signer.credentialId || 'N/A' }}
                  </dd>
                </div>
              </dl>
            </div>

            <div
              class="rounded-md border border-ccf-300 p-4 dark:border-slate-700 md:col-span-2"
            >
              <h4 class="font-semibold text-gray-900 dark:text-slate-200">
                Claims
              </h4>
              <div
                class="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3"
              >
                <div
                  v-for="claim in signatureClaims"
                  :key="claim.label"
                  class="text-sm"
                >
                  <p class="text-gray-500 dark:text-slate-400">
                    {{ claim.label }}
                  </p>
                  <p class="font-medium text-gray-900 dark:text-slate-200">
                    {{ claim.value }}
                  </p>
                </div>
              </div>
            </div>

            <div
              class="rounded-md border border-ccf-300 p-4 dark:border-slate-700 md:col-span-2"
            >
              <h4 class="font-semibold text-gray-900 dark:text-slate-200">
                JWS
              </h4>
              <pre
                class="mt-3 overflow-x-auto rounded bg-slate-100 p-3 text-xs break-all whitespace-pre-wrap dark:bg-slate-800 dark:text-slate-300"
                >{{ signatureDetail.signature.jws }}</pre
              >
            </div>
          </div>

          <p v-else class="mt-4 text-sm text-gray-600 dark:text-slate-400">
            No stored signature envelope is available for this evidence record.
          </p>
        </PageCard>
      </div>

      <div v-else class="space-y-4">
        <EvidenceHistorySection :uuid="evidence.uuid" />
      </div>

      <Dialog
        v-model:visible="showActivitiesModal"
        maximizable
        modal
        header="Tasks"
      >
        <div class="px-12 flex-grow">
          <div v-for="activity in activities" :key="activity.uuid">
            <div class="flex items-center">
              <div class="bg-blue-500 rounded-full w-3 aspect-square mr-2" />
              <h4 class="font-medium text-lg">{{ activity.title }}</h4>
            </div>
            <div class="border-l-4 border-blue-500 ml-1 pl-4 pb-4 pt-2">
              <div
                v-for="step in activity.steps"
                :key="step.uuid"
                class="pb-4 last:pb-0"
              >
                <h4 class="font-medium">
                  {{ step.title }}
                </h4>
                <div class="text-sm pl-2">
                  {{ step.description }}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div
          class="mt-4 border-t border-zinc-300 dark:border-slate-400 text-right py-4 px-4"
        >
          <SecondaryButton
            class="px-2 py-1 shadow"
            @click="toggleActivitiesModal(false)"
          >
            Close
          </SecondaryButton>
        </div>
      </Dialog>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import PageHeader from '@/components/PageHeader.vue';
import PageCard from '@/components/PageCard.vue';
import PageSubHeader from '@/components/PageSubHeader.vue';
import BackMatterDisplay from '@/components/BackMatterDisplay.vue';
import LabelList from '@/components/LabelList.vue';
import EvidenceHistorySection from '@/components/evidence/EvidenceHistorySection.vue';
import type { Activity, BackMatterResource, Link, Property } from '@/oscal';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import Dialog from '@/volt/Dialog.vue';
import Message from '@/volt/Message.vue';
import {
  BIconDownload,
  BIconLockFill,
  BIconUnlockFill,
} from 'bootstrap-icons-vue';
import { useDataApi } from '@/composables/axios';
import type {
  Evidence,
  SignatureDetail,
  VerificationResult,
} from '@/stores/evidence.ts';

const route = useRoute();
const router = useRouter();
const evidenceId = computed(() => route.params.id as string);

const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'metadata', label: 'Metadata' },
  { id: 'media', label: 'Media' },
  { id: 'signature', label: 'Signature' },
  { id: 'history', label: 'History' },
] as const;

const activeTab = ref<(typeof tabs)[number]['id']>('overview');
const activities = ref<Activity[]>([] as Activity[]);
const showActivitiesModal = ref(false);
const verificationAttempted = ref(false);

const {
  data: evidence,
  isLoading,
  error,
  execute: loadEvidence,
} = useDataApi<Evidence>(null, null, { immediate: false });
const {
  data: signatureDetail,
  error: signatureError,
  execute: loadSignatureDetail,
} = useDataApi<SignatureDetail>(null, null, { immediate: false });
const { data: latestEvidence, execute: loadLatestEvidence } =
  useDataApi<Evidence>(null, null, { immediate: false });
const {
  data: verificationResult,
  execute: executeVerify,
  isLoading: verifying,
  error: verifyError,
} = useDataApi<VerificationResult>(
  null,
  { method: 'POST' },
  { immediate: false },
);

const metadataProps = computed<Property[]>(() => evidence.value?.props ?? []);
const metadataLinks = computed<Link[]>(() => evidence.value?.links ?? []);
const backMatterResources = computed<BackMatterResource[]>(
  () => evidence.value?.backMatter?.resources ?? [],
);
const resourceMap = computed(() => {
  return new Map(
    backMatterResources.value.map((resource) => [resource.uuid, resource]),
  );
});

const displayableMedia = computed<BackMatterResource[]>(() => {
  return metadataLinks.value
    .filter(
      (link) => typeof link.href === 'string' && link.href.startsWith('#'),
    )
    .map((link) => resourceMap.value.get(link.href.substring(1)))
    .filter((resource): resource is BackMatterResource => Boolean(resource));
});

const signatureBadgeState = computed(() => {
  if (signatureError.value) {
    return {
      text: 'Unavailable',
      tooltip: 'Signature status is unavailable',
      badgeClass:
        'bg-slate-50 text-slate-700 border-slate-400 dark:bg-slate-900/30 dark:text-slate-300 dark:border-slate-600',
      icon: BIconUnlockFill,
    };
  }

  if (!signatureDetail.value) {
    return {
      text: 'Loading...',
      tooltip: 'Signature status is loading',
      badgeClass:
        'bg-slate-50 text-slate-700 border-slate-400 dark:bg-slate-900/30 dark:text-slate-300 dark:border-slate-600',
      icon: BIconUnlockFill,
    };
  }

  if (signatureDetail.value.status === 'signed') {
    return {
      text: 'Signed',
      tooltip: 'Evidence is signed',
      badgeClass:
        'bg-green-50 text-green-800 border-green-800 dark:bg-green-950/30 dark:text-green-500 dark:border-green-600',
      icon: BIconLockFill,
    };
  }

  return {
    text: 'Unsigned',
    tooltip: 'Evidence is unsigned',
    badgeClass:
      'bg-amber-50 text-amber-800 border-amber-700 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-700',
    icon: BIconUnlockFill,
  };
});
const signatureSummary = computed(() => signatureBadgeState.value.text);
const signatureBadgeText = computed(() => signatureBadgeState.value.text);
const signatureTooltip = computed(() => signatureBadgeState.value.tooltip);
const signatureBadgeClass = computed(
  () => signatureBadgeState.value.badgeClass,
);
const signatureIcon = computed(() => signatureBadgeState.value.icon);
const isLatestEvidence = computed(() => {
  if (!evidence.value?.id || !latestEvidence.value?.id) {
    return true;
  }
  return evidence.value.id === latestEvidence.value.id;
});
const showLatestEvidenceLink = computed(() => {
  return Boolean(
    evidence.value?.id && latestEvidence.value?.id && !isLatestEvidence.value,
  );
});
const latestEvidenceRoute = computed(() => ({
  name: 'evidence:view',
  params: { id: latestEvidence.value?.id },
}));
const summaryLifecycleLabel = computed(() =>
  showLatestEvidenceLink.value ? 'Latest Evidence' : 'Expiration Date',
);
const overviewLifecycleLabel = computed(() =>
  showLatestEvidenceLink.value ? 'Latest Evidence' : 'Expiration',
);
const expirationDate = computed(() => evidence.value?.expires);
const isExpired = computed(() => {
  if (!expirationDate.value) {
    return false;
  }
  return new Date(expirationDate.value).getTime() < Date.now();
});
const expiresSoon = computed(() => {
  if (!expirationDate.value || isExpired.value) {
    return false;
  }
  return (
    new Date(expirationDate.value).getTime() - Date.now() <=
    7 * 24 * 60 * 60 * 1000
  );
});
const expirationTextClass = computed(() => {
  if (!expirationDate.value) {
    return 'text-gray-900 dark:text-slate-100';
  }
  if (isExpired.value) {
    return 'text-red-700 dark:text-red-400';
  }
  if (expiresSoon.value) {
    return 'text-amber-700 dark:text-amber-400';
  }
  return 'text-green-700 dark:text-green-400';
});
const expirationLabel = computed(() => {
  if (!expirationDate.value) {
    return 'No expiration date';
  }
  return isExpired.value
    ? `${formatDateTime(expirationDate.value)} (expired)`
    : formatDateTime(expirationDate.value);
});

const signatureClaims = computed(() => {
  const claims = signatureDetail.value?.signature?.claims;
  if (!claims) {
    return [];
  }

  return [
    { label: 'Subject', value: claims.subject || 'N/A' },
    { label: 'Issuer', value: claims.issuer || 'N/A' },
    { label: 'Token Kind', value: claims.tokenKind || 'N/A' },
    { label: 'Issued At', value: formatDateTime(claims.issuedAt) },
    { label: 'Expires At', value: formatDateTime(claims.expiresAt) },
    { label: 'Not Before', value: formatDateTime(claims.notBefore) },
    { label: 'Given Name', value: claims.givenName || 'N/A' },
    { label: 'Family Name', value: claims.familyName || 'N/A' },
    { label: 'Agent ID', value: claims.agentId || 'N/A' },
    { label: 'Credential ID', value: claims.credentialId || 'N/A' },
    { label: 'Auth Method', value: claims.authMethod || 'N/A' },
  ];
});

const verificationChecks = computed(() => {
  if (!verificationResult.value) {
    return [];
  }

  return [
    {
      label: 'Hash Match',
      value: verificationResult.value.checks.hashMatch,
    },
    {
      label: 'Signature Valid',
      value: verificationResult.value.checks.signatureValid,
    },
    {
      label: 'Temporal Valid',
      value: verificationResult.value.checks.temporalValid,
    },
    {
      label: 'Signed Content Matches',
      value: verificationResult.value.checks.signedContentMatches,
    },
  ];
});

const validBadgeClass =
  'bg-green-50 text-green-800 border-green-800 dark:bg-green-950/30 dark:text-green-500 dark:border-green-600';
const invalidBadgeClass =
  'bg-red-50 text-red-800 border-red-800 dark:bg-red-950/30 dark:text-red-500 dark:border-red-600';

enum FindingStatusColor {
  UNKNOWN = 'bg-slate-50 text-slate-700 border-slate-300 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700',
  SATISFIED = 'bg-green-50 text-green-800 border-green-800 dark:bg-green-950/30 dark:text-green-500 dark:border-green-600',
  'NOT-SATISFIED' = 'bg-red-50 text-red-800 border-red-800 dark:bg-red-950/30 dark:text-red-500 dark:border-red-600',
  'IN-PROGRESS' = 'bg-amber-50 text-amber-800 border-amber-700 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-700',
}

function showActivities(selectedEvidence: Evidence) {
  activities.value = selectedEvidence.activities || [];
  toggleActivitiesModal(true);
}

function toggleActivitiesModal(open: boolean) {
  showActivitiesModal.value = open;
}

function getEvidenceStatusColor(status?: string): string {
  return (
    FindingStatusColor[
      status?.toUpperCase() as keyof typeof FindingStatusColor
    ] || FindingStatusColor.UNKNOWN
  );
}

function directToUpdate() {
  return router.push({
    name: 'evidence:update',
    params: { id: evidence.value!.id },
  });
}

async function runVerification() {
  verificationAttempted.value = true;
  await executeVerify(`/api/evidence/${evidenceId.value}/verify`);
}

function formatDateTime(value?: string) {
  if (!value) {
    return 'N/A';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function normalizeLinkHref(value?: string) {
  return typeof value === 'string' ? value.trim() : '';
}

function isInternalLink(value?: string) {
  return normalizeLinkHref(value).startsWith('#');
}

function getSafeExternalHref(value?: string) {
  const href = normalizeLinkHref(value);

  if (/^(https?:|mailto:)/i.test(href)) {
    return href;
  }

  return '';
}

watch(
  evidenceId,
  async (id) => {
    verificationAttempted.value = false;
    verificationResult.value = undefined;
    verifyError.value = undefined;
    showActivitiesModal.value = false;
    evidence.value = undefined;
    signatureDetail.value = undefined;
    latestEvidence.value = undefined;

    await Promise.allSettled([
      loadEvidence(`/api/evidence/${id}`),
      loadSignatureDetail(`/api/evidence/${id}/signature`),
    ]);

    const currentEvidence = evidence.value as Evidence | undefined;
    const evidenceUuid = currentEvidence?.uuid;

    if (evidenceUuid) {
      await Promise.allSettled([
        loadLatestEvidence(`/api/evidence/latest/${evidenceUuid}`),
      ]);
    }
  },
  { immediate: true },
);
</script>
