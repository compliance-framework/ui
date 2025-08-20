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
          v-for="diagram in authorizationBoundary?.diagrams"
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
          v-for="diagram in networkArchitecture?.diagrams"
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
          v-for="diagram in dataFlow?.diagrams"
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
import type { Diagram, DiagramGrouping, SystemSecurityPlan } from '@/stores/system-security-plans.ts';
import DrawIODiagramEditor from '@/components/DrawIODiagramEditor.vue';
import CollapsableGroup from '@/components/CollapsableGroup.vue';
import { v4 } from 'uuid';
import { useToast } from 'primevue/usetoast';
import { useSystemStore } from '@/stores/system.ts';
import { useDataApi, decamelizeKeys } from '@/composables/axios';

const { system } = useSystemStore();
const toast = useToast();

const systemSecurityPlan = ref<SystemSecurityPlan | null>(system.securityPlan as SystemSecurityPlan || null);

const { data: authorizationBoundary, execute: fetchAuthorizationBoundaryDiagram } = useDataApi<DiagramGrouping>(
  `/api/oscal/system-security-plans/${systemSecurityPlan.value?.uuid}/system-characteristics/authorization-boundary`,
  { method: "GET" },
  { initialData: { diagrams: [ { uuid: v4() }] } as DiagramGrouping, immediate: false }
);

const { data: networkArchitecture, execute: fetchNetworkArchitectureDiagram } = useDataApi<DiagramGrouping>(
  `/api/oscal/system-security-plans/${systemSecurityPlan.value?.uuid}/system-characteristics/network-architecture`,
  { method: "GET" },
  { initialData: {} as DiagramGrouping, immediate: false }
);

const { data: dataFlow, execute: fetchDataFlowDiagram } = useDataApi<DiagramGrouping>(
  `/api/oscal/system-security-plans/${systemSecurityPlan.value?.uuid}/system-characteristics/data-flow`,
  { method: "GET" },
  { initialData: {} as DiagramGrouping, immediate: false }
);

// Required multiple commands due to if more than 1 diagram is present, axios will end up cancelling the requests.
const { execute: saveABDiagram } = useDataApi<Diagram>(
  null,
  {
    method: 'PUT',
    transformRequest: [decamelizeKeys],
  },
  { immediate: false }
);

const { execute: saveNADiagram } = useDataApi<Diagram>(
  null,
  {
    method: 'PUT',
    transformRequest: [decamelizeKeys],
  },
  { immediate: false }
);

const { execute: saveDFDiagram } = useDataApi<Diagram>(
  null,
  {
    method: 'PUT',
    transformRequest: [decamelizeKeys],
  },
  { immediate: false }
);

onMounted(async () => {
  await fetchAuthorizationBoundaryDiagram();
  await fetchNetworkArchitectureDiagram();
  await fetchDataFlowDiagram();
});

async function saveAuthorizationBoundaryDiagram(diagram: Diagram) {
  if (systemSecurityPlan.value != null) {
    await saveABDiagram(`/api/oscal/system-security-plans/${systemSecurityPlan.value.uuid}/system-characteristics/authorization-boundary/diagrams/${diagram.uuid}`, {
      data: diagram,
    });
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
    await saveNADiagram(`/api/oscal/system-security-plans/${systemSecurityPlan.value.uuid}/system-characteristics/network-architecture/diagrams/${diagram.uuid}`, {
      data: diagram,
    });
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
    await saveDFDiagram(`/api/oscal/system-security-plans/${systemSecurityPlan.value.uuid}/system-characteristics/data-flow/diagrams/${diagram.uuid}`, {
      data: diagram,
    });
    toast.add({
      severity: 'success',
      summary: 'Diagram Saved',
      detail: 'Data Flow diagram saved successfully.',
      life: 3000,
    });
  }
}
</script>
