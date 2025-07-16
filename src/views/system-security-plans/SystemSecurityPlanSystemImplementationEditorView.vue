<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div class="bg-white dark:bg-slate-900 border border-ccf-300 dark:border-slate-700 rounded-lg p-6">
      <h2 class="text-2xl font-bold text-gray-900 dark:text-slate-300">System Implementation Editor</h2>
      <p class="text-gray-600 dark:text-slate-400 mt-1">Configure users, components, inventory, and authorizations for your system implementation</p>
    </div>

    <!-- Tabbed Interface -->
    <div class="bg-white dark:bg-slate-900 border border-ccf-300 dark:border-slate-700 rounded-lg overflow-hidden">
      <Tabs v-model:value="activeTab">
        <TabList>
          <Tab value="overview">Overview</Tab>
          <Tab value="users">Users ({{ users?.length || 0 }})</Tab>
          <Tab value="components">Components ({{ components?.length || 0 }})</Tab>
          <Tab value="inventory">Inventory ({{ inventoryItems?.length || 0 }})</Tab>
          <Tab value="authorizations">Authorizations ({{ leveragedAuthorizations?.length || 0 }})</Tab>
        </TabList>

        <TabPanels>
          <!-- Overview Tab -->
          <TabPanel value="overview">
            <SystemImplementationOverviewForm 
              :ssp-id="id" 
              :system-implementation="systemImplementation"
              @saved="handleOverviewSaved"
            />
          </TabPanel>

          <!-- Users Tab -->
          <TabPanel value="users">
            <div class="p-6">
              <div class="flex justify-between items-center mb-6">
                <h3 class="text-lg font-semibold dark:text-slate-300">System Users</h3>
                <button 
                  @click="showCreateUserModal = true"
                  class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                >
                  Create User
                </button>
              </div>

              <div class="space-y-4">
                <div v-if="users?.length === 0" class="text-center py-8 text-gray-500 dark:text-slate-400">
                  No users defined. Create your first user to get started.
                </div>
                
                <div v-for="user in users" :key="user.uuid" class="border border-gray-200 dark:border-slate-700 rounded-lg">
                  <CollapsableGroup>
                    <template #header>
                      <div class="py-3 px-4 flex justify-between items-center">
                        <div class="flex items-center space-x-3">
                          <span class="font-medium text-gray-900 dark:text-slate-300">{{ user.title }}</span>
                          <span v-if="user.shortName" class="text-sm text-gray-500 dark:text-slate-400">({{ user.shortName }})</span>
                        </div>
                        <div class="flex gap-2">
                          <button 
                            @click.stop="editUser(user)"
                            class="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
                          >
                            Edit
                          </button>
                          <button 
                            @click.stop="downloadUserJSON(user)"
                            class="px-3 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600 transition-colors"
                          >
                            JSON
                          </button>
                          <button 
                            @click.stop="deleteUser(user)"
                            class="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </template>
                    <div class="px-4 py-4 bg-gray-50 dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700">
                      <p class="text-sm text-gray-600 dark:text-slate-400 mb-3">{{ user.description }}</p>
                      
                      <div v-if="user.roleIds?.length" class="mb-3">
                        <span class="text-sm font-medium text-gray-700 dark:text-slate-300">Roles:</span>
                        <div class="flex flex-wrap gap-1 mt-1">
                          <span v-for="role in user.roleIds" :key="role" class="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded text-xs">
                            {{ role }}
                          </span>
                        </div>
                      </div>

                      <div v-if="user.authorizedPrivileges?.length" class="space-y-2">
                        <span class="text-sm font-medium text-gray-700 dark:text-slate-300">Authorized Privileges:</span>
                        <div v-for="privilege in user.authorizedPrivileges" :key="privilege.title" class="bg-white dark:bg-slate-900 p-3 rounded border border-gray-200 dark:border-slate-600">
                          <div class="font-medium text-sm">{{ privilege.title }}</div>
                          <div v-if="privilege.description" class="text-xs text-gray-600 dark:text-slate-400 mt-1">{{ privilege.description }}</div>
                          <div v-if="privilege.functionsPerformed?.length" class="text-xs text-blue-600 dark:text-blue-400 mt-1">
                            Functions: {{ privilege.functionsPerformed.join(', ') }}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CollapsableGroup>
                </div>
              </div>
            </div>
          </TabPanel>

          <!-- Components Tab -->
          <TabPanel value="components">
            <div class="p-6">
              <div class="flex justify-between items-center mb-6">
                <h3 class="text-lg font-semibold dark:text-slate-300">System Components</h3>
                <button 
                  @click="showCreateComponentModal = true"
                  class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                >
                  Create Component
                </button>
              </div>

              <div class="space-y-4">
                <div v-if="components?.length === 0" class="text-center py-8 text-gray-500 dark:text-slate-400">
                  No components defined. Create your first component to get started.
                </div>
                
                <div v-for="component in components" :key="component.uuid" class="border border-gray-200 dark:border-slate-700 rounded-lg">
                  <CollapsableGroup>
                    <template #header>
                      <div class="py-3 px-4 flex justify-between items-center">
                        <div class="flex items-center space-x-3">
                          <span class="font-medium text-gray-900 dark:text-slate-300">{{ component.title }}</span>
                          <span class="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded text-xs">
                            {{ component.type }}
                          </span>
                          <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                                :class="{
                                  'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200': component.status?.state === 'operational',
                                  'bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200': component.status?.state !== 'operational'
                                }">
                            {{ component.status?.state || 'unknown' }}
                          </span>
                        </div>
                        <div class="flex gap-2">
                          <button 
                            @click.stop="editComponent(component)"
                            class="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
                          >
                            Edit
                          </button>
                          <button 
                            @click.stop="downloadComponentJSON(component)"
                            class="px-3 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600 transition-colors"
                          >
                            JSON
                          </button>
                          <button 
                            @click.stop="deleteComponent(component)"
                            class="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </template>
                    <div class="px-4 py-4 bg-gray-50 dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700">
                      <p class="text-sm text-gray-600 dark:text-slate-400 mb-3">{{ component.description }}</p>
                      
                      <div v-if="component.purpose" class="mb-3">
                        <span class="text-sm font-medium text-gray-700 dark:text-slate-300">Purpose:</span>
                        <span class="text-sm text-gray-600 dark:text-slate-400 ml-2">{{ component.purpose }}</span>
                      </div>

                      <div v-if="component.protocols?.length" class="space-y-2">
                        <span class="text-sm font-medium text-gray-700 dark:text-slate-300">Protocols:</span>
                        <div v-for="protocol in component.protocols" :key="protocol.uuid" class="bg-white dark:bg-slate-900 p-3 rounded border border-gray-200 dark:border-slate-600">
                          <div class="font-medium text-sm">{{ protocol.title }}</div>
                          <div class="text-xs text-gray-600 dark:text-slate-400 mt-1">{{ protocol.name }}</div>
                          <div v-if="protocol.portRanges?.length" class="text-xs text-blue-600 dark:text-blue-400 mt-1">
                            <span v-for="range in protocol.portRanges" :key="range.transport" class="mr-3">
                              {{ range.transport }}: {{ range.start }}-{{ range.end }}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CollapsableGroup>
                </div>
              </div>
            </div>
          </TabPanel>

          <!-- Inventory Tab -->
          <TabPanel value="inventory">
            <div class="p-6">
              <div class="flex justify-between items-center mb-6">
                <h3 class="text-lg font-semibold dark:text-slate-300">Inventory Items</h3>
                <button 
                  @click="showCreateInventoryItemModal = true"
                  class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                >
                  Create Item
                </button>
              </div>

              <div class="space-y-4">
                <div v-if="inventoryItems?.length === 0" class="text-center py-8 text-gray-500 dark:text-slate-400">
                  No inventory items defined. Create your first item to get started.
                </div>
                
                <div v-for="item in inventoryItems" :key="item.uuid" class="border border-gray-200 dark:border-slate-700 rounded-lg">
                  <CollapsableGroup>
                    <template #header>
                      <div class="py-3 px-4 flex justify-between items-center">
                        <div class="flex items-center space-x-3">
                          <span class="font-medium text-gray-900 dark:text-slate-300">{{ item.description || 'Inventory Item' }}</span>
                          <span class="bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 px-2 py-1 rounded text-xs font-mono">
                            {{ item.uuid.substring(0, 8) }}...
                          </span>
                        </div>
                        <div class="flex gap-2">
                          <button 
                            @click.stop="editInventoryItem(item)"
                            class="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
                          >
                            Edit
                          </button>
                          <button 
                            @click.stop="attachInventoryItem(item)"
                            class="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600 transition-colors"
                          >
                            Attach
                          </button>
                          <button 
                            @click.stop="downloadInventoryItemJSON(item)"
                            class="px-3 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600 transition-colors"
                          >
                            JSON
                          </button>
                          <button 
                            @click.stop="deleteInventoryItem(item)"
                            class="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </template>
                    <div class="px-4 py-4 bg-gray-50 dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700">
                      <p class="text-sm text-gray-600 dark:text-slate-400 mb-3">{{ item.description }}</p>
                      
                      <div v-if="item.implementedComponents?.length" class="space-y-2">
                        <span class="text-sm font-medium text-gray-700 dark:text-slate-300">Implemented Components:</span>
                        <div v-for="impl in item.implementedComponents" :key="impl.componentUuid" class="bg-white dark:bg-slate-900 p-3 rounded border border-gray-200 dark:border-slate-600">
                          <div class="font-medium text-sm font-mono">{{ impl.componentUuid }}</div>
                          <div v-if="impl.remarks" class="text-xs text-gray-600 dark:text-slate-400 mt-1">{{ impl.remarks }}</div>
                        </div>
                      </div>
                    </div>
                  </CollapsableGroup>
                </div>
              </div>
            </div>
          </TabPanel>

          <!-- Authorizations Tab -->
          <TabPanel value="authorizations">
            <div class="p-6">
              <div class="flex justify-between items-center mb-6">
                <h3 class="text-lg font-semibold dark:text-slate-300">Leveraged Authorizations</h3>
                <button 
                  @click="showCreateLeveragedAuthModal = true"
                  class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                >
                  Create Authorization
                </button>
              </div>

              <div class="space-y-4">
                <div v-if="leveragedAuthorizations?.length === 0" class="text-center py-8 text-gray-500 dark:text-slate-400">
                  No leveraged authorizations defined. Create your first authorization to get started.
                </div>
                
                <div v-for="auth in leveragedAuthorizations" :key="auth.uuid" class="border border-gray-200 dark:border-slate-700 rounded-lg">
                  <CollapsableGroup>
                    <template #header>
                      <div class="py-3 px-4 flex justify-between items-center">
                        <div class="flex items-center space-x-3">
                          <span class="font-medium text-gray-900 dark:text-slate-300">{{ auth.title }}</span>
                          <span class="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded text-xs">
                            {{ new Date(auth.dateAuthorized).toLocaleDateString() }}
                          </span>
                        </div>
                        <div class="flex gap-2">
                          <button 
                            @click.stop="editLeveragedAuth(auth)"
                            class="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
                          >
                            Edit
                          </button>
                          <button 
                            @click.stop="downloadLeveragedAuthJSON(auth)"
                            class="px-3 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600 transition-colors"
                          >
                            JSON
                          </button>
                          <button 
                            @click.stop="deleteLeveragedAuth(auth)"
                            class="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </template>
                    <div class="px-4 py-4 bg-gray-50 dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700">
                      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                        <div>
                          <span class="text-sm font-medium text-gray-700 dark:text-slate-300">Party UUID:</span>
                          <span class="text-sm text-gray-600 dark:text-slate-400 ml-2 font-mono">{{ auth.partyUuid }}</span>
                        </div>
                        <div>
                          <span class="text-sm font-medium text-gray-700 dark:text-slate-300">Date Authorized:</span>
                          <span class="text-sm text-gray-600 dark:text-slate-400 ml-2">{{ new Date(auth.dateAuthorized).toLocaleDateString() }}</span>
                        </div>
                      </div>
                      
                      <div v-if="auth.remarks" class="mb-3">
                        <span class="text-sm font-medium text-gray-700 dark:text-slate-300">Remarks:</span>
                        <p class="text-sm text-gray-600 dark:text-slate-400 mt-1">{{ auth.remarks }}</p>
                      </div>

                      <div v-if="auth.props?.length" class="space-y-2">
                        <span class="text-sm font-medium text-gray-700 dark:text-slate-300">Properties:</span>
                        <div v-for="prop in auth.props" :key="prop.name" class="bg-white dark:bg-slate-900 p-3 rounded border border-gray-200 dark:border-slate-600">
                          <div class="font-medium text-sm">{{ prop.name }}</div>
                          <div class="text-xs text-gray-600 dark:text-slate-400 mt-1">{{ prop.value }}</div>
                        </div>
                      </div>
                    </div>
                  </CollapsableGroup>
                </div>
              </div>
            </div>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  </div>

  <!-- User Create Modal -->
  <Modal :show="showCreateUserModal" @close="showCreateUserModal = false">
    <SystemImplementationUserCreateForm 
      :ssp-id="id"
      @cancel="showCreateUserModal = false"
      @created="handleUserCreated"
    />
  </Modal>

  <!-- User Edit Modal -->
  <Modal :show="!!(showEditUserModal && editingUser)" @close="showEditUserModal = false">
    <SystemImplementationUserEditForm 
      :ssp-id="id"
      :user="editingUser!"
      @cancel="showEditUserModal = false"
      @saved="handleUserSaved"
    />
  </Modal>

  <!-- Component Create Modal -->
  <Modal :show="showCreateComponentModal" @close="showCreateComponentModal = false">
    <SystemImplementationComponentCreateForm 
      :ssp-id="id"
      @cancel="showCreateComponentModal = false"
      @created="handleComponentCreated"
    />
  </Modal>

  <!-- Component Edit Modal -->
  <Modal :show="!!(showEditComponentModal && editingComponent)" @close="showEditComponentModal = false">
    <SystemImplementationComponentEditForm 
      :ssp-id="id"
      :component="editingComponent!"
      @cancel="showEditComponentModal = false"
      @saved="handleComponentSaved"
    />
  </Modal>

  <!-- Inventory Item Create Modal -->
  <Modal :show="showCreateInventoryItemModal" @close="showCreateInventoryItemModal = false">
    <SystemImplementationInventoryItemCreateForm 
      :ssp-id="id"
      @cancel="showCreateInventoryItemModal = false"
      @created="handleInventoryItemCreated"
    />
  </Modal>

  <!-- Inventory Item Edit Modal -->
  <Modal :show="!!(showEditInventoryItemModal && editingInventoryItem)" @close="showEditInventoryItemModal = false">
    <SystemImplementationInventoryItemEditForm 
      :ssp-id="id"
      :inventory-item="editingInventoryItem!"
      @cancel="showEditInventoryItemModal = false"
      @saved="handleInventoryItemSaved"
    />
  </Modal>

  <!-- Inventory Item Attach Modal -->
  <Modal :show="showInventoryItemAttachModal" @close="showInventoryItemAttachModal = false">
    <SystemImplementationInventoryItemAttachModal 
      :ssp-id="id"
      :item="editingInventoryItem!"
      @cancel="showInventoryItemAttachModal = false"
      @saved="handleInventoryItemAttached"
    />
  </Modal>

  <!-- Leveraged Authorization Create Modal -->
  <Modal :show="showCreateLeveragedAuthModal" @close="showCreateLeveragedAuthModal = false">
    <SystemImplementationLeveragedAuthorizationCreateForm 
      :ssp-id="id"
      @cancel="showCreateLeveragedAuthModal = false"
      @created="handleLeveragedAuthCreated"
    />
  </Modal>

  <!-- Leveraged Authorization Edit Modal -->
  <Modal :show="!!(showEditLeveragedAuthModal && editingLeveragedAuth)" @close="showEditLeveragedAuthModal = false">
    <SystemImplementationLeveragedAuthorizationEditForm 
      :ssp-id="id"
      :auth="editingLeveragedAuth!"
      @cancel="showEditLeveragedAuthModal = false"
      @saved="handleLeveragedAuthSaved"
    />
  </Modal>
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import decamelizeKeys from 'decamelize-keys';

// Tab components
import Tabs from '@/volt/Tabs.vue';
import TabList from '@/volt/TabList.vue';
import Tab from '@/volt/Tab.vue';
import TabPanels from '@/volt/TabPanels.vue';
import TabPanel from '@/volt/TabPanel.vue';

// Form components
import Modal from '@/components/Modal.vue';
import CollapsableGroup from '@/components/CollapsableGroup.vue';
import SystemImplementationOverviewForm from '@/components/system-security-plans/SystemImplementationOverviewForm.vue';
import SystemImplementationUserCreateForm from '@/components/system-security-plans/SystemImplementationUserCreateForm.vue';
import SystemImplementationUserEditForm from '@/components/system-security-plans/SystemImplementationUserEditForm.vue';
import SystemImplementationComponentCreateForm from '@/components/system-security-plans/SystemImplementationComponentCreateForm.vue';
import SystemImplementationComponentEditForm from '@/components/system-security-plans/SystemImplementationComponentEditForm.vue';
import SystemImplementationInventoryItemCreateForm from '@/components/system-security-plans/SystemImplementationInventoryItemCreateForm.vue';
import SystemImplementationInventoryItemEditForm from '@/components/system-security-plans/SystemImplementationInventoryItemEditForm.vue';
import SystemImplementationInventoryItemAttachModal from '@/components/system-security-plans/SystemImplementationInventoryItemAttachModal.vue';
import SystemImplementationLeveragedAuthorizationCreateForm from '@/components/system-security-plans/SystemImplementationLeveragedAuthorizationCreateForm.vue';
import SystemImplementationLeveragedAuthorizationEditForm from '@/components/system-security-plans/SystemImplementationLeveragedAuthorizationEditForm.vue';

// Types and stores
import {
  type SystemComponent,
  type SystemImplementationUser,
  type SystemSecurityPlan,
  type InventoryItem,
  type LeveragedAuthorization,
  type SystemImplementation,
  useSystemSecurityPlanStore
} from '@/stores/system-security-plans.ts';
import type { DataResponse } from '@/stores/types.ts';

const route = useRoute();
const toast = useToast();
const id = route.params.id as string;
const sspStore = useSystemSecurityPlanStore();

// Tab state
const activeTab = ref('overview');

// Data
const systemSecurityPlan = ref<SystemSecurityPlan | null>(null);
const systemImplementation = ref<SystemImplementation | null>(null);
const users = ref<SystemImplementationUser[] | null>(null);
const components = ref<SystemComponent[] | null>(null);
const inventoryItems = ref<InventoryItem[] | null>(null);
const leveragedAuthorizations = ref<LeveragedAuthorization[] | null>(null);

// Modal states
const showCreateUserModal = ref(false);
const showEditUserModal = ref(false);
const showCreateComponentModal = ref(false);
const showEditComponentModal = ref(false);
const showCreateInventoryItemModal = ref(false);
const showEditInventoryItemModal = ref(false);
const showInventoryItemAttachModal = ref(false);
const showCreateLeveragedAuthModal = ref(false);
const showEditLeveragedAuthModal = ref(false);

// Edit targets
const editingUser = ref<SystemImplementationUser | null>(null);
const editingComponent = ref<SystemComponent | null>(null);
const editingInventoryItem = ref<InventoryItem | null>(null);
const editingLeveragedAuth = ref<LeveragedAuthorization | null>(null);

const loadData = () => {
  sspStore.get(id).then((data) => {
    systemSecurityPlan.value = data.data;
  });
  
  sspStore.getSystemImplementation(id).then((data) => {
    systemImplementation.value = data.data;
  });
  
  sspStore.getSystemImplementationUsers(id).then((data: DataResponse<SystemImplementationUser[]>) => {
    users.value = data.data;
  });
  
  sspStore.getSystemImplementationComponents(id).then((data: DataResponse<SystemComponent[]>) => {
    components.value = data.data;
  });
  
  sspStore.getSystemImplementationInventoryItems(id).then((data: DataResponse<InventoryItem[]>) => {
    inventoryItems.value = data.data;
  });
  
  sspStore.getSystemImplementationLeveragedAuthorizations(id).then((data: DataResponse<LeveragedAuthorization[]>) => {
    leveragedAuthorizations.value = data.data;
  });
};

onMounted(() => {
  loadData();
});

// Overview handlers
const handleOverviewSaved = (updatedSystemImplementation: SystemImplementation) => {
  systemImplementation.value = updatedSystemImplementation;
};

// User management
const editUser = (user: SystemImplementationUser) => {
  editingUser.value = user;
  showEditUserModal.value = true;
};

const handleUserCreated = (newUser: SystemImplementationUser) => {
  users.value?.push(newUser);
  showCreateUserModal.value = false;
};

const handleUserSaved = (updatedUser: SystemImplementationUser) => {
  if (users.value) {
    const index = users.value.findIndex(u => u.uuid === updatedUser.uuid);
    if (index !== -1) {
      users.value[index] = updatedUser;
    }
  }
  showEditUserModal.value = false;
  editingUser.value = null;
};

const downloadUserJSON = (user: SystemImplementationUser) => {
  const dataStr = JSON.stringify(decamelizeKeys(user), null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `user-${user.uuid}.json`;
  link.click();
  URL.revokeObjectURL(url);
};

const deleteUser = async (user: SystemImplementationUser) => {
  if (!confirm(`Are you sure you want to delete user "${user.title}"?`)) {
    return;
  }
  
  try {
    await sspStore.deleteSystemImplementationUser(id, user.uuid);
    if (users.value) {
      users.value = users.value.filter(u => u.uuid !== user.uuid);
    }
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'User deleted successfully.',
      life: 3000
    });
  } catch (error) {
    console.error('Failed to delete user:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to delete user. Please try again.',
      life: 5000
    });
  }
};

// Component management
const editComponent = async (component: SystemComponent) => {
  // Verify the component still exists before editing
  try {
    const response = await sspStore.getSystemImplementationComponent(id, component.uuid);
    editingComponent.value = response.data;
    showEditComponentModal.value = true;
  } catch (error) {
    console.error('Failed to fetch component for editing:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Component not found. Please refresh the page.',
      life: 5000
    });
    // Refresh the component list
    loadData();
  }
};

const handleComponentCreated = async (newComponent: SystemComponent) => {
  // Add the component to the local array
  components.value?.push(newComponent);
  showCreateComponentModal.value = false;
  
  // Verify by reloading components from backend after a short delay
  setTimeout(async () => {
    try {
      const data = await sspStore.getSystemImplementationComponents(id);
      const foundComponent = data.data.find(c => c.uuid === newComponent.uuid);
      if (!foundComponent) {
        console.error('Component was not found in backend after creation!', newComponent);
        toast.add({
          severity: 'warning',
          summary: 'Warning',
          detail: 'Component may not have been saved properly. Please refresh the page.',
          life: 5000
        });
        // Remove from local array if not found in backend
        if (components.value) {
          components.value = components.value.filter(c => c.uuid !== newComponent.uuid);
        }
      } else {
        console.log('Component verified in backend:', foundComponent);
      }
    } catch (error) {
      console.error('Failed to verify component creation:', error);
    }
  }, 1000);
};

const handleComponentSaved = (updatedComponent: SystemComponent) => {
  if (components.value) {
    const index = components.value.findIndex(c => c.uuid === updatedComponent.uuid);
    if (index !== -1) {
      components.value[index] = updatedComponent;
    }
  }
  showEditComponentModal.value = false;
  editingComponent.value = null;
};

const downloadComponentJSON = (component: SystemComponent) => {
  const dataStr = JSON.stringify(decamelizeKeys(component), null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `component-${component.uuid}.json`;
  link.click();
  URL.revokeObjectURL(url);
};

const deleteComponent = async (component: SystemComponent) => {
  if (!confirm(`Are you sure you want to delete component "${component.title}"?`)) {
    return;
  }
  
  try {
    await sspStore.deleteSystemImplementationComponent(id, component.uuid);
    if (components.value) {
      components.value = components.value.filter(c => c.uuid !== component.uuid);
    }
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Component deleted successfully.',
      life: 3000
    });
  } catch (error) {
    console.error('Failed to delete component:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to delete component. Please try again.',
      life: 5000
    });
  }
};

// Inventory Item management
const editInventoryItem = (item: InventoryItem) => {
  editingInventoryItem.value = item;
  showEditInventoryItemModal.value = true;
};

const handleInventoryItemCreated = (newItem: InventoryItem) => {
  inventoryItems.value?.push(newItem);
  showCreateInventoryItemModal.value = false;
};

const handleInventoryItemSaved = (updatedItem: InventoryItem) => {
  if (inventoryItems.value) {
    const index = inventoryItems.value.findIndex(i => i.uuid === updatedItem.uuid);
    if (index !== -1) {
      inventoryItems.value[index] = updatedItem;
    }
  }
  showEditInventoryItemModal.value = false;
  editingInventoryItem.value = null;
};

const downloadInventoryItemJSON = (item: InventoryItem) => {
  const dataStr = JSON.stringify(decamelizeKeys(item), null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `inventory-item-${item.uuid}.json`;
  link.click();
  URL.revokeObjectURL(url);
};

const deleteInventoryItem = async (item: InventoryItem) => {
  if (!confirm(`Are you sure you want to delete inventory item "${item.description || item.uuid}"?`)) {
    return;
  }
  
  try {
    await sspStore.deleteSystemImplementationInventoryItem(id, item.uuid);
    if (inventoryItems.value) {
      inventoryItems.value = inventoryItems.value.filter(i => i.uuid !== item.uuid);
    }
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Inventory item deleted successfully.',
      life: 3000
    });
  } catch (error) {
    console.error('Failed to delete inventory item:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to delete inventory item. Please try again.',
      life: 5000
    });
  }
};

const attachInventoryItem = (item: InventoryItem) => {
  editingInventoryItem.value = item;
  showInventoryItemAttachModal.value = true;
};

const handleInventoryItemAttached = (updatedItem: InventoryItem) => {
  if (inventoryItems.value) {
    const index = inventoryItems.value.findIndex(i => i.uuid === updatedItem.uuid);
    if (index !== -1) {
      inventoryItems.value[index] = updatedItem;
    }
  }
  showInventoryItemAttachModal.value = false;
  editingInventoryItem.value = null;
};

// Leveraged Authorization management
const editLeveragedAuth = (auth: LeveragedAuthorization) => {
  editingLeveragedAuth.value = auth;
  showEditLeveragedAuthModal.value = true;
};

const handleLeveragedAuthCreated = (newAuth: LeveragedAuthorization) => {
  leveragedAuthorizations.value?.push(newAuth);
  showCreateLeveragedAuthModal.value = false;
};

const handleLeveragedAuthSaved = (updatedAuth: LeveragedAuthorization) => {
  if (leveragedAuthorizations.value) {
    const index = leveragedAuthorizations.value.findIndex(a => a.uuid === updatedAuth.uuid);
    if (index !== -1) {
      leveragedAuthorizations.value[index] = updatedAuth;
    }
  }
  showEditLeveragedAuthModal.value = false;
  editingLeveragedAuth.value = null;
};

const downloadLeveragedAuthJSON = (auth: LeveragedAuthorization) => {
  const dataStr = JSON.stringify(decamelizeKeys(auth), null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `leveraged-auth-${auth.uuid}.json`;
  link.click();
  URL.revokeObjectURL(url);
};

const deleteLeveragedAuth = async (auth: LeveragedAuthorization) => {
  if (!confirm(`Are you sure you want to delete leveraged authorization "${auth.title}"?`)) {
    return;
  }
  
  try {
    await sspStore.deleteSystemImplementationLeveragedAuthorization(id, auth.uuid);
    if (leveragedAuthorizations.value) {
      leveragedAuthorizations.value = leveragedAuthorizations.value.filter(a => a.uuid !== auth.uuid);
    }
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Leveraged authorization deleted successfully.',
      life: 3000
    });
  } catch (error) {
    console.error('Failed to delete leveraged authorization:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to delete leveraged authorization. Please try again.',
      life: 5000
    });
  }
};

</script>
