<template>
  <div class="p-6">
    <h3 class="text-lg font-semibold text-gray-900 dark:text-slate-300 mb-4">
      Create Observation
    </h3>
    
    <form @submit.prevent="submit" class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">
          Title
        </label>
        <input
          v-model="formData.title"
          type="text"
          class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:text-slate-300"
          placeholder="Enter observation title"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">
          Description <span class="text-red-500">*</span>
        </label>
        <textarea
          v-model="formData.description"
          required
          rows="4"
          class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:text-slate-300"
          placeholder="Enter observation description"
        ></textarea>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">
          Methods <span class="text-red-500">*</span>
        </label>
        <div class="space-y-2">
          <div v-for="(method, index) in formData.methods" :key="index" class="flex gap-2">
            <input
              v-model="formData.methods[index]"
              type="text"
              required
              class="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:text-slate-300"
              placeholder="Enter method"
            />
            <button
              type="button"
              @click="removeMethod(index)"
              class="px-3 py-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
            >
              Remove
            </button>
          </div>
          <button
            type="button"
            @click="addMethod"
            class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
          >
            + Add Method
          </button>
        </div>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">
          Types
        </label>
        <div class="space-y-2">
          <div v-for="(type, index) in formData.types" :key="index" class="flex gap-2">
            <input
              v-model="formData.types[index]"
              type="text"
              class="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:text-slate-300"
              placeholder="Enter type"
            />
            <button
              type="button"
              @click="removeType(index)"
              class="px-3 py-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
            >
              Remove
            </button>
          </div>
          <button
            type="button"
            @click="addType"
            class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
          >
            + Add Type
          </button>
        </div>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">
          Collected Date
        </label>
        <input
          v-model="formData.collected"
          type="datetime-local"
          class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:text-slate-300"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">
          Expires Date
        </label>
        <input
          v-model="formData.expires"
          type="datetime-local"
          class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:text-slate-300"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">
          Remarks
        </label>
        <textarea
          v-model="formData.remarks"
          rows="3"
          class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:text-slate-300"
          placeholder="Enter additional remarks (optional)"
        ></textarea>
      </div>

      <div class="flex justify-end gap-3 pt-4">
        <button
          type="button"
          @click="$emit('cancel')"
          class="px-4 py-2 text-gray-700 dark:text-slate-300 bg-gray-200 dark:bg-slate-700 rounded-md hover:bg-gray-300 dark:hover:bg-slate-600"
        >
          Cancel
        </button>
        <button
          type="submit"
          :disabled="!formData.description || !formData.methods.length || saving"
          class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ saving ? 'Creating...' : 'Create' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { type Observation, usePlanOfActionAndMilestonesStore } from '@/stores/plan-of-action-and-milestones.ts'
import { useToast } from 'primevue/usetoast'

const props = defineProps<{
  poamId: string
}>()

const emit = defineEmits<{
  cancel: []
  created: [observation: Observation]
}>()

const poamStore = usePlanOfActionAndMilestonesStore()
const toast = useToast()

const saving = ref(false)

const formData = reactive({
  title: '',
  description: '',
  methods: [''] as string[],
  types: [] as string[],
  collected: '',
  expires: '',
  remarks: ''
})

function addMethod() {
  formData.methods.push('')
}

function removeMethod(index: number) {
  if (formData.methods.length > 1) {
    formData.methods.splice(index, 1)
  }
}

function addType() {
  formData.types.push('')
}

function removeType(index: number) {
  formData.types.splice(index, 1)
}

async function submit() {
  if (!formData.description || !formData.methods.length || formData.methods.some(m => !m.trim())) {
    toast.add({
      severity: 'error',
      summary: 'Validation Error',
      detail: 'Description and at least one method are required',
      life: 3000
    })
    return
  }

  try {
    saving.value = true
    
    const newObservation: Partial<Observation> = {
      uuid: crypto.randomUUID(),
      title: formData.title || undefined,
      description: formData.description,
      methods: formData.methods.filter(m => m.trim()),
      types: formData.types.filter(t => t.trim()).length > 0 ? formData.types.filter(t => t.trim()) : undefined,
      collected: formData.collected || undefined,
      expires: formData.expires || undefined,
      remarks: formData.remarks || undefined
    }
    
    const response = await poamStore.createObservation(props.poamId, newObservation)
    
    toast.add({
      severity: 'success',
      summary: 'Observation Created',
      detail: 'Observation created successfully',
      life: 3000
    })
    
    emit('created', response.data)
  } catch (error) {
    console.error('Error creating observation:', error)
    toast.add({
      severity: 'error',
      summary: 'Creation Failed',
      detail: 'Failed to create observation. Please try again.',
      life: 3000
    })
  } finally {
    saving.value = false
  }
}
</script> 