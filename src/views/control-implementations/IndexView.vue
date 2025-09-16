<template>
  <h4 v-if="loading" class="text-gray-600">Loading ...</h4>

  <Message
    v-else-if="!systemStore.system.securityPlan"
    severity="error"
    variant="outlined"
  >
    <h4 class="font-bold">System Security Plan not selected</h4>
    <p>You have not selected a system security plan for editing.</p>
    <p>
      Please return to the
      <RouterLink :to="{ name: 'system-security-plans' }" class="underline"
        >SSP Page
      </RouterLink>
      to select one
    </p>
  </Message>

  <Message v-else-if="!profile" severity="error" variant="outlined">
    <h4 class="font-bold">Your selected SSP does not have a linked profile</h4>
    <p>
      The System Security Plan you have selected does not have an attached
      profile.
    </p>
    <p>
      Please return to the
      <RouterLink :to="{ name: 'system-security-plans' }" class="underline"
        >SSP Page
      </RouterLink>
      to select one
    </p>
  </Message>

  <div v-else>
    <PageHeader>Controls</PageHeader>
    <PageSubHeader
      >Specify how controls are implemented across the business
    </PageSubHeader>

    <div v-if="catalogLoading">Loading Catalog ...</div>
    <div v-else-if="!catalog">No Catalog</div>
    <div v-else>
      <Tree :value="nodes" :filter="true" filterMode="lenient">
        <template #group="slotProps">
          <div class="flex items-center gap-x-3">
            <div class="w-8">
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
</template>

<script setup lang="ts">
import { onMounted, ref, watch, computed, type Ref } from 'vue';
import Message from '@/volt/Message.vue';
import Badge from '@/volt/Badge.vue';
import { useSystemStore } from '@/stores/system.ts';
import PageHeader from '@/components/PageHeader.vue';
import PageSubHeader from '@/components/PageSubHeader.vue';
import ControlEvidenceCounter from './partials/ControlEvidenceCounter.vue';
import { useCatalogTree } from '@/composables/useCatalogTree';
import { useDataApi } from '@/composables/axios';
import Tree from '@/volt/Tree.vue';
import IndexControlImplementation from '@/views/control-implementations/partials/IndexControlImplementation.vue';
import type { AxiosError } from 'axios';
import type { Profile } from '@/stores/types';
import type { Catalog } from '@/oscal';
import type { ControlImplementation, ImplementedRequirement } from '@/oscal';

const systemStore = useSystemStore();

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
    }
  } catch (err) {
    error.value = err as AxiosError<unknown>;
  }
});
</script>
