<template>
  <div
    class="px-4 py-4 bg-white dark:bg-slate-950 border-b border-ccf-300 dark:border-slate-700"
  >
    <p class="font-medium mb-2">By ID</p>
    <div class="flex flex-wrap gap-2 mb-2">
      <Chip
        v-for="(id, i) in modelValue"
        :key="id"
        :label="id"
        removable
        @remove="remove(i)"
      />
    </div>
    <div class="flex gap-2">
      <AutoComplete
        v-model="newId"
        type="text"
        placeholder="Enter control ID (e.g. ac-1)"
        class="grow"
        :suggestions="items"
        optionLabel="value"
        dropdown
        @complete="search"
        @keydown.enter="add"
        forceSelection
        :virtualScrollerOptions="{ itemSize: 38 }"
      >
        <template #option="slotProps">
          <div class="flex items-center">
            <div>{{ slotProps.option.label }}</div>
          </div>
        </template>
      </AutoComplete>
      <PrimaryButton @click="add()">Add</PrimaryButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { type PropType } from 'vue';
import Chip from '@/volt/Chip.vue';
import PrimaryButton from '@/components/PrimaryButton.vue';
import AutoComplete from '@/volt/AutoComplete.vue';
import type {
  ControlOption,
  SelectControl,
} from '@/composables/useControlList';
import { rankedSearch } from '@/composables/useControlList';

const props = defineProps({
  modelValue: {
    type: Array as PropType<string[]>,
    required: true,
  },
  controlList: {
    type: Array as PropType<SelectControl[]>,
    required: false,
    default: () => [],
  },
});
const emit = defineEmits<{
  (e: 'update:modelValue', v: string[]): void;
}>();

const newId = ref<ControlOption>({ label: '', value: '' });

const items = ref<ControlOption[]>([]);

function add() {
  const val = newId.value.value.trim();
  if (!val) return;
  if (!props.modelValue.includes(val)) {
    emit('update:modelValue', [...props.modelValue, val]);
  }
  newId.value = { label: '', value: '' };
}

function remove(index: number) {
  const arr = [...props.modelValue];
  arr.splice(index, 1);
  emit('update:modelValue', arr);
}

function search(event: { query: string }) {
  items.value = rankedSearch(event.query, props.controlList).filter(
    (r) => !props.modelValue.includes(r.value),
  );
}
</script>
