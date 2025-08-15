<template>
  <div class="px-8 py-6 max-w-4xl mx-auto">
    <h2 class="text-xl font-semibold mb-6 dark:text-slate-300">Manage Inventory Item Relationships</h2>

    <div v-if="loading" class="text-center py-8">
      <p class="text-gray-500 dark:text-slate-400">Loading available items...</p>
    </div>

    <div v-else-if="error" class="text-center py-8">
      <p class="text-red-500 dark:text-red-400">{{ error }}</p>
    </div>

    <div v-else>
      <!-- Tabs -->
      <div class="border-b border-gray-200 dark:border-slate-700 mb-6">
        <nav class="-mb-px flex space-x-8">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            @click="activeTab = tab.key"
            :class="[
              'py-2 px-1 border-b-2 font-medium text-sm',
              activeTab === tab.key
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-slate-400 dark:hover:text-slate-300'
            ]"
          >
            {{ tab.label }}
            <span class="ml-2 bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-slate-300 py-0.5 px-2.5 rounded-full text-xs">
              {{ getAvailableCount(tab.key) }}
            </span>
          </button>
        </nav>
      </div>

      <!-- Search -->
      <div class="mb-6">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search items..."
          class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:text-slate-300"
        />
      </div>

      <!-- Props Tab -->
      <div v-if="activeTab === 'props'" class="space-y-3">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-medium dark:text-slate-300">Properties</h3>
          <button
            @click="addProperty"
            class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm"
          >
            Add Property
          </button>
        </div>

        <div v-for="(prop, index) in workingItem.props" :key="index" class="border border-gray-200 dark:border-slate-600 rounded-lg p-4">
          <div class="grid grid-cols-3 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">Name</label>
              <input
                v-model="prop.name"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md"
                placeholder="Property name"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">Value</label>
              <input
                v-model="prop.value"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md"
                placeholder="Property value"
              />
            </div>
            <div class="flex items-end">
              <button
                @click="removeProperty(index)"
                class="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-md text-sm"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Links Tab -->
      <div v-if="activeTab === 'links'" class="space-y-3">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-medium dark:text-slate-300">Links</h3>
          <button
            @click="addLink"
            class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm"
          >
            Add Link
          </button>
        </div>

        <div v-for="(link, index) in workingItem.links" :key="index" class="border border-gray-200 dark:border-slate-600 rounded-lg p-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">Href</label>
              <input
                v-model="link.href"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md"
                placeholder="https://example.com"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">Rel</label>
              <input
                v-model="link.rel"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md"
                placeholder="reference"
              />
            </div>
            <div class="col-span-2">
              <label class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">Text</label>
              <input
                v-model="link.text"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md"
                placeholder="Link text"
              />
            </div>
            <div class="col-span-2 flex justify-end">
              <button
                @click="removeLink(index)"
                class="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-md text-sm"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Responsible Parties Tab -->
      <div v-if="activeTab === 'responsible-parties'" class="space-y-3">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-medium dark:text-slate-300">Responsible Parties</h3>
          <button
            @click="addResponsibleParty"
            class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm"
          >
            Add Responsible Party
          </button>
        </div>

        <div v-for="(party, index) in workingItem.responsibleParties" :key="index" class="border border-gray-200 dark:border-slate-600 rounded-lg p-4">
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">Role ID</label>
              <input
                v-model="party.roleId"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md"
                placeholder="role-id"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">Party UUIDs (comma-separated)</label>
              <input
                v-model="partyUuidStrings[index]"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md"
                placeholder="uuid1,uuid2,uuid3"
                @input="updatePartyUuids(index)"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">Remarks</label>
              <textarea
                v-model="party.remarks"
                rows="2"
                class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md"
                placeholder="Additional remarks"
              ></textarea>
            </div>
            <div class="flex justify-end">
              <button
                @click="removeResponsibleParty(index)"
                class="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-md text-sm"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Implemented Components Tab -->
      <div v-if="activeTab === 'implemented-components'" class="space-y-3">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-medium dark:text-slate-300">Implemented Components</h3>
          <button
            @click="addImplementedComponent"
            class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm"
          >
            Add Component
          </button>
        </div>

        <div v-for="(component, index) in workingItem.implementedComponents" :key="index" class="border border-gray-200 dark:border-slate-600 rounded-lg p-4">
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">Component UUID</label>
              <select
                v-model="component.componentUuid"
                class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md"
              >
                <option value="">Select a component</option>
                <option v-for="comp in availableComponents" :key="comp.uuid" :value="comp.uuid">
                  {{ comp.title }} ({{ comp.uuid.substring(0, 8) }})
                </option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">Remarks</label>
              <textarea
                v-model="component.remarks"
                rows="2"
                class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md"
                placeholder="Component remarks"
              ></textarea>
            </div>
            <div class="flex justify-end">
              <button
                @click="removeImplementedComponent(index)"
                class="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-md text-sm"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="flex justify-end gap-3 pt-6 border-t border-gray-200 dark:border-slate-700">
      <button
        @click="$emit('cancel')"
        class="px-4 py-2 text-gray-700 dark:text-slate-300 bg-gray-200 dark:bg-slate-700 rounded-md hover:bg-gray-300 dark:hover:bg-slate-600"
      >
        Cancel
      </button>
      <button
        @click="saveChanges"
        :disabled="saving"
        class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {{ saving ? 'Saving...' : 'Save Changes' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { type InventoryItem, type SystemComponent } from '@/stores/system-security-plans.ts'
import { useToast } from 'primevue/usetoast'
import { useDataApi, decamelizeKeys } from '@/composables/axios'

const props = defineProps<{
  sspId: string
  item: InventoryItem
}>()

const emit = defineEmits<{
  cancel: []
  saved: [item: InventoryItem]
}>()

const toast = useToast()

const { data: availableComponents, isLoading: loadingComponents, error: componentError } = useDataApi<SystemComponent[]>(
  `/api/oscal/system-security-plans/${props.sspId}/system-implementation/components`
)

const { data: updatedItem, execute: updateItem } = useDataApi<InventoryItem>(
  `/api/oscal/system-security-plans/${props.sspId}/system-implementation/inventory-items/${props.item.uuid}`,
  {
    method: 'PUT',
    transformRequest: [decamelizeKeys]
  }
)

const loading = computed(() => loadingComponents.value)
const saving = ref(false)
const error = computed(() => componentError.value)
const searchQuery = ref('')
const activeTab = ref<'props' | 'links' | 'responsible-parties' | 'implemented-components'>('props')

// Working copy of the item with changes
const workingItem = reactive<InventoryItem>({
  ...props.item,
  props: [...(props.item.props || [])],
  links: [...(props.item.links || [])],
  responsibleParties: [...(props.item.responsibleParties || [])],
  implementedComponents: [...(props.item.implementedComponents || [])]
})

// Helper for managing party UUIDs as strings
const partyUuidStrings = ref<string[]>([])

const tabs = [
  { key: 'props' as const, label: 'Properties' },
  { key: 'links' as const, label: 'Links' },
  { key: 'responsible-parties' as const, label: 'Responsible Parties' },
  { key: 'implemented-components' as const, label: 'Implemented Components' }
]

// Methods
function getAvailableCount(type: string): number {
  switch (type) {
    case 'props': return workingItem.props?.length || 0
    case 'links': return workingItem.links?.length || 0
    case 'responsible-parties': return workingItem.responsibleParties?.length || 0
    case 'implemented-components': return workingItem.implementedComponents?.length || 0
    default: return 0
  }
}

// Property management
function addProperty() {
  if (!workingItem.props) workingItem.props = []
  workingItem.props.push({ name: '', value: '' })
}

function removeProperty(index: number) {
  workingItem.props?.splice(index, 1)
}

// Link management
function addLink() {
  if (!workingItem.links) workingItem.links = []
  workingItem.links.push({ href: '', rel: '', text: '' })
}

function removeLink(index: number) {
  workingItem.links?.splice(index, 1)
}

// Responsible party management
function addResponsibleParty() {
  if (!workingItem.responsibleParties) workingItem.responsibleParties = []
  workingItem.responsibleParties.push({ roleId: '', partyUuids: [], remarks: '' })
  partyUuidStrings.value.push('')
}

function removeResponsibleParty(index: number) {
  workingItem.responsibleParties?.splice(index, 1)
  partyUuidStrings.value.splice(index, 1)
}

function updatePartyUuids(index: number) {
  if (workingItem.responsibleParties && workingItem.responsibleParties[index]) {
    const uuids = partyUuidStrings.value[index].split(',').map(uuid => uuid.trim()).filter(uuid => uuid)
    workingItem.responsibleParties[index].partyUuids = uuids
  }
}

// Implemented component management
function addImplementedComponent() {
  if (!workingItem.implementedComponents) workingItem.implementedComponents = []
  workingItem.implementedComponents.push({ componentUuid: '', remarks: '' })
}

function removeImplementedComponent(index: number) {
  workingItem.implementedComponents?.splice(index, 1)
}

async function saveChanges() {
  try {
    saving.value = true

    await updateItem({
      data: workingItem
    })

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Inventory item relationships updated successfully.',
      life: 3000
    })

    emit('saved', updatedItem.value!)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    toast.add({
      severity: 'error',
      summary: 'Save Failed',
      detail: `Failed to save changes: ${errorMessage}`,
      life: 3000
    })
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  // Initialize party UUID strings
  if (workingItem.responsibleParties) {
    partyUuidStrings.value = workingItem.responsibleParties.map(party =>
      party.partyUuids?.join(', ') || ''
    )
  }
})
</script>
