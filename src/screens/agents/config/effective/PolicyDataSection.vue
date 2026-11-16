<script setup lang="ts">
// A plugin's policy_data on the Effective view (R69, R71): a structured tree in which each key
// and list item is edited, removed or added on its own (PolicyDataNode), and a raw JSON view
// for type changes and bulk edits. Both record only the real changes as a minimal merge patch
// (policy-data-patch.ts, through the draft's setValue / removeValue / applyOps); an untouched
// masked report value never reaches the overlay (R25). Each pointer carries its R71 access
// (the tree notes a pointer only where it differs from this section's state). Without a
// workspace or agent:configure it is a read-only view of the reported value.
import { computed, provide, ref, watch } from 'vue';
import Button from '@/ds/components/Button/Button.vue';
import Text from '@/ds/components/Text/Text.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import { CodeEditor } from '@/ds/components/CodeEditor';
import { useWorkspace } from '@/composables/agent-config/useConfigWorkspace';
import { getAt, hasAt, pointer } from '@/utils/agent-config/json-pointer';
import {
  deepEqual,
  isPlainObject,
  type PlainObject,
} from '@/utils/agent-config/merge-patch';
import { diffOps } from '@/utils/agent-config/policy-data-patch';
import { hasUnstorableNumber } from '@/utils/agent-config/policy-data';
import { accessTooltip, fieldAccess } from '@/utils/agent-config/field-access';
import type { Provenance } from '@/utils/agent-config/provenance';
import ProvenanceBadge from '../ProvenanceBadge.vue';
import FieldIssues from '../editor/FieldIssues.vue';
import { useEditor } from '../editor/useEditor';
import AccessIcon from './AccessIcon.vue';
import PendingPill from './PendingPill.vue';
import { NULL_KEY_ERROR, opsSetNullKey } from './nullKeys';
import PolicyDataTree from './PolicyDataTree.vue';
import { POLICY_DATA_TREE_KEY } from './policyDataContext';

const props = defineProps<{
  plugin: string;
  /** The reported (effective) policy_data of the shown instance. */
  reported: unknown;
  provenance: Provenance;
}>();

const ws = useWorkspace();
// The shared editor helpers need the workspace's draft and context (absent when read-only).
const editor = ws ? useEditor() : null;
const ptr = computed(() => pointer('plugins', props.plugin, 'policy_data'));

const access = computed(() =>
  ws ? ws.accessAt(ptr.value) : fieldAccess(ptr.value, []),
);
const accessText = computed(() => accessTooltip(access.value));
const showAccess = computed(
  () => !!ws && ws.ready.value && ws.canConfigure.value,
);
const editable = computed(
  () => !!ws && ws.ready.value && ws.canEditPointer(ptr.value),
);
const pending = computed(() => !!ws && ws.draft.pendingAt(ptr.value));
const inOverlay = computed(
  () => !!ws && hasAt(ws.draft.overlay.value, ptr.value),
);

/** Editors see the draft's effective value (their edits included); readers the report. */
const shown = computed<PlainObject>(() => {
  const v = editable.value
    ? getAt(ws!.draft.effectiveDraft.value, ptr.value)
    : props.reported;
  return isPlainObject(v) ? v : {};
});
const keyCount = computed(() => Object.keys(shown.value).length);

provide(POLICY_DATA_TREE_KEY, {
  canEdit: (p) => editable.value && ws!.canEditPointer(p),
  accessNote: (p) => {
    if (!showAccess.value) return null;
    const a = ws!.accessAt(p);
    if (a.state === access.value.state) return null;
    if (a.state !== 'restricted' && a.state !== 'readonly') return null;
    return { state: a.state, text: accessTooltip(a) };
  },
  changed: (p) => !!ws && ws.draft.changedPaths.value.includes(p),
  revert: (p) => ws?.draft.revertPointer(p),
  set: (p, v) => ws?.draft.setValue(p, v, ptr.value),
  remove: (p) => ws?.draft.removeValue(p),
  differs: (p) => !!editor && editor.differsAcrossInstances(p),
});

// ---- Structured / raw JSON ----
const error = ref('');
const mode = ref<'structured' | 'raw'>('structured');
function currentText(): string {
  return JSON.stringify(shown.value, null, 2);
}
const text = ref(currentText());

/** Why the structured view is unavailable (invalid raw JSON), else undefined. */
const structuredBlocked = computed(() =>
  error.value
    ? 'Fix the JSON to switch back to the structured view.'
    : undefined,
);

function setMode(next: 'structured' | 'raw') {
  if (next === 'structured' && error.value) return;
  if (next === 'raw') text.value = currentText();
  mode.value = next;
}

// Follow external changes (structured edits, undo, raw YAML) without clobbering in-progress
// invalid text.
watch(shown, (v) => {
  if (error.value) return;
  try {
    if (deepEqual(JSON.parse(text.value), v)) return;
  } catch {
    return;
  }
  text.value = currentText();
});

function onInput(value: string) {
  text.value = value;
  let parsed: unknown;
  try {
    parsed = value.trim() ? JSON.parse(value) : {};
  } catch (e) {
    error.value = `Invalid JSON: ${(e as Error).message}.`;
    return;
  }
  if (!isPlainObject(parsed)) {
    error.value = 'Policy data must be a JSON object.';
    return;
  }
  // 1e999 parses as Infinity (saved as null, an RFC 7396 delete) and big integers lose digits.
  if (hasUnstorableNumber(parsed)) {
    error.value =
      'A number cannot be saved as typed (not finite, or more digits than 2^53); quote it to keep it as text.';
    return;
  }
  // Only what really changed, at the pointers that changed.
  const ops = diffOps(ptr.value, shown.value, parsed);
  // A new null at a key would record a deletion (RFC 7396); nulls inside arrays are kept.
  if (opsSetNullKey(ops)) {
    error.value = `${NULL_KEY_ERROR}: delete the key instead.`;
    return;
  }
  error.value = '';
  ws?.draft.applyOps(ops, ptr.value);
}

function reset() {
  ws?.draft.unset(ptr.value);
  error.value = '';
  text.value = currentText();
}
</script>

<template>
  <Stack
    gap="2"
    :data-test="`field-${ptr}`"
    :data-state="access.state"
    :data-pending="pending ? 'true' : undefined"
  >
    <Cluster gap="2">
      <Text as="span" variant="secondary">Policy data</Text>
      <Text as="span">{{ keyCount }} key{{ keyCount === 1 ? '' : 's' }}</Text>
      <ProvenanceBadge v-if="provenance !== 'file'" :provenance="provenance" />
      <AccessIcon v-if="showAccess" :state="access.state" :text="accessText" />
      <PendingPill
        v-if="pending"
        undo-label="Undo the pending changes to policy data"
        :test-id="`pending-${ptr}`"
        :undo-test-id="`undo-${ptr}`"
        @undo="ws!.draft.revertPointer(ptr)"
      />
      <Button
        v-if="editable && mode === 'structured'"
        variant="tertiary"
        size="sm"
        icon="code"
        :aria-label="`Edit policy data of ${plugin} as raw JSON`"
        data-test="policy-data-mode"
        @click="setMode('raw')"
        >Edit as raw JSON</Button
      >
      <Button
        v-else-if="editable"
        variant="tertiary"
        size="sm"
        :aria-label="`Show policy data of ${plugin} as a structured view`"
        :disabled-reason="structuredBlocked"
        data-test="policy-data-mode"
        @click="setMode('structured')"
        >Show structured view</Button
      >
    </Cluster>
    <PolicyDataTree
      v-if="mode === 'structured' && (keyCount || editable)"
      :value="shown"
      :ptr="ptr"
      :label="`Policy data of ${plugin}`"
      :test-id="`policy-data-view-${plugin}`"
    />
    <Stack v-else-if="mode === 'raw'" gap="2">
      <CodeEditor
        :model-value="text"
        language="json"
        min-height="140px"
        max-height="320px"
        :label="`Policy data for ${plugin}`"
        @update:model-value="onInput"
      />
      <Text v-if="error" role="alert" data-test="policy-data-error"
        >{{ error }} Fix the JSON to switch back to the structured view.</Text
      >
      <Cluster v-if="inOverlay">
        <Button
          variant="tertiary"
          size="sm"
          data-test="policy-data-reset"
          @click="reset"
          >Use the file value</Button
        >
      </Cluster>
    </Stack>
    <FieldIssues v-if="editable" :ptr="ptr" />
  </Stack>
</template>
