<template>
  <li
    :data-test="`pd-node-${ptr}`"
    :data-pending="isChanged ? 'true' : undefined"
  >
    <div class="flex flex-wrap items-center gap-1.5 py-0.5">
      <button
        v-if="container"
        type="button"
        class="w-4 text-gray-500 hover:text-sky-700 dark:text-slate-400 dark:hover:text-sky-300"
        :aria-expanded="expanded"
        :aria-label="`${expanded ? 'Collapse' : 'Expand'} ${label}`"
        :data-test="`pd-toggle-${ptr}`"
        @click="expanded = !expanded"
      >
        <i
          class="pi text-[0.65rem]"
          :class="expanded ? 'pi-chevron-down' : 'pi-chevron-right'"
        />
      </button>
      <span v-else class="w-4" />
      <span
        class="min-w-0 font-mono text-xs break-all"
        :class="
          inArray
            ? 'text-gray-400 dark:text-slate-500'
            : 'text-gray-700 dark:text-slate-300'
        "
        >{{ label }}</span
      >
      <span
        v-if="editable && !editing"
        class="inline-flex shrink-0 gap-0.5"
        data-test="pd-actions"
      >
        <button
          v-if="!container && type !== 'null'"
          type="button"
          class="rounded p-0.5 text-gray-500 hover:bg-slate-200 hover:text-sky-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-sky-300"
          :aria-label="`Edit ${label}`"
          :data-test="`pd-edit-${ptr}`"
          @click="startEdit"
        >
          <i class="pi pi-pencil text-[0.65rem]" />
        </button>
        <button
          type="button"
          class="rounded p-0.5 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
          :aria-label="`Remove ${label}`"
          :data-test="`pd-remove-${ptr}`"
          @click="$emit('remove', ptr)"
        >
          <i class="pi pi-trash text-[0.65rem]" />
        </button>
      </span>
      <template v-if="!editing">
        <span
          v-if="container"
          class="text-xs text-gray-500 dark:text-slate-400"
          >{{ summary }}</span
        >
        <template v-else-if="masked">
          <span class="font-mono text-xs text-gray-500">{{ value }}</span>
          <ConfigPill
            v-tooltip.top="MASKED_TOOLTIP"
            severity="secondary"
            tabindex="0"
            :aria-label="MASKED_TOOLTIP"
            data-test="pd-masked"
            >masked</ConfigPill
          >
        </template>
        <span
          v-else-if="typeof value === 'string'"
          class="font-mono text-xs break-all text-gray-900 dark:text-slate-200"
          :data-test="`pd-value-${ptr}`"
          >"<template v-for="(seg, i) in segments" :key="i"
            ><mark
              v-if="seg.env"
              class="rounded bg-violet-100 px-0.5 text-violet-800 dark:bg-violet-500/20 dark:text-violet-200"
              data-test="pd-env"
              >{{ seg.text }}</mark
            ><template v-else>{{ seg.text }}</template></template
          >"</span
        >
        <span
          v-else
          class="font-mono text-xs"
          :class="SCALAR_CLASSES[type]"
          :data-test="`pd-value-${ptr}`"
          >{{ scalarText(value) }}</span
        >
        <ConfigPill
          v-if="hasEnv"
          v-tooltip.top="ENV_TOOLTIP"
          severity="warn"
          tabindex="0"
          :aria-label="ENV_TOOLTIP"
          data-test="pd-env-pill"
          >env</ConfigPill
        >
      </template>
      <i
        v-if="note"
        v-tooltip.top="note.text"
        role="img"
        tabindex="0"
        class="pi text-xs"
        :class="
          note.state === 'restricted'
            ? 'pi-shield text-amber-600 dark:text-amber-400'
            : 'pi-info-circle text-gray-400 dark:text-slate-500'
        "
        :aria-label="note.text"
        :data-test="`pd-access-${ptr}`"
      />
      <span
        v-if="isChanged"
        class="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 text-[0.7rem] text-sky-800 dark:bg-sky-500/15 dark:text-sky-200"
        :data-test="`pd-pending-${ptr}`"
      >
        pending
        <button
          type="button"
          :aria-label="`Undo the pending change to ${label}`"
          :data-test="`pd-undo-${ptr}`"
          @click="tree!.revert(ptr)"
        >
          ↺
        </button>
      </span>
    </div>

    <form
      v-if="editing"
      class="ml-6 flex flex-wrap items-start gap-2 py-1"
      :data-test="`pd-edit-form-${ptr}`"
      @submit.prevent="apply"
      @keydown.esc.prevent="editing = false"
    >
      <label
        v-if="editType === 'boolean'"
        class="inline-flex items-center gap-1.5 text-xs"
      >
        <input
          v-model="checked"
          type="checkbox"
          :aria-label="`Value of ${label}`"
          data-test="pd-edit-value"
        />
        {{ checked ? 'true' : 'false' }}
      </label>
      <InputText
        v-else
        v-model="text"
        size="small"
        class="min-w-40 flex-1 font-mono"
        :inputmode="editType === 'number' ? 'decimal' : undefined"
        :placeholder="masked ? 'masked; type a new value' : ''"
        :aria-label="`Value of ${label}`"
        data-test="pd-edit-value"
      />
      <PrimaryButton
        size="small"
        type="submit"
        :disabled="!!editError"
        data-test="pd-edit-apply"
        >Apply</PrimaryButton
      >
      <TertiaryButton size="small" type="button" @click="editing = false"
        >Cancel</TertiaryButton
      >
      <p
        v-if="editError"
        class="w-full text-xs text-red-600 dark:text-red-400"
        data-test="pd-edit-error"
      >
        {{ editError }}
      </p>
    </form>

    <template v-if="container && expanded">
      <ul
        class="ml-2 border-l border-ccf-300 pl-3 dark:border-slate-700"
        :aria-label="label"
      >
        <PolicyDataNode
          v-for="child in shownChildren"
          :key="child.ptr"
          :label="Array.isArray(value) ? `[${child.key}]` : String(child.key)"
          :value="child.value"
          :ptr="child.ptr"
          :depth="depth + 1"
          :in-array="Array.isArray(value)"
          @set="onChildSet"
          @remove="onChildRemove"
        />
        <li v-if="hiddenCount" class="py-0.5">
          <button
            type="button"
            class="text-xs text-sky-700 hover:underline dark:text-sky-300"
            :data-test="`pd-show-all-${ptr}`"
            @click="showAll = true"
          >
            Show {{ hiddenCount }} more
          </button>
        </li>
        <li v-if="!children.length" class="py-0.5 text-xs text-gray-500">
          {{ Array.isArray(value) ? 'No items.' : 'No keys.' }}
        </li>
      </ul>
      <div v-if="editable" class="ml-5">
        <PolicyDataAddForm
          :in-array="Array.isArray(value)"
          :item-type="Array.isArray(value) ? itemType(value) : null"
          :existing="children.map((c) => String(c.key))"
          :where="label"
          :test-key="ptr"
          @add="addChild"
        />
      </div>
    </template>
  </li>
</template>

<script setup lang="ts">
// One key / array item of the structured policy_data view (recursive), with its own pencil,
// remove and (for objects / arrays) add actions. A value keeps its JSON type when edited
// (text for strings, a number check for numbers, a checkbox for booleans); changing a type is
// done in the raw JSON view. Object keys are written at their own pointer; an array item edit
// is emitted as the whole new array at the array's pointer (RFC 7396), and the draft shows it
// as an element change. Objects / arrays collapse beyond COLLAPSE_DEPTH or COLLAPSE_SIZE.
import { computed, inject, ref } from 'vue';
import InputText from '@/volt/InputText.vue';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import TertiaryButton from '@/volt/TertiaryButton.vue';
import { escapeToken, parsePointer } from '@/utils/agent-config/json-pointer';
import { clone, isPlainObject } from '@/utils/agent-config/merge-patch';
import {
  CHILD_PAGE,
  envRefs,
  envSegments,
  isContainer,
  isMasked,
  itemType,
  jsonType,
  parseScalar,
  removeIn,
  scalarText,
  setIn,
  sizeOf,
  startsCollapsed,
  type JsonType,
} from '@/utils/agent-config/policy-data';
import ConfigPill from '../ConfigPill.vue';
import PolicyDataAddForm from './PolicyDataAddForm.vue';
import { POLICY_DATA_TREE_KEY } from './policyDataContext';

const props = defineProps<{
  label: string;
  value: unknown;
  ptr: string;
  depth: number;
  /** An array item (its label is the index). */
  inArray: boolean;
}>();
const emit = defineEmits<{
  set: [ptr: string, value: unknown];
  remove: [ptr: string];
}>();

const tree = inject(POLICY_DATA_TREE_KEY, null);

const MASKED_TOOLTIP =
  'Masked in the report: the host keeps its value unless you set a new one';
const ENV_TOOLTIP =
  '${env:…} is resolved only in plugin config values: here it is a literal string, and the API rejects new references in policy_data';
const SCALAR_CLASSES: Partial<Record<JsonType, string>> = {
  number: 'text-sky-800 dark:text-sky-200',
  boolean: 'text-amber-800 dark:text-amber-200',
  null: 'text-gray-500 italic dark:text-slate-400',
};

const type = computed(() => jsonType(props.value));
const container = computed(() => isContainer(props.value));
const masked = computed(() => isMasked(props.value));
const segments = computed(() =>
  typeof props.value === 'string' ? envSegments(props.value) : [],
);
const hasEnv = computed(
  () => typeof props.value === 'string' && envRefs(props.value).length > 0,
);
const summary = computed(() => {
  const n = sizeOf(props.value);
  return Array.isArray(props.value)
    ? `${n} item${n === 1 ? '' : 's'}`
    : `${n} key${n === 1 ? '' : 's'}`;
});

const editable = computed(() => !!tree && tree.canEdit(props.ptr));
const note = computed(() => tree?.accessNote(props.ptr) ?? null);
const isChanged = computed(() => !!tree && tree.changed(props.ptr));

const expanded = ref(!startsCollapsed(props.depth, props.value));
const showAll = ref(false);
const children = computed(() => {
  const v = props.value;
  const at = (k: string | number) => `${props.ptr}/${escapeToken(String(k))}`;
  if (Array.isArray(v)) {
    return v.map((value, key) => ({ key, value, ptr: at(key) }));
  }
  if (isPlainObject(v)) {
    return Object.entries(v).map(([key, value]) => ({
      key,
      value,
      ptr: at(key),
    }));
  }
  return [];
});
const shownChildren = computed(() =>
  showAll.value ? children.value : children.value.slice(0, CHILD_PAGE),
);
const hiddenCount = computed(
  () => children.value.length - shownChildren.value.length,
);

// ---- Editing one value, keeping its type ----
const editing = ref(false);
/** The type the editor keeps: a masked value is replaced by a string. */
const editType = computed<JsonType>(() =>
  masked.value ? 'string' : type.value,
);
const text = ref('');
const checked = ref(false);

function startEdit() {
  text.value = masked.value ? '' : scalarText(props.value);
  checked.value = props.value === true;
  editing.value = true;
}

const editError = computed(() => {
  if (editType.value === 'boolean') return '';
  if (masked.value && !text.value) {
    return 'Type a new value, or Cancel to keep the host value';
  }
  return parseScalar(text.value, editType.value).error;
});

function apply() {
  if (editError.value) return;
  const next =
    editType.value === 'boolean'
      ? checked.value
      : parseScalar(text.value, editType.value).value;
  editing.value = false;
  emit('set', props.ptr, next);
}

// ---- Children: a change anywhere inside an array becomes the whole new array (RFC 7396) ----
/** `childPtr` relative to this node, or null when this node is not an array. */
function inside(childPtr: string): string[] | null {
  if (!Array.isArray(props.value)) return null;
  return parsePointer(childPtr).slice(parsePointer(props.ptr).length);
}

function onChildSet(childPtr: string, v: unknown) {
  const rel = inside(childPtr);
  if (!rel) emit('set', childPtr, v);
  else emit('set', props.ptr, setIn(props.value as unknown[], rel, v));
}

function onChildRemove(childPtr: string) {
  const rel = inside(childPtr);
  if (!rel) emit('remove', childPtr);
  else emit('set', props.ptr, removeIn(props.value as unknown[], rel));
}

function addChild(key: string | null, v: unknown) {
  expanded.value = true;
  if (Array.isArray(props.value)) {
    emit('set', props.ptr, [...clone(props.value), v]);
  } else {
    emit('set', `${props.ptr}/${escapeToken(key ?? '')}`, v);
  }
}
</script>
