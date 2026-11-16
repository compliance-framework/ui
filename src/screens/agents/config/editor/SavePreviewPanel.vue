<script setup lang="ts">
// The review step (U2.5): problems, which instances will apply the revision and why not, the
// per-instance diff with safety tags, then the comment and Save.
import { computed, reactive, ref, watch } from 'vue';
import Button from '@/ds/components/Button/Button.vue';
import { CodeMergeView } from '@/ds/components/CodeEditor';
import Dialog from '@/ds/components/Dialog/Dialog.vue';
import Disclosure from '@/ds/components/Disclosure/Disclosure.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import InlineMessage from '@/ds/components/InlineMessage/InlineMessage.vue';
import StatusBadge from '@/ds/components/StatusBadge/StatusBadge.vue';
import type { StatusKey } from '@/ds/components/StatusBadge/statuses';
import Tag from '@/ds/components/Tag/Tag.vue';
import Text from '@/ds/components/Text/Text.vue';
import Textarea from '@/ds/components/Textarea/Textarea.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Panel from '@/ds/components/layout/Panel.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import type {
  AgentInstanceDetail,
  ChangeSafety,
  ConfigDoc,
  ConfigErrorBody,
  ConfigPreview,
  FieldError,
  InstancePreview,
  OverlayDoc,
} from '@/types/agent-config';
import { mergePatch } from '@/utils/agent-config/merge-patch';
import { diffConfigs, type DiffEntry } from '@/utils/agent-config/config-diff';
import { toYaml } from '@/utils/agent-config/yaml';
import { LIMITS } from '@/utils/agent-config/validation';
import CodeLabel from '../CodeLabel.vue';
import {
  CHANGE_REASON_LABELS,
  FIELD_ERROR_CODE_LABELS,
  WILL_APPLY_REASON_LABELS,
} from '../constants';
import DiffRows from './DiffRows.vue';
import {
  instanceErrorsBlock,
  previewBlocks,
  saveErrorsBlock,
} from '@/utils/agent-config/review';

const props = withDefaults(
  defineProps<{
    preview: ConfigPreview;
    instanceDetails: Map<string, AgentInstanceDetail>;
    currentOverlay: OverlayDoc;
    draftOverlay: OverlayDoc;
    baseRevision: number;
    saving?: boolean;
    /** Raw 422 body of the last failed save (R6). */
    saveErrors?: ConfigErrorBody | null;
    saveDisabledReason?: string;
    backLabel?: string;
  }>(),
  {
    saving: false,
    saveErrors: null,
    saveDisabledReason: '',
    backLabel: 'Back',
  },
);

const emit = defineEmits<{
  back: [];
  save: [comment: string];
  /** A nested dialog (View diff) opened or closed. */
  childOpen: [open: boolean];
}>();

const comment = defineModel<string>('comment', { default: '' });
const yamlOpen = reactive(new Set<string>());
const diffOpen = ref(false);
const diffTitle = ref('');
const diffOriginal = ref('');
const diffModified = ref('');
watch(diffOpen, (open) => emit('childOpen', open));

const topErrors = computed<FieldError[]>(() => [
  ...props.preview.overlayErrors,
  ...(props.saveErrors?.overlay ?? []),
]);
const legacyValidation = computed(() =>
  props.preview.instances.some((i) => i.validated === undefined),
);
const applying = computed(
  () => props.preview.instances.filter((i) => i.willApply).length,
);
const notApplying = computed(() =>
  props.preview.instances.filter((i) => !i.willApply),
);
/** Instances beyond the preview's bound (50 instances / 16 MiB); a save validates them. */
const omitted = computed(() => props.preview.omittedInstances ?? 0);
/** 422 instances with no preview panel: shown on their own, since they block the save. */
const otherSaveErrors = computed(() =>
  (props.saveErrors?.instances ?? []).filter(
    (s) =>
      (s.errors?.length || s.warnings?.length) &&
      !props.preview.instances.some((p) => p.instanceId === s['instance-id']),
  ),
);

const SAFETY: Record<ChangeSafety, StatusKey> = {
  safe: 'change-safe',
  unsafe: 'change-unsafe',
  forbidden: 'change-forbidden',
};

function offending(inst: InstancePreview) {
  return inst.changes.filter((c) => c.safety !== 'safe');
}
function host(id: string, hostname?: string | null): string {
  return hostname || id.slice(0, 8);
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
    const blocking = errorsBlock && errors.length > 0;
    const label = [
      host(p.instanceId, p.hostname),
      p.mode || 'no mode',
      ...(p.stale ? ['stale'] : []),
      p.willApply ? 'will apply' : 'will not apply',
      ...(blocking ? ['blocks save'] : []),
    ].join(' · ');
    return {
      preview: p,
      before,
      after,
      rows,
      errors,
      warnings,
      blocking,
      label,
    };
  }),
);

/** Instance panels the user opened or closed; others start open unless they apply cleanly. */
const panelOpen = reactive(new Map<string, boolean>());
function isOpen(panel: (typeof panels.value)[number]): boolean {
  return (
    panelOpen.get(panel.preview.instanceId) ??
    !(panel.preview.willApply && !panel.blocking)
  );
}

const standaloneRows = computed(() =>
  diffConfigs(props.currentOverlay, props.draftOverlay),
);

const blocking = computed(
  () => previewBlocks(props.preview) || saveErrorsBlock(props.saveErrors),
);
const saveBlocked = computed(() => {
  if (props.saveDisabledReason) return props.saveDisabledReason;
  if (blocking.value) return 'Fix the problems above first.';
  return undefined;
});

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

<template>
  <Stack gap="4" data-test="save-preview">
    <Panel
      v-if="topErrors.length"
      title="Problems"
      :level="3"
      dense
      data-test="top-errors"
    >
      <Stack gap="1">
        <Text
          v-for="(e, i) in topErrors"
          :key="`o${i}`"
          data-test="overlay-error"
          ><Text as="code" variant="code">{{ e.path || '/' }}</Text>
          <template v-if="e.code">
            (<CodeLabel :labels="FIELD_ERROR_CODE_LABELS" :code="e.code" />)
          </template>
          — {{ e.message }}</Text
        >
      </Stack>
    </Panel>

    <InlineMessage v-if="preview.standalone" tone="info" data-test="standalone">
      No agent instance has reported a configuration yet, so only overlay-level
      checks ran. Agents validate it again when they fetch it.
    </InlineMessage>

    <Panel v-if="!preview.standalone" dense data-test="apply-summary">
      <Stack gap="2">
        <Text as="strong"
          >{{ applying }} of {{ preview.instances.length }} instances will apply
          this revision.</Text
        >
        <Text v-if="omitted" data-test="omitted-instances">
          {{ omitted }}
          more
          {{ omitted === 1 ? 'instance was' : 'instances were' }} not previewed;
          a save still validates against them.
        </Text>
        <Stack
          v-for="inst in notApplying"
          :key="inst.instanceId"
          gap="1"
          data-test="not-applying"
        >
          <Text
            ><Text as="code" variant="code">{{
              host(inst.instanceId, inst.hostname)
            }}</Text>
            · {{ inst.mode || 'unknown mode' }} ·
            <CodeLabel
              :labels="WILL_APPLY_REASON_LABELS"
              :code="inst.willApplyReason"
          /></Text>
          <template
            v-if="
              inst.willApplyReason === 'unsafe-changes' ||
              inst.willApplyReason === 'forbidden-changes'
            "
          >
            <Text
              v-for="c in offending(inst)"
              :key="`${c.path}|${c.value ?? ''}`"
              variant="caption"
              ><Text as="code" variant="code">{{ c.path }}</Text> ·
              <CodeLabel :labels="CHANGE_REASON_LABELS" :code="c.reason" />
              <template v-if="c.value">
                ·
                <Text as="code" variant="code">{{ c.value }}</Text></template
              ></Text
            >
          </template>
        </Stack>
        <Text variant="caption">
          Changes are classified against each instance's local file, so this
          list can include changes saved in earlier revisions.
        </Text>
        <Text
          v-if="legacyValidation"
          variant="caption"
          data-test="legacy-validation"
        >
          This API does not say which instances a save validates against; errors
          on every non-stale instance are treated as blocking.
        </Text>
      </Stack>
    </Panel>

    <!-- 422 errors of instances the preview did not include (e.g. omitted ones) -->
    <Panel
      v-if="otherSaveErrors.length"
      title="Other instances"
      :level="3"
      dense
      data-test="other-instance-errors"
    >
      <Stack gap="3">
        <Stack
          v-for="inst in otherSaveErrors"
          :key="inst['instance-id']"
          gap="1"
          :data-test="`other-instance-${inst['instance-id']}`"
        >
          <Text as="strong">{{
            host(inst['instance-id'], inst.hostname)
          }}</Text>
          <Text
            v-for="(e, i) in inst.errors ?? []"
            :key="`e${i}`"
            data-test="other-instance-error"
            >Error: <Text as="code" variant="code">{{ e.path || '/' }}</Text> —
            {{ e.message }}</Text
          >
          <Text v-for="(w, i) in inst.warnings ?? []" :key="`w${i}`"
            >Warning:
            <Text as="code" variant="code">{{ w.path || '/' }}</Text> —
            {{ w.message }} (in this host's file; does not block)</Text
          >
        </Stack>
      </Stack>
    </Panel>

    <!-- Standalone diff: current overlay vs draft -->
    <Stack v-if="preview.standalone" gap="2">
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
        label="Overlay changes"
      />
    </Stack>

    <!-- Per instance -->
    <Disclosure
      v-for="inst in panels"
      :key="inst.preview.instanceId"
      :label="inst.label"
      :open="isOpen(inst)"
      :data-test="`instance-panel-${inst.preview.instanceId}`"
      @update:open="panelOpen.set(inst.preview.instanceId, $event)"
    >
      <Stack gap="3">
        <Cluster gap="2">
          <Tag :label="inst.preview.mode || 'no mode'" />
          <Tag v-if="inst.preview.stale" label="Stale" />
          <StatusBadge
            :status="
              inst.preview.willApply
                ? 'config-will-apply'
                : 'config-will-not-apply'
            "
          />
          <StatusBadge v-if="inst.blocking" status="config-blocks-save" />
        </Cluster>
        <Stack v-if="inst.errors.length" gap="1">
          <Text
            v-for="(e, i) in inst.errors"
            :key="`e${i}`"
            :data-test="
              inst.blocking ? 'instance-error' : 'instance-error-nonblocking'
            "
            >{{ inst.blocking ? 'Error' : 'Warning' }}:
            <Text as="code" variant="code">{{ e.path || '/' }}</Text> —
            {{ e.message }}
            <template v-if="!inst.blocking">
              (Not validated on save: stale or not in an apply mode)</template
            ></Text
          >
        </Stack>
        <Stack
          v-if="inst.warnings.length"
          gap="1"
          data-test="instance-warnings"
        >
          <Text v-for="(w, i) in inst.warnings" :key="`w${i}`"
            >Warning:
            <Text as="code" variant="code">{{ w.path || '/' }}</Text> —
            {{ w.message }} (in this host's file; does not block)</Text
          >
        </Stack>

        <template v-if="inst.rows">
          <DiffRows
            :rows="inst.rows"
            :changes="inst.preview.changes"
            @open-diff="openDiff"
          />
          <Cluster>
            <Button
              variant="tertiary"
              size="sm"
              :aria-expanded="yamlOpen.has(inst.preview.instanceId)"
              data-test="toggle-yaml-diff"
              @click="toggleYaml(inst.preview.instanceId)"
            >
              {{ yamlOpen.has(inst.preview.instanceId) ? 'Hide' : 'Show' }}
              YAML diff
            </Button>
          </Cluster>
          <CodeMergeView
            v-if="yamlOpen.has(inst.preview.instanceId)"
            :original="toYaml(inst.before)"
            :modified="toYaml(inst.after)"
            language="yaml"
            mode="unified"
            :label="`YAML changes on ${host(inst.preview.instanceId, inst.preview.hostname)}`"
          />
        </template>
        <Stack v-else gap="1" data-test="changes-fallback">
          <Text variant="caption">
            The file of this instance is unavailable; classified changes:
          </Text>
          <Cluster
            v-for="c in inst.preview.changes"
            :key="`${c.path}|${c.value ?? ''}|${c.reason}`"
            gap="2"
          >
            <Text as="code" variant="code">{{ c.path }}</Text>
            <StatusBadge :status="SAFETY[c.safety]" :data-safety="c.safety" />
            <CodeLabel :labels="CHANGE_REASON_LABELS" :code="c.reason" />
          </Cluster>
        </Stack>
      </Stack>
    </Disclosure>

    <!-- Comment + save -->
    <Stack gap="3">
      <FormField
        label="Comment (optional)"
        :hint="`${comment.length}/${LIMITS.commentChars} characters`"
      >
        <Textarea
          v-model="comment"
          :maxlength="LIMITS.commentChars"
          :rows="2"
          data-test="save-comment"
        />
      </FormField>
      <Cluster gap="2" justify="end">
        <Button
          :disabled-reason="saving ? 'Saving the configuration…' : undefined"
          data-test="review-back"
          @click="$emit('back')"
          >{{ backLabel }}</Button
        >
        <Button
          variant="primary"
          :loading="saving"
          :disabled-reason="saving ? undefined : saveBlocked"
          data-test="save-config"
          @click="$emit('save', comment)"
        >
          {{ saving ? 'Saving…' : `Save as r${baseRevision + 1}` }}
        </Button>
      </Cluster>
    </Stack>

    <Dialog v-model:open="diffOpen" :title="diffTitle" size="l">
      <CodeMergeView
        v-if="diffOpen"
        :original="diffOriginal"
        :modified="diffModified"
        language="text"
        mode="split"
        :label="`Changes to ${diffTitle}`"
      />
    </Dialog>
  </Stack>
</template>
