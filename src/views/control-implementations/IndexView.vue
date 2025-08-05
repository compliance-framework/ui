<template>
  <h4 v-if="baseLoading" class="text-gray-600">Loading ...</h4>

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
import { onMounted, ref, watch, type Ref } from 'vue';
import { useSystemSecurityPlanStore } from '@/stores/system-security-plans.ts';

import Message from '@/volt/Message.vue';
import Badge from '@/volt/Badge.vue';
import { useSystemStore } from '@/stores/system.ts';
import { type DataResponse, useFetch } from '@/composables/api';
import type {
  Catalog,
  Profile,
  SystemSecurityPlan,
  ControlImplementation,
  ImplementedRequirement,
} from '@/oscal';
import PageHeader from '@/components/PageHeader.vue';
import PageSubHeader from '@/components/PageSubHeader.vue';
import ControlEvidenceCounter from './partials/ControlEvidenceCounter.vue';
import { useMustAuthenticate } from '@/composables/useMustAuthenticate';
import { useStorage } from '@vueuse/core';
import { useCatalogTree } from '@/composables/useCatalogTree';

import Tree from '@/volt/Tree.vue';
import IndexControlImplementation from '@/views/control-implementations/partials/IndexControlImplementation.vue';

const { gotoLogin } = useMustAuthenticate();
const systemStore = useSystemStore();
const baseLoading = ref(true);
const profile = ref();
if (systemStore.system.securityPlan) {
  useFetch(
    new Request(
      `/api/oscal/system-security-plans/${systemStore.system.securityPlan.uuid}/profile`,
    ),
  )
    .then((res) => (res.ok ? res.json() : Promise.reject(res)))
    .then((res: DataResponse<Profile>) => {
      if (res.data) {
        profile.value = res.data;
      }
    })
    .catch((error: Response) => {
      // 404 is fine. The rest, throw.
      if (error.status !== 404) {
        return error;
      }
    })
    .finally(() => {
      baseLoading.value = false;
    });
}

const controlImplementations = ref<{ [key: string]: ImplementedRequirement }>(
  {},
);
const catalog = ref<Catalog | undefined>({} as Catalog);
const { nodes, build } = useCatalogTree();
const catalogLoading = ref<boolean>(false);
watch(profile, () => {
  if (!profile.value) {
    return;
  }

  catalogLoading.value = true;
  useFetch(new Request(`/api/oscal/profiles/${profile.value.uuid}/resolved`))
    .then((res: Response) => (res.ok ? res.json() : Promise.reject(res)))
    .then((data: DataResponse<Catalog>) => {
      catalog.value = data.data;
      build(catalog as Ref<Catalog>);
    })
    .catch((error: Response) => {
      if (error.status === 401) {
        return gotoLogin();
      }
    })
    .finally(() => {
      catalogLoading.value = false;
    });
});

const sspStore = useSystemSecurityPlanStore();

const controlImplementation = ref<ControlImplementation | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);

onMounted(() => {
  const id = systemStore.system.securityPlan?.uuid as string;
  sspStore
    .getControlImplementation(id)
    .then((res) => {
      controlImplementation.value = res.data;
      const implementations =
        controlImplementation.value?.implementedRequirements ||
        ([] as ImplementedRequirement[]);
      for (const impl of implementations) {
        controlImplementations.value[impl.controlId] = impl;
      }
    })
    .catch((err) => {
      console.error('Error loading control implementation:', err);
      error.value = err instanceof Error ? err.message : 'Unknown error';
    })
    .finally(() => {
      loading.value = false;
    });
});
</script>
