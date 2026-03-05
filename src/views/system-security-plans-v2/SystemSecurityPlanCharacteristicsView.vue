<template>
  <div class="space-y-8">
    <section
      v-if="characteristicsLoading"
      class="border border-[var(--ui-v2-border)] bg-[var(--ui-v2-card)] p-6"
    >
      <p class="ui-v2-nav text-[var(--ui-v2-secondary-foreground)]">Loading</p>
      <p class="mt-2 text-[var(--ui-v2-muted-foreground)]">
        Loading system characteristics...
      </p>
    </section>

    <section
      v-else-if="error"
      class="border border-[var(--ui-v2-error)] bg-[var(--ui-v2-error-tint-10)] p-6"
    >
      <p class="ui-v2-nav text-[var(--ui-v2-error)]">Load failed</p>
      <p class="mt-2 text-[var(--ui-v2-foreground)]">{{ errorMessage }}</p>
    </section>

    <template v-else>
      <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article
          v-for="card in metricCards"
          :key="card.label"
          class="min-h-[120px] border border-[var(--ui-v2-border)] bg-[var(--ui-v2-card)] p-5"
        >
          <p class="ui-v2-label text-[var(--ui-v2-secondary-foreground)]">
            {{ card.label }}
          </p>
          <p class="ui-v2-metric mt-1" :class="card.valueClass">
            {{ card.value }}
          </p>
          <p
            class="mt-2 font-[var(--ui-v2-font-secondary)] text-[11px] font-semibold tracking-[1px] text-[var(--ui-v2-tertiary-foreground)]"
          >
            {{ card.meta }}
          </p>
        </article>
      </section>

      <section class="space-y-4">
        <header class="flex items-center justify-between">
          <h2 class="ui-v2-section-title text-[var(--ui-v2-foreground)]">
            DIAGRAMS
          </h2>
        </header>

        <div class="grid gap-4 xl:grid-cols-3">
          <article
            v-for="diagramSet in diagramSets"
            :key="diagramSet.kind"
            class="flex min-h-[190px] flex-col gap-3 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-card)] p-5"
          >
            <header class="flex items-center justify-between gap-2">
              <h3 class="ui-v2-card-title text-[var(--ui-v2-foreground)]">
                {{ diagramSet.label }}
              </h3>

              <button
                type="button"
                class="inline-flex h-7 items-center justify-center border border-[var(--ui-v2-primary)] bg-[var(--ui-v2-primary)] px-2.5 font-[var(--ui-v2-font-secondary)] text-[11px] font-bold tracking-[1px] text-[var(--ui-v2-foreground)] uppercase transition-colors duration-150 hover:bg-[var(--ui-v2-primary)] disabled:cursor-not-allowed disabled:opacity-60"
                :disabled="isWorking || addingKind === diagramSet.kind"
                @click="addDiagram(diagramSet.kind)"
              >
                {{
                  addingKind === diagramSet.kind ? 'ADDING...' : 'ADD DIAGRAM'
                }}
              </button>
            </header>

            <p
              v-if="diagramSet.loading"
              class="font-[var(--ui-v2-font-secondary)] text-[10px] font-semibold tracking-[1px] text-[var(--ui-v2-secondary-foreground)]"
            >
              LOADING DIAGRAMS...
            </p>

            <div
              v-else-if="diagramSet.diagrams.length === 0"
              class="flex items-center border border-[var(--ui-v2-border)] bg-[var(--ui-v2-background)] px-3 py-3"
            >
              <p
                class="font-[var(--ui-v2-font-secondary)] text-[10px] font-semibold tracking-[1px] text-[var(--ui-v2-secondary-foreground)]"
              >
                No diagrams yet. Use Add Diagram to create one.
              </p>
            </div>

            <div v-else class="space-y-2">
              <article
                v-for="diagram in diagramSet.diagrams"
                :key="diagram.uuid"
                class="space-y-1.5 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] p-2.5"
              >
                <div class="flex items-center justify-between gap-2">
                  <p
                    class="truncate font-[var(--ui-v2-font-secondary)] text-[11px] font-bold tracking-[1px] text-[var(--ui-v2-foreground)]"
                    :title="diagram.caption || 'Untitled Diagram'"
                  >
                    {{ diagram.caption || 'Untitled Diagram' }}
                  </p>

                  <div class="flex items-center gap-1.5">
                    <button
                      type="button"
                      class="inline-flex h-[22px] items-center justify-center gap-1 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] px-2 font-[var(--ui-v2-font-secondary)] text-[9px] font-bold tracking-[1px] text-[var(--ui-v2-info)] uppercase transition-colors duration-150 hover:border-[var(--ui-v2-info)] hover:bg-[var(--ui-v2-info-tint-10)] disabled:cursor-not-allowed disabled:opacity-60"
                      :disabled="isWorking"
                      @click="editDiagram(diagramSet.kind, diagram)"
                    >
                      <V2LucideIcon name="view" :size="12" />
                      <span>EDIT</span>
                    </button>

                    <button
                      type="button"
                      class="inline-flex h-[22px] w-[22px] items-center justify-center border border-[var(--ui-v2-error)] bg-[var(--ui-v2-error-tint-10)] text-[var(--ui-v2-error)] transition-colors duration-150 hover:bg-[var(--ui-v2-error-tint-10)] disabled:cursor-not-allowed disabled:opacity-60"
                      :disabled="isWorking"
                      @click="confirmDeleteDiagram(diagramSet.kind, diagram)"
                    >
                      <V2LucideIcon name="x" :size="12" />
                    </button>
                  </div>
                </div>

                <p
                  class="font-[var(--ui-v2-font-secondary)] text-[10px] font-semibold tracking-[1px] text-[var(--ui-v2-secondary-foreground)]"
                >
                  {{ diagram.description || 'No description provided.' }}
                </p>
              </article>
            </div>
          </article>
        </div>
      </section>
    </template>

    <Drawer v-model:visible="diagramDrawerVisible" position="full">
      <template #header>
        <div
          class="flex min-w-0 flex-1 items-center justify-between gap-3 pr-2"
        >
          <h3
            class="font-[var(--ui-v2-font-primary)] text-[16px] font-bold uppercase leading-[1.1] text-[var(--ui-v2-foreground)]"
          >
            {{ diagramDrawerTitle }}
          </h3>

          <button
            type="button"
            class="inline-flex h-8 items-center justify-center border border-[var(--ui-v2-primary)] bg-[var(--ui-v2-primary)] px-3 font-[var(--ui-v2-font-secondary)] text-[11px] font-bold tracking-[1px] text-[var(--ui-v2-foreground)] uppercase transition-colors duration-150 hover:bg-[var(--ui-v2-primary)] disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="!activeDiagram || isWorking"
            @click="requestDiagramSave"
          >
            {{ diagramSaveRequested ? 'SAVING...' : 'SAVE DIAGRAM' }}
          </button>
        </div>
      </template>

      <div
        v-if="activeDiagram"
        class="flex h-full min-h-0 flex-col gap-2 overflow-hidden"
      >
        <div
          class="grid shrink-0 grid-cols-[auto_minmax(0,1fr)_auto_minmax(0,2fr)] items-center gap-2 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] p-2"
        >
          <label
            for="diagram-caption-input"
            class="ui-v2-label whitespace-nowrap text-[var(--ui-v2-secondary-foreground)]"
          >
            NAME
          </label>
          <InputText
            id="diagram-caption-input"
            v-model="diagramCaption"
            class="w-full"
            size="small"
            placeholder="Untitled Diagram"
            :disabled="isWorking"
          />

          <label
            for="diagram-description-input"
            class="ui-v2-label whitespace-nowrap text-[var(--ui-v2-secondary-foreground)]"
          >
            DESCRIPTION
          </label>
          <InputText
            id="diagram-description-input"
            v-model="diagramDescription"
            class="w-full"
            size="small"
            placeholder="No description provided."
            :disabled="isWorking"
          />
        </div>

        <DrawIODiagramEditor
          ref="diagramEditorRef"
          :key="activeDiagram.uuid"
          :diagram="activeDiagram"
          class="min-h-0 flex-1 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)]"
          @saved="handleEditorSaved"
        />
      </div>
    </Drawer>
  </div>
</template>

<script setup lang="ts">
import type { AxiosError } from 'axios';
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import { v4 as uuidv4 } from 'uuid';
import { decamelizeKeys, useDataApi } from '@/composables/axios';
import type { Diagram, SystemCharacteristics } from '@/oscal';
import DrawIODiagramEditor from '@/components/DrawIODiagramEditor.vue';
import V2LucideIcon from '@/components/v2/primitives/V2LucideIcon.vue';
import type { Diagrammable } from '@/stores/system-security-plans';
import type { ErrorBody, ErrorResponse } from '@/stores/types';
import { useDeleteConfirmationDialog } from '@/utils/delete-dialog';
import Drawer from '@/volt/Drawer.vue';
import InputText from '@/volt/InputText.vue';

type DiagramKind =
  | 'authorization-boundary'
  | 'network-architecture'
  | 'data-flow';
type DiagramDrawerMode = 'create' | 'edit';

interface DiagramDrawerContext {
  kind: DiagramKind;
  diagramId: string;
  mode: DiagramDrawerMode;
}

const route = useRoute();
const toast = useToast();
const { confirmDeleteDialog } = useDeleteConfirmationDialog();
const sspId = computed(() => String(route.params.id || ''));

const {
  data: characteristics,
  isLoading: characteristicsLoading,
  error,
  execute: loadCharacteristics,
} = useDataApi<SystemCharacteristics>(null, null, { immediate: false });

const {
  data: authorizationBoundary,
  isLoading: authorizationBoundaryLoading,
  execute: loadAuthorizationBoundary,
} = useDataApi<Diagrammable | null>(null, null, { immediate: false });

const {
  data: networkArchitecture,
  isLoading: networkArchitectureLoading,
  execute: loadNetworkArchitecture,
} = useDataApi<Diagrammable | null>(null, null, { immediate: false });

const {
  data: dataFlow,
  isLoading: dataFlowLoading,
  execute: loadDataFlow,
} = useDataApi<Diagrammable | null>(null, null, { immediate: false });

const { data: createdDiagram, execute: createDiagramRequest } =
  useDataApi<Diagram>(
    null,
    {
      method: 'POST',
      transformRequest: [decamelizeKeys],
    },
    { immediate: false },
  );

const { execute: saveDiagramRequest } = useDataApi<Diagram>(
  null,
  {
    method: 'PUT',
    transformRequest: [decamelizeKeys],
  },
  { immediate: false, abortPrevious: false },
);

const { execute: deleteDiagramRequest } = useDataApi<void>(
  null,
  {
    method: 'DELETE',
  },
  { immediate: false },
);

const addingKind = ref<DiagramKind | null>(null);
const diagramMutationInFlight = ref(false);
const diagramSaveRequested = ref(false);
const diagramDrawerVisible = ref(false);
const activeDiagramContext = ref<DiagramDrawerContext | null>(null);
const diagramCaption = ref('');
const diagramDescription = ref('');
const diagramEditorRef = ref<{ requestSave: () => void } | null>(null);

watch(
  sspId,
  async (id) => {
    diagramDrawerVisible.value = false;
    activeDiagramContext.value = null;
    addingKind.value = null;
    diagramSaveRequested.value = false;
    diagramCaption.value = '';
    diagramDescription.value = '';

    if (!id) {
      return;
    }

    await Promise.allSettled([
      loadCharacteristics(
        `/api/oscal/system-security-plans/${id}/system-characteristics`,
      ),
      loadAuthorizationBoundary(
        `/api/oscal/system-security-plans/${id}/system-characteristics/authorization-boundary`,
      ),
      loadNetworkArchitecture(
        `/api/oscal/system-security-plans/${id}/system-characteristics/network-architecture`,
      ),
      loadDataFlow(
        `/api/oscal/system-security-plans/${id}/system-characteristics/data-flow`,
      ),
    ]);
  },
  { immediate: true },
);

watch(diagramDrawerVisible, (visible) => {
  if (!visible) {
    activeDiagramContext.value = null;
    diagramSaveRequested.value = false;
    diagramCaption.value = '';
    diagramDescription.value = '';
  }
});

const activeDiagram = computed<Diagram | null>(() => {
  const context = activeDiagramContext.value;
  if (!context) {
    return null;
  }

  return findDiagram(context.kind, context.diagramId);
});

watch(activeDiagram, (diagram) => {
  if (diagramDrawerVisible.value && !diagram) {
    diagramDrawerVisible.value = false;
    return;
  }

  diagramCaption.value = diagram?.caption || '';
  diagramDescription.value = diagram?.description || '';
});

const diagramDrawerTitle = computed(() =>
  activeDiagramContext.value?.mode === 'create'
    ? 'Add Diagram'
    : 'Edit Diagram',
);

const isWorking = computed(
  () =>
    diagramMutationInFlight.value ||
    addingKind.value !== null ||
    diagramSaveRequested.value,
);

const errorMessage = computed(() => {
  if (!error.value) {
    return 'Unable to load system characteristics.';
  }
  if (typeof error.value === 'string') {
    return error.value;
  }
  if (error.value instanceof Error) {
    return error.value.message;
  }
  return 'Unable to load system characteristics.';
});

const authorizationStatus = computed(() => {
  if (!characteristics.value?.dateAuthorized) {
    return 'NOT AUTHORIZED';
  }

  const authDate = new Date(characteristics.value.dateAuthorized.toString());
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - authDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays > 365) {
    return 'NEEDS REVIEW';
  }

  return 'AUTHORIZED';
});

const authorizationStatusClass = computed(() => {
  if (authorizationStatus.value === 'AUTHORIZED') {
    return 'text-[var(--ui-v2-success)]';
  }
  if (authorizationStatus.value === 'NEEDS REVIEW') {
    return 'text-[var(--ui-v2-primary)]';
  }
  return 'text-[var(--ui-v2-error)]';
});

const daysSinceAuthorization = computed(() => {
  if (!characteristics.value?.dateAuthorized) {
    return null;
  }

  const authDate = new Date(characteristics.value.dateAuthorized.toString());
  const now = new Date();
  return Math.floor(
    (now.getTime() - authDate.getTime()) / (1000 * 60 * 60 * 24),
  );
});

const totalDiagrams = computed(() => {
  const boundaryCount = authorizationBoundary.value?.diagrams?.length || 0;
  const networkCount = networkArchitecture.value?.diagrams?.length || 0;
  const flowCount = dataFlow.value?.diagrams?.length || 0;
  return boundaryCount + networkCount + flowCount;
});

const diagramCategories = computed(() => {
  let count = 0;
  if ((authorizationBoundary.value?.diagrams?.length || 0) > 0) count += 1;
  if ((networkArchitecture.value?.diagrams?.length || 0) > 0) count += 1;
  if ((dataFlow.value?.diagrams?.length || 0) > 0) count += 1;
  return count;
});

const fieldsCompleted = computed(() => {
  let completed = 0;
  if (characteristics.value?.systemName) completed += 1;
  if (characteristics.value?.systemNameShort) completed += 1;
  if (characteristics.value?.securitySensitivityLevel) completed += 1;
  if (characteristics.value?.dateAuthorized) completed += 1;
  if (characteristics.value?.description) completed += 1;
  if (characteristics.value?.remarks) completed += 1;
  if (authorizationBoundary.value) completed += 1;
  if (networkArchitecture.value) completed += 1;
  if (dataFlow.value) completed += 1;
  return completed;
});

const totalFields = 9;

const completenessPercentage = computed(() =>
  Math.round((fieldsCompleted.value / totalFields) * 100),
);

const securityLevelValue = computed(() => {
  const value = characteristics.value?.securitySensitivityLevel;
  if (!value) {
    return 'N/A';
  }
  return value.toString().toUpperCase();
});

const metricCards = computed(() => [
  {
    label: 'SECURITY LEVEL',
    value: securityLevelValue.value,
    valueClass: 'text-[var(--ui-v2-foreground)]',
    meta: 'SYSTEM CHARACTERISTICS',
  },
  {
    label: 'AUTH STATUS',
    value: authorizationStatus.value,
    valueClass: authorizationStatusClass.value,
    meta:
      daysSinceAuthorization.value === null
        ? 'NO AUTHORIZATION DATE'
        : `${daysSinceAuthorization.value} DAYS SINCE AUTHORIZATION`,
  },
  {
    label: 'DIAGRAMS',
    value: totalDiagrams.value,
    valueClass: 'text-[var(--ui-v2-primary)]',
    meta: `ACROSS ${diagramCategories.value} ${diagramCategories.value === 1 ? 'CATEGORY' : 'CATEGORIES'}`,
  },
  {
    label: 'PROFILE COMPLETENESS',
    value: `${completenessPercentage.value}%`,
    valueClass: 'text-[var(--ui-v2-primary)]',
    meta: `${fieldsCompleted.value} OF ${totalFields} FIELDS COMPLETED`,
  },
]);

const diagramSets = computed(() => [
  {
    kind: 'authorization-boundary' as DiagramKind,
    label: 'AUTHORIZATION BOUNDARY',
    loading: authorizationBoundaryLoading.value,
    diagrams: authorizationBoundary.value?.diagrams || [],
  },
  {
    kind: 'network-architecture' as DiagramKind,
    label: 'NETWORK ARCHITECTURE',
    loading: networkArchitectureLoading.value,
    diagrams: networkArchitecture.value?.diagrams || [],
  },
  {
    kind: 'data-flow' as DiagramKind,
    label: 'DATA FLOW',
    loading: dataFlowLoading.value,
    diagrams: dataFlow.value?.diagrams || [],
  },
]);

function getKindLabel(kind: DiagramKind): string {
  switch (kind) {
    case 'authorization-boundary':
      return 'Authorization Boundary';
    case 'network-architecture':
      return 'Network Architecture';
    case 'data-flow':
      return 'Data Flow';
  }
}

function getGrouping(kind: DiagramKind) {
  switch (kind) {
    case 'authorization-boundary':
      return authorizationBoundary;
    case 'network-architecture':
      return networkArchitecture;
    case 'data-flow':
      return dataFlow;
  }
}

function ensureDiagramList(kind: DiagramKind): Diagram[] {
  const grouping = getGrouping(kind);
  if (!grouping.value) {
    grouping.value = {
      diagrams: [],
    } as unknown as Diagrammable;
  }
  if (!grouping.value.diagrams) {
    grouping.value.diagrams = [];
  }

  return grouping.value.diagrams as Diagram[];
}

function findDiagram(kind: DiagramKind, diagramId: string): Diagram | null {
  const diagrams = getGrouping(kind).value?.diagrams || [];
  return diagrams.find((diagram) => diagram.uuid === diagramId) || null;
}

function upsertDiagram(kind: DiagramKind, diagram: Diagram): void {
  const diagrams = ensureDiagramList(kind);
  const index = diagrams.findIndex((item) => item.uuid === diagram.uuid);
  if (index === -1) {
    diagrams.push(diagram);
    return;
  }
  diagrams.splice(index, 1, diagram);
}

function removeDiagram(kind: DiagramKind, diagramId: string): void {
  const grouping = getGrouping(kind);
  if (!grouping.value?.diagrams) {
    return;
  }
  grouping.value.diagrams = grouping.value.diagrams.filter(
    (item) => item.uuid !== diagramId,
  );
}

function openDiagramDrawer(
  kind: DiagramKind,
  diagramId: string,
  mode: DiagramDrawerMode,
): void {
  activeDiagramContext.value = {
    kind,
    diagramId,
    mode,
  };
  diagramDrawerVisible.value = true;
}

async function addDiagram(kind: DiagramKind): Promise<void> {
  if (!sspId.value || isWorking.value) {
    return;
  }

  addingKind.value = kind;

  try {
    await createDiagramRequest(
      `/api/oscal/system-security-plans/${sspId.value}/system-characteristics/${kind}/diagrams`,
      {
        data: {
          uuid: uuidv4(),
          caption: '',
          description: '',
          remarks: '',
          props: [],
          links: [],
        },
      },
    );

    const created = createdDiagram.value;
    if (!created) {
      throw new Error('Unable to initialize a new diagram.');
    }

    upsertDiagram(kind, created);
    openDiagramDrawer(kind, created.uuid, 'create');

    toast.add({
      severity: 'success',
      summary: 'Diagram Created',
      detail: `New ${getKindLabel(kind)} diagram added.`,
      life: 2500,
    });
  } catch (loadError) {
    toast.add({
      severity: 'error',
      summary: 'Create Failed',
      detail: resolveApiError(loadError, 'Unable to create diagram.'),
      life: 3500,
    });
  } finally {
    addingKind.value = null;
  }
}

function editDiagram(kind: DiagramKind, diagram: Diagram): void {
  openDiagramDrawer(kind, diagram.uuid, 'edit');
}

function applyDiagramMetadata(diagram: Diagram): void {
  diagram.caption = diagramCaption.value.trim();
  diagram.description = diagramDescription.value.trim();
}

function requestDiagramSave(): void {
  const diagram = activeDiagram.value;

  if (!diagram || !diagramDrawerVisible.value || isWorking.value) {
    return;
  }

  const editor = diagramEditorRef.value;
  if (!editor?.requestSave) {
    toast.add({
      severity: 'error',
      summary: 'Save Unavailable',
      detail: 'Diagram editor is still initializing. Try again.',
      life: 3000,
    });
    return;
  }

  applyDiagramMetadata(diagram);
  diagramSaveRequested.value = true;
  editor.requestSave();
}

function handleEditorSaved(diagram: Diagram): void {
  applyDiagramMetadata(diagram);
  void saveDiagram(diagram);
}

async function saveDiagram(diagram: Diagram): Promise<void> {
  const context = activeDiagramContext.value;
  if (!context || !sspId.value || diagramMutationInFlight.value) {
    diagramSaveRequested.value = false;
    return;
  }

  diagramMutationInFlight.value = true;

  try {
    await saveDiagramRequest(
      `/api/oscal/system-security-plans/${sspId.value}/system-characteristics/${context.kind}/diagrams/${diagram.uuid}`,
      {
        data: diagram,
      },
    );

    upsertDiagram(context.kind, diagram);

    toast.add({
      severity: 'success',
      summary: 'Diagram Saved',
      detail: `${getKindLabel(context.kind)} diagram saved successfully.`,
      life: 2500,
    });
  } catch (loadError) {
    toast.add({
      severity: 'error',
      summary: 'Save Failed',
      detail: resolveApiError(loadError, 'Unable to save diagram.'),
      life: 3500,
    });
  } finally {
    diagramMutationInFlight.value = false;
    diagramSaveRequested.value = false;
  }
}

function confirmDeleteDiagram(kind: DiagramKind, diagram: Diagram): void {
  confirmDeleteDialog(() => deleteDiagram(kind, diagram), {
    itemType: 'diagram',
    itemName: diagram.caption || diagram.uuid,
  });
}

async function deleteDiagram(
  kind: DiagramKind,
  diagram: Diagram,
): Promise<void> {
  if (!sspId.value || diagramMutationInFlight.value) {
    return;
  }

  diagramMutationInFlight.value = true;

  try {
    await deleteDiagramRequest(
      `/api/oscal/system-security-plans/${sspId.value}/system-characteristics/${kind}/diagrams/${diagram.uuid}`,
    );

    removeDiagram(kind, diagram.uuid);

    if (activeDiagramContext.value?.diagramId === diagram.uuid) {
      diagramDrawerVisible.value = false;
    }

    toast.add({
      severity: 'success',
      summary: 'Diagram Deleted',
      detail: `${getKindLabel(kind)} diagram deleted successfully.`,
      life: 2500,
    });
  } catch (loadError) {
    toast.add({
      severity: 'error',
      summary: 'Delete Failed',
      detail: resolveApiError(loadError, 'Unable to delete diagram.'),
      life: 3500,
    });
  } finally {
    diagramMutationInFlight.value = false;
  }
}

function resolveApiError(loadError: unknown, fallbackMessage: string): string {
  const apiError = loadError as AxiosError<ErrorResponse<ErrorBody>>;
  return (
    apiError.response?.data?.errors?.body ||
    (loadError instanceof Error ? loadError.message : fallbackMessage)
  );
}
</script>
