<template>
  <li :data-test="`pd-node-${pathKey}`" :data-type="type">
    <div class="flex flex-wrap items-center gap-1.5 py-0.5">
      <button
        v-if="container"
        type="button"
        class="w-4 text-gray-500 hover:text-sky-700 dark:text-slate-400 dark:hover:text-sky-300"
        :aria-expanded="expanded"
        :aria-label="`${expanded ? 'Collapse' : 'Expand'} ${label}`"
        :data-test="`pd-toggle-${pathKey}`"
        @click="expanded = !expanded"
      >
        <i
          class="pi text-[0.65rem]"
          :class="expanded ? 'pi-chevron-down' : 'pi-chevron-right'"
        />
      </button>
      <span v-else class="w-4" />
      <span
        class="font-mono text-xs break-all"
        :class="
          inArray
            ? 'text-gray-400 dark:text-slate-500'
            : 'text-gray-700 dark:text-slate-300'
        "
        >{{ label }}</span
      >
      <span
        class="rounded px-1 text-[0.65rem] leading-4"
        :class="TYPE_CLASSES[type]"
        :data-test="`pd-type-${pathKey}`"
        >{{ type }}</span
      >
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
          v-else-if="type === 'string'"
          class="font-mono text-xs break-all text-gray-900 dark:text-slate-200"
          :data-test="`pd-value-${pathKey}`"
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
          :data-test="`pd-value-${pathKey}`"
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
      <span v-if="editable && !editing" class="ml-auto flex gap-1">
        <button
          type="button"
          class="rounded p-0.5 text-gray-500 hover:bg-slate-200 hover:text-sky-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-sky-300"
          :aria-label="`Edit ${label}`"
          :data-test="`pd-edit-${pathKey}`"
          @click="startEdit"
        >
          <i class="pi pi-pencil text-[0.65rem]" />
        </button>
        <button
          type="button"
          class="rounded p-0.5 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
          :aria-label="`Remove ${label}`"
          :data-test="`pd-remove-${pathKey}`"
          @click="$emit('remove', path)"
        >
          <i class="pi pi-trash text-[0.65rem]" />
        </button>
      </span>
    </div>

    <form
      v-if="editing"
      class="ml-6 flex flex-wrap items-start gap-2 py-1"
      :data-test="`pd-edit-form-${pathKey}`"
      @submit.prevent="apply"
      @keydown.esc.prevent="editing = false"
    >
      <select
        v-model="editType"
        :class="SELECT_CLASS"
        :aria-label="`Type of ${label}`"
        data-test="pd-edit-type"
      >
        <option v-for="t in types" :key="t" :value="t">{{ t }}</option>
      </select>
      <select
        v-if="editType === 'boolean'"
        v-model="text"
        :class="SELECT_CLASS"
        :aria-label="`Value of ${label}`"
        data-test="pd-edit-value"
      >
        <option value="true">true</option>
        <option value="false">false</option>
      </select>
      <InputText
        v-else-if="editType === 'string' || editType === 'number'"
        v-model="text"
        size="small"
        class="min-w-40 flex-1 font-mono"
        :placeholder="masked ? 'masked; type a new value' : ''"
        :aria-label="`Value of ${label}`"
        data-test="pd-edit-value"
      />
      <span
        v-else-if="container && editType !== type"
        class="text-xs text-gray-500 dark:text-slate-400"
        >Converts the {{ type }} ({{ summary }})</span
      >
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
          :key="String(child.key)"
          :label="Array.isArray(value) ? `[${child.key}]` : String(child.key)"
          :value="child.value"
          :path="[...path, child.key]"
          :depth="depth + 1"
          :editable="editable"
          :in-array="Array.isArray(value)"
          @set="(p, v) => $emit('set', p, v)"
          @remove="(p) => $emit('remove', p)"
        />
        <li v-if="hiddenCount" class="py-0.5">
          <button
            type="button"
            class="text-xs text-sky-700 hover:underline dark:text-sky-300"
            :data-test="`pd-show-all-${pathKey}`"
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
          :existing="children.map((c) => String(c.key))"
          :where="label"
          :test-key="pathKey"
          @add="addChild"
        />
      </div>
    </template>
  </li>
</template>

<script setup lang="ts">
// One key / array item of the structured policy_data view (recursive). Objects and arrays
// collapse (by default beyond COLLAPSE_DEPTH or COLLAPSE_SIZE); scalars show their type,
// masked report values and ${env:} references distinctly. When editable, edits are emitted as
// (path, value) / (path) operations; PolicyDataTree applies them to the whole object.
import { computed, ref, watch } from 'vue';
import InputText from '@/volt/InputText.vue';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import TertiaryButton from '@/volt/TertiaryButton.vue';
import { isPlainObject } from '@/utils/agent-config/merge-patch';
import {
  CHILD_PAGE,
  convertValue,
  envRefs,
  envSegments,
  isContainer,
  isMasked,
  jsonType,
  parseScalar,
  scalarText,
  sizeOf,
  startsCollapsed,
  type DataPath,
  type JsonType,
} from '@/utils/agent-config/policy-data';
import ConfigPill from '../ConfigPill.vue';
import PolicyDataAddForm from './PolicyDataAddForm.vue';

const props = defineProps<{
  label: string;
  value: unknown;
  path: DataPath;
  depth: number;
  editable: boolean;
  /** An array item (its label is the index). */
  inArray: boolean;
}>();
const emit = defineEmits<{
  set: [path: DataPath, value: unknown];
  remove: [path: DataPath];
}>();

const MASKED_TOOLTIP =
  'Masked in the report: the host keeps its value unless you set a new one';
const ENV_TOOLTIP =
  '${env:…} is resolved only in plugin config values: here it is a literal string, and the API rejects new references in policy_data';

const TYPE_CLASSES: Record<JsonType, string> = {
  string:
    'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200',
  number: 'bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-200',
  boolean:
    'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200',
  null: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
  object: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  array: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};
const SCALAR_CLASSES: Partial<Record<JsonType, string>> = {
  number: 'text-sky-800 dark:text-sky-200',
  boolean: 'text-amber-800 dark:text-amber-200',
  null: 'text-gray-500 italic dark:text-slate-400',
};

const pathKey = computed(() => props.path.map(String).join('/'));
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

const expanded = ref(!startsCollapsed(props.depth, props.value));
const showAll = ref(false);
const children = computed(() => {
  const v = props.value;
  if (Array.isArray(v)) return v.map((value, key) => ({ key, value }));
  if (isPlainObject(v)) {
    return Object.entries(v).map(([key, value]) => ({ key, value }));
  }
  return [];
});
const shownChildren = computed(() =>
  showAll.value ? children.value : children.value.slice(0, CHILD_PAGE),
);
const hiddenCount = computed(
  () => children.value.length - shownChildren.value.length,
);

// ---- Editing ----
// In an object a null would delete the key (RFC 7396): only array items may become null.
const types = computed<JsonType[]>(() =>
  props.inArray || type.value === 'null'
    ? ['string', 'number', 'boolean', 'object', 'array', 'null']
    : ['string', 'number', 'boolean', 'object', 'array'],
);
const editing = ref(false);
const editType = ref<JsonType>('string');
const text = ref('');

function startEdit() {
  editType.value = type.value;
  text.value = masked.value
    ? ''
    : type.value === 'null'
      ? ''
      : scalarText(props.value);
  editing.value = true;
}

// Changing the type pre-fills the converted value (e.g. "3" → 3).
watch(editType, (t, old) => {
  if (!editing.value || t === old || masked.value) return;
  if (t === 'string' || t === 'number' || t === 'boolean') {
    const base =
      old === type.value ? props.value : parseScalar(text.value, old).value;
    text.value = scalarText(convertValue(base, t));
  }
});

const editError = computed(() => {
  if (masked.value && editType.value === 'string' && !text.value) {
    return 'Type a new value, or Cancel to keep the host value';
  }
  return parseScalar(text.value, editType.value).error;
});

function apply() {
  if (editError.value) return;
  let next: unknown;
  if (editType.value === type.value && container.value) {
    next = props.value;
  } else if (
    (editType.value === 'object' || editType.value === 'array') &&
    !masked.value
  ) {
    next = convertValue(props.value, editType.value);
  } else {
    next = parseScalar(text.value, editType.value).value;
  }
  editing.value = false;
  emit('set', props.path, next);
}

function addChild(key: string | null, value: unknown) {
  const k = key ?? (Array.isArray(props.value) ? props.value.length : '');
  expanded.value = true;
  emit('set', [...props.path, k], value);
}

const SELECT_CLASS =
  'rounded-md border border-ccf-300 bg-white px-2 py-1 text-xs text-gray-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200';
</script>
