<template>
  <div class="flex justify-between items-center mb-4">
    <h4 class="text-lg">Users</h4>
    <button 
      @click="showCreateUserModal = true"
      class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
    >
      Create User
    </button>
  </div>

  <div
    class="my-4 rounded-md bg-white dark:bg-slate-900 border-collapse border border-ccf-300 dark:border-slate-700"
  >
    <CollapsableGroup v-for="user in users" :key="user.uuid">
      <template #header>
        <div class="py-2 px-4 text-lg flex justify-between items-center">
          <span>{{ user.title }}</span>
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
      <div class="px-4 py-4 dark:bg-slate-950 border-b dark:border-slate-700">
        <p>
          {{ user.description }}
        </p>

        <h4 class="text-lg font-medium mb-4">Roles</h4>

        <p v-for="role in user?.roleIds" :key="role">{{ role }}</p>

        <h4 class="text-lg font-medium my-4">Authorized Privileges</h4>

        <div v-for="privilege in user?.authorizedPrivileges" :key="privilege.title" class="pb-4">
          <p>{{ privilege.title }}</p>
          <ul class="list-disc pl-4">
            <li v-for="perf in privilege.functionsPerformed" :key="perf">{{ perf}}</li>
          </ul>
        </div>
      </div>
    </CollapsableGroup>
  </div>

  <div class="flex justify-between items-center mb-4">
    <h4 class="text-lg">Components</h4>
    <button 
      @click="showCreateComponentModal = true"
      class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
    >
      Create Component
    </button>
  </div>

  <div
    class="my-4 rounded-md bg-white dark:bg-slate-900 border-collapse border border-ccf-300 dark:border-slate-700"
  >
    <CollapsableGroup v-for="component in components" :key="component.uuid">
      <template #header>
        <div class="py-2 px-4 text-lg flex items-center justify-between">
          <div class="flex items-center">
            <h3>
              {{ component.title }}
              <span
                class="ml-4 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 text-gray-800 dark:text-slate-300 rounded-md text-sm whitespace-nowrap px-4 py-1"
              >{{ component.type }}</span>
            </h3>
          </div>
          <div class="flex items-center gap-3">
            <div :class="{
              'rounded-full capitalize px-2 py-1 text-sm font-light': true,
              'bg-green-400 dark:bg-green-700': component.status.state == `operational`,
              'bg-amber-600': component.status.state != `operational`,
            }">
              {{ component.status.state }}
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
        </div>
      </template>
      <div class="px-4 py-4 dark:bg-slate-950 border-b dark:border-slate-700">
        <p>
          {{ component.description }}
        </p>

        <h4 class="text-lg font-medium mb-4">Purpose</h4>

        <p>
          {{ component.purpose }}
        </p>

        <h4 class="text-lg font-medium mb-4">Remarks</h4>

        <p>
          {{ component.remarks }}
        </p>

        <h4 class="text-lg font-medium my-4">Protocols</h4>

        <div v-for="protocol in component.protocols" :key="protocol.uuid" class="pb-4">
          <p>{{ protocol.title }}</p>

          <p>{{ protocol.name }}</p>
          <ul class="list-disc pl-4">
            <li v-for="range in protocol.portRanges" :key="range.transport">{{ range.transport }}: {{ range.start }}-{{ range.end }}</li>
          </ul>
        </div>
      </div>
    </CollapsableGroup>
  </div>

  <div class="flex justify-between items-center mb-4">
    <h4 class="text-lg">Inventory Items</h4>
    <button 
      @click="showCreateInventoryItemModal = true"
      class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
    >
      Create Inventory Item
    </button>
  </div>

  <div
    class="my-4 rounded-md bg-white dark:bg-slate-900 border-collapse border border-ccf-300 dark:border-slate-700"
  >
    <CollapsableGroup v-for="item in inventoryItems" :key="item.uuid">
      <template #header>
        <div class="py-2 px-4 text-lg flex items-center justify-between">
          <div class="flex items-center">
            <h3>
              {{ item.description || 'Inventory Item' }}
              <span class="ml-4 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 text-gray-800 dark:text-slate-300 rounded-md text-sm whitespace-nowrap px-4 py-1">
                {{ item.uuid.substring(0, 8) }}
              </span>
            </h3>
          </div>
          <div class="flex gap-2">
            <button 
              @click.stop="editInventoryItem(item)"
              class="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
            >
              Edit
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
      <div class="px-4 py-4 dark:bg-slate-950 border-b dark:border-slate-700">
        <p>
          {{ item.description }}
        </p>

        <div v-if="item.remarks" class="mt-4">
          <h4 class="text-lg font-medium mb-2">Remarks</h4>
          <p>{{ item.remarks }}</p>
        </div>

        <div v-if="item.implementedComponents?.length" class="mt-4">
          <h4 class="text-lg font-medium mb-2">Implemented Components</h4>
          <div class="space-y-2">
            <div 
              v-for="impl in item.implementedComponents" 
              :key="impl.componentUuid"
              class="bg-gray-50 dark:bg-slate-800 p-3 rounded border"
            >
              <div class="font-medium text-sm">{{ impl.componentUuid }}</div>
              <div v-if="impl.remarks" class="text-gray-600 dark:text-slate-400 text-sm mt-1">
                {{ impl.remarks }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </CollapsableGroup>
  </div>

  <!-- User Create Modal -->
  <Modal v-if="showCreateUserModal" @close="showCreateUserModal = false">
    <SystemImplementationUserCreateForm 
      :ssp-id="id"
      @cancel="showCreateUserModal = false"
      @created="handleUserCreated"
    />
  </Modal>

  <!-- User Edit Modal -->
  <Modal v-if="showEditUserModal && editingUser" @close="showEditUserModal = false">
    <SystemImplementationUserEditForm 
      :ssp-id="id"
      :user="editingUser"
      @cancel="showEditUserModal = false"
      @saved="handleUserSaved"
    />
  </Modal>

  <!-- Component Create Modal -->
  <Modal v-if="showCreateComponentModal" @close="showCreateComponentModal = false">
    <SystemImplementationComponentCreateForm 
      :ssp-id="id"
      @cancel="showCreateComponentModal = false"
      @created="handleComponentCreated"
    />
  </Modal>

  <!-- Component Edit Modal -->
  <Modal v-if="showEditComponentModal && editingComponent" @close="showEditComponentModal = false">
    <SystemImplementationComponentEditForm 
      :ssp-id="id"
      :component="editingComponent"
      @cancel="showEditComponentModal = false"
      @saved="handleComponentSaved"
    />
  </Modal>

  <!-- Inventory Item Create Modal -->
  <Modal v-if="showCreateInventoryItemModal" @close="showCreateInventoryItemModal = false">
    <SystemImplementationInventoryItemCreateForm 
      :ssp-id="id"
      @cancel="showCreateInventoryItemModal = false"
      @created="handleInventoryItemCreated"
    />
  </Modal>

  <!-- Inventory Item Edit Modal -->
  <Modal v-if="showEditInventoryItemModal && editingInventoryItem" @close="showEditInventoryItemModal = false">
    <SystemImplementationInventoryItemEditForm 
      :ssp-id="id"
      :inventory-item="editingInventoryItem"
      @cancel="showEditInventoryItemModal = false"
      @saved="handleInventoryItemSaved"
    />
  </Modal>
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue';
import {
  type SystemComponent,
  type SystemImplementationUser,
  type SystemSecurityPlan,
  type InventoryItem,
  useSystemSecurityPlanStore
} from '@/stores/system-security-plans.ts'
import { useRoute } from 'vue-router';
import type { DataResponse } from '@/stores/types.ts'
import CollapsableGroup from '@/components/CollapsableGroup.vue'
import Modal from '@/components/Modal.vue'
import SystemImplementationUserCreateForm from '@/components/system-security-plans/SystemImplementationUserCreateForm.vue'
import SystemImplementationUserEditForm from '@/components/system-security-plans/SystemImplementationUserEditForm.vue'
import SystemImplementationComponentCreateForm from '@/components/system-security-plans/SystemImplementationComponentCreateForm.vue'
import SystemImplementationComponentEditForm from '@/components/system-security-plans/SystemImplementationComponentEditForm.vue'
import SystemImplementationInventoryItemCreateForm from '@/components/system-security-plans/SystemImplementationInventoryItemCreateForm.vue'
import SystemImplementationInventoryItemEditForm from '@/components/system-security-plans/SystemImplementationInventoryItemEditForm.vue'
import { useToast } from 'primevue/usetoast'
import decamelizeKeys from 'decamelize-keys'

const route = useRoute();
const toast = useToast();
const id = route.params.id as string;
const sspStore = useSystemSecurityPlanStore();

const systemSecurityPlan = ref<SystemSecurityPlan | null>(null);
const users = ref<SystemImplementationUser[] | null>(null);
const components = ref<SystemComponent[] | null>(null);
const inventoryItems = ref<InventoryItem[] | null>(null);

// Modal states
const showCreateUserModal = ref(false);
const showEditUserModal = ref(false);
const showCreateComponentModal = ref(false);
const showEditComponentModal = ref(false);
const showCreateInventoryItemModal = ref(false);
const showEditInventoryItemModal = ref(false);

// Edit targets
const editingUser = ref<SystemImplementationUser | null>(null);
const editingComponent = ref<SystemComponent | null>(null);
const editingInventoryItem = ref<InventoryItem | null>(null);

const loadData = () => {
  sspStore.get(id).then((data) => {
    systemSecurityPlan.value = data.data;
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
};

onMounted(() => {
  loadData();
});

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
const editComponent = (component: SystemComponent) => {
  editingComponent.value = component;
  showEditComponentModal.value = true;
};

const handleComponentCreated = (newComponent: SystemComponent) => {
  components.value?.push(newComponent);
  showCreateComponentModal.value = false;
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
</script>
