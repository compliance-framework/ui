<script setup lang="ts">
/**
 * Configure System → Authorization Boundary: the system's diagrams in three groups (authorization
 * boundary, network architecture, data flow), each open to edit in draw.io, with rename and
 * delete. The draw.io editor (an embedded frame) stays mounted while a diagram is closed.
 * The script is the classic DiagramsView's.
 */
import { computed, onMounted, ref, type Ref } from 'vue';
import type { Diagram, SystemSecurityPlan } from '@/oscal';
import DrawIODiagramEditor from '@/components/DrawIODiagramEditor.vue';
import { v4 } from 'uuid';
import { useToast } from 'primevue/usetoast';
import { useDataApi, decamelizeKeys } from '@/composables/axios';
import Button from '@/ds/components/Button/Button.vue';
import Disclosure from '@/ds/components/Disclosure/Disclosure.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import IconButton from '@/ds/components/IconButton/IconButton.vue';
import Text from '@/ds/components/Text/Text.vue';
import TextInput from '@/ds/components/TextInput/TextInput.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Panel from '@/ds/components/layout/Panel.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import type { AxiosError } from 'axios';
import type { ErrorBody, ErrorResponse } from '@/stores/types';
import { useDeleteConfirmationDialog } from '@/utils/delete-dialog';
import type { Diagrammable } from '@/stores/system-security-plans';

const props = defineProps<{
  sspId: string;
}>();

const toast = useToast();
const { confirmDeleteDialog } = useDeleteConfirmationDialog();
const collapsedDiagrams = ref<Record<string, boolean>>({});
const editingCaption = ref<Record<string, boolean>>({});
const captionDrafts = ref<Record<string, string>>({});

const systemSecurityPlan = ref<SystemSecurityPlan | null>(
  props.sspId ? ({ uuid: props.sspId } as SystemSecurityPlan) : null,
);

const {
  data: authorizationBoundary,
  execute: fetchAuthorizationBoundaryDiagram,
} = useDataApi<Diagrammable>(
  `/api/oscal/system-security-plans/${systemSecurityPlan.value?.uuid}/system-characteristics/authorization-boundary`,
  { method: 'GET' },
  {
    initialData: {} as Diagrammable,
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
  await Promise.all([
    fetchOptionalDiagram(
      fetchAuthorizationBoundaryDiagram,
      authorizationBoundary as unknown as Ref<Diagrammable | undefined>,
    ),
    fetchOptionalDiagram(
      fetchNetworkArchitectureDiagram,
      networkArchitecture as unknown as Ref<Diagrammable | undefined>,
    ),
    fetchOptionalDiagram(
      fetchDataFlowDiagram,
      dataFlow as unknown as Ref<Diagrammable | undefined>,
    ),
  ]);
});

async function fetchOptionalDiagram(
  fetchDiagram: () => Promise<unknown>,
  grouping: Ref<Diagrammable | undefined>,
) {
  try {
    await fetchDiagram();
  } catch (error) {
    const err = error as AxiosError;
    if (err.response?.status !== 404) {
      throw error;
    }
    grouping.value = { diagrams: [] } as unknown as Diagrammable;
  }
}

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

function isDiagramCollapsed(uuid: string): boolean {
  return collapsedDiagrams.value[uuid] === true;
}

function toggleDiagram(uuid: string) {
  collapsedDiagrams.value = {
    ...collapsedDiagrams.value,
    [uuid]: !isDiagramCollapsed(uuid),
  };
}

function startCaptionEdit(diagram: Diagram) {
  editingCaption.value = {
    ...editingCaption.value,
    [diagram.uuid]: true,
  };
  captionDrafts.value = {
    ...captionDrafts.value,
    [diagram.uuid]: diagram.caption ?? '',
  };
}

function cancelCaptionEdit(uuid: string) {
  editingCaption.value = {
    ...editingCaption.value,
    [uuid]: false,
  };
}

type DiagramKind =
  'authorization-boundary' | 'network-architecture' | 'data-flow';

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

function updateDiagramInGrouping(
  grouping: Ref<Diagrammable | undefined>,
  diagram: Diagram,
) {
  grouping.value = {
    ...(grouping.value ?? {}),
    diagrams: (grouping.value?.diagrams ?? []).map((item) =>
      item.uuid === diagram.uuid ? diagram : item,
    ),
  } as Diagrammable;
}

async function saveDiagramCaption(kind: DiagramKind, diagram: Diagram) {
  const { grouping } = resolveGrouping(kind);
  const updatedDiagram = {
    ...diagram,
    caption: captionDrafts.value[diagram.uuid] ?? '',
  };

  switch (kind) {
    case 'authorization-boundary':
      await saveAuthorizationBoundaryDiagram(updatedDiagram);
      break;
    case 'network-architecture':
      await saveNetworkArchitectureDiagram(updatedDiagram);
      break;
    case 'data-flow':
      await saveDataFlowDiagram(updatedDiagram);
      break;
  }

  updateDiagramInGrouping(grouping, updatedDiagram);
  cancelCaptionEdit(diagram.uuid);
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

    grouping.value = {
      ...(grouping.value ?? {}),
      diagrams: [...(grouping.value?.diagrams ?? []), created],
    } as Diagrammable;

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

    grouping.value = {
      ...(grouping.value ?? {}),
      diagrams: (grouping.value?.diagrams ?? []).filter(
        (d) => d.uuid !== diagram.uuid,
      ),
    } as Diagrammable;

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

// Design-system view ---------------------------------------------------------------------------

const groups = computed(() => [
  {
    kind: 'authorization-boundary' as DiagramKind,
    title: 'Authorization boundary',
    data: authorizationBoundary.value,
    add: addAuthorizationBoundaryDiagram,
    save: saveAuthorizationBoundaryDiagram,
  },
  {
    kind: 'network-architecture' as DiagramKind,
    title: 'Network architecture',
    data: networkArchitecture.value,
    add: addNetworkArchitectureDiagram,
    save: saveNetworkArchitectureDiagram,
  },
  {
    kind: 'data-flow' as DiagramKind,
    title: 'Data flow',
    data: dataFlow.value,
    add: addDataFlowDiagram,
    save: saveDataFlowDiagram,
  },
]);
</script>

<template>
  <Stack gap="5">
    <Panel
      v-for="group in groups"
      :key="group.kind"
      :title="group.title"
      :level="2"
    >
      <template #actions>
        <Button icon="add" @click="group.add()">Add diagram</Button>
      </template>
      <Stack v-if="group.data?.diagrams?.length" gap="3">
        <Stack
          v-for="diagram in group.data.diagrams"
          :key="diagram.uuid"
          gap="2"
        >
          <Stack v-if="editingCaption[diagram.uuid]" gap="2">
            <FormField label="Diagram title">
              <TextInput
                v-model="captionDrafts[diagram.uuid]"
                @keydown.enter.prevent="saveDiagramCaption(group.kind, diagram)"
                @keydown.esc.prevent="cancelCaptionEdit(diagram.uuid)"
              />
            </FormField>
            <Cluster gap="2">
              <Button
                variant="primary"
                @click="saveDiagramCaption(group.kind, diagram)"
                >Save</Button
              >
              <Button @click="cancelCaptionEdit(diagram.uuid)">Cancel</Button>
            </Cluster>
          </Stack>
          <Disclosure
            :label="diagram.caption || 'Untitled diagram'"
            :open="!isDiagramCollapsed(diagram.uuid)"
            @update:open="toggleDiagram(diagram.uuid)"
          >
            <Stack gap="3">
              <Cluster justify="between" gap="2">
                <Text v-if="diagram.description" variant="caption">{{
                  diagram.description
                }}</Text>
                <Cluster gap="1">
                  <IconButton
                    icon="edit"
                    label="Edit diagram title"
                    @click="startCaptionEdit(diagram)"
                  />
                  <IconButton
                    icon="delete"
                    :label="`Delete ${diagram.caption || 'diagram'}`"
                    @click="
                      confirmDeleteDialog(
                        () => deleteDiagram(group.kind, diagram),
                        {
                          itemType: 'diagram',
                          itemName: diagram.caption || diagram.uuid,
                        },
                      )
                    "
                  />
                </Cluster>
              </Cluster>
              <DrawIODiagramEditor :diagram="diagram" @saved="group.save" />
            </Stack>
          </Disclosure>
        </Stack>
      </Stack>
      <Text v-else variant="caption"
        >No diagrams yet. Use Add diagram to draw one.</Text
      >
    </Panel>
  </Stack>
</template>
