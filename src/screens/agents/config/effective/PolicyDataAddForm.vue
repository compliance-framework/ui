<script setup lang="ts">
// "Add key" / "Add item" of one object / array in the structured policy_data editor. There is
// no type selector: a list whose items share a scalar type takes new items of that type;
// otherwise the value is read as a JSON literal when it parses, else as text.
import { computed, ref } from 'vue';
import Button from '@/ds/components/Button/Button.vue';
import Checkbox from '@/ds/components/Checkbox/Checkbox.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import TextInput from '@/ds/components/TextInput/TextInput.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import { parseNewValue, type JsonType } from '@/utils/agent-config/policy-data';
import { NULL_KEY_ERROR } from './nullKeys';

const props = defineProps<{
  /** Adding to an array (no key) rather than an object. */
  inArray: boolean;
  /** The scalar type the new value must have (an array's items), or null. */
  itemType: JsonType | null;
  /** Keys already in the object (duplicates are refused). */
  existing: readonly string[];
  /** Human name of the container, for labels. */
  where: string;
  testKey: string;
}>();
const emit = defineEmits<{ add: [key: string | null, value: unknown] }>();

const open = ref(false);
const key = ref('');
const text = ref('');
const checked = ref(false);

const parsed = computed(() =>
  props.itemType === 'boolean'
    ? { value: checked.value, error: '' }
    : parseNewValue(text.value, props.itemType),
);
const error = computed(() => {
  if (!props.inArray) {
    if (!key.value) return 'Enter a key';
    if (props.existing.includes(key.value)) return 'This key exists';
  }
  if (parsed.value.error) return parsed.value.error;
  // RFC 7396: null at a key means "delete" in the overlay. Arrays are written whole, so their
  // items may be null.
  if (!props.inArray && parsed.value.value === null)
    return `${NULL_KEY_ERROR}; use Remove`;
  return '';
});
/** The error, once something has been typed. */
const shownError = computed(() =>
  error.value && (key.value || text.value) ? error.value : undefined,
);

function close() {
  open.value = false;
  key.value = '';
  text.value = '';
  checked.value = false;
}

function submit() {
  if (error.value) return;
  emit('add', props.inArray ? null : key.value, parsed.value.value);
  close();
}
</script>

<template>
  <Cluster v-if="!open">
    <Button
      variant="tertiary"
      size="sm"
      icon="add"
      :data-test="`pd-add-${testKey}`"
      @click="open = true"
      >{{ inArray ? 'Add item' : 'Add key' }}</Button
    >
  </Cluster>
  <form
    v-else
    :data-test="`pd-add-form-${testKey}`"
    @submit.prevent="submit"
    @keydown.esc.prevent="close"
  >
    <Stack gap="2">
      <Cluster gap="2" align="end">
        <FormField v-if="!inArray" :label="`New key in ${where}`">
          <TextInput v-model="key" placeholder="key" data-test="pd-new-key" />
        </FormField>
        <Checkbox
          v-if="itemType === 'boolean'"
          v-model="checked"
          :label="checked ? 'New value: true' : 'New value: false'"
          data-test="pd-new-value"
        />
        <FormField
          v-else
          label="New value"
          :hint="
            itemType
              ? undefined
              : 'A JSON value (5, true, [], {}, &quot;text&quot;) keeps its type; anything else is text.'
          "
        >
          <TextInput
            v-model="text"
            :placeholder="itemType ? `${itemType} value` : 'value'"
            :inputmode="itemType === 'number' ? 'decimal' : undefined"
            data-test="pd-new-value"
          />
        </FormField>
        <Button
          size="sm"
          type="submit"
          :disabled-reason="error ? 'Fix the new entry first.' : undefined"
          data-test="pd-add-submit"
          >Add</Button
        >
        <Button variant="tertiary" size="sm" @click="close">Cancel</Button>
      </Cluster>
      <p v-if="shownError" role="alert" data-test="pd-add-error">
        {{ shownError }}
      </p>
    </Stack>
  </form>
</template>
