<template>
  Control Implementation
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
