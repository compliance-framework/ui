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
          :to="{ name: 'system-security-plans' }"
          class="font-medium underline text-blue-600 dark:text-blue-300"
          >SSP Page
        </RouterLink>
        to select one
      </p>
    </div>
  </Message>

  <div v-else>
    <PageHeader>Controls</PageHeader>
    <PageSubHeader
      >Specify how controls are implemented across the business
    </PageSubHeader>

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
import Message from '@/volt/Message.vue';
import Badge from '@/volt/Badge.vue';
import { useSystemStore } from '@/stores/system.ts';
import { useUIStore } from '@/stores/ui.ts';
import PageHeader from '@/components/PageHeader.vue';
import PageSubHeader from '@/components/PageSubHeader.vue';
import ControlEvidenceCounter from './partials/ControlEvidenceCounter.vue';
import { useCatalogTree } from '@/composables/useCatalogTree';
import { useDataApi } from '@/composables/axios';
import Tree from '@/volt/Tree.vue';
import IndexControlImplementation from '@/views/control-implementations/partials/IndexControlImplementation.vue';
import type { AxiosError } from 'axios';
import type { Catalog, Profile } from '@/oscal';
import type { ControlImplementation, ImplementedRequirement } from '@/oscal';
import Button from '@/volt/Button.vue';
import { BIconEye } from 'bootstrap-icons-vue';
import Drawer from '@/volt/Drawer.vue';
import StatementByComponent from './partials/StatementByComponent.vue';

const systemStore = useSystemStore();
const uiStore = useUIStore();

const controlDrawerOpen = computed({
  get: () => uiStore.controlImplementationDrawerOpen,
  set: (val) => uiStore.setDrawerOpen(val),
});

const expandedKeys = computed({
  get: () => uiStore.controlImplementationExpandedKeys,
  set: (val) => uiStore.setExpandedKeys(val),
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
  data: controlImplementation,
  isLoading: controlImplementationLoading,
  execute: fetchControlImplementations,
} = useDataApi<ControlImplementation | null>(
  `/api/oscal/system-security-plans/${systemStore.system.securityPlan?.uuid}/control-implementation`,
  null,
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

const error = ref<AxiosError<unknown> | null>(null);

const { nodes, build } = useCatalogTree();

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
  uiStore.setDrawerOpen(true);
  uiStore.setSelectedRequirementId(req.uuid);
  selectedImplementedRequirement.value = req;
}

onMounted(async () => {
  try {
    await fetchProfile();
  } catch (err) {
    error.value = err as AxiosError<unknown>;
  }

  try {
    await fetchControlImplementations();
    const implementations =
      controlImplementation.value?.implementedRequirements ||
      ([] as ImplementedRequirement[]);
    for (const impl of implementations) {
      controlImplementations.value[impl.controlId] = impl;
      if (
        uiStore.controlImplementationSelectedRequirementId === impl.uuid &&
        uiStore.controlImplementationDrawerOpen
      ) {
        selectedImplementedRequirement.value = impl;
      }
    }
  } catch (err) {
    error.value = err as AxiosError<unknown>;
  }
});
</script>
