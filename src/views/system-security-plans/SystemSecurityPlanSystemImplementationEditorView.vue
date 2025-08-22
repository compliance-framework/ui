<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div
      class="bg-white dark:bg-slate-900 border border-ccf-300 dark:border-slate-700 rounded-lg p-6"
    >
      <h2 class="text-2xl font-bold text-gray-900 dark:text-slate-300">
        System Implementation Editor
      </h2>
      <p class="text-gray-600 dark:text-slate-400 mt-1">
        Configure users, components, and authorizations for your system
        implementation
      </p>
    </div>

    <!-- Metrics Dashboard -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- Total Users Metric -->
      <div
        class="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800"
      >
        <div class="flex items-center justify-between">
          <div>
            <div class="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {{ users?.length || 0 }}
            </div>
            <div class="text-sm text-blue-600 dark:text-blue-400">
              System Users
            </div>
            <div
              v-if="userRoleCount > 0"
              class="text-xs text-blue-500 dark:text-blue-300 mt-1"
            >
              {{ userRoleCount }} role{{ userRoleCount !== 1 ? 's' : '' }}
              assigned
            </div>
          </div>
          <svg
            class="w-8 h-8 text-blue-300 dark:text-blue-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
            ></path>
          </svg>
        </div>
      </div>

      <!-- Total Components Metric -->
      <div
        class="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800"
      >
        <div class="flex items-center justify-between">
          <div>
            <div class="text-2xl font-bold text-green-600 dark:text-green-400">
              {{ components?.length || 0 }}
            </div>
            <div class="text-sm text-green-600 dark:text-green-400">
              Components
            </div>
            <div
              v-if="activeComponentCount > 0"
              class="text-xs text-green-500 dark:text-green-300 mt-1"
            >
              {{ activeComponentCount }} active
            </div>
          </div>
          <svg
            class="w-8 h-8 text-green-300 dark:text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
            ></path>
          </svg>
        </div>
      </div>

      <!-- Leveraged Authorizations Metric -->
      <div
        class="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800"
      >
        <div class="flex items-center justify-between">
          <div>
            <div
              class="text-2xl font-bold text-orange-600 dark:text-orange-400"
            >
              {{ leveragedAuthorizations?.length || 0 }}
            </div>
            <div class="text-sm text-orange-600 dark:text-orange-400">
              Leveraged Auth
            </div>
            <div
              v-if="leveragedAuthorizations?.length"
              class="text-xs text-orange-500 dark:text-orange-300 mt-1"
            >
              {{ uniquePartyCount }} unique part{{
                uniquePartyCount !== 1 ? 'ies' : 'y'
              }}
            </div>
          </div>
          <svg
            class="w-8 h-8 text-orange-300 dark:text-orange-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            ></path>
          </svg>
        </div>
      </div>
    </div>

    <!-- Component Type Distribution -->
    <div
      v-if="componentTypeDistribution.length > 0"
      class="bg-white dark:bg-slate-900 border border-ccf-300 dark:border-slate-700 rounded-lg p-6"
    >
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-slate-300">
          Component Type Distribution
        </h3>
        <span class="text-sm text-gray-500 dark:text-slate-400"
          >{{ components?.length || 0 }} total components</span
        >
      </div>

      <div class="space-y-4">
        <div
          v-for="(type, index) in componentTypeDistribution"
          :key="type.type"
          class="relative"
        >
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-2">
              <div
                :class="getTypeColorClass(index)"
                class="w-3 h-3 rounded-full"
              ></div>
              <span
                class="text-sm font-medium text-gray-700 dark:text-slate-300 capitalize"
                >{{ formatComponentType(type.type) }}</span
              >
            </div>
            <div class="flex items-center gap-2">
              <span
                class="text-sm font-semibold text-gray-900 dark:text-slate-200"
                >{{ type.count }}</span
              >
              <span class="text-xs text-gray-500 dark:text-slate-400"
                >({{ getPercentage(type.count) }}%)</span
              >
            </div>
          </div>
          <div class="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
            <div
              :class="getTypeColorClass(index)"
              class="h-2 rounded-full transition-all duration-300"
              :style="{ width: getPercentage(type.count) + '%' }"
            ></div>
          </div>
        </div>
      </div>

      <!-- Legend for common component types -->
      <div class="mt-6 pt-4 border-t border-gray-200 dark:border-slate-700">
        <p class="text-xs text-gray-600 dark:text-slate-400 mb-2">
          Common OSCAL component types:
        </p>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
          <div class="flex items-center gap-1">
            <div class="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span class="text-gray-600 dark:text-slate-400">Software</span>
          </div>
          <div class="flex items-center gap-1">
            <div class="w-2 h-2 bg-green-500 rounded-full"></div>
            <span class="text-gray-600 dark:text-slate-400">Hardware</span>
          </div>
          <div class="flex items-center gap-1">
            <div class="w-2 h-2 bg-purple-500 rounded-full"></div>
            <span class="text-gray-600 dark:text-slate-400">Service</span>
          </div>
          <div class="flex items-center gap-1">
            <div class="w-2 h-2 bg-orange-500 rounded-full"></div>
            <span class="text-gray-600 dark:text-slate-400">Policy</span>
          </div>
          <div class="flex items-center gap-1">
            <div class="w-2 h-2 bg-pink-500 rounded-full"></div>
            <span class="text-gray-600 dark:text-slate-400">Process</span>
          </div>
          <div class="flex items-center gap-1">
            <div class="w-2 h-2 bg-indigo-500 rounded-full"></div>
            <span class="text-gray-600 dark:text-slate-400">Other</span>
          </div>
        </div>
      </div>
    </div>

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
                <button
                  @click="showCreateUserModal = true"
                  class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                >
                  Create User
                </button>
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
                            @click.stop="
                              confirmDeleteDialog(() => deleteUser(user), {
                                itemName: user.title,
                                itemType: 'user',
                              })
                            "
                            class="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition-colors"
                          >
                            Delete
                          </button>
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
                <button
                  @click="showCreateComponentModal = true"
                  class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                >
                  Create Component
                </button>
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
                            @click.stop="
                              confirmDeleteDialog(
                                () => deleteComponent(component),
                                {
                                  itemName: component.title,
                                  itemType: 'component',
                                },
                              )
                            "
                            class="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition-colors"
                          >
                            Delete
                          </button>
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
                <button
                  @click="showCreateLeveragedAuthModal = true"
                  class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                >
                  Create Authorization
                </button>
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
                            @click.stop="
                              confirmDeleteDialog(
                                () => deleteLeveragedAuth(auth),
                                {
                                  itemName: auth.title,
                                  itemType: 'leveraged authorization',
                                },
                              )
                            "
                            class="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition-colors"
                          >
                            Delete
                          </button>
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
  <Dialog v-model:visible="showCreateUserModal" modal header="Create User">
    <SystemImplementationUserCreateForm
      :ssp-id="sspId"
      @cancel="showCreateUserModal = false"
      @created="handleUserCreated"
    />
  </Dialog>

  <!-- User Edit Modal -->
  <Dialog v-model:visible="showEditUserModal" modal header="Edit User">
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
import { ref, computed } from 'vue';
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
  SystemImplementationUser,
  LeveragedAuthorization,
  SystemImplementation,
} from '@/stores/system-security-plans.ts';
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
const { data: users } = useDataApi<SystemImplementationUser[]>(
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
const editingUser = ref<SystemImplementationUser | null>(null);
const editingComponent = ref<SystemComponent | null>(null);
const editingLeveragedAuth = ref<LeveragedAuthorization | null>(null);

// Computed metrics
const userRoleCount = computed(() => {
  if (!users.value) return 0;
  return users.value.reduce(
    (sum, user) => sum + (user.roleIds?.length || 0),
    0,
  );
});

const activeComponentCount = computed(() => {
  if (!components.value) return 0;
  return components.value.filter(
    (c) => c.status?.state === 'operational' || c.status?.state === 'active',
  ).length;
});

const uniquePartyCount = computed(() => {
  if (!leveragedAuthorizations.value) return 0;
  const uniqueParties = new Set<string>();
  leveragedAuthorizations.value.forEach((auth) => {
    if (auth.partyUuid) {
      uniqueParties.add(auth.partyUuid);
    }
  });
  return uniqueParties.size;
});

const componentTypeDistribution = computed(() => {
  if (!components.value || components.value.length === 0) return [];

  const typeCount: Record<string, number> = {};
  components.value.forEach((component) => {
    const type = component.type || 'unspecified';
    typeCount[type] = (typeCount[type] || 0) + 1;
  });

  return Object.entries(typeCount)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);
});

// Overview handlers
const handleOverviewSaved = (
  updatedSystemImplementation: SystemImplementation,
) => {
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
    const index = users.value.findIndex((u) => u.uuid === updatedUser.uuid);
    if (index !== -1) {
      users.value[index] = updatedUser;
    }
  }
  showEditUserModal.value = false;
  editingUser.value = null;
};

const downloadUserJSON = (user: SystemImplementationUser) => {
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

const deleteUser = async (user: SystemImplementationUser) => {
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

// Helper functions for component type distribution
const getPercentage = (count: number): number => {
  const total = components.value?.length || 0;
  if (total === 0) return 0;
  return Math.round((count / total) * 100);
};

const getTypeColorClass = (index: number): string => {
  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-purple-500',
    'bg-orange-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-yellow-500',
    'bg-red-500',
    'bg-teal-500',
    'bg-cyan-500',
  ];
  return colors[index % colors.length];
};

const formatComponentType = (type: string): string => {
  // Format common OSCAL component types
  const typeMap: Record<string, string> = {
    software: 'Software',
    hardware: 'Hardware',
    service: 'Service',
    policy: 'Policy',
    physical: 'Physical',
    'org-defined': 'Organization Defined',
    process: 'Process',
    procedure: 'Procedure',
    plan: 'Plan',
    guidance: 'Guidance',
    standard: 'Standard',
    validation: 'Validation',
    unspecified: 'Unspecified',
  };

  return (
    typeMap[type.toLowerCase()] ||
    type
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  );
};
</script>
