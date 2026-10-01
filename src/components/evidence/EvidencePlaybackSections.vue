<template>
  <div class="space-y-4" data-test="playback-sections">
    <p v-if="isLoading" class="text-sm text-gray-600 dark:text-slate-400">
      Replaying the policy evaluation…
    </p>
    <Message v-else-if="error" severity="error" variant="outlined">
      <h4 class="font-bold">Could not load the policy evaluation</h4>
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
      <PlaybackSection
        v-model:open="open.violations"
        title="Violations"
        data-test="playback-violations"
      >
        <template #summary>
          <span data-test="playback-violations-summary">{{
            violationsSummary
          }}</span>
        </template>

        <p
          v-if="!playback.replay"
          class="text-sm text-gray-600 dark:text-slate-400"
        >
          The evaluation could not be replayed. Recorded violation IDs:
          {{ playback.recorded.violationIds.join(', ') || 'none' }}.
        </p>
        <p
          v-else-if="!violations.length"
          class="text-sm text-gray-600 dark:text-slate-400"
        >
          No violations: the policy was satisfied.
        </p>
        <ul v-else class="space-y-3">
          <li
            v-for="(violation, index) in violations"
            :key="violation.id ?? index"
            class="rounded border-l-4 border-red-600 bg-red-50 p-4 text-sm dark:border-red-500 dark:bg-red-950/30"
            data-test="playback-violation"
          >
            <div class="flex flex-wrap items-start justify-between gap-2">
              <p class="font-semibold text-gray-900 dark:text-slate-100">
                {{ violation.title || violation.id || 'Violation' }}
              </p>
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
            </div>
            <dl
              class="mt-2 grid grid-cols-1 gap-x-4 gap-y-1 md:grid-cols-[max-content_1fr]"
            >
              <template v-if="violation.id">
                <dt class="text-gray-600 dark:text-slate-400">ID</dt>
                <dd class="font-mono text-xs break-all">{{ violation.id }}</dd>
              </template>
              <template v-if="violation.description">
                <dt class="text-gray-600 dark:text-slate-400">Description</dt>
                <dd class="whitespace-pre-line">
                  {{ violation.description }}
                </dd>
              </template>
              <template v-if="violation.remarks">
                <dt class="text-gray-600 dark:text-slate-400">Remarks</dt>
                <dd class="whitespace-pre-line">{{ violation.remarks }}</dd>
              </template>
              <dt class="text-gray-600 dark:text-slate-400">Rule</dt>
              <dd>
                <template v-if="violation.rules?.length">
                  <button
                    v-for="rule in violation.rules"
                    :key="ruleKey(rule)"
                    type="button"
                    class="mr-3 font-mono text-xs text-blue-700 hover:underline dark:text-blue-400"
                    data-test="playback-show-rule"
                    @click="showRule(rule)"
                  >
                    {{ rule.file }}, {{ lineRange(rule) }}
                  </button>
                </template>
                <span v-else class="text-gray-600 dark:text-slate-400">
                  Could not be located
                </span>
              </dd>
            </dl>
          </li>
        </ul>

        <div
          v-if="playback.comparison && !matches"
          class="mt-4 rounded border border-amber-700 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
          data-test="playback-differs"
        >
          <p class="font-semibold">
            The replay differs from what the evidence recorded.
          </p>
          <ul class="mt-2 list-disc pl-5">
            <li v-if="!playback.comparison.statusMatches">
              Status was recorded as {{ playback.recorded.status }}, but replays
              as {{ playback.replay?.status }}.
            </li>
            <li v-if="playback.comparison.missingViolationIds.length">
              Recorded, but not found by the replay:
              <span class="font-mono">{{
                playback.comparison.missingViolationIds.join(', ')
              }}</span>
            </li>
            <li v-if="playback.comparison.newViolationIds.length">
              Found by the replay, but not recorded:
              <span class="font-mono">{{
                playback.comparison.newViolationIds.join(', ')
              }}</span>
            </li>
          </ul>
        </div>
      </PlaybackSection>

      <PlaybackSection
        v-model:open="open.policy"
        title="Policy"
        data-test="playback-policy"
      >
        <template v-if="policyFile" #summary>
          <span class="font-mono">{{ policyFile.path }}</span>
        </template>

        <dl
          class="grid grid-cols-1 gap-x-6 gap-y-1 text-sm md:grid-cols-[max-content_1fr]"
        >
          <dt class="text-gray-600 dark:text-slate-400">Source</dt>
          <dd class="font-mono break-all" data-test="playback-policy-source">
            <template v-if="policySource">{{ policySource }}</template>
            <span v-else class="font-sans text-gray-600 dark:text-slate-400">
              Not recorded
            </span>
          </dd>
          <template v-if="policyId">
            <dt class="text-gray-600 dark:text-slate-400">Policy ID</dt>
            <dd class="font-mono break-all" data-test="playback-policy-id">
              {{ policyId }}
            </dd>
          </template>
          <dt class="text-gray-600 dark:text-slate-400">Package</dt>
          <dd class="font-mono break-all">{{ playback.package }}</dd>
          <dt class="text-gray-600 dark:text-slate-400">Evaluated at</dt>
          <dd>{{ evaluatedAt }}</dd>
        </dl>

        <p
          v-if="!shownFiles.length"
          class="mt-4 text-sm text-gray-600 dark:text-slate-400"
        >
          The policy file for {{ playback.package || 'this evidence' }} could
          not be identified in the stored bundle.
        </p>
        <div ref="policyContainer">
          <div
            v-for="file in shownFiles"
            :key="file.path"
            class="mt-4"
            data-test="playback-policy-file"
          >
            <p class="font-mono text-sm" data-test="playback-policy-path">
              {{ file.path }}
            </p>
            <div
              :class="codeClass"
              role="region"
              :aria-label="`Source of ${file.path}`"
            >
              <div
                v-for="(line, index) in file.lines"
                :key="index"
                class="flex"
                :class="lineClass(file.path, index + 1)"
                :data-rule="ruleStartKey(file.path, index + 1)"
                :data-violation-line="
                  isHighlighted(file.path, index + 1) ? 'true' : undefined
                "
              >
                <span
                  class="w-10 shrink-0 pr-3 text-right text-gray-400 select-none dark:text-slate-500"
                  >{{ index + 1 }}</span
                >
                <span class="whitespace-pre">{{ line || ' ' }}</span>
              </div>
            </div>
          </div>
        </div>
        <details v-if="playback.bundleDataJson" class="mt-3">
          <summary class="cursor-pointer text-sm">Bundle data</summary>
          <pre :class="preClass">{{ playback.bundleDataJson }}</pre>
        </details>
      </PlaybackSection>

      <PlaybackSection
        v-model:open="open.config"
        title="Config (policy data)"
        data-test="playback-config"
      >
        <template v-if="!playback.policyDataJson" #summary>None</template>
        <pre v-if="playback.policyDataJson" :class="preClass">{{
          playback.policyDataJson
        }}</pre>
        <p v-else class="text-sm text-gray-600 dark:text-slate-400">
          No policy data was configured.
        </p>
      </PlaybackSection>

      <PlaybackSection
        v-model:open="open.input"
        title="Input"
        data-test="playback-input"
      >
        <template v-if="playback.artifacts" #summary>
          {{ formatBytes(playback.artifacts.input.sizeBytes) }}
        </template>
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
      </PlaybackSection>

      <PlaybackSection
        v-model:open="open.output"
        title="Evaluation output"
        data-test="playback-output"
      >
        <template v-if="playback.errors.length" #summary>
          <span class="text-red-700 dark:text-red-400">
            {{ playback.errors.length }}
            {{ playback.errors.length === 1 ? 'error' : 'errors' }}
          </span>
        </template>
        <Message
          v-if="playback.errors.length"
          severity="error"
          variant="outlined"
          class="mb-3"
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
        <p
          v-if="playback.replay?.error"
          class="text-sm text-amber-800 dark:text-amber-400"
        >
          {{ playback.replay.error }}
        </p>
        <h4 class="text-sm font-semibold">Rego result</h4>
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
      </PlaybackSection>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue';
import { useToast } from 'primevue/usetoast';
import Message from '@/volt/Message.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import PlaybackSection from '@/components/evidence/PlaybackSection.vue';
import { useAuthenticatedInstance, useDataApi } from '@/composables/axios';
import { getEvidenceStatusColor } from '@/utils/evidence-status';
import type {
  EvidencePlayback,
  EvidencePlaybackRuleLocation,
} from '@/types/evidence-playback';

const props = defineProps<{
  evidenceId: string;
  // Where the policy bundle came from, as the agent recorded it. Evidence from agents
  // before v0.8.0-rc3 has none.
  policySource?: string;
  // The policy's declared policy_id (the `_policy_id` label), when it has one.
  policyId?: string;
}>();

const toast = useToast();

const pillClass =
  'inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide';
const preClass =
  'mt-2 max-h-[32rem] overflow-auto rounded bg-slate-100 p-3 font-mono text-xs leading-5 whitespace-pre text-gray-900 dark:bg-slate-800 dark:text-slate-100';
const codeClass =
  'mt-2 max-h-[32rem] overflow-auto rounded bg-slate-100 py-3 font-mono text-xs leading-5 text-gray-900 dark:bg-slate-800 dark:text-slate-100';

// Every section starts collapsed. When the replay finds violations, Violations and Policy
// open, with the rules behind the violations highlighted and scrolled into view.
const open = reactive({
  violations: false,
  policy: false,
  config: false,
  input: false,
  output: false,
});

const policyContainer = ref<HTMLElement | null>(null);
const focusedRule = ref<string | null>(null);

const {
  data: playback,
  isLoading,
  error,
  execute: loadPlayback,
} = useDataApi<EvidencePlayback>(null, null, { immediate: false });

const errorMessage = computed(() => {
  const err = error.value as { message?: string } | null | undefined;
  return err?.message ?? 'Unknown error';
});

const violations = computed(() => playback.value?.replay?.violations ?? []);

const violationsSummary = computed(() => {
  if (!playback.value?.replay) {
    return 'Not replayed';
  }
  const count = violations.value.length;
  if (count === 0) {
    return 'None';
  }
  return `${count} ${count === 1 ? 'violation' : 'violations'}`;
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

const recordedIds = computed(
  () => new Set(playback.value?.recorded.violationIds ?? []),
);

// The rules behind the replayed violations, as highlighted lines per file.
const highlightedLines = computed(() => {
  const lines = new Map<string, Set<number>>();
  for (const violation of violations.value) {
    for (const rule of violation.rules ?? []) {
      const fileLines = lines.get(rule.file) ?? new Set<number>();
      for (let line = rule.startLine; line <= rule.endLine; line++) {
        fileLines.add(line);
      }
      lines.set(rule.file, fileLines);
    }
  }
  return lines;
});

const ruleStarts = computed(() => {
  const starts = new Set<string>();
  for (const violation of violations.value) {
    for (const rule of violation.rules ?? []) {
      starts.add(ruleKey(rule));
    }
  }
  return starts;
});

const policyFile = computed(() =>
  playback.value?.policyFiles.find((file) => file.containsPackage),
);

// The bundle holds every policy for the plugin. Only the file that produced this evidence
// is shown, plus any other file of the same package holding a rule behind a violation.
const shownFiles = computed(() =>
  (playback.value?.policyFiles ?? [])
    .filter(
      (file) => file.containsPackage || highlightedLines.value.has(file.path),
    )
    .sort((a, b) => Number(b.containsPackage) - Number(a.containsPackage))
    .map((file) => ({ path: file.path, lines: file.source.split('\n') })),
);

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

watch(
  playback,
  async (current) => {
    const replayed = current?.replay?.violations ?? [];
    if (!replayed.length) {
      return;
    }
    open.violations = true;
    open.policy = true;
    const first = replayed.flatMap((violation) => violation.rules ?? [])[0];
    if (first) {
      await scrollToRule(first);
    }
  },
  { immediate: true },
);

function isRecorded(id: string): boolean {
  return recordedIds.value.has(id);
}

function ruleKey(rule: EvidencePlaybackRuleLocation): string {
  return `${rule.file}:${rule.startLine}`;
}

function ruleStartKey(file: string, line: number): string | undefined {
  const key = `${file}:${line}`;
  return ruleStarts.value.has(key) ? key : undefined;
}

function isHighlighted(file: string, line: number): boolean {
  return highlightedLines.value.get(file)?.has(line) ?? false;
}

function lineClass(file: string, line: number): string {
  if (!isHighlighted(file, line)) {
    return '';
  }
  const focused =
    focusedRule.value !== null &&
    ruleStartKey(file, line) === focusedRule.value;
  return [
    'border-l-4 border-red-600 bg-red-100 text-red-950 dark:border-red-500 dark:bg-red-950/50 dark:text-red-100',
    focused ? 'font-semibold' : '',
  ].join(' ');
}

function lineRange(rule: EvidencePlaybackRuleLocation): string {
  return rule.startLine === rule.endLine
    ? `line ${rule.startLine}`
    : `lines ${rule.startLine}–${rule.endLine}`;
}

async function showRule(rule: EvidencePlaybackRuleLocation) {
  open.policy = true;
  await scrollToRule(rule);
}

async function scrollToRule(rule: EvidencePlaybackRuleLocation) {
  const key = ruleKey(rule);
  focusedRule.value = key;
  await nextTick();
  const line = Array.from(
    policyContainer.value?.querySelectorAll<HTMLElement>('[data-rule]') ?? [],
  ).find((element) => element.dataset.rule === key);
  line?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KiB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
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
