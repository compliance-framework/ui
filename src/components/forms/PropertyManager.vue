<template>
  <div class="mb-6">
    <label class="inline-block pb-2 dark:text-slate-300">Properties</label>
    <div class="space-y-3">
      <div
        v-for="(prop, index) in properties"
        :key="index"
        class="p-3 border border-ccf-300 dark:border-slate-700 rounded-md bg-gray-50 dark:bg-slate-800"
      >
        <div class="flex justify-between items-start mb-2">
          <h4 class="text-sm font-medium dark:text-slate-300">Property {{ index + 1 }}</h4>
          <button
            type="button"
            @click="removeProperty(index)"
            class="text-red-500 hover:text-red-700"
          >
            Remove
          </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label class="inline-block pb-1 text-sm dark:text-slate-300">Name</label>
            <FormInput v-model="prop.name" placeholder="Property name" />
          </div>
          <div>
            <label class="inline-block pb-1 text-sm dark:text-slate-300">Value</label>
            <FormInput v-model="prop.value" placeholder="Property value" />
          </div>
        </div>
      </div>

      <button
        type="button"
        @click="addProperty"
        class="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
      >
        Add Property
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import FormInput from '@/components/forms/FormInput.vue'
import type { Property } from '@/stores/types.ts'

const props = defineProps<{
  modelValue: Property[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: Property[]]
}>()

const properties = computed({
  get: () => props.modelValue || [],
  set: (value: Property[]) => emit('update:modelValue', value)
})

const addProperty = () => {
  const newProperties = [...properties.value]
  newProperties.push({
    name: '',
    value: '',
    class: '',
    ns: '',
    uuid: crypto.randomUUID()
  })
  properties.value = newProperties
}

const removeProperty = (index: number) => {
  const newProperties = [...properties.value]
  newProperties.splice(index, 1)
  properties.value = newProperties
}
</script>
