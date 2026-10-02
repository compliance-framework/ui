<template>
  <div
    class="min-w-0"
    :data-test="`field-${ptr}`"
    :data-state="access.state"
    :data-pending="pending ? 'true' : undefined"
  >
    <div class="flex flex-wrap items-center gap-2">
      <slot name="label" />
      <span
        class="min-w-0"
        :class="{
          'text-gray-400 dark:text-slate-500': access.state === 'forbidden',
        }"
      >
        <slot />
      </span>
      <i
        v-if="access.state === 'forbidden'"
        v-tooltip.top="FORBIDDEN_TOOLTIP"
        role="img"
        tabindex="0"
        class="pi pi-lock text-xs text-gray-400"
        :aria-label="FORBIDDEN_TOOLTIP"
        data-test="field-forbidden"
      />
      <i
        v-else-if="showAccess && access.state === 'restricted'"
        v-tooltip.top="accessText"
        role="img"
        tabindex="0"
        class="pi pi-shield text-xs text-amber-600 dark:text-amber-400"
        :aria-label="accessText"
        data-test="field-restricted"
      />
      <i
        v-else-if="showAccess && access.state === 'readonly'"
        v-tooltip.top="accessText"
        role="img"
        tabindex="0"
        class="pi pi-info-circle text-xs text-gray-400 dark:text-slate-500"
        :aria-label="accessText"
        data-test="field-readonly"
      />
      <button
        v-if="editable"
        type="button"
        class="rounded p-0.5 text-gray-500 hover:bg-slate-200 hover:text-sky-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-sky-300"
        :aria-label="`Edit ${label}`"
        :aria-expanded="open"
        :data-test="`edit-${ptr}`"
        @click="open = !open"
      >
        <i class="pi pi-pencil text-xs" />
      </button>
      <span
        v-if="pending"
        class="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-xs text-sky-800 dark:bg-sky-500/15 dark:text-sky-200"
        :data-test="`pending-${ptr}`"
      >
        pending<template v-if="pendingText">: {{ pendingText }}</template>
        <button
          type="button"
          class="ml-0.5"
          :aria-label="`Undo the pending change to ${label}`"
          :data-test="`undo-${ptr}`"
          @click="ws!.draft.revertPointer(ptr)"
        >
          ↺
        </button>
      </span>
    </div>
    <div
      v-if="open && editable"
      class="mt-2 rounded-md border border-sky-200 bg-white p-3 dark:border-sky-800 dark:bg-slate-900"
      :data-test="`editor-${ptr}`"
    >
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
        <div class="mt-2 flex justify-end">
          <SecondaryButton
            size="small"
            :data-test="`done-${ptr}`"
            @click="open = false"
            >Done</SecondaryButton
          >
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
// One field of the Effective view with its R71 state and, when the workspace is provided and
// the user may edit it, an inline editor that writes to the shared pending-changes draft
// (R69). States (utils/agent-config/field-access.ts), over the reporting instances:
//   editable   — every instance would apply a change: pencil only;
//   restricted — some would not: pencil + shield naming them and why;
//   readonly   — none would: no pencil, an info icon explains why;
//   forbidden  — locked keys: lock icon, never editable.
// Without agent:configure every field is read-only and the access hints are hidden (they
// describe what an edit would do).
import { computed, ref } from 'vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import { useWorkspace } from '@/composables/agent-config/useConfigWorkspace';
import {
  FORBIDDEN_TOOLTIP,
  accessTooltip,
  fieldAccess,
} from '@/utils/agent-config/field-access';
import { getAt } from '@/utils/agent-config/json-pointer';
import InlineScalarEditor from './InlineScalarEditor.vue';
import type { ScalarKind } from './scalar';

const props = withDefaults(
  defineProps<{
    ptr: string;
    label: string;
    kind?: ScalarKind | 'custom';
    /** Offer "Remove" (config keys): makeAbsent instead of only "file value". */
    removable?: boolean;
    /** Show the pending value next to the pill (scalars). */
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
/** Shields / read-only hints are for users who may edit (agent:configure). */
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
