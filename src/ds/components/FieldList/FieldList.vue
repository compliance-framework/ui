<script setup lang="ts" generic="T">
import { computed, nextTick, ref, useId, useTemplateRef, watch } from 'vue';
import Button from '../Button/Button.vue';
import FieldMessages from '../FormField/FieldMessages.vue';
import { joinIds } from '../FormField/field';
import IconButton from '../IconButton/IconButton.vue';

/**
 * A repeatable group of fields, e.g. protocols and ports (F-20, F-11). Each row is a fieldset
 * named "Protocol 2", with the caller's fields in the `item` slot and a named Remove button
 * ("Remove protocol 2"), never a bare "×". Add puts focus in the new row's first field; Remove
 * moves it to the Remove button now at that place, else the one before, else Add. At `max` rows,
 * Add gives way to a caption stating the maximum.
 */
const props = withDefaults(
  defineProps<{
    legend: string;
    itemLabel: string;
    newItem: () => T;
    hint?: string;
    error?: string;
    addLabel?: string;
    emptyText?: string;
    max?: number;
    filter?: (item: T) => boolean;
    disabledReason?: string;
  }>(),
  {
    hint: undefined,
    error: undefined,
    addLabel: undefined,
    emptyText: undefined,
    max: undefined,
    filter: undefined,
    disabledReason: undefined,
  },
);
const emit = defineEmits<{ add: [] }>();
const model = defineModel<T[]>({ required: true });
defineSlots<{ item(props: { item: T; index: number }): unknown }>();

const hintId = useId();
const errorId = useId();
const describedBy = computed(() =>
  joinIds(props.hint && hintId, props.error && errorId),
);
const noun = computed(() => props.itemLabel.toLowerCase());
const full = computed(
  () => props.max !== undefined && model.value.length >= props.max,
);

// Stable row keys, so removing a row doesn't hand its DOM to the next one.
let nextKey = 0;
const keys = ref(model.value.map(() => nextKey++));
watch(
  () => model.value.length,
  (length) => {
    while (keys.value.length < length) keys.value.push(nextKey++);
    keys.value.length = length;
  },
);

const rows = useTemplateRef<HTMLElement[]>('rows');
const addButton = useTemplateRef<{ $el: HTMLElement }>('add-button');

function rowElement(index: number): HTMLElement | undefined {
  return rows.value?.find((row) => row.dataset.index === String(index));
}

async function add(): Promise<void> {
  if (props.disabledReason) return;
  emit('add');
  keys.value.push(nextKey++);
  model.value = [...model.value, props.newItem()];
  await nextTick();
  const row = rowElement(model.value.length - 1);
  row
    ?.querySelector<HTMLElement>(
      'input:not([type="hidden"]), select, textarea, button',
    )
    ?.focus();
}

async function remove(index: number): Promise<void> {
  if (props.disabledReason) return;
  keys.value.splice(index, 1);
  model.value = model.value.filter((_, at) => at !== index);
  await nextTick();
  const visible = model.value
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => !props.filter || props.filter(item));
  const target =
    visible.find((row) => row.index >= index)?.index ??
    visible.at(-1)?.index ??
    -1;
  const removeButton = rowElement(target)?.querySelector<HTMLElement>(
    '.field-list__remove button',
  );
  (removeButton ?? addButton.value?.$el)?.focus();
}
</script>

<template>
  <fieldset class="field-list" :aria-describedby="describedBy">
    <legend class="field-list__legend">{{ legend }}</legend>
    <div class="field-list__body">
      <div v-if="model.length" class="field-list__rows">
        <fieldset
          v-for="(item, index) in model"
          v-show="!filter || filter(item)"
          :key="keys[index]"
          ref="rows"
          class="field-list__row"
          :data-index="index"
        >
          <legend class="field-list__row-legend">
            {{ itemLabel }} {{ index + 1 }}
          </legend>
          <div class="field-list__row-body">
            <div class="field-list__fields">
              <slot name="item" :item="item" :index="index" />
            </div>
            <div class="field-list__remove">
              <IconButton
                icon="delete"
                :label="`Remove ${noun} ${index + 1}`"
                :disabled-reason="disabledReason"
                @click="remove(index)"
              />
            </div>
          </div>
        </fieldset>
      </div>
      <p v-else class="field-list__empty">
        {{ emptyText ?? `No ${legend.toLowerCase()} yet.` }}
      </p>
      <p v-if="full" class="field-list__max">
        The maximum is {{ max }} {{ legend.toLowerCase() }}.
      </p>
      <div v-else>
        <Button
          ref="add-button"
          size="sm"
          icon="add"
          :disabled-reason="disabledReason"
          @click="add"
          >{{ addLabel ?? `Add ${noun}` }}</Button
        >
      </div>
      <FieldMessages
        :hint="hint"
        :hint-id="hintId"
        :error="error"
        :error-id="errorId"
      />
    </div>
  </fieldset>
</template>

<style scoped>
.field-list,
.field-list__row {
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

.field-list__legend {
  padding: 0 0 var(--ds-space-1);
  color: var(--ds-color-text-secondary);
  font-size: var(--ds-font-size-label);
  font-weight: var(--ds-font-weight-bold);
  letter-spacing: var(--ds-tracking-wide);
  line-height: var(--ds-leading-snug);
  text-transform: uppercase;
  overflow-wrap: anywhere;
}

.field-list__body {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-3);
}

.field-list__rows {
  display: flex;
  flex-direction: column;
}

.field-list__row + .field-list__row {
  margin-top: var(--ds-space-3);
  padding-top: var(--ds-space-3);
  border-top: var(--ds-border-width) solid var(--ds-color-border-subtle);
}

.field-list__row-legend {
  float: left;
  width: 100%;
  padding: 0 0 var(--ds-space-2);
  font-size: var(--ds-font-size-label);
  font-weight: var(--ds-font-weight-bold);
  line-height: var(--ds-leading-snug);
}

.field-list__row-body {
  display: flex;
  clear: both;
  align-items: flex-start;
  gap: var(--ds-space-2);
}

.field-list__fields {
  flex: 1;
  min-width: 0;
}

/* Lines the button up with the inputs under the fields' labels. */
.field-list__remove {
  padding-top: calc(
    var(--ds-font-size-label) * var(--ds-leading-snug) + var(--ds-space-1)
  );
}

.field-list__empty {
  color: var(--ds-color-text-secondary);
  font-size: var(--ds-font-size-body);
  line-height: var(--ds-leading-snug);
}

.field-list__max {
  color: var(--ds-color-text-secondary);
  font-size: var(--ds-font-size-caption);
  line-height: var(--ds-leading-snug);
}
</style>
