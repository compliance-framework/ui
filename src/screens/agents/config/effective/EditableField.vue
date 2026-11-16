<script setup lang="ts">
// One field of the Effective view with its R71 state and, when the workspace is provided and
// the user may edit it, an inline editor that writes to the shared pending-changes draft
// (R69). States (utils/agent-config/field-access.ts), over the reporting instances:
//   editable   — every instance would apply a change: Edit only;
//   restricted — some would not: Edit + a warning note naming them and why;
//   readonly   — none would: no Edit, an info note explains why;
//   forbidden  — locked keys: lock note, never editable.
// Without agent:configure every field is read-only and the access notes are hidden (they
// describe what an edit would do).
import { computed, ref } from 'vue';
import Button from '@/ds/components/Button/Button.vue';
import IconButton from '@/ds/components/IconButton/IconButton.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Panel from '@/ds/components/layout/Panel.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import { useWorkspace } from '@/composables/agent-config/useConfigWorkspace';
import {
  FORBIDDEN_TOOLTIP,
  accessTooltip,
  fieldAccess,
} from '@/utils/agent-config/field-access';
import { getAt } from '@/utils/agent-config/json-pointer';
import AccessIcon from './AccessIcon.vue';
import InlineScalarEditor from './InlineScalarEditor.vue';
import PendingPill from './PendingPill.vue';
import type { ScalarKind } from './scalar';

const props = withDefaults(
  defineProps<{
    ptr: string;
    label: string;
    kind?: ScalarKind | 'custom';
    /** Offer "Remove" (config keys): makeAbsent instead of only "file value". */
    removable?: boolean;
    /** Show the pending value next to the marker (scalars). */
    showPendingValue?: boolean;
  }>(),
  { kind: 'text', removable: false, showPendingValue: true },
);

const ws = useWorkspace();
const open = ref(false);

// Read-only contexts (no workspace) only know the locked keys.
const access = computed(() =>
  ws ? ws.accessAt(props.ptr) : fieldAccess(props.ptr, []),
);
const accessText = computed(() => accessTooltip(access.value));
/** Access notes are for users who may edit (agent:configure). */
const showAccess = computed(
  () => !!ws && ws.ready.value && ws.canConfigure.value,
);
const editable = computed(
  () => !!ws && ws.ready.value && ws.canEditPointer(props.ptr),
);
const pending = computed(() => !!ws && ws.draft.pendingAt(props.ptr));

const pendingText = computed(() => {
  if (!ws || !pending.value || !props.showPendingValue) return '';
  const v = getAt(ws.draft.effectiveDraft.value, props.ptr);
  if (v === undefined || v === null) return 'removed / default';
  if (typeof v === 'string') return v.length > 40 ? `${v.slice(0, 40)}…` : v;
  if (typeof v === 'object') return '';
  return String(v);
});

defineExpose({ open });
</script>

<template>
  <Stack
    gap="2"
    :data-test="`field-${ptr}`"
    :data-state="access.state"
    :data-pending="pending ? 'true' : undefined"
  >
    <Cluster gap="2">
      <slot name="label" />
      <slot />
      <AccessIcon
        v-if="access.state === 'forbidden' || showAccess"
        :state="access.state"
        :text="access.state === 'forbidden' ? FORBIDDEN_TOOLTIP : accessText"
      />
      <IconButton
        v-if="editable"
        icon="edit"
        size="sm"
        :label="`Edit ${label}`"
        :expanded="open"
        :data-test="`edit-${ptr}`"
        @click="open = !open"
      />
      <PendingPill
        v-if="pending"
        :text="pendingText"
        :undo-label="`Undo the pending change to ${label}`"
        :test-id="`pending-${ptr}`"
        :undo-test-id="`undo-${ptr}`"
        @undo="ws!.draft.revertPointer(ptr)"
      />
    </Cluster>
    <Panel v-if="open && editable" dense :data-test="`editor-${ptr}`">
      <InlineScalarEditor
        v-if="kind !== 'custom'"
        :ptr="ptr"
        :kind="kind"
        :label="label"
        :removable="removable"
        @done="open = false"
      />
      <template v-else>
        <slot name="editor" :done="() => (open = false)" />
        <Cluster justify="end">
          <Button size="sm" :data-test="`done-${ptr}`" @click="open = false"
            >Done</Button
          >
        </Cluster>
      </template>
    </Panel>
  </Stack>
</template>
