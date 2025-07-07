<template>
  <div class="px-4 py-4 bg-white dark:bg-slate-950 border-b border-ccf-300 dark:border-slate-700">
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
      <FormInput
        v-model="newId"
        @keyup.enter="add()"
        type="text"
        placeholder="Enter control ID (e.g. ac-1)"
      />
      <PrimaryButton @click="add()">Add</PrimaryButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { type PropType } from 'vue'
import Chip from '@/volt/Chip.vue'
import PrimaryButton from '@/components/PrimaryButton.vue'
import FormInput from '../forms/FormInput.vue'

const props = defineProps({
  modelValue: {
    type: Array as PropType<string[]>,
    required: true
  }
})
const emit = defineEmits<{
  (e: 'update:modelValue', v: string[]): void
}>()

const newId = ref('')

function add() {
  const val = newId.value.trim()
  if (!val) return
  emit('update:modelValue', [...props.modelValue, val])
  newId.value = ''
}

function remove(index: number) {
  const arr = [...props.modelValue]
  arr.splice(index, 1)
  emit('update:modelValue', arr)
}
</script>
