<template>
  <div class="space-y-4" data-test="save-preview">
    <!-- Top-level errors / warnings -->
    <section
      v-if="topErrors.length || policyProblems.length"
      class="space-y-1"
      data-test="top-errors"
    >
      <h4 class="text-sm font-semibold text-gray-900 dark:text-slate-200">
        Problems
      </h4>
      <ul class="space-y-1 text-sm">
        <li
          v-for="(e, i) in topErrors"
          :key="`o${i}`"
          class="text-red-700 dark:text-red-300"
          data-test="overlay-error"
        >
          <code class="font-mono text-xs">{{ e.path || '/' }}</code>
          <span v-if="e.code" class="ml-1 text-xs text-gray-500">
            <CodeLabel :labels="FIELD_ERROR_CODE_LABELS" :code="e.code" />
          </span>
          — {{ e.message }}
        </li>
        <li
          v-for="(e, i) in policyProblems"
          :key="`p${i}`"
          :class="
            e.severity === 'error'
              ? 'text-red-700 dark:text-red-300'
              : 'text-amber-700 dark:text-amber-300'
          "
          :data-test="
            e.severity === 'error' ? 'policy-error' : 'policy-warning'
          "
        >
          <code class="font-mono text-xs"
            >{{ e.bundle }}/{{ e.path || ''
            }}<template v-if="e.row"
              >:{{ e.row }}:{{ e.col ?? 1 }}</template
            ></code
          >
          — {{ e.message }}
        </li>
      </ul>
    </section>

    <Message v-if="preview.standalone" severity="info" data-test="standalone">
      No agent instance has reported a configuration yet, so only overlay-level
      checks ran. Agents validate it again when they fetch it.
    </Message>

    <!-- Summary -->
    <section
      v-if="!preview.standalone"
      class="space-y-2 rounded-md border border-ccf-300 p-3 text-sm dark:border-slate-700"
      data-test="apply-summary"
    >
      <p class="font-medium text-gray-900 dark:text-slate-200">
        {{ applying }} of {{ preview.instances.length }} instances will apply
        this revision.
      </p>
      <ul class="space-y-1">
        <li
          v-for="inst in notApplying"
          :key="inst.instanceId"
          data-test="not-applying"
        >
          <span class="font-mono text-xs">{{
            inst.hostname || inst.instanceId.slice(0, 8)
          }}</span>
          · {{ inst.mode || 'unknown mode' }} ·
          <CodeLabel
            :labels="WILL_APPLY_REASON_LABELS"
            :code="inst.willApplyReason"
          />
          <ul
            v-if="
              inst.willApplyReason === 'unsafe-changes' ||
              inst.willApplyReason === 'forbidden-changes'
            "
            class="mt-1 ml-4 space-y-0.5 text-xs"
          >
            <li
              v-for="c in offending(inst)"
              :key="`${c.path}|${c.value ?? ''}`"
            >
              <code class="font-mono">{{ c.path }}</code> ·
              <CodeLabel :labels="CHANGE_REASON_LABELS" :code="c.reason" />
              <template v-if="c.value">
                ·
                <code class="font-mono break-all">{{ c.value }}</code></template
              >
            </li>
          </ul>
        </li>
      </ul>
      <p class="text-xs text-gray-500 dark:text-slate-400">
        Changes are classified against each instance's local file, so this list
        can include changes saved in earlier revisions.
      </p>
      <p
        v-if="legacyValidation"
        class="text-xs text-amber-700 dark:text-amber-300"
        data-test="legacy-validation"
      >
        This API does not say which instances a save validates against; errors
        on every non-stale instance are treated as blocking.
      </p>
    </section>

    <!-- Standalone diff: current overlay vs draft -->
    <section v-if="preview.standalone" class="space-y-2">
      <DiffRows
        :rows="standaloneRows"
        :changes="[]"
        hide-tags
        @open-diff="openDiff"
      />
      <CodeMergeView
        :original="toYaml(currentOverlay)"
        :modified="toYaml(draftOverlay)"
        language="yaml"
        mode="unified"
      />
    </section>

    <!-- Per instance -->
    <Panel
      v-for="inst in panels"
      :key="inst.preview.instanceId"
      toggleable
      :collapsed="inst.preview.willApply && !inst.blocking"
      :data-test="`instance-panel-${inst.preview.instanceId}`"
    >
      <template #header>
        <div class="flex flex-wrap items-center gap-2 text-sm">
          <span class="font-mono">{{
            inst.preview.hostname || inst.preview.instanceId.slice(0, 8)
          }}</span>
          <ConfigPill severity="info">{{
            inst.preview.mode || 'no mode'
          }}</ConfigPill>
          <ConfigPill v-if="inst.preview.stale" severity="secondary"
            >stale</ConfigPill
          >
          <ConfigPill :severity="inst.preview.willApply ? 'success' : 'warn'">
            {{ inst.preview.willApply ? 'will apply' : 'will not apply' }}
          </ConfigPill>
          <ConfigPill v-if="inst.blocking" severity="danger"
            >blocks save</ConfigPill
          >
        </div>
      </template>
      <div class="space-y-3">
        <ul v-if="inst.errors.length" class="space-y-1 text-sm">
          <li
            v-for="(e, i) in inst.errors"
            :key="`e${i}`"
            :class="
              inst.errorsBlock
                ? 'text-red-700 dark:text-red-300'
                : 'text-amber-700 dark:text-amber-300'
            "
            :data-test="
              inst.errorsBlock ? 'instance-error' : 'instance-error-nonblocking'
            "
          >
            <code class="font-mono text-xs">{{ e.path || '/' }}</code> —
            {{ e.message }}
            <span v-if="!inst.errorsBlock" class="text-xs">
              (Not validated on save: stale or not in an apply mode)
            </span>
          </li>
        </ul>
        <ul
          v-if="inst.warnings.length"
          class="space-y-1 text-sm"
          data-test="instance-warnings"
        >
          <li
            v-for="(w, i) in inst.warnings"
            :key="`w${i}`"
            class="text-amber-700 dark:text-amber-300"
          >
            <code class="font-mono text-xs">{{ w.path || '/' }}</code> —
            {{ w.message }}
            <span class="text-xs">(in this host's file; does not block)</span>
          </li>
        </ul>

        <template v-if="inst.rows">
          <DiffRows
            :rows="inst.rows"
            :changes="inst.preview.changes"
            @open-diff="openDiff"
          />
          <button
            type="button"
            class="text-xs text-sky-700 hover:underline dark:text-sky-300"
            data-test="toggle-yaml-diff"
            @click="toggleYaml(inst.preview.instanceId)"
          >
            {{ yamlOpen.has(inst.preview.instanceId) ? 'Hide' : 'Show' }} YAML
            diff
          </button>
          <CodeMergeView
            v-if="yamlOpen.has(inst.preview.instanceId)"
            :original="toYaml(inst.before)"
            :modified="toYaml(inst.after)"
            language="yaml"
            mode="unified"
          />
        </template>
        <div v-else class="space-y-1" data-test="changes-fallback">
          <p class="text-xs text-gray-500">
            The file of this instance is unavailable; classified changes:
          </p>
          <ul class="space-y-0.5 text-xs">
            <li
              v-for="c in inst.preview.changes"
              :key="`${c.path}|${c.value ?? ''}|${c.reason}`"
              class="flex gap-2"
            >
              <code class="font-mono">{{ c.path }}</code>
              <SafetyTag :kind="c.safety" />
              <CodeLabel :labels="CHANGE_REASON_LABELS" :code="c.reason" />
            </li>
          </ul>
        </div>
      </div>
    </Panel>

    <!-- Comment + save -->
    <section class="space-y-2">
      <label
        class="block text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-slate-400"
        for="cfg-comment"
      >
        Comment (optional)
      </label>
      <Textarea
        id="cfg-comment"
        v-model="comment"
        :maxlength="LIMITS.commentChars"
        rows="2"
        class="w-full"
        data-test="save-comment"
      />
      <p class="text-right text-xs text-gray-500">
        {{ comment.length }}/{{ LIMITS.commentChars }}
      </p>
      <div class="flex justify-end gap-2">
        <SecondaryButton data-test="review-back" @click="$emit('back')"
          >Back</SecondaryButton
        >
        <span
          v-tooltip.top="{
            value: saveDisabledReason,
            disabled: !saveDisabledReason,
          }"
        >
          <PrimaryButton
            :disabled="blocking || saving || !!saveDisabledReason"
            data-test="save-config"
            @click="$emit('save', comment)"
          >
            {{ saving ? 'Saving…' : `Save as r${baseRevision + 1}` }}
          </PrimaryButton>
        </span>
      </div>
    </section>

    <Dialog
      v-model:visible="diffOpen"
      modal
      :header="diffTitle"
      class="w-full max-w-5xl"
    >
      <CodeMergeView
        v-if="diffOpen"
        :original="diffOriginal"
        :modified="diffModified"
        :language="diffTitle.endsWith('.rego') ? 'rego' : 'text'"
        mode="split"
      />
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import Dialog from '@/volt/Dialog.vue';
import Message from '@/volt/Message.vue';
import Panel from '@/volt/Panel.vue';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import Textarea from '@/volt/Textarea.vue';
import { CodeMergeView } from '@/components/code-editor';
import type {
  AgentInstanceDetail,
  ConfigDoc,
  ConfigErrorBody,
  ConfigPreview,
  FieldError,
  InstancePreview,
  OverlayDoc,
  PolicyError,
} from '@/types/agent-config';
import { mergePatch } from '@/utils/agent-config/merge-patch';
import { diffConfigs, type DiffEntry } from '@/utils/agent-config/config-diff';
import { toYaml } from '@/utils/agent-config/yaml';
import { LIMITS } from '@/utils/agent-config/validation';
import ConfigPill from '../ConfigPill.vue';
import CodeLabel from '../CodeLabel.vue';
import {
  CHANGE_REASON_LABELS,
  FIELD_ERROR_CODE_LABELS,
  WILL_APPLY_REASON_LABELS,
} from '../constants';
import DiffRows from './DiffRows.vue';
import SafetyTag from './SafetyTag.vue';
import { instanceErrorsBlock, previewBlocks, saveErrorsBlock } from './review';

const props = defineProps<{
  preview: ConfigPreview;
  instanceDetails: Map<string, AgentInstanceDetail>;
  currentOverlay: OverlayDoc;
  draftOverlay: OverlayDoc;
  baseRevision: number;
  saving?: boolean;
  /** Raw 422 body of the last failed save (R6). */
  saveErrors?: ConfigErrorBody | null;
  saveDisabledReason?: string;
}>();

defineEmits<{ back: []; save: [comment: string] }>();

const comment = ref('');
const yamlOpen = reactive(new Set<string>());
const diffOpen = ref(false);
const diffTitle = ref('');
const diffOriginal = ref('');
const diffModified = ref('');

const topErrors = computed<FieldError[]>(() => [
  ...props.preview.overlayErrors,
  ...(props.saveErrors?.overlay ?? []),
]);
const policyProblems = computed<PolicyError[]>(() => {
  const seen = new Set<string>();
  const out: PolicyError[] = [];
  for (const e of [
    ...props.preview.policyErrors,
    ...(props.saveErrors?.['policy-errors'] ?? []),
  ]) {
    const k = `${e.bundle}|${e.path}|${e.row}|${e.col}|${e.message}`;
    if (!seen.has(k)) {
      seen.add(k);
      out.push(e);
    }
  }
  return out;
});
const legacyValidation = computed(() =>
  props.preview.instances.some((i) => i.validated === undefined),
);
const applying = computed(
  () => props.preview.instances.filter((i) => i.willApply).length,
);
const notApplying = computed(() =>
  props.preview.instances.filter((i) => !i.willApply),
);

function offending(inst: InstancePreview) {
  return inst.changes.filter((c) => c.safety !== 'safe');
}

const panels = computed(() =>
  props.preview.instances.map((p) => {
    const detail = props.instanceDetails.get(p.instanceId);
    const base = detail?.base ?? null;
    const saveInst = props.saveErrors?.instances?.find(
      (i) => i['instance-id'] === p.instanceId,
    );
    const errorsBlock = instanceErrorsBlock(p) || !!saveInst?.errors?.length;
    const errors = [...p.errors, ...(saveInst?.errors ?? [])];
    const warnings = [...(p.warnings ?? []), ...(saveInst?.warnings ?? [])];
    let before: ConfigDoc | null = null;
    let after: ConfigDoc | null = null;
    let rows: DiffEntry[] | null = null;
    if (base) {
      before = mergePatch<ConfigDoc>(base, props.currentOverlay);
      after = mergePatch<ConfigDoc>(base, props.draftOverlay);
      rows = diffConfigs(before, after);
    }
    return {
      preview: p,
      before,
      after,
      rows,
      errors,
      warnings,
      errorsBlock: errorsBlock && errors.length > 0,
      blocking: errorsBlock && errors.length > 0,
    };
  }),
);

const standaloneRows = computed(() =>
  diffConfigs(props.currentOverlay, props.draftOverlay),
);

const blocking = computed(
  () => previewBlocks(props.preview) || saveErrorsBlock(props.saveErrors),
);

function toggleYaml(id: string) {
  if (yamlOpen.has(id)) yamlOpen.delete(id);
  else yamlOpen.add(id);
}

function openDiff(row: DiffEntry) {
  diffTitle.value = row.path;
  diffOriginal.value = typeof row.before === 'string' ? row.before : '';
  diffModified.value = typeof row.after === 'string' ? row.after : '';
  diffOpen.value = true;
}

defineExpose({ blocking });
</script>
