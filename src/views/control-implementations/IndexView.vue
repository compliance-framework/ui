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
        to select one
      </p>
    </div>
  </Message>

  <Message v-else-if="!profile" severity="error" variant="outlined">
    <div class="space-y-2 text-gray-700 dark:text-slate-200">
      <h4 class="text-base font-semibold">
        Your selected SSP does not have a linked profile
      </h4>
      <p>
        The System Security Plan you have selected does not have an attached
        profile.
      </p>
      <p>
        Please return to the
        <RouterLink
          :to="{ name: 'system' }"
          class="font-medium underline text-blue-600 dark:text-blue-300"
          >System Page
        </RouterLink>
        to select one
      </p>
    </div>
  </Message>

  <div v-else>
    <div
      class="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between"
    >
      <div>
        <PageHeader>Controls</PageHeader>
        <PageSubHeader
          >Specify how controls are implemented across the business
        </PageSubHeader>
      </div>
      <Button
        type="button"
        severity="secondary"
        :label="
          hasBulkSuggestionsInFlight
            ? 'Applying Suggestions...'
            : 'Apply All Suggestions'
        "
        :loading="hasBulkSuggestionsInFlight"
        :disabled="hasBulkSuggestionsInFlight || catalogLoading || loading"
        @click="prepareApplyAllSuggestions"
      />
    </div>

    <div v-if="catalogLoading">Loading Catalog ...</div>
    <div v-else-if="!catalog">No Catalog</div>
    <div v-else>
      <Tree
        v-model:expandedKeys="expandedKeys"
        :value="nodes"
        :filter="true"
        filterMode="lenient"
      >
        <template #group="slotProps">
          <div class="flex items-center gap-x-3">
            <div>
              <Badge class="text-base">{{ slotProps.node.data.id }}</Badge>
            </div>
            <h4>{{ slotProps.node.data.title }}</h4>
          </div>
        </template>
        <template #control="slotProps">
          <div>
            <div class="flex items-center gap-x-3">
              <Badge class="text-base">{{ slotProps.node.data.id }}</Badge>
              <h4>{{ slotProps.node.data.title }}</h4>
              <Badge class="text-base">{{
                controlImplementations[slotProps.node.data.id]?.byComponents
                  ?.length || 0
              }}</Badge>
              <Button
                variant="text"
                @click="
                  openImplementationDrawer(
                    controlImplementations[slotProps.node.data.id],
                  )
                "
                ><BIconEye
              /></Button>
              <ControlEvidenceCounter :control="slotProps.node.data" />
            </div>
            <div class="py-4">
              <IndexControlImplementation
                :control="slotProps.node.data"
                :implementation="controlImplementations[slotProps.node.data.id]"
              />
            </div>
          </div>
        </template>
      </Tree>
    </div>
  </div>

  <Drawer
    v-model:visible="controlDrawerOpen"
    header="Implementation"
    position="right"
    class="w-full! md:w-1/2! lg:w-3/5!"
  >
    <div class="flex items-center mb-4 gap-x-4">
      <h4 class="font-medium text-xl">Components</h4>
      <Badge
        :value="selectedImplementedRequirement?.byComponents?.length"
        severity="info"
      />
    </div>
    <div
      v-for="(
        byComponent, index
      ) in selectedImplementedRequirement?.byComponents || []"
      :key="byComponent.uuid"
    >
      <div
        class="h-0.5 w-full bg-gray-200 dark:bg-slate-700 my-4"
        v-if="index !== 0"
      ></div>
      <StatementByComponent :by-component="byComponent" />
    </div>
  </Drawer>
</template>

<script setup lang="ts">
import { onMounted, ref, watch, computed, type Ref } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import Message from '@/volt/Message.vue';
import Badge from '@/volt/Badge.vue';
import { useSystemStore } from '@/stores/system.ts';
import { useUIStore } from '@/stores/ui.ts';
import PageHeader from '@/components/PageHeader.vue';
import PageSubHeader from '@/components/PageSubHeader.vue';
import ControlEvidenceCounter from './partials/ControlEvidenceCounter.vue';
import { useCatalogTree } from '@/composables/useCatalogTree';
import {
  useAuthenticatedInstance,
  useDataApi,
  decamelizeKeys,
} from '@/composables/axios';
import Tree from '@/volt/Tree.vue';
import IndexControlImplementation from '@/views/control-implementations/partials/IndexControlImplementation.vue';
import type { AxiosError } from 'axios';
import type { Catalog, Profile } from '@/oscal';
import type {
  ByComponent,
  ControlImplementation,
  ImplementedRequirement,
  Statement,
} from '@/oscal';
import Button from '@/volt/Button.vue';
import { BIconEye } from 'bootstrap-icons-vue';
import Drawer from '@/volt/Drawer.vue';
import StatementByComponent from './partials/StatementByComponent.vue';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import {
  buildByComponentsEndpoint,
  buildSuggestComponentsEndpoint,
  getUnappliedSuggestions,
  normalizeSuggestedComponentsResponse,
  type SuggestedComponent,
  type SystemComponentSuggestion,
} from '@/views/control-implementations/partials/component-suggestions';

const systemStore = useSystemStore();
const uiStore = useUIStore();
const toast = useToast();
const confirm = useConfirm();
const axios = useAuthenticatedInstance();

const controlDrawerOpen = computed({
  get: () => uiStore.controlImplementationDrawerOpen,
  set: (val) => uiStore.setControlImplementationDrawerOpen(val),
});

const expandedKeys = computed({
  get: () => uiStore.controlImplementationExpandedKeys,
  set: (val) => uiStore.setControlImplementationExpandedKeys(val),
});

const {
  data: profile,
  isLoading: baseLoading,
  execute: fetchProfile,
} = useDataApi<Profile>(
  `/api/oscal/system-security-plans/${systemStore.system.securityPlan?.uuid}/profile`,
  null,
  { immediate: false },
);
const {
  data: catalog,
  isLoading: catalogLoading,
  execute: fetchResolvedcatalog,
} = useDataApi<Catalog>();
const {
  isLoading: controlImplementationLoading,
  execute: fetchControlImplementations,
} = useDataApi<ControlImplementation | null>(
  `/api/oscal/system-security-plans/${systemStore.system.securityPlan?.uuid}/control-implementation`,
  null,
  { immediate: false },
);
const { execute: createByComponentApi } = useDataApi<ByComponent>(
  null,
  {
    method: 'POST',
    transformRequest: [decamelizeKeys],
  },
  { immediate: false },
);

const loading = computed<boolean>(
  () =>
    baseLoading.value ||
    catalogLoading.value ||
    controlImplementationLoading.value,
);

const controlImplementations = ref<{ [key: string]: ImplementedRequirement }>(
  {},
);
const selectedImplementedRequirement = ref<ImplementedRequirement>();
const preparingBulkSuggestions = ref(false);
const applyingBulkSuggestions = ref(false);

const error = ref<AxiosError<unknown> | null>(null);

const { nodes, build } = useCatalogTree();

interface StatementSuggestionWorkItem {
  requirement: ImplementedRequirement;
  statement: Statement;
  suggestions: SuggestedComponent[];
  unappliedSuggestions: SuggestedComponent[];
}

const hasBulkSuggestionsInFlight = computed(
  () => preparingBulkSuggestions.value || applyingBulkSuggestions.value,
);

function getStatementWorkItems(): Array<{
  requirement: ImplementedRequirement;
  statement: Statement;
}> {
  const items: Array<{
    requirement: ImplementedRequirement;
    statement: Statement;
  }> = [];
  for (const requirement of Object.values(controlImplementations.value)) {
    for (const statement of requirement.statements ?? []) {
      if (!statement.uuid) {
        continue;
      }
      items.push({ requirement, statement });
    }
  }
  return items;
}

async function loadControlImplementations() {
  const { data: implementationResponse } = await fetchControlImplementations();
  const implementation = implementationResponse?.value?.data;
  if (!implementation) {
    controlImplementations.value = {};
    return;
  }

  const nextMap: { [key: string]: ImplementedRequirement } = {};
  for (const impl of implementation.implementedRequirements) {
    nextMap[impl.controlId] = impl;
    if (
      uiStore.controlImplementationSelectedRequirementId === impl.uuid &&
      uiStore.controlImplementationDrawerOpen
    ) {
      selectedImplementedRequirement.value = impl;
    }
  }
  controlImplementations.value = nextMap;
}

async function buildStatementSuggestionPlan(): Promise<
  StatementSuggestionWorkItem[]
> {
  const sspId = systemStore.system.securityPlan?.uuid;
  if (!sspId) {
    return [];
  }

  const statements = getStatementWorkItems();
  const concurrencyLimit = 5;
  const planned = await mapWithConcurrency(
    statements,
    concurrencyLimit,
    async ({ requirement, statement }) => {
      const response = await axios.post<{ data: SystemComponentSuggestion[] }>(
        buildSuggestComponentsEndpoint(sspId, requirement.uuid, statement.uuid),
      );
      const suggestions = normalizeSuggestedComponentsResponse(
        response.data.data,
      );
      return {
        requirement,
        statement,
        suggestions,
        unappliedSuggestions: getUnappliedSuggestions(
          statement.byComponents,
          suggestions,
        ),
      } as StatementSuggestionWorkItem;
    },
  );

  return planned.filter((item) => item.unappliedSuggestions.length > 0);
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  iteratorFn: (item: T) => Promise<R>,
): Promise<R[]> {
  if (!items.length) {
    return [];
  }

  const safeLimit = Math.max(1, Math.min(limit, items.length));
  const results = new Array<R>(items.length);
  let currentIndex = 0;

  const worker = async () => {
    while (true) {
      const index = currentIndex;
      currentIndex += 1;
      if (index >= items.length) {
        return;
      }
      results[index] = await iteratorFn(items[index]);
    }
  };

  await Promise.all(Array.from({ length: safeLimit }, () => worker()));
  return results;
}

async function applySuggestionPlan(
  plannedItems: StatementSuggestionWorkItem[],
) {
  const sspId = systemStore.system.securityPlan?.uuid;
  if (!sspId) {
    return;
  }

  applyingBulkSuggestions.value = true;
  let createdCount = 0;
  let failedCount = 0;
  try {
    for (const item of plannedItems) {
      for (const suggestion of item.unappliedSuggestions) {
        try {
          await createByComponentApi(
            buildByComponentsEndpoint(
              sspId,
              item.requirement.uuid,
              item.statement.uuid,
            ),
            {
              data: {
                uuid: uuidv4(),
                componentUuid: suggestion.componentUuid,
                description: '',
                implementationStatus: {
                  state: '',
                },
              } as ByComponent,
            },
          );
          createdCount += 1;
        } catch (error) {
          failedCount += 1;
          console.error(
            'Failed to apply suggested component in bulk operation:',
            error,
          );
        }
      }
    }
  } finally {
    try {
      await loadControlImplementations();
    } catch (error) {
      console.error('Failed to refresh control implementations:', error);
      toast.add({
        severity: 'error',
        summary: 'Refresh Failed',
        detail:
          'Some suggestions may have been applied, but the page failed to refresh automatically.',
        life: 5000,
      });
    }

    if (createdCount > 0 && failedCount === 0) {
      toast.add({
        severity: 'success',
        summary: 'Suggestions Applied',
        detail: `${createdCount} suggested component${createdCount === 1 ? '' : 's'} added across statements.`,
        life: 4000,
      });
    } else if (createdCount > 0 && failedCount > 0) {
      toast.add({
        severity: 'warn',
        summary: 'Partially Applied',
        detail: `${createdCount} suggestion${createdCount === 1 ? '' : 's'} added, ${failedCount} failed.`,
        life: 5000,
      });
    } else if (failedCount > 0) {
      toast.add({
        severity: 'error',
        summary: 'Bulk Apply Failed',
        detail: `${failedCount} suggestion${failedCount === 1 ? '' : 's'} failed to apply.`,
        life: 5000,
      });
    }

    applyingBulkSuggestions.value = false;
  }
}

async function prepareApplyAllSuggestions() {
  if (hasBulkSuggestionsInFlight.value) {
    return;
  }

  preparingBulkSuggestions.value = true;
  try {
    const plannedItems = await buildStatementSuggestionPlan();
    const suggestionsToAdd = plannedItems.reduce(
      (sum, item) => sum + item.unappliedSuggestions.length,
      0,
    );

    if (suggestionsToAdd === 0) {
      toast.add({
        severity: 'info',
        summary: 'No Pending Suggestions',
        detail: 'All current statement suggestions are already applied.',
        life: 3000,
      });
      return;
    }

    confirm.require({
      header: 'Apply All Suggestions',
      message: `Apply ${suggestionsToAdd} suggested component${suggestionsToAdd === 1 ? '' : 's'} across ${plannedItems.length} statement${plannedItems.length === 1 ? '' : 's'}?`,
      rejectProps: {
        label: 'Cancel',
        severity: 'secondary',
        outlined: true,
      },
      acceptProps: {
        label: 'Apply',
      },
      accept: async () => {
        await applySuggestionPlan(plannedItems);
      },
    });
  } catch (bulkError) {
    toast.add({
      severity: 'error',
      summary: 'Unable to Load Suggestions',
      detail:
        bulkError instanceof Error
          ? bulkError.message
          : 'Unexpected error loading component suggestions.',
      life: 4000,
    });
  } finally {
    preparingBulkSuggestions.value = false;
  }
}

watch(profile, async () => {
  if (!profile.value) {
    return;
  }
  try {
    await fetchResolvedcatalog(
      `/api/oscal/profiles/${profile.value.uuid}/resolved`,
    );
    build(catalog as Ref<Catalog>);
  } catch (err) {
    error.value = err as AxiosError<unknown>;
  }
});

function openImplementationDrawer(req: ImplementedRequirement) {
  uiStore.setControlImplementationDrawerOpen(true);
  uiStore.setControlImplementationSelectedRequirementId(req.uuid);
  selectedImplementedRequirement.value = req;
}

watch(
  () => uiStore.controlImplementationDrawerOpen,
  (isOpen) => {
    if (!isOpen && uiStore.controlImplementationSelectedRequirementId) {
      uiStore.setControlImplementationSelectedRequirementId(null);
      selectedImplementedRequirement.value = undefined;
    }
  },
);

onMounted(async () => {
  try {
    await fetchProfile();
  } catch (err) {
    error.value = err as AxiosError<unknown>;
  }

  try {
    await loadControlImplementations();
  } catch (err) {
    error.value = err as AxiosError<unknown>;
  }
});
</script>
