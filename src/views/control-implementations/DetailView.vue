<template>
  <h4 v-if="loading" class="text-gray-600">Loading ...</h4>

  <Message
    v-else-if="!systemStore.system.securityPlan"
    severity="error"
    variant="outlined"
  >
    <div class="space-y-2 text-gray-700 dark:text-slate-200">
      <h4 class="text-base font-semibold">System Security Plan not selected</h4>
      <p>You have not selected a system security plan for editing.</p>
      <p>
        Please return to the
        <RouterLink
          :to="{ name: 'system-security-plans' }"
          class="font-medium underline text-blue-600 dark:text-blue-300"
          >SSP Page
        </RouterLink>
        to select one.
      </p>
    </div>
  </Message>

  <Message v-else-if="!activeProfile" severity="error" variant="outlined">
    <div class="space-y-2 text-gray-700 dark:text-slate-200">
      <h4 class="text-base font-semibold">
        Your selected SSP does not have a linked profile
      </h4>
      <p>
        The System Security Plan you have selected does not have any linked
        profiles.
      </p>
      <p>
        Please return to the
        <RouterLink
          :to="{ name: 'system' }"
          class="font-medium underline text-blue-600 dark:text-blue-300"
          >System Page
        </RouterLink>
        to select one.
      </p>
    </div>
  </Message>

  <Message v-else-if="!control" severity="error" variant="outlined">
    <div class="space-y-2 text-gray-700 dark:text-slate-200">
      <h4 class="text-base font-semibold">Control not found</h4>
      <p>
        The selected profile does not include control
        <span class="font-mono">{{ controlId }}</span
        >.
      </p>
      <RouterLink
        :to="{ name: 'controls:index' }"
        class="font-medium underline text-blue-600 dark:text-blue-300"
        >Back to controls</RouterLink
      >
    </div>
  </Message>

  <div v-else class="space-y-6">
    <div
      class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"
    >
      <div>
        <RouterLink
          :to="{ name: 'controls:index' }"
          class="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-200"
        >
          <BIconArrowLeft />
          Controls
        </RouterLink>
        <div class="mt-3 flex flex-wrap items-center gap-3">
          <Badge class="text-base">{{ control.id }}</Badge>
          <PageHeader>{{ control.title }}</PageHeader>
        </div>
        <PageSubHeader>
          Manage implementation statements, components, evidence, and
          responsibility details without the drawer layout constraints.
        </PageSubHeader>
      </div>
      <Button
        v-if="!implementedRequirement"
        type="button"
        :loading="creatingRequirement"
        label="Create Control Implementation"
        @click="createImplementedRequirement"
      />
    </div>

    <section
      class="rounded-md border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
    >
      <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <h4 class="text-sm font-medium text-gray-500 dark:text-slate-400">
            Component Links
          </h4>
          <p class="text-2xl font-semibold">
            {{ totalByComponents }}
          </p>
        </div>
        <div>
          <h4 class="text-sm font-medium text-gray-500 dark:text-slate-400">
            Statements
          </h4>
          <p class="text-2xl font-semibold">
            {{ implementedStatementCount }} / {{ statementParts.length }}
          </p>
        </div>
        <div>
          <h4 class="text-sm font-medium text-gray-500 dark:text-slate-400">
            Profile
          </h4>
          <p class="text-sm font-medium">
            {{ activeProfile.title }}
          </p>
        </div>
      </div>
    </section>

    <Message v-if="!implementedRequirement" severity="info" variant="outlined">
      Create the control implementation before adding statement details or
      linking system components.
    </Message>

    <div
      class="border-b border-ccf-300 dark:border-slate-700 flex flex-wrap gap-2 pb-2"
    >
      <button
        v-for="tab in tabs"
        :key="tab.id"
        @click="activeTab = tab.id"
        class="px-3 py-1 rounded-md text-sm"
        :class="
          tab.id === activeTab
            ? 'bg-blue-600 text-white'
            : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
        "
      >
        {{ tab.label }}
      </button>
    </div>

    <div v-if="activeTab === 'overview'" class="space-y-4">
      <section
        class="rounded-md border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
      >
        <h3 class="mb-3 text-base font-semibold">Control Overview</h3>
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <h4 class="text-sm font-medium text-gray-500 dark:text-slate-400">
              Control ID
            </h4>
            <p class="font-mono text-sm">{{ control.id }}</p>
          </div>
          <div>
            <h4 class="text-sm font-medium text-gray-500 dark:text-slate-400">
              Status
            </h4>
            <p class="text-sm">
              {{
                implementedRequirement
                  ? 'Implementation record exists'
                  : 'No implementation record yet'
              }}
            </p>
          </div>
          <div class="md:col-span-2">
            <h4 class="text-sm font-medium text-gray-500 dark:text-slate-400">
              Remarks
            </h4>
            <p class="text-sm">
              {{ implementedRequirement?.remarks || 'No remarks provided.' }}
            </p>
          </div>
        </div>
      </section>

      <section
        class="rounded-md border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
      >
        <h3 class="mb-3 text-base font-semibold">Statements</h3>
        <div v-if="statementParts.length" class="space-y-3">
          <div
            v-for="part in statementParts"
            :key="part.id"
            class="rounded-md border border-gray-200 p-3 dark:border-slate-700"
          >
            <div class="flex flex-wrap items-center gap-2">
              <Badge severity="secondary">{{ part.id }}</Badge>
              <span class="text-sm font-medium">
                {{
                  statementsByPartId[part.id]
                    ? 'Statement created'
                    : 'Statement not created'
                }}
              </span>
              <span class="text-sm text-gray-500 dark:text-slate-400">
                {{ statementsByPartId[part.id]?.byComponents?.length ?? 0 }}
                components
              </span>
            </div>
            <p
              v-if="getPartText(part)"
              class="prose prose-slate mt-2 max-w-none text-sm dark:prose-invert"
            >
              {{ getPartText(part) }}
            </p>
            <div
              v-if="implementedRequirement && !statementsByPartId[part.id]"
              class="mt-3"
            >
              <ControlStatementImplementation
                :implementation="implementedRequirement"
                :ssp-id="systemStore.system.securityPlan?.uuid"
                :partid="part.id"
                :display-sections="['create']"
                @updated="updateStatement"
              />
            </div>
          </div>
        </div>
        <p v-else class="text-sm text-gray-500 dark:text-slate-400">
          No statement parts are defined for this control.
        </p>
      </section>
    </div>

    <div
      v-else
      class="grid grid-cols-1 gap-4"
      :class="{
        'lg:grid-cols-[20rem_minmax(0,1fr)]': createdStatementParts.length > 1,
      }"
    >
      <div
        v-if="createdStatementParts.length > 1"
        class="rounded-md border border-gray-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900"
      >
        <h3
          class="mb-3 text-sm font-semibold text-gray-700 dark:text-slate-200"
        >
          Statements
        </h3>
        <button
          v-for="part in createdStatementParts"
          :key="part.id"
          type="button"
          class="mb-2 block w-full rounded-md border p-3 text-left transition-colors last:mb-0"
          :class="statementListItemClass(part)"
          @click="selectStatement(part.id)"
        >
          <span class="flex items-center justify-between gap-2">
            <span class="font-mono text-sm">{{ part.id }}</span>
            <span
              class="rounded px-2 py-0.5 text-xs"
              :class="statementStatusCue(part)?.countClass ?? neutralCountClass"
            >
              {{ statementsByPartId[part.id]?.byComponents?.length ?? 0 }}
            </span>
          </span>
          <span
            v-if="statementStatusCue(part)"
            class="mt-2 inline-flex rounded px-2 py-0.5 text-xs font-medium"
            :class="statementStatusCue(part)?.countClass"
          >
            {{ statementStatusCue(part)?.label }}
          </span>
          <span
            v-if="getPartText(part)"
            class="mt-2 line-clamp-2 block text-xs text-gray-600 dark:text-slate-400"
          >
            {{ getPartText(part) }}
          </span>
        </button>
      </div>

      <div class="space-y-4">
        <section
          v-for="part in displayedStatementParts"
          :key="part.id"
          class="rounded-md border p-4"
          :class="statementStatusCue(part)?.panelClass ?? neutralPanelClass"
        >
          <div class="mb-4 space-y-2">
            <div class="flex flex-wrap items-center gap-2">
              <Badge severity="secondary">{{ part.id }}</Badge>
              <h3 class="text-base font-semibold">
                {{ activeTabTitle }} Statement
              </h3>
              <span
                v-if="statementStatusCue(part)"
                class="rounded px-2 py-0.5 text-xs font-medium"
                :class="statementStatusCue(part)?.countClass"
              >
                {{ statementStatusCue(part)?.label }}
              </span>
            </div>
            <p
              v-if="getPartText(part)"
              class="prose prose-slate max-w-none text-sm dark:prose-invert"
            >
              {{ getPartText(part) }}
            </p>
          </div>

          <ControlStatementImplementation
            v-if="implementedRequirement"
            :implementation="implementedRequirement"
            :ssp-id="systemStore.system.securityPlan?.uuid"
            :statement="statementsByPartId[part.id]"
            :partid="part.id"
            :display-sections="[activeTab]"
            @updated="updateStatement"
          />
          <div v-else class="text-sm text-gray-500 dark:text-slate-400">
            Statement editing will be available after the control implementation
            is created.
          </div>
        </section>
        <Message
          v-if="createdStatementParts.length === 0"
          severity="info"
          variant="outlined"
        >
          Create a statement from the Overview tab before editing components,
          evidence, or metadata.
        </Message>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { v4 as uuidv4 } from 'uuid';
import { computed, onMounted, ref, watch, watchEffect } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { BIconArrowLeft } from 'bootstrap-icons-vue';
import Badge from '@/volt/Badge.vue';
import Button from '@/volt/Button.vue';
import Message from '@/volt/Message.vue';
import PageHeader from '@/components/PageHeader.vue';
import PageSubHeader from '@/components/PageSubHeader.vue';
import ControlStatementImplementation from '@/views/control-implementations/partials/ControlStatementImplementation.vue';
import { useAuthenticatedInstance, decamelizeKeys } from '@/composables/axios';
import {
  buildTreeNodesWithPrefix,
  type TreeNode,
} from '@/composables/useCatalogTree';
import { useSystemStore } from '@/stores/system';
import {
  useSystemSecurityPlanStore,
  type SystemSecurityPlanProfileBinding,
} from '@/stores/system-security-plans';
import type {
  Catalog,
  Control,
  ControlImplementation,
  ImplementedRequirement,
  Part,
  Statement,
} from '@/oscal';
import type { DataResponse } from '@/stores/types';
import { useToast } from 'primevue/usetoast';
import { getErrorDetail } from '@/utils/httpErrors';

const route = useRoute();
const router = useRouter();
const axios = useAuthenticatedInstance();
const systemStore = useSystemStore();
const sspStore = useSystemSecurityPlanStore();
const toast = useToast();

type DetailTabId = 'overview' | 'components' | 'evidence' | 'metadata';
type ImplementationStatusCue = {
  label: string;
  countClass: string;
  panelClass: string;
  listClass: string;
};

const tabs: Array<{ id: DetailTabId; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'components', label: 'Components' },
  { id: 'evidence', label: 'Evidence Linking' },
  { id: 'metadata', label: 'Metadata' },
];
const neutralCountClass =
  'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200';
const neutralPanelClass =
  'border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-900';
const implementationStatusCues: Record<string, ImplementationStatusCue> = {
  implemented: {
    label: 'Implemented',
    countClass: 'bg-blue-600 text-white dark:bg-blue-400 dark:text-blue-950',
    panelClass:
      'border-blue-200 bg-blue-50/60 dark:border-blue-900 dark:bg-blue-950/20',
    listClass:
      'border-blue-200 bg-blue-50/70 text-blue-950 hover:border-blue-400 dark:border-blue-900 dark:bg-blue-950/25 dark:text-blue-100 dark:hover:border-blue-500',
  },
  partial: {
    label: 'Partial',
    countClass: 'bg-amber-500 text-white dark:bg-amber-400 dark:text-amber-950',
    panelClass:
      'border-amber-200 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/20',
    listClass:
      'border-amber-200 bg-amber-50/70 text-amber-950 hover:border-amber-400 dark:border-amber-900 dark:bg-amber-950/25 dark:text-amber-100 dark:hover:border-amber-500',
  },
  planned: {
    label: 'Planned',
    countClass: 'bg-sky-600 text-white dark:bg-sky-400 dark:text-sky-950',
    panelClass:
      'border-sky-200 bg-sky-50/60 dark:border-sky-900 dark:bg-sky-950/20',
    listClass:
      'border-sky-200 bg-sky-50/70 text-sky-950 hover:border-sky-400 dark:border-sky-900 dark:bg-sky-950/25 dark:text-sky-100 dark:hover:border-sky-500',
  },
  alternative: {
    label: 'Alternative',
    countClass:
      'bg-violet-600 text-white dark:bg-violet-400 dark:text-violet-950',
    panelClass:
      'border-violet-200 bg-violet-50/60 dark:border-violet-900 dark:bg-violet-950/20',
    listClass:
      'border-violet-200 bg-violet-50/70 text-violet-950 hover:border-violet-400 dark:border-violet-900 dark:bg-violet-950/25 dark:text-violet-100 dark:hover:border-violet-500',
  },
  'not-applicable': {
    label: 'Not Applicable',
    countClass: 'bg-gray-500 text-white dark:bg-gray-400 dark:text-gray-950',
    panelClass:
      'border-gray-300 bg-gray-50 dark:border-slate-600 dark:bg-slate-800/70',
    listClass:
      'border-gray-300 bg-gray-50 text-gray-800 hover:border-gray-400 dark:border-slate-600 dark:bg-slate-800/70 dark:text-slate-200 dark:hover:border-slate-500',
  },
};

const profileBindings = ref<SystemSecurityPlanProfileBinding[]>([]);
const profileBindingsLoading = ref(false);
const catalogLoading = ref(false);
const implementationLoading = ref(false);
const creatingRequirement = ref(false);
const nodes = ref<TreeNode[]>([]);
const control = ref<Control | null>(null);
const implementedRequirement = ref<ImplementedRequirement | null>(null);
const activeStatementId = ref(getStatementIdFromRoute());
const activeTab = ref<DetailTabId>(
  route.query.statementId ? 'components' : 'overview',
);

const activeProfile = computed(() => profileBindings.value[0] ?? null);
const loading = computed(
  () =>
    profileBindingsLoading.value ||
    catalogLoading.value ||
    implementationLoading.value,
);
const controlId = computed(() => {
  const value = route.params.controlId;
  return Array.isArray(value) ? value[0] : value;
});
const statementParts = computed(() =>
  collectSelectableStatementParts(
    control.value?.parts?.filter((part) => part.name === 'statement') ?? [],
  ),
);
const createdStatementParts = computed(() =>
  statementParts.value.filter((part) => statementsByPartId.value[part.id]),
);
const selectedStatementPart = computed(() => {
  if (!activeStatementId.value) {
    return null;
  }
  return (
    createdStatementParts.value.find(
      (part) => part.id === activeStatementId.value,
    ) ?? null
  );
});
const displayedStatementParts = computed(() => {
  if (selectedStatementPart.value) {
    return [selectedStatementPart.value];
  }
  const firstPart = createdStatementParts.value[0];
  return firstPart ? [firstPart] : [];
});
const selectedStatementListId = computed(
  () =>
    selectedStatementPart.value?.id ??
    createdStatementParts.value[0]?.id ??
    null,
);
const statementsByPartId = computed(() => {
  const map: Record<string, Statement> = {};
  for (const statement of implementedRequirement.value?.statements ?? []) {
    map[statement.statementId] = statement;
  }
  return map;
});
const totalByComponents = computed(() => {
  let count = implementedRequirement.value?.byComponents?.length ?? 0;
  for (const statement of implementedRequirement.value?.statements ?? []) {
    count += statement.byComponents?.length ?? 0;
  }
  return count;
});
const implementedStatementCount = computed(
  () => implementedRequirement.value?.statements?.length ?? 0,
);
const activeTabTitle = computed(
  () => tabs.find((tab) => tab.id === activeTab.value)?.label ?? '',
);

watchEffect(() => {
  control.value = findControl(nodes.value, controlId.value);
});

watch(
  () => route.query.statementId,
  (statementId) => {
    activeStatementId.value = normalizeRouteValue(statementId);
    if (activeStatementId.value) {
      activeTab.value = 'components';
    }
  },
);

watch(
  statementParts,
  (parts) => {
    if (parts.length === 0) {
      return;
    }
    if (
      activeStatementId.value &&
      !parts.some((part) => part.id === activeStatementId.value)
    ) {
      activeStatementId.value = null;
    }
  },
  { immediate: true },
);

function normalizeRouteValue(value: unknown): string | null {
  if (typeof value === 'string' && value.length) {
    return value;
  }
  if (Array.isArray(value) && typeof value[0] === 'string' && value[0].length) {
    return value[0];
  }
  return null;
}

function getStatementIdFromRoute(): string | null {
  return normalizeRouteValue(route.query.statementId);
}

function selectStatement(statementId: string) {
  activeStatementId.value = statementId;
  void router.replace({
    name: 'controls:detail',
    params: { controlId: controlId.value },
    query: {
      ...route.query,
      statementId,
    },
  });
}

function findControl(treeNodes: TreeNode[], id?: string): Control | null {
  if (!id) return null;
  for (const node of treeNodes) {
    if (node.type === 'control' && node.data.id === id) {
      return node.data as Control;
    }
    const found = findControl(node.children ?? [], id);
    if (found) return found;
  }
  return null;
}

function collectSelectableStatementParts(parts: Part[]): Part[] {
  const selectableParts: Part[] = [];
  for (const part of parts) {
    if (part.id) {
      selectableParts.push(part);
    }
    selectableParts.push(...collectSelectableStatementParts(part.parts ?? []));
  }
  return selectableParts;
}

function getPartLabel(part: Part): string {
  return part.props?.find((prop) => prop.name === 'label')?.value ?? '';
}

function getPartText(part: Part): string {
  const label = getPartLabel(part);
  if (!label && !part.prose) {
    return '';
  }
  return `${label ? `${label} ` : ''}${part.prose ?? ''}`;
}

function statementStatusCue(part: Part): ImplementationStatusCue | null {
  const byComponents = statementsByPartId.value[part.id]?.byComponents ?? [];
  if (byComponents.length === 0) {
    return null;
  }

  const states = byComponents.map((byComponent) =>
    byComponent.implementationStatus?.state?.trim().toLowerCase(),
  );
  const firstState = states[0];
  if (!firstState || !states.every((state) => state === firstState)) {
    return null;
  }

  return implementationStatusCues[firstState] ?? null;
}

function statementListItemClass(part: Part): string {
  const cue = statementStatusCue(part);
  const selectedClass =
    part.id === selectedStatementListId.value
      ? 'ring-2 ring-blue-500 ring-offset-1 ring-offset-white dark:ring-offset-slate-900'
      : '';
  const baseClass =
    cue?.listClass ??
    'border-gray-200 text-slate-700 hover:border-blue-300 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:border-blue-700 dark:hover:bg-slate-800';
  return `${baseClass} ${selectedClass}`.trim();
}

async function loadProfileBindings() {
  const sspId = systemStore.system.securityPlan?.uuid;
  profileBindings.value = [];
  nodes.value = [];

  if (!sspId) {
    return;
  }

  profileBindingsLoading.value = true;
  try {
    const result = await sspStore.listProfiles(sspId);
    profileBindings.value = result.data || [];
  } catch (err) {
    if (err instanceof Response && err.status === 404) {
      return;
    }
    throw err;
  } finally {
    profileBindingsLoading.value = false;
  }
}

async function loadResolvedProfileCatalogs() {
  nodes.value = [];

  if (profileBindings.value.length === 0) {
    return;
  }

  catalogLoading.value = true;
  try {
    const results = await Promise.allSettled(
      profileBindings.value.map(async (profileBinding) => {
        const response = await axios.get<DataResponse<Catalog>>(
          `/api/oscal/profiles/${profileBinding.uuid}/resolved`,
        );
        return { profileBinding, resolvedCatalog: response.data?.data };
      }),
    );

    const failedCount = results.filter((r) => r.status === 'rejected').length;
    if (failedCount > 0) {
      toast.add({
        severity: 'error',
        summary: 'Error Loading Catalogs',
        detail: `Failed to load resolved catalog for ${failedCount} profile${failedCount > 1 ? 's' : ''}.`,
        life: 3000,
      });
    }

    nodes.value = results.flatMap((result) => {
      if (result.status !== 'fulfilled' || !result.value.resolvedCatalog) {
        return [];
      }
      const { profileBinding, resolvedCatalog } = result.value;
      return [
        {
          key: `profile:${profileBinding.uuid}`,
          label: profileBinding.title,
          type: 'group',
          data: {
            id: profileBinding.uuid,
            title: profileBinding.title,
          },
          children: buildTreeNodesWithPrefix(
            resolvedCatalog,
            `profile:${profileBinding.uuid}`,
          ),
        } as TreeNode,
      ];
    });
  } finally {
    catalogLoading.value = false;
  }
}

async function loadControlImplementation() {
  const sspId = systemStore.system.securityPlan?.uuid;
  implementedRequirement.value = null;
  if (!sspId) {
    return;
  }

  implementationLoading.value = true;
  try {
    const response = await axios.get<DataResponse<ControlImplementation>>(
      `/api/oscal/system-security-plans/${sspId}/control-implementation`,
    );
    implementedRequirement.value =
      response.data.data?.implementedRequirements?.find(
        (item) => item.controlId === controlId.value,
      ) ?? null;
  } finally {
    implementationLoading.value = false;
  }
}

async function createImplementedRequirement() {
  const sspId = systemStore.system.securityPlan?.uuid;
  if (!sspId || !control.value) {
    return;
  }

  creatingRequirement.value = true;
  try {
    const response = await axios.post<DataResponse<ImplementedRequirement>>(
      `/api/oscal/system-security-plans/${sspId}/control-implementation/implemented-requirements`,
      {
        uuid: uuidv4(),
        controlId: control.value.id,
      },
      {
        transformRequest: [decamelizeKeys],
      },
    );
    implementedRequirement.value = response.data.data;
    toast.add({
      severity: 'success',
      summary: 'Control Implementation Created',
      detail: 'Statement editing is now available for this control.',
      life: 3000,
    });
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Unable to Create Control Implementation',
      detail:
        error instanceof Error
          ? error.message
          : 'Unexpected error creating the control implementation.',
      life: 4000,
    });
  } finally {
    creatingRequirement.value = false;
  }
}

function updateStatement(statement: Statement) {
  if (!implementedRequirement.value) {
    return;
  }

  const statements = implementedRequirement.value.statements ?? [];
  const existingIndex = statements.findIndex(
    (item) => item.uuid === statement.uuid,
  );
  if (existingIndex >= 0) {
    statements.splice(existingIndex, 1, statement);
  } else {
    statements.push(statement);
  }
  implementedRequirement.value = {
    ...implementedRequirement.value,
    statements,
  };
}

onMounted(async () => {
  try {
    await loadProfileBindings();
    await Promise.all([
      loadResolvedProfileCatalogs(),
      loadControlImplementation(),
    ]);
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Error Loading Control Implementation',
      detail: await getErrorDetail(
        err,
        'An error occurred while loading this control implementation.',
      ),
      life: 3000,
    });
  }
});
</script>
