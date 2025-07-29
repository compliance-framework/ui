<template>
  <div
    class="my-4 rounded-md bg-white dark:bg-slate-900 border-collapse border border-ccf-300 dark:border-slate-700"
  >
    <CollapsableGroup open>
      <template #header>
        <div class="py-2 px-4 text-lg">Authorization Boundary</div>
      </template>
      <div class="px-4 py-4 border-b border-ccf-300 dark:border-slate-700">
        <!--        <SystemCharacteristicsDiagramGroupForm v-model="authorizationBoundary" />-->
        <div
          class="overflow-hidden border border-ccf-300 dark:border-slate-700 rounded-md"
          v-for="diagram in authorizationBoundary.diagrams"
          :key="diagram.uuid"
        >
          <DrawIODiagramEditor
            class="h-184"
            :diagram="diagram"
            @saved="saveAuthorizationBoundaryDiagram"
          />
        </div>
      </div>
    </CollapsableGroup>

    <CollapsableGroup>
      <template #header>
        <div class="py-2 px-4 text-lg">Network Architecture</div>
      </template>
      <div class="px-4 py-4 border-b border-ccf-300 dark:border-slate-700">
        <!--        <SystemCharacteristicsDiagramGroupForm v-model="networkArchitecture" />-->
        <div
          class="overflow-hidden border border-ccf-300 dark:border-slate-700 rounded-md"
          v-for="diagram in networkArchitecture.diagrams"
          :key="diagram.uuid"
        >
          <DrawIODiagramEditor
            class="h-168"
            :diagram="diagram"
            @saved="saveNetworkArchitectureDiagram"
          />
        </div>
      </div>
    </CollapsableGroup>

    <CollapsableGroup>
      <template #header>
        <div class="py-2 px-4 text-lg">Data Flow</div>
      </template>
      <div class="px-4 py-4 border-b border-ccf-300 dark:border-slate-700">
        <!--        <SystemCharacteristicsDiagramGroupForm v-model="dataFlow" />-->
        <div
          class="overflow-hidden border border-ccf-300 dark:border-slate-700 rounded-md"
          v-for="diagram in dataFlow.diagrams"
          :key="diagram.uuid"
        >
          <DrawIODiagramEditor
            class="h-168"
            :diagram="diagram"
            @saved="saveDataFlowDiagram"
          />
        </div>
      </div>
    </CollapsableGroup>
  </div>
  <div class="h-screen w-full"></div>
  <!-- A screen height div to prevent collapse scrolling back up after closing -->
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue';
import PageHeader from '@/components/PageHeader.vue';
import {
  type Diagram,
  type DiagramGrouping,
  type SystemSecurityPlan,
  useSystemSecurityPlanStore,
} from '@/stores/system-security-plans.ts';
import { useRoute } from 'vue-router';
import PageSubHeader from '@/components/PageSubHeader.vue';
import SystemCharacteristicsForm from '@/components/SystemCharacteristicsForm.vue';
import SystemCharacteristicsDiagramGroupForm from '@/components/SystemCharacteristicsDiagramGroupForm.vue';
import DrawIODiagramEditor from '@/components/DrawIODiagramEditor.vue';
import CollapsableGroup from '@/components/CollapsableGroup.vue';
import type { DataResponse } from '@/stores/types.ts';
import { v4 } from 'uuid';
import { useToast } from 'primevue/usetoast';
import { useSystemStore } from '@/stores/system.ts';

const route = useRoute();
const sspStore = useSystemSecurityPlanStore();
const { system } = useSystemStore();
const toast = useToast();

const systemSecurityPlan = ref<SystemSecurityPlan | null>(system.securityPlan as SystemSecurityPlan || null);
const authorizationBoundary = ref<DiagramGrouping>({} as DiagramGrouping);
const networkArchitecture = ref<DiagramGrouping>({} as DiagramGrouping);
const dataFlow = ref<DiagramGrouping>({} as DiagramGrouping);

onMounted(() => {
  sspStore
    .getCharacteristicsAuthorizationBoundary(systemSecurityPlan.value?.uuid as string)
    .then((data: DataResponse<DiagramGrouping>) => {
      authorizationBoundary.value = data.data;
      if (!data.data?.diagrams?.length) {
        authorizationBoundary.value.diagrams = [
          {
            uuid: v4(),
          } as Diagram,
        ];
      }
    });
  sspStore.getCharacteristicsNetworkArchitecture(systemSecurityPlan.value?.uuid as string).then((data) => {
    networkArchitecture.value = data.data;
  });
  sspStore.getCharacteristicsDataFlow(systemSecurityPlan.value?.uuid as string).then((data) => {
    dataFlow.value = data.data;
  });
});

async function saveAuthorizationBoundaryDiagram(diagram: Diagram) {
  if (systemSecurityPlan.value != null) {
    const response =
      await sspStore.updateCharacteristicsAuthorizationBoundaryDiagram(
        systemSecurityPlan.value.uuid,
        diagram,
      );
    toast.add({
      severity: 'success',
      summary: 'Diagram Saved',
      detail: 'Authorization Boundary diagram saved successfully.',
      life: 3000,
    });
  }
}

async function saveNetworkArchitectureDiagram(diagram: Diagram) {
  if (systemSecurityPlan.value != null) {
    const response =
      await sspStore.updateCharacteristicsNetworkArchitectureDiagram(
        systemSecurityPlan.value.uuid,
        diagram,
      );
    toast.add({
      severity: 'success',
      summary: 'Diagram Saved',
      detail: 'Network Architecture diagram saved successfully.',
      life: 3000,
    });
  }
}

async function saveDataFlowDiagram(diagram: Diagram) {
  if (systemSecurityPlan.value != null) {
    const response = await sspStore.updateCharacteristicsDataFlowDiagram(
      systemSecurityPlan.value.uuid,
      diagram,
    );
    toast.add({
      severity: 'success',
      summary: 'Diagram Saved',
      detail: 'Data Flow diagram saved successfully.',
      life: 3000,
    });
  }
}
</script>
