<script setup lang="ts">
// One key / array item of the structured policy_data view (recursive), with its own Edit,
// Remove and (for objects / arrays) add actions. A value keeps its JSON type when edited
// (text for strings, a number check for numbers, a checkbox for booleans); changing a type is
// done in the raw JSON view. Object keys are written at their own pointer; an array item edit
// is emitted as the whole new array at the array's pointer (RFC 7396), and the draft shows it
// as an element change. Objects / arrays collapse beyond COLLAPSE_DEPTH or COLLAPSE_SIZE.
import { computed, inject, ref, watch } from 'vue';
import Button from '@/ds/components/Button/Button.vue';
import Checkbox from '@/ds/components/Checkbox/Checkbox.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import IconButton from '@/ds/components/IconButton/IconButton.vue';
import InfoTip from '@/ds/components/InfoTip/InfoTip.vue';
import Tag from '@/ds/components/Tag/Tag.vue';
import Text from '@/ds/components/Text/Text.vue';
import TextInput from '@/ds/components/TextInput/TextInput.vue';
import TreeItem from '@/ds/components/TreeItem/TreeItem.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import { TOOLTIPS } from '@/config/tooltips';
import { escapeToken, parsePointer } from '@/utils/agent-config/json-pointer';
import { clone, isPlainObject } from '@/utils/agent-config/merge-patch';
import {
  CHILD_PAGE,
  containsMask,
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
import AccessIcon from './AccessIcon.vue';
import PendingPill from './PendingPill.vue';
import PolicyDataAddForm from './PolicyDataAddForm.vue';
import { POLICY_DATA_TREE_KEY } from './policyDataContext';

const props = defineProps<{
  label: string;
  value: unknown;
  ptr: string;
  depth: number;
  /** An array item (its label is the index). */
  inArray: boolean;
  /**
   * Inside a list that holds a masked value: the list can only be written whole (RFC 7396),
   * which would copy the mask, so its items are not edited here (the raw view can, by
   * retyping the masked values).
   */
  maskLocked?: boolean;
}>();
const emit = defineEmits<{
  set: [ptr: string, value: unknown];
  remove: [ptr: string];
}>();

const tree = inject(POLICY_DATA_TREE_KEY, null);

const MASKED_TOOLTIP = TOOLTIPS['agents.config.policyData.masked'];
const ENV_TOOLTIP = TOOLTIPS['agents.config.policyData.env'];
const MASKED_LIST_TOOLTIP = TOOLTIPS['agents.config.policyData.maskedList'];

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
/** A list holding a masked value (at any depth): its items are locked (see maskLocked). */
const listHasMask = computed(
  () => Array.isArray(props.value) && containsMask(props.value),
);
const isChanged = computed(() => !!tree && tree.changed(props.ptr));
/**
 * An editable list whose value differs between the instances' files: any edit writes one list
 * for every instance (RFC 7396), as PolicySourcesEditor warns for policies.
 */
const differs = computed(
  () =>
    Array.isArray(props.value) &&
    editable.value &&
    !!tree?.differs?.(props.ptr),
);

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

// Array items are keyed by index: after a sibling is removed (or an undo splices the list)
// this node shows another item, so an open editor would write the old text over it. Close it,
// and re-derive the collapsed state when the value's kind changes.
watch(
  () => props.value,
  (next, prev) => {
    editing.value = false;
    if (jsonType(next) !== jsonType(prev)) {
      expanded.value = !startsCollapsed(props.depth, next);
    }
  },
);

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

<template>
  <TreeItem
    v-model:open="expanded"
    :label="label"
    :expandable="container"
    :data-test="`pd-node-${ptr}`"
    :data-pending="isChanged ? 'true' : undefined"
  >
    <Stack gap="2">
      <Cluster gap="2">
        <Text as="code" variant="code">{{ label }}</Text>
        <Cluster
          v-if="editable && !editing && !maskLocked"
          gap="1"
          as="span"
          data-test="pd-actions"
        >
          <IconButton
            v-if="!container && type !== 'null'"
            icon="edit"
            size="sm"
            :label="`Edit ${label}`"
            :data-test="`pd-edit-${ptr}`"
            @click="startEdit"
          />
          <IconButton
            icon="delete"
            size="sm"
            :label="`Remove ${label}`"
            :data-test="`pd-remove-${ptr}`"
            @click="$emit('remove', ptr)"
          />
        </Cluster>
        <template v-if="!editing">
          <template v-if="container">
            <Text as="span" variant="secondary">{{ summary }}</Text>
            <Text
              v-if="differs"
              as="span"
              variant="caption"
              :data-test="`pd-differs-${ptr}`"
              >Differs across instances</Text
            >
          </template>
          <template v-else-if="masked">
            <Text as="span" variant="secondary">{{ value }}</Text>
            <Tag label="Masked" />
            <InfoTip :text="MASKED_TOOLTIP" data-test="pd-masked" />
          </template>
          <Text
            v-else-if="typeof value === 'string'"
            as="span"
            :data-test="`pd-value-${ptr}`"
            >"<template v-for="(seg, i) in segments" :key="i"
              ><mark v-if="seg.env" data-test="pd-env">{{ seg.text }}</mark
              ><template v-else>{{ seg.text }}</template></template
            >"</Text
          >
          <Text
            v-else
            as="span"
            :variant="type === 'null' ? 'secondary' : 'body'"
            :data-test="`pd-value-${ptr}`"
            :data-type="type"
            >{{ scalarText(value) }}</Text
          >
          <template v-if="hasEnv">
            <Tag label="env" />
            <InfoTip
              icon="warning"
              tone="warning"
              :text="ENV_TOOLTIP"
              data-test="pd-env-pill"
            />
          </template>
        </template>
        <InfoTip
          v-if="listHasMask && !maskLocked"
          icon="locked"
          :text="MASKED_LIST_TOOLTIP"
          :data-test="`pd-masked-list-${ptr}`"
        />
        <AccessIcon
          v-if="note"
          :state="note.state"
          :text="note.text"
          :test-id="`pd-access-${ptr}`"
        />
        <PendingPill
          v-if="isChanged"
          compact
          :undo-label="`Undo the pending change to ${label}`"
          :test-id="`pd-pending-${ptr}`"
          :undo-test-id="`pd-undo-${ptr}`"
          @undo="tree!.revert(ptr)"
        />
      </Cluster>

      <form
        v-if="editing"
        :data-test="`pd-edit-form-${ptr}`"
        @submit.prevent="apply"
        @keydown.esc.prevent="editing = false"
      >
        <Cluster gap="2" align="end">
          <Checkbox
            v-if="editType === 'boolean'"
            v-model="checked"
            :label="checked ? 'true' : 'false'"
            :accessible-label="`Value of ${label}`"
            data-test="pd-edit-value"
          />
          <FormField
            v-else
            :label="`Value of ${label}`"
            :error="editError || undefined"
          >
            <TextInput
              v-model="text"
              :inputmode="editType === 'number' ? 'decimal' : undefined"
              :placeholder="masked ? 'masked; type a new value' : undefined"
              data-test="pd-edit-value"
            />
          </FormField>
          <Button
            variant="primary"
            size="sm"
            type="submit"
            :disabled-reason="editError ? 'Fix the value first.' : undefined"
            data-test="pd-edit-apply"
            >Apply</Button
          >
          <Button variant="tertiary" size="sm" @click="editing = false"
            >Cancel</Button
          >
        </Cluster>
      </form>
    </Stack>

    <template #children>
      <PolicyDataNode
        v-for="child in shownChildren"
        :key="child.ptr"
        :label="Array.isArray(value) ? `[${child.key}]` : String(child.key)"
        :value="child.value"
        :ptr="child.ptr"
        :depth="depth + 1"
        :in-array="Array.isArray(value)"
        :mask-locked="maskLocked || listHasMask"
        @set="onChildSet"
        @remove="onChildRemove"
      />
      <TreeItem v-if="hiddenCount" :label="`More items of ${label}`">
        <Cluster>
          <Button
            variant="tertiary"
            size="sm"
            :data-test="`pd-show-all-${ptr}`"
            @click="showAll = true"
            >Show {{ hiddenCount }} more</Button
          >
        </Cluster>
      </TreeItem>
      <TreeItem v-if="!children.length" :label="`No entries in ${label}`">
        <Text variant="secondary">{{
          Array.isArray(value) ? 'No items.' : 'No keys.'
        }}</Text>
      </TreeItem>
      <TreeItem
        v-if="editable && !maskLocked && !listHasMask"
        :label="`Add to ${label}`"
      >
        <PolicyDataAddForm
          :in-array="Array.isArray(value)"
          :item-type="Array.isArray(value) ? itemType(value) : null"
          :existing="children.map((c) => String(c.key))"
          :where="label"
          :test-key="ptr"
          @add="addChild"
        />
      </TreeItem>
    </template>
  </TreeItem>
</template>
