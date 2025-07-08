<template>
  <div class="p-6">
    <h3 class="text-lg font-medium text-gray-900 dark:text-slate-300 mb-4">
      {{ isEdit ? 'Edit Resource' : 'Create Resource' }}
    </h3>

    <form @submit.prevent="handleSubmit" class="space-y-6">
      <!-- Basic Information -->
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
            Title
          </label>
          <input
            v-model="formData.title"
            type="text"
            placeholder="Resource title"
            class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-300"
          />
        </div>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
          Description
        </label>
        <textarea
          v-model="formData.description"
          rows="3"
          placeholder="Resource description"
          class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-300"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
          Remarks
        </label>
        <textarea
          v-model="formData.remarks"
          rows="2"
          placeholder="Additional remarks"
          class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-300"
        />
      </div>

      <!-- Citation -->
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
          Citation Text
        </label>
        <textarea
          :value="formData.citation?.text || ''"
          @input="(e) => { if (!formData.citation) formData.citation = { text: '' }; formData.citation.text = (e.target as HTMLTextAreaElement).value }"
          rows="2"
          placeholder="Citation or reference information"
          class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-300"
        />
      </div>

      <!-- Document IDs -->
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
          Document Identifiers
        </label>
        <div class="space-y-2">
          <div
            v-for="(docId, index) in formData.documentIds"
            :key="index"
            class="flex gap-2 items-center"
          >
            <input
              v-model="docId.scheme"
              type="text"
              placeholder="Scheme (e.g., DOI, ISBN)"
              class="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-300"
            />
            <input
              v-model="docId.identifier"
              type="text"
              placeholder="Identifier"
              class="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-300"
            />
            <button
              type="button"
              @click="removeDocumentId(index)"
              class="px-3 py-2 text-red-600 hover:text-red-700"
            >
              Remove
            </button>
          </div>
          <button
            type="button"
            @click="addDocumentId"
            class="text-blue-600 hover:text-blue-700 text-sm"
          >
            + Add Document ID
          </button>
        </div>
      </div>

      <!-- External Links -->
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
          External Links
        </label>
        <div class="space-y-2">
          <div
            v-for="(link, index) in formData.rlinks"
            :key="index"
            class="flex gap-2 items-center"
          >
            <input
              v-model="link.href"
              type="url"
              placeholder="https://example.com/resource"
              class="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-300"
            />
            <input
              v-model="link.mediaType"
              type="text"
              placeholder="application/pdf"
              class="w-40 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-300"
            />
            <button
              type="button"
              @click="removeLink(index)"
              class="px-3 py-2 text-red-600 hover:text-red-700"
            >
              Remove
            </button>
          </div>
          <button
            type="button"
            @click="addLink"
            class="text-blue-600 hover:text-blue-700 text-sm"
          >
            + Add Link
          </button>
        </div>
      </div>

      <!-- Properties -->
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
          Properties
        </label>
        <div class="space-y-2">
          <div
            v-for="(prop, index) in formData.props"
            :key="index"
            class="flex gap-2 items-center"
          >
            <input
              v-model="prop.name"
              type="text"
              placeholder="Property name"
              class="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-300"
            />
            <input
              v-model="prop.value"
              type="text"
              placeholder="Property value"
              class="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-300"
            />
            <button
              type="button"
              @click="removeProperty(index)"
              class="px-3 py-2 text-red-600 hover:text-red-700"
            >
              Remove
            </button>
          </div>
          <button
            type="button"
            @click="addProperty"
            class="text-blue-600 hover:text-blue-700 text-sm"
          >
            + Add Property
          </button>
        </div>
      </div>

      <!-- Base64 Content -->
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
          Embedded Content
        </label>
        <div class="space-y-3">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
                Filename
              </label>
              <input
                :value="formData.base64?.filename || ''"
                @input="(e) => { if (!formData.base64) formData.base64 = { filename: '', mediaType: '', value: '' }; formData.base64.filename = (e.target as HTMLInputElement).value }"
                type="text"
                placeholder="document.pdf"
                class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-300"
              />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
                Media Type
              </label>
              <input
                :value="formData.base64?.mediaType || ''"
                @input="(e) => { if (!formData.base64) formData.base64 = { filename: '', mediaType: '', value: '' }; formData.base64.mediaType = (e.target as HTMLInputElement).value }"
                type="text"
                placeholder="application/pdf"
                class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-300"
              />
            </div>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
              Base64 Content
            </label>
            <textarea
              :value="formData.base64?.value || ''"
              @input="(e) => { if (!formData.base64) formData.base64 = { filename: '', mediaType: '', value: '' }; formData.base64.value = (e.target as HTMLTextAreaElement).value }"
              rows="4"
              placeholder="Paste base64 encoded content here"
              class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-300 font-mono text-xs"
            />
          </div>
        </div>
      </div>

      <!-- Form Actions -->
      <div class="flex justify-end gap-3 pt-4">
        <button
          type="button"
          @click="$emit('cancel')"
          class="px-4 py-2 text-gray-700 dark:text-slate-300 border border-gray-300 dark:border-slate-600 rounded-md hover:bg-gray-50 dark:hover:bg-slate-700"
        >
          Cancel
        </button>
        <button
          type="submit"
          :disabled="loading"
          class="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-md"
        >
          {{ loading ? 'Saving...' : (isEdit ? 'Update' : 'Create') }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { usePlanOfActionAndMilestonesStore, type Resource } from '@/stores/plan-of-action-and-milestones'

interface Props {
  poamId: string
  resource?: Resource | null
  isEdit?: boolean
}

interface Emits {
  (e: 'cancel'): void
  (e: 'saved', resource: Resource): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const poamStore = usePlanOfActionAndMilestonesStore()
const loading = ref(false)

const formData = ref<Partial<Resource>>({
  uuid: '',
  title: '',
  description: '',
  remarks: '',
  citation: {
    text: ''
  },
  documentIds: [],
  rlinks: [],
  props: [],
  base64: {
    filename: '',
    mediaType: '',
    value: ''
  }
})

onMounted(() => {
  if (props.resource) {
    formData.value = {
      uuid: props.resource.uuid,
      title: props.resource.title || '',
      description: props.resource.description || '',
      remarks: props.resource.remarks || '',
      citation: props.resource.citation || { text: '' },
      documentIds: [...(props.resource.documentIds || [])],
      rlinks: [...(props.resource.rlinks || [])],
      props: [...(props.resource.props || [])],
      base64: props.resource.base64 || { filename: '', mediaType: '', value: '' }
    }
  } else {
    // Generate UUID for new resources
    formData.value.uuid = generateUUID()
  }
})

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

function addDocumentId() {
  if (!formData.value.documentIds) {
    formData.value.documentIds = []
  }
  formData.value.documentIds.push({
    scheme: '',
    identifier: ''
  })
}

function removeDocumentId(index: number) {
  formData.value.documentIds?.splice(index, 1)
}

function addLink() {
  if (!formData.value.rlinks) {
    formData.value.rlinks = []
  }
  formData.value.rlinks.push({
    href: '',
    mediaType: ''
  })
}

function removeLink(index: number) {
  formData.value.rlinks?.splice(index, 1)
}

function addProperty() {
  if (!formData.value.props) {
    formData.value.props = []
  }
  formData.value.props.push({
    name: '',
    value: ''
  })
}

function removeProperty(index: number) {
  formData.value.props?.splice(index, 1)
}

async function handleSubmit() {
  try {
    loading.value = true
    
    // Clean up empty items
    if (formData.value.documentIds) {
      formData.value.documentIds = formData.value.documentIds.filter(d => d.scheme || d.identifier)
    }
    if (formData.value.rlinks) {
      formData.value.rlinks = formData.value.rlinks.filter(l => l.href)
    }
    if (formData.value.props) {
      formData.value.props = formData.value.props.filter(p => p.name || p.value)
    }

    let response
    if (props.isEdit && formData.value.uuid) {
      response = await poamStore.updateBackMatterResource(props.poamId, formData.value.uuid, formData.value as Resource)
    } else {
      response = await poamStore.createBackMatterResource(props.poamId, formData.value)
    }

    emit('saved', response.data)
  } catch (error) {
    console.error('Error saving back matter resource:', error)
  } finally {
    loading.value = false
  }
}
</script> 