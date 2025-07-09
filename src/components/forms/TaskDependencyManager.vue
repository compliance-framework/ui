<template>
  <div class="mb-6">
    <label class="inline-block pb-2 dark:text-slate-300">Task Dependencies</label>
    <div class="space-y-3">
      <div
        v-for="(dependency, index) in dependencies"
        :key="index"
        class="p-3 border border-ccf-300 dark:border-slate-700 rounded-md bg-gray-50 dark:bg-slate-800"
      >
        <div class="flex justify-between items-start mb-2">
          <h4 class="text-sm font-medium dark:text-slate-300">Dependency {{ index + 1 }}</h4>
          <button
            type="button"
            @click="removeDependency(index)"
            class="text-red-500 hover:text-red-700"
          >
            Remove
          </button>
        </div>

        <div class="space-y-3">
          <div>
            <label class="inline-block pb-1 text-sm dark:text-slate-300">Task UUID</label>
            <FormInput v-model="dependency.taskUuid" placeholder="UUID of the dependent task" />
          </div>
          <div>
            <label class="inline-block pb-1 text-sm dark:text-slate-300">Remarks</label>
            <FormTextarea
              v-model="dependency.remarks"
              placeholder="Optional notes about this dependency"
              rows="2"
            />
          </div>
        </div>
      </div>

      <button
        type="button"
        @click="addDependency"
        class="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
      >
        Add Task Dependency
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import FormInput from '@/components/forms/FormInput.vue'
import FormTextarea from '@/components/forms/FormTextarea.vue'
import type { TaskDependency } from '@/stores/assessment-plans.ts'

const props = defineProps<{
  modelValue: TaskDependency[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: TaskDependency[]]
}>()

const dependencies = computed({
  get: () => props.modelValue || [],
  set: (value: TaskDependency[]) => emit('update:modelValue', value)
})

const addDependency = () => {
  const newDependencies = [...dependencies.value]
  newDependencies.push({
    taskUuid: '',
    remarks: ''
  })
  dependencies.value = newDependencies
}

const removeDependency = (index: number) => {
  const newDependencies = [...dependencies.value]
  newDependencies.splice(index, 1)
  dependencies.value = newDependencies
}
</script>
