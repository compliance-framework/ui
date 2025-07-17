<template>
  <div class="space-y-6">
    <!-- System Implementation Overview -->
    <div class="bg-white dark:bg-slate-900 border border-ccf-300 dark:border-slate-700 rounded-lg p-6">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-slate-300">System Implementation</h3>
        <button
          class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
          disabled
        >
          Edit
        </button>
      </div>
      
      <div v-if="systemImplementation" class="grid grid-cols-1 gap-6">
        <div v-if="systemImplementation.remarks">
          <label class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">Remarks</label>
          <p class="text-gray-900 dark:text-slate-300">{{ systemImplementation.remarks }}</p>
        </div>
      </div>

      <div v-else-if="systemImplementationLoading" class="text-center py-4">
        <p class="text-gray-500 dark:text-slate-400">Loading system implementation...</p>
      </div>

      <div v-else class="text-center py-4">
        <p class="text-gray-500 dark:text-slate-400">No system implementation information available.</p>
      </div>
    </div>

    <!-- System Users -->
    <div class="bg-white dark:bg-slate-900 border border-ccf-300 dark:border-slate-700 rounded-lg p-6">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-slate-300">
          System Users 
          <span v-if="users.length > 0" class="text-sm font-normal text-gray-500 dark:text-slate-400">({{ users.length }})</span>
        </h3>
        <button
          class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
          disabled
        >
          Add User
        </button>
      </div>

      <div v-if="usersLoading" class="text-center py-4">
        <p class="text-gray-500 dark:text-slate-400">Loading users...</p>
      </div>

      <div v-else-if="users.length === 0" class="text-center py-4">
        <p class="text-gray-500 dark:text-slate-400">No system users defined.</p>
      </div>

      <div v-else class="space-y-4">
        <div 
          v-for="user in users" 
          :key="user.uuid"
          class="border border-gray-200 dark:border-slate-700 rounded-lg p-4"
        >
          <div class="flex justify-between items-start mb-2">
            <h4 class="font-medium text-gray-900 dark:text-slate-300">{{ user.title || 'Untitled User' }}</h4>
            <button
              class="text-blue-600 hover:text-blue-800 dark:text-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled
            >
              Edit
            </button>
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div v-if="user.shortName">
              <span class="font-medium text-gray-700 dark:text-slate-400">Short Name:</span>
              <span class="text-gray-900 dark:text-slate-300 ml-1">{{ user.shortName }}</span>
            </div>
            
            <div v-if="user.roleIds?.length">
              <span class="font-medium text-gray-700 dark:text-slate-400">Roles:</span>
              <span class="text-gray-900 dark:text-slate-300 ml-1">{{ user.roleIds.join(', ') }}</span>
            </div>
          </div>

          <div v-if="user.description" class="mt-2 text-sm text-gray-600 dark:text-slate-400">
            {{ user.description }}
          </div>

          <div v-if="user.authorizedPrivileges?.length" class="mt-3">
            <span class="text-sm font-medium text-gray-700 dark:text-slate-400">Authorized Privileges:</span>
            <div class="mt-1 space-y-1">
              <div 
                v-for="privilege in user.authorizedPrivileges" 
                :key="privilege.title"
                class="text-sm bg-gray-50 dark:bg-slate-800 p-2 rounded"
              >
                <div class="font-medium">{{ privilege.title }}</div>
                <div v-if="privilege.description" class="text-gray-600 dark:text-slate-400 text-xs">{{ privilege.description }}</div>
                <div v-if="privilege.functionsPerformed?.length" class="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  Functions: {{ privilege.functionsPerformed.join(', ') }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- System Components -->
    <div class="bg-white dark:bg-slate-900 border border-ccf-300 dark:border-slate-700 rounded-lg p-6">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-slate-300">
          System Components 
          <span v-if="components.length > 0" class="text-sm font-normal text-gray-500 dark:text-slate-400">({{ components.length }})</span>
        </h3>
        <button
          class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
          disabled
        >
          Add Component
        </button>
      </div>

      <div v-if="componentsLoading" class="text-center py-4">
        <p class="text-gray-500 dark:text-slate-400">Loading components...</p>
      </div>

      <div v-else-if="components.length === 0" class="text-center py-4">
        <p class="text-gray-500 dark:text-slate-400">No system components defined.</p>
      </div>

      <div v-else class="space-y-4">
        <div 
          v-for="component in components" 
          :key="component.uuid"
          class="border border-gray-200 dark:border-slate-700 rounded-lg p-4"
        >
          <div class="flex justify-between items-start mb-2">
            <h4 class="font-medium text-gray-900 dark:text-slate-300">{{ component.title }}</h4>
            <div class="flex space-x-2">
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                {{ component.type }}
              </span>
              <button
                class="text-blue-600 hover:text-blue-800 dark:text-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled
              >
                Edit
              </button>
            </div>
          </div>
          
          <div class="text-sm text-gray-600 dark:text-slate-400 mb-2">
            {{ component.description }}
          </div>

          <div v-if="component.purpose" class="text-sm">
            <span class="font-medium text-gray-700 dark:text-slate-400">Purpose:</span>
            <span class="text-gray-900 dark:text-slate-300 ml-1">{{ component.purpose }}</span>
          </div>

          <div v-if="component.status" class="text-sm mt-1">
            <span class="font-medium text-gray-700 dark:text-slate-400">Status:</span>
            <span class="text-gray-900 dark:text-slate-300 ml-1">{{ component.status.state }}</span>
            <span v-if="component.status.remarks" class="text-gray-600 dark:text-slate-400 ml-1">({{ component.status.remarks }})</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Inventory Items -->
    <div class="bg-white dark:bg-slate-900 border border-ccf-300 dark:border-slate-700 rounded-lg p-6">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-slate-300">
          Inventory Items 
          <span v-if="inventoryItems.length > 0" class="text-sm font-normal text-gray-500 dark:text-slate-400">({{ inventoryItems.length }})</span>
        </h3>
        <button
          class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
          disabled
        >
          Add Item
        </button>
      </div>

      <div v-if="inventoryItemsLoading" class="text-center py-4">
        <p class="text-gray-500 dark:text-slate-400">Loading inventory items...</p>
      </div>

      <div v-else-if="inventoryItems.length === 0" class="text-center py-4">
        <p class="text-gray-500 dark:text-slate-400">No inventory items defined.</p>
      </div>

      <div v-else class="space-y-4">
        <div 
          v-for="item in inventoryItems" 
          :key="item.uuid"
          class="border border-gray-200 dark:border-slate-700 rounded-lg p-4"
        >
          <div class="flex justify-between items-start mb-2">
            <h4 class="font-medium text-gray-900 dark:text-slate-300">{{ item.description || item.uuid.substring(0, 8) }}</h4>
            <button
              @click="() => {}"
              class="text-blue-600 hover:text-blue-800 dark:text-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled
            >
              Edit
            </button>
          </div>
          
          <div class="text-sm text-gray-600 dark:text-slate-400 mb-2">
            {{ item.description }}
          </div>

          <div v-if="item.implementedComponents?.length" class="mt-3">
            <span class="text-sm font-medium text-gray-700 dark:text-slate-400">Implemented Components:</span>
            <div class="mt-1 space-y-1">
              <div 
                v-for="impl in item.implementedComponents" 
                :key="impl.componentUuid"
                class="text-sm bg-gray-50 dark:bg-slate-800 p-2 rounded"
              >
                <div class="font-medium">{{ impl.componentUuid }}</div>
                <div v-if="impl.remarks" class="text-gray-600 dark:text-slate-400 text-xs">{{ impl.remarks }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Leveraged Authorizations -->
    <div class="bg-white dark:bg-slate-900 border border-ccf-300 dark:border-slate-700 rounded-lg p-6">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-slate-300">
          Leveraged Authorizations 
          <span v-if="leveragedAuthorizations.length > 0" class="text-sm font-normal text-gray-500 dark:text-slate-400">({{ leveragedAuthorizations.length }})</span>
        </h3>
        <button
          @click="() => {}"
          class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
          disabled
        >
          Add Authorization
        </button>
      </div>

      <div v-if="leveragedAuthorizationsLoading" class="text-center py-4">
        <p class="text-gray-500 dark:text-slate-400">Loading leveraged authorizations...</p>
      </div>

      <div v-else-if="leveragedAuthorizations.length === 0" class="text-center py-4">
        <p class="text-gray-500 dark:text-slate-400">No leveraged authorizations defined.</p>
      </div>

      <div v-else class="space-y-4">
        <div 
          v-for="auth in leveragedAuthorizations" 
          :key="auth.uuid"
          class="border border-gray-200 dark:border-slate-700 rounded-lg p-4"
        >
          <div class="flex justify-between items-start mb-2">
            <h4 class="font-medium text-gray-900 dark:text-slate-300">{{ auth.title }}</h4>
            <button
              @click="() => {}"
              class="text-blue-600 hover:text-blue-800 dark:text-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled
            >
              Edit
            </button>
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span class="font-medium text-gray-700 dark:text-slate-400">Party UUID:</span>
              <span class="text-gray-900 dark:text-slate-300 ml-1 font-mono text-xs">{{ auth.partyUuid }}</span>
            </div>
            
            <div>
              <span class="font-medium text-gray-700 dark:text-slate-400">Date Authorized:</span>
              <span class="text-gray-900 dark:text-slate-300 ml-1">{{ formatDate(auth.dateAuthorized) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { 
  type SystemImplementation,
  type SystemImplementationUser,
  type SystemComponent,
  type InventoryItem,
  useSystemSecurityPlanStore 
} from '@/stores/system-security-plans.ts'

const route = useRoute()
const sspStore = useSystemSecurityPlanStore()

const systemImplementation = ref<SystemImplementation | null>(null)
const users = ref<SystemImplementationUser[]>([])
const components = ref<SystemComponent[]>([])
const inventoryItems = ref<InventoryItem[]>([])
const leveragedAuthorizations = ref<any[]>([])

const systemImplementationLoading = ref(true)
const usersLoading = ref(true)
const componentsLoading = ref(true)
const inventoryItemsLoading = ref(true)
const leveragedAuthorizationsLoading = ref(true)

onMounted(async () => {
  const id = route.params.id as string
  
  // Load all system implementation data in parallel
  const loadingPromises = [
    // System Implementation Overview
    sspStore.getSystemImplementation(id)
      .then(response => {
        systemImplementation.value = response.data
      })
      .catch(err => console.warn('Could not load system implementation:', err))
      .finally(() => systemImplementationLoading.value = false),
    
    // System Users
    sspStore.getSystemImplementationUsers(id)
      .then(response => {
        users.value = response.data
      })
      .catch(err => console.warn('Could not load system users:', err))
      .finally(() => usersLoading.value = false),
    
    // System Components
    sspStore.getSystemImplementationComponents(id)
      .then(response => {
        components.value = response.data
      })
      .catch(err => console.warn('Could not load system components:', err))
      .finally(() => componentsLoading.value = false),
    
    // Inventory Items
    sspStore.getSystemImplementationInventoryItems(id)
      .then(response => {
        inventoryItems.value = response.data
      })
      .catch(err => console.warn('Could not load inventory items:', err))
      .finally(() => inventoryItemsLoading.value = false),
    
    // Leveraged Authorizations
    sspStore.getSystemImplementationLeveragedAuthorizations(id)
      .then(response => {
        leveragedAuthorizations.value = response.data
      })
      .catch(err => console.warn('Could not load leveraged authorizations:', err))
      .finally(() => leveragedAuthorizationsLoading.value = false)
  ]

  await Promise.allSettled(loadingPromises)
})

function formatDate(dateString?: string): string {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleDateString()
}
</script>