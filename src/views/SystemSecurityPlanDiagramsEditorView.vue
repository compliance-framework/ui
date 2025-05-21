<template>
  <div
    class="my-4 rounded-md bg-white dark:bg-slate-900 border-collapse border dark:border-slate-700"
  >
    <CollapsableGroup>
      <template #header>
        <div class="py-2 px-4 text-lg">
          Authorization Boundary
        </div>
      </template>
      <div class="px-4 py-4 border-b dark:border-slate-700">
        <SystemCharacteristicsDiagramGroupForm v-model="authorizationBoundary" />
        <div class="overflow-hidden border dark:border-slate-700 rounded-md mt-4" v-for="diagram in authorizationBoundary.diagrams" :key="diagram.uuid">
          <DrawIODiagramEditor class="h-[42rem]" :diagram="diagram" @saved="saveAuthorizationBoundaryDiagram" />
        </div>
      </div>
    </CollapsableGroup>

    <CollapsableGroup>
      <template #header>
        <div class="py-2 px-4 text-lg">
          Network Architecture
        </div>
      </template>
      <div class="px-4 py-4 border-b dark:border-slate-700">
        <SystemCharacteristicsDiagramGroupForm v-model="networkArchitecture" />
        <div class="overflow-hidden border dark:border-slate-700 rounded-md mt-4" v-for="diagram in networkArchitecture.diagrams" :key="diagram.uuid">
          <DrawIODiagramEditor class="h-[42rem]" :diagram="diagram" @saved="saveNetworkArchitectureDiagram" />
        </div>
      </div>
    </CollapsableGroup>

    <CollapsableGroup>
      <template #header>
        <div class="py-2 px-4 text-lg">
          Data Flow
        </div>
      </template>
      <div class="px-4 py-4 border-b dark:border-slate-700">
        <SystemCharacteristicsDiagramGroupForm v-model="dataFlow" />
        <div class="overflow-hidden border dark:border-slate-700 rounded-md mt-4" v-for="diagram in dataFlow.diagrams" :key="diagram.uuid">
          <DrawIODiagramEditor class="h-[42rem]" :diagram="diagram" @saved="saveDataFlowDiagram" />
        </div>
      </div>
    </CollapsableGroup>
  </div>
  <div class="h-screen w-full"></div> <!-- A screen height div to prevent collapse scrolling back up after closing -->
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue';
import PageHeader from '@/components/PageHeader.vue';
import {
  type Diagram,
  type DiagramGrouping,
  type SystemSecurityPlan,
  useSystemSecurityPlanStore
} from '@/stores/system-security-plans.ts'
import { useRoute } from 'vue-router';
import PageSubHeader from '@/components/PageSubHeader.vue';
import Tabs from '@/components/Tabs.vue';
import SystemCharacteristicsForm from '@/components/SystemCharacteristicsForm.vue'
import SystemCharacteristicsDiagramGroupForm from '@/components/SystemCharacteristicsDiagramGroupForm.vue'
import DrawIODiagramEditor from '@/components/DrawIODiagramEditor.vue'
import CollapsableGroup from '@/components/CollapsableGroup.vue'
import type { DataResponse } from '@/stores/types.ts'
import { v4 } from 'uuid'

const route = useRoute();
const id = route.params.id as string;
const sspStore = useSystemSecurityPlanStore();

const systemSecurityPlan = ref<SystemSecurityPlan | null>(null);
const authorizationBoundary = ref<DiagramGrouping>({} as DiagramGrouping);
const networkArchitecture = ref<DiagramGrouping>({} as DiagramGrouping);
const dataFlow = ref<DiagramGrouping>({} as DiagramGrouping);

onMounted(() => {
  console.log("Fetching for ID", id);
  sspStore.get(id).then((data) => {
    systemSecurityPlan.value = data.data;
  });
  sspStore.getCharacteristicsAuthorizationBoundary(id).then((data: DataResponse<DiagramGrouping>) => {
    authorizationBoundary.value = data.data;
    if (!data.data?.diagrams?.length) {
      authorizationBoundary.value.diagrams = [{
        uuid: v4(),
      } as Diagram]
    }
  })
  sspStore.getCharacteristicsNetworkArchitecture(id).then((data) => {
    networkArchitecture.value = data.data;
  })
  sspStore.getCharacteristicsDataFlow(id).then((data) => {
    dataFlow.value = data.data;
  })
});

async function saveAuthorizationBoundaryDiagram(diagram: Diagram) {
  const response = await sspStore.updateCharacteristicsAuthorizationBoundaryDiagram(systemSecurityPlan.value.uuid, diagram);
  console.log('authorization boundary stored', response);
}

async function saveNetworkArchitectureDiagram(diagram: Diagram) {
  const response = await sspStore.updateCharacteristicsNetworkArchitectureDiagram(systemSecurityPlan.value.uuid, diagram);
  console.log('network architecture stored', response);
}

async function saveDataFlowDiagram(diagram: Diagram) {
  const response = await sspStore.updateCharacteristicsDataFlowDiagram(systemSecurityPlan.value.uuid, diagram);
  console.log('data flow stored', response);
}
</script>
