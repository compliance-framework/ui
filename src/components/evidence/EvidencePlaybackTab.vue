<template>
  <div class="space-y-4">
    <p v-if="isLoading" class="text-sm text-gray-600 dark:text-slate-400">
      Replaying the evaluation…
    </p>
    <Message v-else-if="error" severity="error" variant="outlined">
      <h4 class="font-bold">Could not load the playback</h4>
      <p>{{ errorMessage }}</p>
    </Message>
    <Message
      v-else-if="playback && !playback.available"
      severity="info"
      variant="outlined"
      data-test="playback-unavailable"
    >
      <p>{{ playback.reason }}</p>
    </Message>

    <template v-else-if="playback">
      <PageCard data-test="playback-result">
        <h3 class="text-lg font-semibold text-zinc-700 dark:text-slate-200">
          Result
        </h3>
        <div class="mt-4 flex flex-wrap items-center gap-6 text-sm">
          <div class="flex items-center gap-2">
            <span class="text-gray-600 dark:text-slate-400">Recorded</span>
            <span
              :class="[
                pillClass,
                getEvidenceStatusColor(playback.recorded.status),
              ]"
            >
              {{ playback.recorded.status || 'unknown' }}
            </span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-gray-600 dark:text-slate-400">Replayed</span>
            <span
              v-if="playback.replay"
              :class="[
                pillClass,
                getEvidenceStatusColor(playback.replay.status),
              ]"
            >
              {{ playback.replay.status }}
            </span>
            <span v-else :class="[pillClass, getEvidenceStatusColor()]">
              could not run
            </span>
          </div>
        </div>

        <div
          v-if="playback.comparison && matches"
          class="mt-4 rounded border border-green-700 bg-green-50 p-3 text-sm text-green-900 dark:border-green-600 dark:bg-green-950/30 dark:text-green-400"
          data-test="playback-matches"
        >
          The replay matches the recorded result.
        </div>
        <div
          v-else-if="playback.comparison"
          class="mt-4 rounded border border-amber-700 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
          data-test="playback-differs"
        >
          <p class="font-semibold">
            The replay differs from the recorded result.
          </p>
          <ul class="mt-2 list-disc pl-5">
            <li v-if="!playback.comparison.statusMatches">
              Status was recorded as {{ playback.recorded.status }}, but replays
              as {{ playback.replay?.status }}.
            </li>
            <li v-if="playback.comparison.missingViolationIds.length">
              Recorded, but not found by the replay:
              {{ playback.comparison.missingViolationIds.join(', ') }}
            </li>
            <li v-if="playback.comparison.newViolationIds.length">
              Found by the replay, but not recorded:
              {{ playback.comparison.newViolationIds.join(', ') }}
            </li>
          </ul>
        </div>
        <p
          v-if="playback.comparison?.unidentifiedViolations"
          class="mt-2 text-sm text-gray-600 dark:text-slate-400"
        >
          {{ playback.comparison.unidentifiedViolations }} replayed
          {{
            playback.comparison.unidentifiedViolations === 1
              ? 'violation has'
              : 'violations have'
          }}
          no ID, so
          {{ playback.comparison.unidentifiedViolations === 1 ? 'it' : 'they' }}
          cannot be compared.
        </p>
        <Message
          v-if="playback.errors.length"
          severity="error"
          variant="outlined"
          class="mt-4"
          data-test="playback-errors"
        >
          <p class="font-semibold">The evaluation could not be replayed:</p>
          <ul class="mt-1 list-disc pl-5">
            <li v-for="(evalError, index) in playback.errors" :key="index">
              <code>{{ evalError.code }}</code
              >: {{ evalError.message }}
              <span v-if="evalError.file">
                ({{ evalError.file
                }}<span v-if="evalError.row">:{{ evalError.row }}</span
                >)
              </span>
            </li>
          </ul>
        </Message>

        <dl
          class="mt-4 grid grid-cols-1 gap-x-6 gap-y-2 text-sm md:grid-cols-[max-content_1fr]"
        >
          <dt class="text-gray-600 dark:text-slate-400">Policy source</dt>
          <dd
            class="flex items-center gap-2 font-mono break-all"
            data-test="playback-policy-source"
          >
            <template v-if="policySource">
              <span>{{ policySource }}</span>
              <button
                type="button"
                class="font-sans text-xs text-blue-700 hover:underline dark:text-blue-400"
                @click="copy(policySource)"
              >
                copy
              </button>
            </template>
            <span v-else class="font-sans text-gray-600 dark:text-slate-400">
              Not recorded
            </span>
          </dd>
          <dt class="text-gray-600 dark:text-slate-400">Policy package</dt>
          <dd class="font-mono break-all">{{ playback.package }}</dd>
          <dt class="text-gray-600 dark:text-slate-400">Evaluated at</dt>
          <dd>{{ evaluatedAt }}</dd>
          <template v-for="entry in artifactEntries" :key="entry.label">
            <dt class="text-gray-600 dark:text-slate-400">{{ entry.label }}</dt>
            <dd class="flex items-center gap-2 font-mono text-xs break-all">
              <span :title="entry.digest">{{ shortDigest(entry.digest) }}</span>
              <button
                type="button"
                class="text-blue-700 hover:underline dark:text-blue-400"
                @click="copy(entry.digest)"
              >
                copy
              </button>
            </dd>
          </template>
        </dl>
      </PageCard>

      <PageCard data-test="playback-violations">
        <h3 class="text-lg font-semibold text-zinc-700 dark:text-slate-200">
          Violations
        </h3>
        <p
          v-if="!playback.replay"
          class="mt-4 text-sm text-gray-600 dark:text-slate-400"
        >
          The replay could not run. Recorded violation IDs:
          {{ playback.recorded.violationIds.join(', ') || 'none' }}.
        </p>
        <p
          v-else-if="!playback.replay.violations.length"
          class="mt-4 text-sm text-gray-600 dark:text-slate-400"
        >
          No violations: the policy was satisfied.
        </p>
        <table v-else class="mt-4 w-full text-left text-sm">
          <thead class="text-gray-600 dark:text-slate-400">
            <tr>
              <th class="py-1 pr-4 font-medium">ID</th>
              <th class="py-1 pr-4 font-medium">Title</th>
              <th class="py-1 pr-4 font-medium">Description</th>
              <th class="py-1 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(violation, index) in playback.replay.violations"
              :key="violation.id ?? index"
              class="border-t border-ccf-300 align-top dark:border-slate-700"
            >
              <td class="py-2 pr-4 font-mono text-xs break-all">
                {{ violation.id ?? '—' }}
              </td>
              <td class="py-2 pr-4">{{ violation.title }}</td>
              <td class="py-2 pr-4">
                {{ violation.description }}
                <p
                  v-if="violation.remarks"
                  class="mt-1 text-gray-600 dark:text-slate-400"
                >
                  {{ violation.remarks }}
                </p>
              </td>
              <td class="py-2">
                <span
                  v-if="violation.id"
                  :class="[
                    pillClass,
                    isRecorded(violation.id)
                      ? getEvidenceStatusColor()
                      : getEvidenceStatusColor('in-progress'),
                  ]"
                >
                  {{ isRecorded(violation.id) ? 'recorded' : 'new' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
        <p
          v-if="playback.comparison?.missingViolationIds.length"
          class="mt-3 text-sm text-gray-600 dark:text-slate-400"
        >
          Recorded but not found by the replay:
          <span class="font-mono">{{
            playback.comparison.missingViolationIds.join(', ')
          }}</span>
        </p>
      </PageCard>

      <PageCard data-test="playback-policy">
        <h3 class="text-lg font-semibold text-zinc-700 dark:text-slate-200">
          Policy
        </h3>
        <template v-if="policyFile">
          <p class="mt-3 font-mono text-sm" data-test="playback-policy-path">
            {{ policyFile.path }}
          </p>
          <p
            v-if="policySource"
            class="mt-1 text-xs text-gray-600 dark:text-slate-400"
          >
            From <span class="font-mono break-all">{{ policySource }}</span>
          </p>
          <pre :class="preClass">{{ policyFile.source }}</pre>
        </template>
        <p v-else class="mt-4 text-sm text-gray-600 dark:text-slate-400">
          The policy file for {{ playback.package || 'this evidence' }} could
          not be identified in the stored bundle.
        </p>
        <details v-if="playback.bundleDataJson" class="mt-3">
          <summary class="cursor-pointer text-sm">Bundle data</summary>
          <pre :class="preClass">{{ playback.bundleDataJson }}</pre>
        </details>
      </PageCard>

      <PageCard data-test="playback-config">
        <h3 class="text-lg font-semibold text-zinc-700 dark:text-slate-200">
          Config (policy data)
        </h3>
        <pre v-if="playback.policyDataJson" :class="preClass">{{
          playback.policyDataJson
        }}</pre>
        <p v-else class="mt-4 text-sm text-gray-600 dark:text-slate-400">
          No policy data was configured.
        </p>
      </PageCard>

      <PageCard data-test="playback-input">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h3 class="text-lg font-semibold text-zinc-700 dark:text-slate-200">
            Input
          </h3>
          <div class="flex gap-2">
            <SecondaryButton size="small" @click="copy(playback.inputJson)">
              Copy
            </SecondaryButton>
            <SecondaryButton
              size="small"
              data-test="playback-download-input"
              @click="downloadInput"
            >
              Download
            </SecondaryButton>
          </div>
        </div>
        <Message
          v-if="playback.inputTruncated"
          severity="info"
          variant="outlined"
          class="mt-3"
          data-test="playback-input-truncated"
        >
          The input is large, so only its start is shown. Download it for the
          full input.
        </Message>
        <pre :class="preClass">{{ playback.inputJson }}</pre>
      </PageCard>

      <PageCard>
        <details data-test="playback-output">
          <summary
            class="cursor-pointer text-lg font-semibold text-zinc-700 dark:text-slate-200"
          >
            Evaluation output
          </summary>
          <p
            v-if="playback.replay?.error"
            class="mt-3 text-sm text-amber-800 dark:text-amber-400"
          >
            {{ playback.replay.error }}
          </p>
          <h4 class="mt-3 text-sm font-semibold">Rego result</h4>
          <pre :class="preClass">{{
            playback.replay?.rawJson ?? 'The replay could not run.'
          }}</pre>
          <h4 class="mt-3 text-sm font-semibold">print() output</h4>
          <pre v-if="playback.prints.length" :class="preClass">{{
            playback.prints.join('\n')
          }}</pre>
          <p v-else class="mt-1 text-sm text-gray-600 dark:text-slate-400">
            None.
          </p>
        </details>
      </PageCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue';
import { useToast } from 'primevue/usetoast';
import PageCard from '@/components/PageCard.vue';
import Message from '@/volt/Message.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import { useAuthenticatedInstance, useDataApi } from '@/composables/axios';
import { getEvidenceStatusColor } from '@/utils/evidence-status';
import type { EvidencePlayback } from '@/types/evidence-playback';

const props = defineProps<{
  evidenceId: string;
  // Where the policy bundle came from, as the agent recorded it. Evidence from agents
  // before v0.8.0-rc3 has none.
  policySource?: string;
}>();

const toast = useToast();

const pillClass =
  'inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide';
const preClass =
  'mt-2 max-h-[32rem] overflow-auto rounded bg-slate-100 p-3 font-mono text-xs leading-5 whitespace-pre text-gray-900 dark:bg-slate-800 dark:text-slate-100';

const {
  data: playback,
  isLoading,
  error,
  execute: loadPlayback,
} = useDataApi<EvidencePlayback>(null, null, { immediate: false });

watch(
  () => props.evidenceId,
  (id) => {
    if (id) {
      loadPlayback(`/api/evidence/${id}/playback`).catch(() => {
        // The error ref is shown in the template.
      });
    }
  },
  { immediate: true },
);

const errorMessage = computed(() => {
  const err = error.value as { message?: string } | null | undefined;
  return err?.message ?? 'Unknown error';
});

const matches = computed(() => {
  const comparison = playback.value?.comparison;
  return (
    !!comparison &&
    comparison.statusMatches &&
    comparison.missingViolationIds.length === 0 &&
    comparison.newViolationIds.length === 0
  );
});

const evaluatedAt = computed(() =>
  playback.value?.evaluatedAt
    ? new Date(playback.value.evaluatedAt).toLocaleString()
    : '—',
);

const artifactEntries = computed(() => {
  const artifacts = playback.value?.artifacts;
  if (!artifacts) {
    return [];
  }
  const entries = [
    { label: 'Policy bundle', digest: artifacts.bundle.digest },
    { label: 'Input', digest: artifacts.input.digest },
  ];
  if (artifacts.policyData) {
    entries.push({ label: 'Policy data', digest: artifacts.policyData.digest });
  }
  return entries;
});

// The bundle holds every policy for the plugin; only the one that produced this evidence
// is shown.
const policyFile = computed(() =>
  playback.value?.policyFiles.find((file) => file.containsPackage),
);

const recordedIds = computed(
  () => new Set(playback.value?.recorded.violationIds ?? []),
);

function isRecorded(id: string): boolean {
  return recordedIds.value.has(id);
}

function shortDigest(digest: string): string {
  return digest.length > 19 ? `${digest.slice(0, 19)}…` : digest;
}

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.add({ severity: 'success', summary: 'Copied', life: 2000 });
  } catch {
    toast.add({
      severity: 'warn',
      summary: 'Could not copy to the clipboard',
      life: 3000,
    });
  }
}

function saveText(filename: string, text: string) {
  const url = URL.createObjectURL(
    new Blob([text], { type: 'application/json' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Downloads the input exactly as stored. When the shown input is truncated, the full input
// is fetched from its artifact.
async function downloadInput() {
  const current = playback.value;
  if (!current) {
    return;
  }
  const filename = `evidence-${props.evidenceId}-input.json`;
  if (!current.inputTruncated || !current.artifacts) {
    saveText(filename, current.inputJson);
    return;
  }
  try {
    const response = await useAuthenticatedInstance().get<string>(
      `/api/artifacts/${current.artifacts.input.digest}`,
      { responseType: 'text' },
    );
    saveText(filename, response.data);
  } catch {
    toast.add({
      severity: 'error',
      summary: 'Could not download the input',
      life: 4000,
    });
  }
}
</script>
