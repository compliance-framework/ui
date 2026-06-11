<template>
  <div class="space-y-6">
    <!-- Tabbed Interface -->
    <div
      class="bg-white dark:bg-slate-900 border border-ccf-300 dark:border-slate-700 rounded-lg overflow-hidden"
    >
      <Tabs v-model:value="activeTab">
        <TabList>
          <Tab value="overview">Overview</Tab>
          <Tab value="users">Users ({{ users?.length || 0 }})</Tab>
          <Tab value="components"
            >Components ({{ components?.length || 0 }})</Tab
          >
          <Tab value="authorizations"
            >Authorizations ({{ leveragedAuthorizations?.length || 0 }})</Tab
          >
        </TabList>

        <TabPanels>
          <!-- Overview Tab -->
          <TabPanel value="overview">
            <SystemImplementationOverviewForm
              :ssp-id="sspId"
              :system-implementation="systemImplementation!"
              @saved="handleOverviewSaved"
            />
          </TabPanel>

          <!-- Users Tab -->
          <TabPanel value="users">
            <div class="p-6">
              <div class="flex justify-between items-center mb-6">
                <h3 class="text-lg font-semibold dark:text-slate-300">
                  System Users
                </h3>
                <PrimaryButton @click="showCreateUserModal = true">
                  <i class="pi pi-plus mr-2"></i>
                  Create User
                </PrimaryButton>
              </div>

              <div class="space-y-4">
                <div
                  v-if="users?.length === 0"
                  class="text-center py-8 text-gray-500 dark:text-slate-400"
                >
                  No users defined. Create your first user to get started.
                </div>

                <div
                  v-for="user in users"
                  :key="user.uuid"
                  class="border border-gray-200 dark:border-slate-700 rounded-lg"
                >
                  <CollapsableGroup>
                    <template #header>
                      <div class="py-3 px-4 flex justify-between items-center">
                        <div class="flex items-center space-x-3">
                          <span
                            class="font-medium text-gray-900 dark:text-slate-300"
                            >{{ user.title }}</span
                          >
                          <span
                            v-if="user.shortName"
                            class="text-sm text-gray-500 dark:text-slate-400"
                            >({{ user.shortName }})</span
                          >
                        </div>
                        <div class="flex gap-2">
                          <SecondaryButton @click.stop="editUser(user)">
                            Edit
                          </SecondaryButton>
                          <SecondaryButton @click.stop="downloadUserJSON(user)">
                            JSON
                          </SecondaryButton>
                          <TertiaryButton
                            @click.stop="
                              confirmDeleteDialog(() => deleteUser(user), {
                                itemName: user.title,
                                itemType: 'user',
                              })
                            "
                            class="border-red-200 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/40"
                          >
                            Delete
                          </TertiaryButton>
                        </div>
                      </div>
                    </template>
                    <div
                      class="px-4 py-4 bg-gray-50 dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700"
                    >
                      <p class="text-sm text-gray-600 dark:text-slate-400 mb-3">
                        {{ user.description }}
                      </p>

                      <div v-if="user.roleIds?.length" class="mb-3">
                        <span
                          class="text-sm font-medium text-gray-700 dark:text-slate-300"
                          >Roles:</span
                        >
                        <div class="flex flex-wrap gap-1 mt-1">
                          <span
                            v-for="role in user.roleIds"
                            :key="role"
                            class="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded text-xs"
                          >
                            {{ role }}
                          </span>
                        </div>
                      </div>

                      <div
                        v-if="user.authorizedPrivileges?.length"
                        class="space-y-2"
                      >
                        <span
                          class="text-sm font-medium text-gray-700 dark:text-slate-300"
                          >Authorized Privileges:</span
                        >
                        <div
                          v-for="privilege in user.authorizedPrivileges"
                          :key="privilege.title"
                          class="bg-white dark:bg-slate-900 p-3 rounded border border-gray-200 dark:border-slate-600"
                        >
                          <div class="font-medium text-sm">
                            {{ privilege.title }}
                          </div>
                          <div
                            v-if="privilege.description"
                            class="text-xs text-gray-600 dark:text-slate-400 mt-1"
                          >
                            {{ privilege.description }}
                          </div>
                          <div
                            v-if="privilege.functionsPerformed?.length"
                            class="text-xs text-blue-600 dark:text-blue-400 mt-1"
                          >
                            Functions:
                            {{ privilege.functionsPerformed.join(', ') }}
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
                <h3 class="text-lg font-semibold dark:text-slate-300">
                  System Components
                </h3>
                <PrimaryButton @click="showCreateComponentModal = true">
                  <i class="pi pi-plus mr-2"></i>
                  Create Component
                </PrimaryButton>
              </div>

              <div class="space-y-4">
                <div
                  v-if="components?.length === 0"
                  class="text-center py-8 text-gray-500 dark:text-slate-400"
                >
                  No components defined. Create your first component to get
                  started.
                </div>

                <div
                  v-for="component in components"
                  :key="component.uuid"
                  class="border border-gray-200 dark:border-slate-700 rounded-lg"
                >
                  <CollapsableGroup>
                    <template #header>
                      <div class="py-3 px-4 flex justify-between items-center">
                        <div class="flex items-center space-x-3">
                          <span
                            class="font-medium text-gray-900 dark:text-slate-300"
                            >{{ component.title }}</span
                          >
                          <span
                            class="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded text-xs"
                          >
                            {{ component.type }}
                          </span>
                          <span
                            class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                            :class="{
                              'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200':
                                component.status?.state === 'operational',
                              'bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200':
                                component.status?.state !== 'operational',
                            }"
                          >
                            {{ component.status?.state || 'unknown' }}
                          </span>
                        </div>
                        <div class="flex gap-2">
                          <SecondaryButton
                            @click.stop="editComponent(component)"
                          >
                            Edit
                          </SecondaryButton>
                          <SecondaryButton
                            @click.stop="downloadComponentJSON(component)"
                          >
                            JSON
                          </SecondaryButton>
                          <TertiaryButton
                            @click.stop="
                              confirmDeleteDialog(
                                () => deleteComponent(component),
                                {
                                  itemName: component.title,
                                  itemType: 'component',
                                },
                              )
                            "
                            class="border-red-200 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/40"
                          >
                            Delete
                          </TertiaryButton>
                        </div>
                      </div>
                    </template>
                    <div
                      class="px-4 py-4 bg-gray-50 dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700"
                    >
                      <p class="text-sm text-gray-600 dark:text-slate-400 mb-3">
                        {{ component.description }}
                      </p>

                      <div v-if="component.purpose" class="mb-3">
                        <span
                          class="text-sm font-medium text-gray-700 dark:text-slate-300"
                          >Purpose:</span
                        >
                        <span
                          class="text-sm text-gray-600 dark:text-slate-400 ml-2"
                          >{{ component.purpose }}</span
                        >
                      </div>

                      <div v-if="component.protocols?.length" class="space-y-2">
                        <span
                          class="text-sm font-medium text-gray-700 dark:text-slate-300"
                          >Protocols:</span
                        >
                        <div
                          v-for="protocol in component.protocols"
                          :key="protocol.uuid"
                          class="bg-white dark:bg-slate-900 p-3 rounded border border-gray-200 dark:border-slate-600"
                        >
                          <div class="font-medium text-sm">
                            {{ protocol.title }}
                          </div>
                          <div
                            class="text-xs text-gray-600 dark:text-slate-400 mt-1"
                          >
                            {{ protocol.name }}
                          </div>
                          <div
                            v-if="protocol.portRanges?.length"
                            class="text-xs text-blue-600 dark:text-blue-400 mt-1"
                          >
                            <span
                              v-for="range in protocol.portRanges"
                              :key="range.transport"
                              class="mr-3"
                            >
                              {{ range.transport }}: {{ range.start }}-{{
                                range.end
                              }}
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

          <!-- Authorizations Tab -->
          <TabPanel value="authorizations">
            <div class="p-6">
              <div class="flex justify-between items-center mb-6">
                <h3 class="text-lg font-semibold dark:text-slate-300">
                  Leveraged Authorizations
                </h3>
                <PrimaryButton @click="showCreateLeveragedAuthModal = true">
                  <i class="pi pi-plus mr-2"></i>
                  Create Authorization
                </PrimaryButton>
              </div>

              <div class="space-y-4">
                <div
                  v-if="leveragedAuthorizations?.length === 0"
                  class="text-center py-8 text-gray-500 dark:text-slate-400"
                >
                  No leveraged authorizations defined. Create your first
                  authorization to get started.
                </div>

                <div
                  v-for="auth in leveragedAuthorizations"
                  :key="auth.uuid"
                  class="border border-gray-200 dark:border-slate-700 rounded-lg"
                >
                  <CollapsableGroup>
                    <template #header>
                      <div class="py-3 px-4 flex justify-between items-center">
                        <div class="flex items-center space-x-3">
                          <span
                            class="font-medium text-gray-900 dark:text-slate-300"
                            >{{ auth.title }}</span
                          >
                          <span
                            class="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded text-xs"
                          >
                            {{
                              new Date(auth.dateAuthorized).toLocaleDateString()
                            }}
                          </span>
                        </div>
                        <div class="flex gap-2">
                          <SecondaryButton
                            @click.stop="editLeveragedAuth(auth)"
                          >
                            Edit
                          </SecondaryButton>
                          <SecondaryButton
                            @click.stop="downloadLeveragedAuthJSON(auth)"
                          >
                            JSON
                          </SecondaryButton>
                          <TertiaryButton
                            @click.stop="
                              confirmDeleteDialog(
                                () => deleteLeveragedAuth(auth),
                                {
                                  itemName: auth.title,
                                  itemType: 'leveraged authorization',
                                },
                              )
                            "
                            class="border-red-200 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/40"
                          >
                            Delete
                          </TertiaryButton>
                        </div>
                      </div>
                    </template>
                    <div
                      class="px-4 py-4 bg-gray-50 dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700"
                    >
                      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                        <div>
                          <span
                            class="text-sm font-medium text-gray-700 dark:text-slate-300"
                            >Party UUID:</span
                          >
                          <span
                            class="text-sm text-gray-600 dark:text-slate-400 ml-2 font-mono"
                            >{{ auth.partyUuid }}</span
                          >
                        </div>
                        <div>
                          <span
                            class="text-sm font-medium text-gray-700 dark:text-slate-300"
                            >Date Authorized:</span
                          >
                          <span
                            class="text-sm text-gray-600 dark:text-slate-400 ml-2"
                            >{{
                              new Date(auth.dateAuthorized).toLocaleDateString()
                            }}</span
                          >
                        </div>
                      </div>

                      <div v-if="auth.remarks" class="mb-3">
                        <span
                          class="text-sm font-medium text-gray-700 dark:text-slate-300"
                          >Remarks:</span
                        >
                        <p
                          class="text-sm text-gray-600 dark:text-slate-400 mt-1"
                        >
                          {{ auth.remarks }}
                        </p>
                      </div>

                      <div v-if="auth.props?.length" class="space-y-2">
                        <span
                          class="text-sm font-medium text-gray-700 dark:text-slate-300"
                          >Properties:</span
                        >
                        <div
                          v-for="prop in auth.props"
                          :key="prop.name"
                          class="bg-white dark:bg-slate-900 p-3 rounded border border-gray-200 dark:border-slate-600"
                        >
                          <div class="font-medium text-sm">{{ prop.name }}</div>
                          <div
                            class="text-xs text-gray-600 dark:text-slate-400 mt-1"
                          >
                            {{ prop.value }}
                          </div>
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
  <Dialog
    v-model:visible="showCreateUserModal"
    modal
    header="Create User"
    :draggable="false"
    class="w-full max-w-2xl"
  >
    <SystemImplementationUserCreateForm
      :ssp-id="sspId"
      @cancel="showCreateUserModal = false"
      @created="handleUserCreated"
    />
  </Dialog>

  <!-- User Edit Modal -->
  <Dialog
    v-model:visible="showEditUserModal"
    modal
    header="Edit User"
    :draggable="false"
    class="w-full max-w-2xl"
  >
    <SystemImplementationUserEditForm
      v-if="editingUser"
      :ssp-id="sspId"
      :user="editingUser"
      @cancel="showEditUserModal = false"
      @saved="handleUserSaved"
    />
  </Dialog>

  <!-- Component Create Modal -->
  <Dialog
    v-model:visible="showCreateComponentModal"
    modal
    header="Create Component"
    :draggable="false"
    class="w-full max-w-2xl"
  >
    <SystemImplementationComponentCreateForm
      :ssp-id="sspId"
      @cancel="showCreateComponentModal = false"
      @created="handleComponentCreated"
    />
  </Dialog>

  <!-- Component Edit Modal -->
  <Dialog
    v-model:visible="showEditComponentModal"
    modal
    header="Edit Component"
    :draggable="false"
    class="w-full max-w-2xl"
  >
    <SystemImplementationComponentEditForm
      v-if="editingComponent"
      :ssp-id="sspId"
      :component="editingComponent!"
      @cancel="showEditComponentModal = false"
      @saved="handleComponentSaved"
    />
  </Dialog>

  <!-- Leveraged Authorization Create Modal -->
  <Dialog
    v-model:visible="showCreateLeveragedAuthModal"
    modal
    header="Create Leveraged Authorization"
    :draggable="false"
    class="w-full max-w-2xl"
  >
    <SystemImplementationLeveragedAuthorizationCreateForm
      :ssp-id="sspId"
      @cancel="showCreateLeveragedAuthModal = false"
      @created="handleLeveragedAuthCreated"
    />
  </Dialog>

  <!-- Leveraged Authorization Edit Modal -->
  <Dialog
    v-model:visible="showEditLeveragedAuthModal"
    modal
    header="Edit Leveraged Authorization"
    :draggable="false"
    class="w-full max-w-2xl"
  >
    <SystemImplementationLeveragedAuthorizationEditForm
      v-if="editingLeveragedAuth"
      :ssp-id="sspId"
      :auth="editingLeveragedAuth!"
      @cancel="showEditLeveragedAuthModal = false"
      @saved="handleLeveragedAuthSaved"
    />
  </Dialog>
</template>
<script setup lang="ts">
import { ref } from 'vue';
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
import Dialog from '@/volt/Dialog.vue';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import TertiaryButton from '@/volt/TertiaryButton.vue';
import CollapsableGroup from '@/components/CollapsableGroup.vue';
import SystemImplementationOverviewForm from '@/components/system-security-plans/SystemImplementationOverviewForm.vue';
import SystemImplementationUserCreateForm from '@/components/system-security-plans/SystemImplementationUserCreateForm.vue';
import SystemImplementationUserEditForm from '@/components/system-security-plans/SystemImplementationUserEditForm.vue';
import SystemImplementationComponentCreateForm from '@/components/system-security-plans/SystemImplementationComponentCreateForm.vue';
import SystemImplementationComponentEditForm from '@/components/system-security-plans/SystemImplementationComponentEditForm.vue';
import SystemImplementationLeveragedAuthorizationCreateForm from '@/components/system-security-plans/SystemImplementationLeveragedAuthorizationCreateForm.vue';
import SystemImplementationLeveragedAuthorizationEditForm from '@/components/system-security-plans/SystemImplementationLeveragedAuthorizationEditForm.vue';

// Types and stores
import type {
  SystemComponent,
  SystemUser,
  LeveragedAuthorization,
  SystemImplementation,
} from '@/oscal';
import { useDataApi } from '@/composables/axios';
import { useDeleteConfirmationDialog } from '@/utils/delete-dialog';

const route = useRoute();
const toast = useToast();

const { confirmDeleteDialog } = useDeleteConfirmationDialog();

const sspId = route.params.id as string;

// Tab state
const activeTab = ref('overview');

// Data
const { data: systemImplementation } = useDataApi<SystemImplementation>(
  `/api/oscal/system-security-plans/${sspId}/system-implementation`,
);
const { data: users } = useDataApi<SystemUser[]>(
  `/api/oscal/system-security-plans/${sspId}/system-implementation/users`,
);
const { data: components } = useDataApi<SystemComponent[]>(
  `/api/oscal/system-security-plans/${sspId}/system-implementation/components`,
);
const { data: leveragedAuthorizations } = useDataApi<LeveragedAuthorization[]>(
  `/api/oscal/system-security-plans/${sspId}/system-implementation/leveraged-authorizations`,
);

// Modification APIs
const { execute: executeDeleteUser } = useDataApi<void>(null, {
  method: 'DELETE',
});
const { execute: executeDeleteComponent } = useDataApi<void>(null, {
  method: 'DELETE',
});
const { execute: executeDeleteLeveragedAuth } = useDataApi<void>(null, {
  method: 'DELETE',
});

// Modal states
const showCreateUserModal = ref(false);
const showEditUserModal = ref(false);
const showCreateComponentModal = ref(false);
const showEditComponentModal = ref(false);
const showCreateLeveragedAuthModal = ref(false);
const showEditLeveragedAuthModal = ref(false);

// Edit targets
const editingUser = ref<SystemUser | null>(null);
const editingComponent = ref<SystemComponent | null>(null);
const editingLeveragedAuth = ref<LeveragedAuthorization | null>(null);

// Overview handlers
const handleOverviewSaved = (
  updatedSystemImplementation: SystemImplementation,
) => {
  systemImplementation.value = updatedSystemImplementation;
};

// User management
const editUser = (user: SystemUser) => {
  editingUser.value = user;
  showEditUserModal.value = true;
};

const handleUserCreated = (newUser: SystemUser) => {
  users.value?.push(newUser);
  showCreateUserModal.value = false;
};

const handleUserSaved = (updatedUser: SystemUser) => {
  if (users.value) {
    const index = users.value.findIndex((u) => u.uuid === updatedUser.uuid);
    if (index !== -1) {
      users.value[index] = updatedUser;
    }
  }
  showEditUserModal.value = false;
  editingUser.value = null;
};

const downloadUserJSON = (user: SystemUser) => {
  const dataStr = JSON.stringify(
    decamelizeKeys(user, { separator: '-', deep: true }),
    null,
    2,
  );
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `user-${user.uuid}.json`;
  link.click();
  URL.revokeObjectURL(url);
};

const deleteUser = async (user: SystemUser) => {
  try {
    await executeDeleteUser(
      `/api/oscal/system-security-plans/${sspId}/system-implementation/users/${user.uuid}`,
    );
    if (users.value) {
      users.value = users.value.filter((u) => u.uuid !== user.uuid);
    }
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'User deleted successfully.',
      life: 3000,
    });
  } catch (error) {
    console.error('Failed to delete user:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to delete user. Please try again.',
      life: 5000,
    });
  }
};

// Component management
const editComponent = async (component: SystemComponent) => {
  editingComponent.value = component;
  showEditComponentModal.value = true;
};

const handleComponentCreated = async (newComponent: SystemComponent) => {
  // Add the component to the local array
  components.value?.push(newComponent);
  showCreateComponentModal.value = false;
};

const handleComponentSaved = (updatedComponent: SystemComponent) => {
  if (components.value) {
    const index = components.value.findIndex(
      (c) => c.uuid === updatedComponent.uuid,
    );
    if (index !== -1) {
      components.value[index] = updatedComponent;
    }
  }
  showEditComponentModal.value = false;
  editingComponent.value = null;
};

const downloadComponentJSON = (component: SystemComponent) => {
  const dataStr = JSON.stringify(
    decamelizeKeys(component, { separator: '-', deep: true }),
    null,
    2,
  );
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `component-${component.uuid}.json`;
  link.click();
  URL.revokeObjectURL(url);
};

const deleteComponent = async (component: SystemComponent) => {
  try {
    await executeDeleteComponent(
      `/api/oscal/system-security-plans/${sspId}/system-implementation/components/${component.uuid}`,
    );
    if (components.value) {
      components.value = components.value.filter(
        (c) => c.uuid !== component.uuid,
      );
    }
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Component deleted successfully.',
      life: 3000,
    });
  } catch (error) {
    let errorDetail = 'Failed to delete component. Please try again.';

    if (error instanceof Response) {
      if (error.status === 404) {
        errorDetail = 'Component not found. It may have already been deleted.';
      } else if (error.status === 409) {
        errorDetail = 'Cannot delete component. It may be in use.';
      }
    }

    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: errorDetail,
      life: 5000,
    });
  }
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
    const index = leveragedAuthorizations.value.findIndex(
      (a) => a.uuid === updatedAuth.uuid,
    );
    if (index !== -1) {
      leveragedAuthorizations.value[index] = updatedAuth;
    }
  }
  showEditLeveragedAuthModal.value = false;
  editingLeveragedAuth.value = null;
};

const downloadLeveragedAuthJSON = (auth: LeveragedAuthorization) => {
  const dataStr = JSON.stringify(
    decamelizeKeys(auth, { separator: '-', deep: true }),
    null,
    2,
  );
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `leveraged-auth-${auth.uuid}.json`;
  link.click();
  URL.revokeObjectURL(url);
};

const deleteLeveragedAuth = async (auth: LeveragedAuthorization) => {
  try {
    await executeDeleteLeveragedAuth(
      `/api/oscal/system-security-plans/${sspId}/system-implementation/leveraged-authorizations/${auth.uuid}`,
    );
    if (leveragedAuthorizations.value) {
      leveragedAuthorizations.value = leveragedAuthorizations.value.filter(
        (a) => a.uuid !== auth.uuid,
      );
    }
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Leveraged authorization deleted successfully.',
      life: 3000,
    });
  } catch (error) {
    console.error('Failed to delete leveraged authorization:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to delete leveraged authorization. Please try again.',
      life: 5000,
    });
  }
};
</script>
