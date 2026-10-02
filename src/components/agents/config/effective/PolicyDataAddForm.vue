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
      <select
        v-model="type"
        :class="SELECT_CLASS"
        :aria-label="`Type of the new ${inArray ? 'item' : 'value'}`"
        data-test="pd-new-type"
      >
        <option v-for="t in types" :key="t" :value="t">{{ t }}</option>
      </select>
      <select
        v-if="type === 'boolean'"
        v-model="text"
        :class="SELECT_CLASS"
        aria-label="New value"
        data-test="pd-new-value"
      >
        <option value="true">true</option>
        <option value="false">false</option>
      </select>
      <InputText
        v-else-if="type === 'string' || type === 'number'"
        v-model="text"
        size="small"
        class="min-w-32 flex-1 font-mono"
        placeholder="value"
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
// "Add key" / "Add item" of one object / array in the structured policy_data editor.
import { computed, ref, watch } from 'vue';
import InputText from '@/volt/InputText.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import TertiaryButton from '@/volt/TertiaryButton.vue';
import { parseScalar, type JsonType } from '@/utils/agent-config/policy-data';

const props = defineProps<{
  /** Adding to an array (no key) rather than an object. */
  inArray: boolean;
  /** Keys already in the object (duplicates are refused). */
  existing: readonly string[];
  /** Human name of the container, for labels. */
  where: string;
  testKey: string;
}>();
const emit = defineEmits<{ add: [key: string | null, value: unknown] }>();

// In an object, null would delete the key (RFC 7396): only arrays can hold a null.
const types = computed<JsonType[]>(() =>
  props.inArray
    ? ['string', 'number', 'boolean', 'object', 'array', 'null']
    : ['string', 'number', 'boolean', 'object', 'array'],
);

const open = ref(false);
const key = ref('');
const type = ref<JsonType>('string');
const text = ref('');

watch(type, (t) => {
  if (t === 'boolean') text.value = 'true';
  else if (t !== 'string' && t !== 'number') text.value = '';
});

const error = computed(() => {
  if (!props.inArray) {
    if (!key.value) return 'Enter a key';
    if (props.existing.includes(key.value)) return 'This key exists';
  }
  return parseScalar(text.value, type.value).error;
});

function close() {
  open.value = false;
  key.value = '';
  text.value = '';
  type.value = 'string';
}

function submit() {
  if (error.value) return;
  emit(
    'add',
    props.inArray ? null : key.value,
    parseScalar(text.value, type.value).value,
  );
  close();
}

const SELECT_CLASS =
  'rounded-md border border-ccf-300 bg-white px-2 py-1 text-xs text-gray-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200';
</script>
