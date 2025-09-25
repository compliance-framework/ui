<template>
  <div
    class="my-4 rounded-md bg-white dark:bg-slate-900 border-collapse border border-ccf-300 dark:border-slate-700"
  >
    <CollapsableGroup open>
      <template #header>
        <div class="py-2 px-4 text-lg flex items-center justify-between">
          <span>Authorization Boundary</span>
          <PrimaryButton
            class="p-small"
            @click.stop.prevent="addAuthorizationBoundaryDiagram"
          >
            Add Diagram
          </PrimaryButton>
        </div>
      </template>
      <div class="px-4 py-4 border-b border-ccf-300 dark:border-slate-700">
        <!--        <SystemCharacteristicsDiagramGroupForm v-model="authorizationBoundary" />-->
        <template v-if="authorizationBoundary?.diagrams?.length">
          <div
            class="overflow-hidden border border-ccf-300 dark:border-slate-700 rounded-md"
            v-for="diagram in authorizationBoundary?.diagrams"
            :key="diagram.uuid"
          >
            <div
              class="flex justify-end items-center gap-2 px-3 py-2 bg-ccf-50 dark:bg-slate-800 border-b border-ccf-300 dark:border-slate-700"
            >
              <button
                class="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition-colors"
                @click.stop.prevent="
                  confirmDeleteDialog(
                    () => deleteDiagram('authorization-boundary', diagram),
                    {
                      itemType: 'diagram',
                      itemName: diagram.caption || diagram.uuid,
                    },
                  )
                "
              >
                Delete Diagram
              </button>
            </div>
            <DrawIODiagramEditor
              class="h-184"
              :diagram="diagram"
              @saved="saveAuthorizationBoundaryDiagram"
            />
          </div>
        </template>
        <div
          v-else
          class="flex items-center justify-center py-8 text-sm text-gray-500 dark:text-slate-400 border border-dashed border-ccf-300 dark:border-slate-700 rounded-md bg-ccf-50/50 dark:bg-slate-800"
        >
          <div class="flex items-center gap-2">
            <PlusIcon class="w-4 h-4 text-gray-400" />
            <span>No diagrams yet. Use "Add Diagram" to create one.</span>
          </div>
        </div>
      </div>
    </CollapsableGroup>

    <CollapsableGroup>
      <template #header>
        <div class="py-2 px-4 text-lg flex items-center justify-between">
          <span>Network Architecture</span>
          <PrimaryButton
            class="p-small"
            @click.stop.prevent="addNetworkArchitectureDiagram"
          >
            Add Diagram
          </PrimaryButton>
        </div>
      </template>
      <div class="px-4 py-4 border-b border-ccf-300 dark:border-slate-700">
        <!--        <SystemCharacteristicsDiagramGroupForm v-model="networkArchitecture" />-->
        <template v-if="networkArchitecture?.diagrams?.length">
          <div
            class="overflow-hidden border border-ccf-300 dark:border-slate-700 rounded-md"
            v-for="diagram in networkArchitecture?.diagrams"
            :key="diagram.uuid"
          >
            <div
              class="flex justify-end items-center gap-2 px-3 py-2 bg-ccf-50 dark:bg-slate-800 border-b border-ccf-300 dark:border-slate-700"
            >
              <button
                class="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition-colors"
                @click.stop.prevent="
                  confirmDeleteDialog(
                    () => deleteDiagram('network-architecture', diagram),
                    {
                      itemType: 'diagram',
                      itemName: diagram.caption || diagram.uuid,
                    },
                  )
                "
              >
                Delete Diagram
              </button>
            </div>
            <DrawIODiagramEditor
              class="h-168"
              :diagram="diagram"
              @saved="saveNetworkArchitectureDiagram"
            />
          </div>
        </template>
        <div
          v-else
          class="flex items-center justify-center py-8 text-sm text-gray-500 dark:text-slate-400 border border-dashed border-ccf-300 dark:border-slate-700 rounded-md bg-ccf-50/50 dark:bg-slate-800"
        >
          <div class="flex items-center gap-2">
            <PlusIcon class="w-4 h-4 text-gray-400" />
            <span>No diagrams yet. Use "Add Diagram" to create one.</span>
          </div>
        </div>
      </div>
    </CollapsableGroup>

    <CollapsableGroup>
      <template #header>
        <div class="py-2 px-4 text-lg flex items-center justify-between">
          <span>Data Flow</span>
          <PrimaryButton
            class="p-small"
            @click.stop.prevent="addDataFlowDiagram"
          >
            Add Diagram
          </PrimaryButton>
        </div>
      </template>
      <div class="px-4 py-4 border-b border-ccf-300 dark:border-slate-700">
        <!--        <SystemCharacteristicsDiagramGroupForm v-model="dataFlow" />-->
        <template v-if="dataFlow?.diagrams?.length">
          <div
            class="overflow-hidden border border-ccf-300 dark:border-slate-700 rounded-md"
            v-for="diagram in dataFlow?.diagrams"
            :key="diagram.uuid"
          >
            <div
              class="flex justify-end items-center gap-2 px-3 py-2 bg-ccf-50 dark:bg-slate-800 border-b border-ccf-300 dark:border-slate-700"
            >
              <button
                class="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition-colors"
                @click.stop.prevent="
                  confirmDeleteDialog(
                    () => deleteDiagram('data-flow', diagram),
                    {
                      itemType: 'diagram',
                      itemName: diagram.caption || diagram.uuid,
                    },
                  )
                "
              >
                Delete Diagram
              </button>
            </div>
            <DrawIODiagramEditor
              class="h-168"
              :diagram="diagram"
              @saved="saveDataFlowDiagram"
            />
          </div>
        </template>
        <div
          v-else
          class="flex items-center justify-center py-8 text-sm text-gray-500 dark:text-slate-400 border border-dashed border-ccf-300 dark:border-slate-700 rounded-md bg-ccf-50/50 dark:bg-slate-800"
        >
          <div class="flex items-center gap-2">
            <PlusIcon class="w-4 h-4 text-gray-400" />
            <span>No diagrams yet. Use "Add Diagram" to create one.</span>
          </div>
        </div>
      </div>
    </CollapsableGroup>
  </div>
  <div class="h-screen w-full"></div>
  <!-- A screen height div to prevent collapse scrolling back up after closing -->
</template>
<script setup lang="ts">
import { onMounted, ref, type Ref } from 'vue';
import type { Diagram, SystemSecurityPlan } from '@/oscal';
import DrawIODiagramEditor from '@/components/DrawIODiagramEditor.vue';
import CollapsableGroup from '@/components/CollapsableGroup.vue';
import { v4 } from 'uuid';
import { useToast } from 'primevue/usetoast';
import { useSystemStore } from '@/stores/system.ts';
import { useDataApi, decamelizeKeys } from '@/composables/axios';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import type { AxiosError } from 'axios';
import type { ErrorBody, ErrorResponse } from '@/stores/types';
import { useDeleteConfirmationDialog } from '@/utils/delete-dialog';
import PlusIcon from '@primevue/icons/plus';
import type { Diagrammable } from '@/stores/system-security-plans';

const { system } = useSystemStore();
const toast = useToast();
const { confirmDeleteDialog } = useDeleteConfirmationDialog();

const systemSecurityPlan = ref<SystemSecurityPlan | null>(
  (system.securityPlan as SystemSecurityPlan) || null,
);

const {
  data: authorizationBoundary,
  execute: fetchAuthorizationBoundaryDiagram,
} = useDataApi<Diagrammable>(
  `/api/oscal/system-security-plans/${systemSecurityPlan.value?.uuid}/system-characteristics/authorization-boundary`,
  { method: 'GET' },
  {
    initialData: { diagrams: [{ uuid: v4() }] } as Diagrammable,
    immediate: false,
  },
);

const { data: networkArchitecture, execute: fetchNetworkArchitectureDiagram } =
  useDataApi<Diagrammable>(
    `/api/oscal/system-security-plans/${systemSecurityPlan.value?.uuid}/system-characteristics/network-architecture`,
    { method: 'GET' },
    { initialData: {} as Diagrammable, immediate: false },
  );

const { data: dataFlow, execute: fetchDataFlowDiagram } =
  useDataApi<Diagrammable>(
    `/api/oscal/system-security-plans/${systemSecurityPlan.value?.uuid}/system-characteristics/data-flow`,
    { method: 'GET' },
    { initialData: {} as Diagrammable, immediate: false },
  );

// Required multiple commands due to if more than 1 diagram is present, axios will end up cancelling the requests.
const { execute: saveABDiagram } = useDataApi<Diagram>(
  null,
  {
    method: 'PUT',
    transformRequest: [decamelizeKeys],
  },
  { immediate: false, abortPrevious: false },
);

const { execute: saveNADiagram } = useDataApi<Diagram>(
  null,
  {
    method: 'PUT',
    transformRequest: [decamelizeKeys],
  },
  { immediate: false, abortPrevious: false },
);

const { execute: saveDFDiagram } = useDataApi<Diagram>(
  null,
  {
    method: 'PUT',
    transformRequest: [decamelizeKeys],
  },
  { immediate: false, abortPrevious: false },
);

// Create Diagram (reusable for all categories)
const { data: createdDiagram, execute: createDiagram } = useDataApi<Diagram>(
  null,
  {
    method: 'POST',
    transformRequest: [decamelizeKeys],
  },
  { immediate: false },
);

// Delete Diagram (reusable for all categories)
const { execute: deleteDiagramRequest } = useDataApi<unknown>(
  null,
  {
    method: 'DELETE',
  },
  { immediate: false },
);

onMounted(async () => {
  await fetchAuthorizationBoundaryDiagram();
  await fetchNetworkArchitectureDiagram();
  await fetchDataFlowDiagram();
});

async function saveAuthorizationBoundaryDiagram(diagram: Diagram) {
  if (systemSecurityPlan.value != null) {
    await saveABDiagram(
      `/api/oscal/system-security-plans/${systemSecurityPlan.value.uuid}/system-characteristics/authorization-boundary/diagrams/${diagram.uuid}`,
      {
        data: diagram,
      },
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
    await saveNADiagram(
      `/api/oscal/system-security-plans/${systemSecurityPlan.value.uuid}/system-characteristics/network-architecture/diagrams/${diagram.uuid}`,
      {
        data: diagram,
      },
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
    await saveDFDiagram(
      `/api/oscal/system-security-plans/${systemSecurityPlan.value.uuid}/system-characteristics/data-flow/diagrams/${diagram.uuid}`,
      {
        data: diagram,
      },
    );
    toast.add({
      severity: 'success',
      summary: 'Diagram Saved',
      detail: 'Data Flow diagram saved successfully.',
      life: 3000,
    });
  }
}

type DiagramKind =
  | 'authorization-boundary'
  | 'network-architecture'
  | 'data-flow';

function resolveGrouping(kind: DiagramKind): {
  grouping: Ref<Diagrammable | undefined>;
  label: string;
} {
  let grouping: Ref<Diagrammable | undefined>;
  let label = '';
  switch (kind) {
    case 'authorization-boundary':
      grouping = authorizationBoundary as unknown as Ref<
        Diagrammable | undefined
      >;
      label = 'Authorization Boundary';
      break;
    case 'network-architecture':
      grouping = networkArchitecture as unknown as Ref<
        Diagrammable | undefined
      >;
      label = 'Network Architecture';
      break;
    case 'data-flow':
      grouping = dataFlow as unknown as Ref<Diagrammable | undefined>;
      label = 'Data Flow';
      break;
  }
  return { grouping, label };
}

async function addDiagram(kind: DiagramKind) {
  if (!systemSecurityPlan.value) return;

  const { grouping, label } = resolveGrouping(kind);

  try {
    await createDiagram(
      `/api/oscal/system-security-plans/${systemSecurityPlan.value.uuid}/system-characteristics/${kind}/diagrams`,
      {
        data: {
          uuid: v4(),
          description: '',
          props: [],
          links: [],
          caption: '',
          remarks: '',
        },
      },
    );

    const created = createdDiagram.value;
    if (!created) return;

    if (!grouping.value) {
      grouping.value = { diagrams: [] } as unknown as Diagrammable;
    }
    if (!grouping.value.diagrams) {
      grouping.value.diagrams = [] as Diagram[];
    }
    grouping.value.diagrams.push(created);

    toast.add({
      severity: 'success',
      summary: 'Diagram Created',
      detail: `New ${label} diagram added.`,
      life: 3000,
    });
  } catch (error) {
    const err = error as AxiosError<ErrorResponse<ErrorBody>>;
    const msg =
      err?.response?.data?.errors?.body ?? 'An unknown error occurred.';
    toast.add({
      severity: 'error',
      summary: 'Create Failed',
      detail: `Could not create ${label} diagram: ${msg}`,
      life: 4000,
    });
  }
}

function addAuthorizationBoundaryDiagram() {
  return addDiagram('authorization-boundary');
}

function addNetworkArchitectureDiagram() {
  return addDiagram('network-architecture');
}

function addDataFlowDiagram() {
  return addDiagram('data-flow');
}

async function deleteDiagram(
  kind: DiagramKind,
  diagram: Diagram,
): Promise<void> {
  const { grouping, label } = resolveGrouping(kind);

  try {
    if (!systemSecurityPlan.value) return;
    await deleteDiagramRequest(
      `/api/oscal/system-security-plans/${systemSecurityPlan.value.uuid}/system-characteristics/${kind}/diagrams/${diagram.uuid}`,
    );

    if (!grouping?.value?.diagrams) return;
    grouping.value.diagrams = grouping.value.diagrams.filter(
      (d) => d.uuid !== diagram.uuid,
    ) as Diagram[];

    toast.add({
      severity: 'success',
      summary: 'Diagram Deleted',
      detail: `${label} diagram deleted successfully.`,
      life: 3000,
    });
  } catch (error) {
    const err = error as AxiosError<ErrorResponse<ErrorBody>>;
    const msg =
      err?.response?.data?.errors?.body ?? 'An unknown error occurred.';
    toast.add({
      severity: 'error',
      summary: 'Delete Failed',
      detail: `Could not delete ${label} diagram: ${msg}`,
      life: 4000,
    });
  }
}
</script>
