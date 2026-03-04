<template>
  <div class="space-y-6">
    <V2StatePanel
      v-if="isInitialLoading"
      kind="loading"
      title="Loading"
      description="Loading system implementation data..."
    />

    <V2StatePanel
      v-else-if="hasLoadError"
      kind="error"
      title="Load failed"
      :description="errorMessage"
    >
      <template #actions>
        <button
          type="button"
          class="ui-v2-nav border border-[var(--ui-v2-error)] bg-[var(--ui-v2-error)] px-4 py-2 font-semibold text-[var(--ui-v2-background)]"
          @click="reloadImplementationData"
        >
          Retry
        </button>
      </template>
    </V2StatePanel>

    <V2StatePanel
      v-else-if="hasNoImplementationData"
      kind="empty"
      title="No implementation data"
      description="No users, components, authorizations, or inventory items are recorded for this plan yet."
    />

    <template v-else>
      <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div
          class="border border-[var(--ui-v2-border)] bg-[var(--ui-v2-card)] p-4"
        >
          <p class="ui-v2-label text-[var(--ui-v2-secondary-foreground)]">
            System Users
          </p>
          <p class="ui-v2-metric mt-2 text-[var(--ui-v2-foreground)]">
            {{ users?.length || 0 }}
          </p>
          <p class="ui-v2-meta mt-2 text-[var(--ui-v2-tertiary-foreground)]">
            {{ userRoleCount }} role{{
              userRoleCount === 1 ? '' : 's'
            }}
            assigned
          </p>
        </div>

        <div
          class="border border-[var(--ui-v2-border)] bg-[var(--ui-v2-card)] p-4"
        >
          <p class="ui-v2-label text-[var(--ui-v2-secondary-foreground)]">
            Components
          </p>
          <p class="ui-v2-metric mt-2 text-[var(--ui-v2-foreground)]">
            {{ components?.length || 0 }}
          </p>
          <p class="ui-v2-meta mt-2 text-[var(--ui-v2-tertiary-foreground)]">
            {{ activeComponentCount }} active component{{
              activeComponentCount === 1 ? '' : 's'
            }}
          </p>
        </div>

        <div
          class="border border-[var(--ui-v2-border)] bg-[var(--ui-v2-card)] p-4"
        >
          <p class="ui-v2-label text-[var(--ui-v2-secondary-foreground)]">
            Authorizations
          </p>
          <p class="ui-v2-metric mt-2 text-[var(--ui-v2-foreground)]">
            {{ leveragedAuthorizations?.length || 0 }}
          </p>
          <p class="ui-v2-meta mt-2 text-[var(--ui-v2-tertiary-foreground)]">
            {{ uniquePartyCount }} unique part{{
              uniquePartyCount === 1 ? 'y' : 'ies'
            }}
          </p>
        </div>

        <div
          class="border border-[var(--ui-v2-border)] bg-[var(--ui-v2-card)] p-4"
        >
          <p class="ui-v2-label text-[var(--ui-v2-secondary-foreground)]">
            Inventory
          </p>
          <p class="ui-v2-metric mt-2 text-[var(--ui-v2-foreground)]">
            {{ inventoryItems?.length || 0 }}
          </p>
          <p class="ui-v2-meta mt-2 text-[var(--ui-v2-tertiary-foreground)]">
            Linked inventory items
          </p>
        </div>
      </section>

      <section
        class="border border-[var(--ui-v2-border)] bg-[var(--ui-v2-card)]"
      >
        <div
          class="flex overflow-x-auto border-b border-[var(--ui-v2-border)] whitespace-nowrap"
        >
          <button
            class="ui-v2-nav min-w-[140px] border-r border-[var(--ui-v2-border)] px-4 py-3 text-[var(--ui-v2-secondary-foreground)] last:border-r-0"
            :class="
              innerTab === 'overview'
                ? 'bg-[var(--ui-v2-primary-tint-10)] text-[var(--ui-v2-primary)]'
                : ''
            "
            type="button"
            @click="innerTab = 'overview'"
          >
            01 Overview
          </button>
          <button
            class="ui-v2-nav min-w-[140px] border-r border-[var(--ui-v2-border)] px-4 py-3 text-[var(--ui-v2-secondary-foreground)] last:border-r-0"
            :class="
              innerTab === 'users'
                ? 'bg-[var(--ui-v2-primary-tint-10)] text-[var(--ui-v2-primary)]'
                : ''
            "
            type="button"
            @click="innerTab = 'users'"
          >
            02 Users
          </button>
          <button
            class="ui-v2-nav min-w-[160px] border-r border-[var(--ui-v2-border)] px-4 py-3 text-[var(--ui-v2-secondary-foreground)] last:border-r-0"
            :class="
              innerTab === 'components'
                ? 'bg-[var(--ui-v2-primary-tint-10)] text-[var(--ui-v2-primary)]'
                : ''
            "
            type="button"
            @click="innerTab = 'components'"
          >
            03 Components
          </button>
          <button
            class="ui-v2-nav min-w-[180px] border-r border-[var(--ui-v2-border)] px-4 py-3 text-[var(--ui-v2-secondary-foreground)] last:border-r-0"
            :class="
              innerTab === 'authorizations'
                ? 'bg-[var(--ui-v2-primary-tint-10)] text-[var(--ui-v2-primary)]'
                : ''
            "
            type="button"
            @click="innerTab = 'authorizations'"
          >
            04 Authorizations
          </button>
        </div>

        <div class="p-5 lg:p-6">
          <template v-if="innerTab === 'overview'">
            <div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
              <div class="space-y-4">
                <section
                  class="border border-[var(--ui-v2-border)] bg-[var(--ui-v2-background)] p-4"
                >
                  <div class="flex items-center justify-between gap-4">
                    <p
                      class="ui-v2-label text-[var(--ui-v2-secondary-foreground)]"
                    >
                      System Implementation Overview
                    </p>
                  </div>
                  <p class="mt-2 text-[var(--ui-v2-muted-foreground)]">
                    {{
                      systemImplementation?.remarks ||
                      'Describe implementation in operational, practical terms.'
                    }}
                  </p>
                </section>

                <section
                  class="border border-[var(--ui-v2-border)] bg-[var(--ui-v2-background)] p-4"
                >
                  <p
                    class="ui-v2-label mb-3 text-[var(--ui-v2-secondary-foreground)]"
                  >
                    Edit Overview
                  </p>

                  <SystemImplementationOverviewForm
                    :ssp-id="sspId"
                    :system-implementation="systemImplementation!"
                    @saved="handleOverviewSaved"
                  />
                </section>
              </div>

              <aside
                class="border border-[var(--ui-v2-border)] bg-[var(--ui-v2-background)] p-4"
              >
                <p class="ui-v2-label text-[var(--ui-v2-secondary-foreground)]">
                  Implementation Distribution
                </p>

                <div class="mt-4 space-y-3">
                  <div
                    v-for="type in componentTypeDistribution"
                    :key="type.type"
                  >
                    <div
                      class="ui-v2-meta mb-1 flex items-center justify-between"
                    >
                      <span
                        class="capitalize text-[var(--ui-v2-muted-foreground)]"
                      >
                        {{ formatComponentType(type.type) }}
                      </span>
                      <span class="text-[var(--ui-v2-foreground)]">{{
                        type.count
                      }}</span>
                    </div>
                    <div
                      class="h-2 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)]"
                    >
                      <div
                        class="h-full bg-[var(--ui-v2-info)]"
                        :style="{ width: `${getPercentage(type.count)}%` }"
                      />
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          </template>

          <template v-else-if="innerTab === 'users'">
            <section class="space-y-4">
              <div class="flex flex-wrap items-center justify-between gap-3">
                <p class="ui-v2-label text-[var(--ui-v2-secondary-foreground)]">
                  System Users
                </p>
                <button
                  class="ui-v2-nav border border-[var(--ui-v2-primary)] bg-[var(--ui-v2-primary)] px-3 py-2 font-semibold text-[var(--ui-v2-primary-foreground)]"
                  type="button"
                  @click="showCreateUserModal = true"
                >
                  Create User
                </button>
              </div>

              <div
                v-if="users?.length === 0"
                class="border border-dashed border-[var(--ui-v2-border)] bg-[var(--ui-v2-background)] p-4 text-[var(--ui-v2-muted-foreground)]"
              >
                No users defined.
              </div>

              <div v-else class="space-y-3">
                <article
                  v-for="user in users"
                  :key="user.uuid"
                  class="border border-[var(--ui-v2-border)] bg-[var(--ui-v2-background)] p-4"
                >
                  <div class="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p class="ui-v2-nav text-[var(--ui-v2-foreground)]">
                        {{ user.title || 'Untitled user' }}
                      </p>
                      <p
                        class="ui-v2-meta mt-1 text-[var(--ui-v2-tertiary-foreground)]"
                      >
                        {{ user.shortName || 'No short name' }} ·
                        {{ user.uuid }}
                      </p>
                    </div>

                    <div
                      class="ui-v2-label flex gap-3 text-[var(--ui-v2-info)]"
                    >
                      <button
                        type="button"
                        class="transition-colors hover:text-[var(--ui-v2-primary)]"
                        @click="editUser(user)"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        class="transition-colors hover:text-[var(--ui-v2-primary)]"
                        @click="downloadUserJSON(user)"
                      >
                        JSON
                      </button>
                      <button
                        type="button"
                        class="text-[var(--ui-v2-error)] transition-colors hover:opacity-80"
                        @click="
                          confirmDeleteDialog(() => deleteUser(user), {
                            itemName: user.title || 'User',
                            itemType: 'user',
                          })
                        "
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <p
                    v-if="user.description"
                    class="mt-2 text-[var(--ui-v2-muted-foreground)]"
                  >
                    {{ user.description }}
                  </p>
                </article>
              </div>
            </section>
          </template>

          <template v-else-if="innerTab === 'components'">
            <section class="space-y-4">
              <div class="flex flex-wrap items-center justify-between gap-3">
                <p class="ui-v2-label text-[var(--ui-v2-secondary-foreground)]">
                  System Components
                </p>
                <button
                  class="ui-v2-nav border border-[var(--ui-v2-primary)] bg-[var(--ui-v2-primary)] px-3 py-2 font-semibold text-[var(--ui-v2-primary-foreground)]"
                  type="button"
                  @click="showCreateComponentModal = true"
                >
                  Create Component
                </button>
              </div>

              <div
                v-if="components?.length === 0"
                class="border border-dashed border-[var(--ui-v2-border)] bg-[var(--ui-v2-background)] p-4 text-[var(--ui-v2-muted-foreground)]"
              >
                No components defined.
              </div>

              <div v-else class="space-y-3">
                <article
                  v-for="component in components"
                  :key="component.uuid"
                  class="border border-[var(--ui-v2-border)] bg-[var(--ui-v2-background)] p-4"
                >
                  <div class="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p class="ui-v2-nav text-[var(--ui-v2-foreground)]">
                        {{ component.title }}
                      </p>
                      <p
                        class="ui-v2-meta mt-1 text-[var(--ui-v2-tertiary-foreground)]"
                      >
                        {{
                          formatComponentType(component.type || 'unspecified')
                        }}
                        ·
                        {{ component.status?.state || 'unknown' }}
                      </p>
                    </div>

                    <div
                      class="ui-v2-label flex gap-3 text-[var(--ui-v2-info)]"
                    >
                      <button
                        type="button"
                        class="transition-colors hover:text-[var(--ui-v2-primary)]"
                        @click="editComponent(component)"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        class="transition-colors hover:text-[var(--ui-v2-primary)]"
                        @click="downloadComponentJSON(component)"
                      >
                        JSON
                      </button>
                      <button
                        type="button"
                        class="text-[var(--ui-v2-error)] transition-colors hover:opacity-80"
                        @click="
                          confirmDeleteDialog(
                            () => deleteComponent(component),
                            {
                              itemName: component.title,
                              itemType: 'component',
                            },
                          )
                        "
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <p
                    v-if="component.description"
                    class="mt-2 text-[var(--ui-v2-muted-foreground)]"
                  >
                    {{ component.description }}
                  </p>
                </article>
              </div>
            </section>
          </template>

          <template v-else>
            <section class="space-y-4">
              <div class="flex flex-wrap items-center justify-between gap-3">
                <p class="ui-v2-label text-[var(--ui-v2-secondary-foreground)]">
                  Leveraged Authorizations
                </p>
                <button
                  class="ui-v2-nav border border-[var(--ui-v2-primary)] bg-[var(--ui-v2-primary)] px-3 py-2 font-semibold text-[var(--ui-v2-primary-foreground)]"
                  type="button"
                  @click="showCreateLeveragedAuthModal = true"
                >
                  Create Authorization
                </button>
              </div>

              <div
                v-if="leveragedAuthorizations?.length === 0"
                class="border border-dashed border-[var(--ui-v2-border)] bg-[var(--ui-v2-background)] p-4 text-[var(--ui-v2-muted-foreground)]"
              >
                No leveraged authorizations defined.
              </div>

              <div v-else class="space-y-3">
                <article
                  v-for="auth in leveragedAuthorizations"
                  :key="auth.uuid"
                  class="border border-[var(--ui-v2-border)] bg-[var(--ui-v2-background)] p-4"
                >
                  <div class="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p class="ui-v2-nav text-[var(--ui-v2-foreground)]">
                        {{ auth.title }}
                      </p>
                      <p
                        class="ui-v2-meta mt-1 text-[var(--ui-v2-tertiary-foreground)]"
                      >
                        {{
                          new Date(auth.dateAuthorized).toLocaleDateString()
                        }}
                        · party {{ auth.partyUuid }}
                      </p>
                    </div>

                    <div
                      class="ui-v2-label flex gap-3 text-[var(--ui-v2-info)]"
                    >
                      <button
                        type="button"
                        class="transition-colors hover:text-[var(--ui-v2-primary)]"
                        @click="editLeveragedAuth(auth)"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        class="transition-colors hover:text-[var(--ui-v2-primary)]"
                        @click="downloadLeveragedAuthJSON(auth)"
                      >
                        JSON
                      </button>
                      <button
                        type="button"
                        class="text-[var(--ui-v2-error)] transition-colors hover:opacity-80"
                        @click="
                          confirmDeleteDialog(() => deleteLeveragedAuth(auth), {
                            itemName: auth.title,
                            itemType: 'leveraged authorization',
                          })
                        "
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <p
                    v-if="auth.remarks"
                    class="mt-2 text-[var(--ui-v2-muted-foreground)]"
                  >
                    {{ auth.remarks }}
                  </p>
                </article>
              </div>
            </section>
          </template>
        </div>
      </section>

      <Dialog v-model:visible="showCreateUserModal" modal header="Create User">
        <SystemImplementationUserCreateForm
          :ssp-id="sspId"
          @cancel="showCreateUserModal = false"
          @created="handleUserCreated"
        />
      </Dialog>

      <Dialog v-model:visible="showEditUserModal" modal header="Edit User">
        <SystemImplementationUserEditForm
          v-if="editingUser"
          :ssp-id="sspId"
          :user="editingUser"
          @cancel="showEditUserModal = false"
          @saved="handleUserSaved"
        />
      </Dialog>

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

      <Dialog
        v-model:visible="showEditComponentModal"
        modal
        header="Edit Component"
      >
        <SystemImplementationComponentEditForm
          v-if="editingComponent"
          :ssp-id="sspId"
          :component="editingComponent"
          @cancel="showEditComponentModal = false"
          @saved="handleComponentSaved"
        />
      </Dialog>

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

      <Dialog
        v-model:visible="showEditLeveragedAuthModal"
        modal
        header="Edit Leveraged Authorization"
      >
        <SystemImplementationLeveragedAuthorizationEditForm
          v-if="editingLeveragedAuth"
          :ssp-id="sspId"
          :auth="editingLeveragedAuth"
          @cancel="showEditLeveragedAuthModal = false"
          @saved="handleLeveragedAuthSaved"
        />
      </Dialog>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import decamelizeKeys from 'decamelize-keys';
import Dialog from '@/volt/Dialog.vue';
import SystemImplementationOverviewForm from '@/components/system-security-plans/SystemImplementationOverviewForm.vue';
import SystemImplementationUserCreateForm from '@/components/system-security-plans/SystemImplementationUserCreateForm.vue';
import SystemImplementationUserEditForm from '@/components/system-security-plans/SystemImplementationUserEditForm.vue';
import SystemImplementationComponentCreateForm from '@/components/system-security-plans/SystemImplementationComponentCreateForm.vue';
import SystemImplementationComponentEditForm from '@/components/system-security-plans/SystemImplementationComponentEditForm.vue';
import SystemImplementationLeveragedAuthorizationCreateForm from '@/components/system-security-plans/SystemImplementationLeveragedAuthorizationCreateForm.vue';
import SystemImplementationLeveragedAuthorizationEditForm from '@/components/system-security-plans/SystemImplementationLeveragedAuthorizationEditForm.vue';
import type {
  InventoryItem,
  LeveragedAuthorization,
  SystemComponent,
  SystemImplementation,
  SystemUser,
} from '@/oscal';
import { useDataApi } from '@/composables/axios';
import { useDeleteConfirmationDialog } from '@/utils/delete-dialog';
import V2StatePanel from '@/components/v2/system/V2StatePanel.vue';

type ImplementationTab = 'overview' | 'users' | 'components' | 'authorizations';

const route = useRoute();
const toast = useToast();
const { confirmDeleteDialog } = useDeleteConfirmationDialog();

const sspId = String(route.params.id || '');
const innerTab = ref<ImplementationTab>('overview');

const {
  data: systemImplementation,
  isLoading: systemImplementationLoading,
  error: systemImplementationError,
  execute: loadSystemImplementation,
} = useDataApi<SystemImplementation>(
  `/api/oscal/system-security-plans/${sspId}/system-implementation`,
);
const {
  data: users,
  isLoading: usersLoading,
  error: usersError,
  execute: loadUsers,
} = useDataApi<SystemUser[]>(
  `/api/oscal/system-security-plans/${sspId}/system-implementation/users`,
);
const {
  data: components,
  isLoading: componentsLoading,
  error: componentsError,
  execute: loadComponents,
} = useDataApi<SystemComponent[]>(
  `/api/oscal/system-security-plans/${sspId}/system-implementation/components`,
);
const {
  data: leveragedAuthorizations,
  isLoading: leveragedAuthorizationsLoading,
  error: leveragedAuthorizationsError,
  execute: loadLeveragedAuthorizations,
} = useDataApi<LeveragedAuthorization[]>(
  `/api/oscal/system-security-plans/${sspId}/system-implementation/leveraged-authorizations`,
);
const {
  data: inventoryItems,
  isLoading: inventoryItemsLoading,
  error: inventoryItemsError,
  execute: loadInventoryItems,
} = useDataApi<InventoryItem[]>(
  `/api/oscal/system-security-plans/${sspId}/system-implementation/inventory-items`,
);

const { execute: executeDeleteUser } = useDataApi<void>(null, {
  method: 'DELETE',
});
const { execute: executeDeleteComponent } = useDataApi<void>(null, {
  method: 'DELETE',
});
const { execute: executeDeleteLeveragedAuth } = useDataApi<void>(null, {
  method: 'DELETE',
});

const showCreateUserModal = ref(false);
const showEditUserModal = ref(false);
const showCreateComponentModal = ref(false);
const showEditComponentModal = ref(false);
const showCreateLeveragedAuthModal = ref(false);
const showEditLeveragedAuthModal = ref(false);

const editingUser = ref<SystemUser | null>(null);
const editingComponent = ref<SystemComponent | null>(null);
const editingLeveragedAuth = ref<LeveragedAuthorization | null>(null);

const loading = computed(
  () =>
    systemImplementationLoading.value ||
    usersLoading.value ||
    componentsLoading.value ||
    leveragedAuthorizationsLoading.value ||
    inventoryItemsLoading.value,
);

const hasLoadedAnyData = computed(
  () =>
    systemImplementation.value !== undefined ||
    users.value !== undefined ||
    components.value !== undefined ||
    leveragedAuthorizations.value !== undefined ||
    inventoryItems.value !== undefined,
);

const isInitialLoading = computed(
  () => loading.value && !hasLoadedAnyData.value,
);

const hasLoadError = computed(() =>
  Boolean(
    systemImplementationError.value ||
      usersError.value ||
      componentsError.value ||
      leveragedAuthorizationsError.value ||
      inventoryItemsError.value,
  ),
);

const hasNoImplementationData = computed(() => {
  const hasOverviewText =
    (systemImplementation.value?.remarks || '').trim().length > 0;
  const counts =
    (users.value?.length || 0) +
    (components.value?.length || 0) +
    (leveragedAuthorizations.value?.length || 0) +
    (inventoryItems.value?.length || 0);

  return (
    !loading.value && !hasLoadError.value && !hasOverviewText && counts === 0
  );
});

const errorMessage = computed(() => {
  const error =
    systemImplementationError.value ||
    usersError.value ||
    componentsError.value ||
    leveragedAuthorizationsError.value ||
    inventoryItemsError.value;

  if (!error) {
    return 'Unable to load system implementation data.';
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Unable to load system implementation data.';
});

async function reloadImplementationData(): Promise<void> {
  await Promise.allSettled([
    loadSystemImplementation(
      `/api/oscal/system-security-plans/${sspId}/system-implementation`,
    ),
    loadUsers(
      `/api/oscal/system-security-plans/${sspId}/system-implementation/users`,
    ),
    loadComponents(
      `/api/oscal/system-security-plans/${sspId}/system-implementation/components`,
    ),
    loadLeveragedAuthorizations(
      `/api/oscal/system-security-plans/${sspId}/system-implementation/leveraged-authorizations`,
    ),
    loadInventoryItems(
      `/api/oscal/system-security-plans/${sspId}/system-implementation/inventory-items`,
    ),
  ]);
}

const userRoleCount = computed(() => {
  if (!users.value) return 0;
  return users.value.reduce(
    (sum, user) => sum + (user.roleIds?.length || 0),
    0,
  );
});

const activeComponentCount = computed(() => {
  if (!components.value) return 0;
  return components.value.filter((component) => {
    const state = component.status?.state;
    return state === 'operational' || state === 'active';
  }).length;
});

const uniquePartyCount = computed(() => {
  if (!leveragedAuthorizations.value) return 0;
  const uniqueParties = new Set<string>();
  leveragedAuthorizations.value.forEach((auth) => {
    if (auth.partyUuid) uniqueParties.add(auth.partyUuid);
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
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
});

const handleOverviewSaved = (
  updatedSystemImplementation: SystemImplementation,
) => {
  systemImplementation.value = updatedSystemImplementation;
};

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
    const index = users.value.findIndex(
      (user) => user.uuid === updatedUser.uuid,
    );
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
      users.value = users.value.filter(
        (candidate) => candidate.uuid !== user.uuid,
      );
    }
    toast.add({
      severity: 'success',
      summary: 'User Deleted',
      detail: 'System user deleted successfully.',
      life: 2500,
    });
  } catch {
    toast.add({
      severity: 'error',
      summary: 'Delete Failed',
      detail: 'Failed to delete user. Please try again.',
      life: 3500,
    });
  }
};

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
    const index = components.value.findIndex(
      (component) => component.uuid === updatedComponent.uuid,
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
        (candidate) => candidate.uuid !== component.uuid,
      );
    }
    toast.add({
      severity: 'success',
      summary: 'Component Deleted',
      detail: 'System component deleted successfully.',
      life: 2500,
    });
  } catch {
    toast.add({
      severity: 'error',
      summary: 'Delete Failed',
      detail: 'Failed to delete component. Please try again.',
      life: 3500,
    });
  }
};

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
      (auth) => auth.uuid === updatedAuth.uuid,
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
        (candidate) => candidate.uuid !== auth.uuid,
      );
    }
    toast.add({
      severity: 'success',
      summary: 'Authorization Deleted',
      detail: 'Leveraged authorization deleted successfully.',
      life: 2500,
    });
  } catch {
    toast.add({
      severity: 'error',
      summary: 'Delete Failed',
      detail: 'Failed to delete leveraged authorization. Please try again.',
      life: 3500,
    });
  }
};

const getPercentage = (count: number): number => {
  const total = components.value?.length || 0;
  if (total === 0) return 0;
  return Math.round((count / total) * 100);
};

const formatComponentType = (type: string): string => {
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
