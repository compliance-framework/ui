<template>
  <div class="py-0.5">
    <button
      v-if="!open"
      type="button"
      class="text-xs text-sky-700 hover:underline dark:text-sky-300"
      :data-test="`pd-add-${testKey}`"
      @click="open = true"
    >
      <i class="pi pi-plus mr-1 text-[0.65rem]" />{{
        inArray ? 'Add item' : 'Add key'
      }}
    </button>
    <form
      v-else
      class="flex flex-wrap items-start gap-2"
      :data-test="`pd-add-form-${testKey}`"
      @submit.prevent="submit"
      @keydown.esc.prevent="close"
    >
      <InputText
        v-if="!inArray"
        v-model="key"
        size="small"
        class="w-40 font-mono"
        placeholder="key"
        :aria-label="`New key in ${where}`"
        data-test="pd-new-key"
      />
      <label
        v-if="itemType === 'boolean'"
        class="inline-flex items-center gap-1.5 text-xs"
      >
        <input
          v-model="checked"
          type="checkbox"
          aria-label="New value"
          data-test="pd-new-value"
        />
        {{ checked ? 'true' : 'false' }}
      </label>
      <InputText
        v-else
        v-model="text"
        size="small"
        class="min-w-32 flex-1 font-mono"
        :placeholder="itemType ? `${itemType} value` : 'value'"
        :inputmode="itemType === 'number' ? 'decimal' : undefined"
        aria-label="New value"
        data-test="pd-new-value"
      />
      <SecondaryButton
        size="small"
        type="submit"
        :disabled="!!error"
        data-test="pd-add-submit"
        >Add</SecondaryButton
      >
      <TertiaryButton size="small" type="button" @click="close"
        >Cancel</TertiaryButton
      >
      <p
        v-if="!itemType"
        class="w-full text-xs text-gray-500 dark:text-slate-400"
      >
        A JSON value (5, true, [], {}, "text") keeps its type; anything else is
        text.
      </p>
      <p
        v-if="error && (key || text)"
        class="w-full text-xs text-red-600 dark:text-red-400"
        data-test="pd-add-error"
      >
        {{ error }}
      </p>
    </form>
  </div>
</template>

<script setup lang="ts">
// "Add key" / "Add item" of one object / array in the structured policy_data editor. There is
// no type selector: a list whose items share a scalar type takes new items of that type;
// otherwise the value is read as a JSON literal when it parses, else as text.
import { computed, ref } from 'vue';
import InputText from '@/volt/InputText.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import TertiaryButton from '@/volt/TertiaryButton.vue';
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
