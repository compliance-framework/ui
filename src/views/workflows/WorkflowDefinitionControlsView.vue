<template>
  <div v-if="store.definition" class="space-y-6">
    <!-- Header -->
    <div class="flex justify-between items-center">
      <div>
        <h3 class="text-lg font-medium text-gray-900 dark:text-slate-200">
          Linked Controls
        </h3>
        <p class="text-sm text-gray-500 dark:text-slate-400">
          Link this workflow to specific controls from your catalogs
        </p>
      </div>
      <PrimaryButton @click="showLinkDialog = true">
        <i class="pi pi-link mr-2"></i>
        Link Control
      </PrimaryButton>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-8">
      <i class="pi pi-spin pi-spinner text-2xl text-gray-400"></i>
      <p class="mt-2 text-gray-500">Loading linked controls...</p>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="!relationships || relationships.length === 0"
      class="text-center py-12 border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-lg"
    >
      <i class="pi pi-link text-4xl text-gray-300 dark:text-slate-600"></i>
      <p class="mt-4 text-gray-500 dark:text-slate-400">
        No controls linked yet.
      </p>
      <p class="text-sm text-gray-400 dark:text-slate-500 mt-2">
        Link controls to help users discover this workflow when implementing
        those controls.
      </p>
    </div>

    <!-- Linked Controls List -->
    <div v-else class="space-y-4">
      <div
        v-for="rel in relationships"
        :key="rel.id"
        class="flex justify-between items-center p-4 border rounded-lg border-ccf-300 dark:border-slate-700"
      >
        <div>
          <div class="font-medium text-gray-900 dark:text-slate-200">
            {{ rel.controlId }}
            <span v-if="rel.controlTitle" class="font-normal">
              - {{ rel.controlTitle }}
            </span>
          </div>
          <div class="text-sm text-gray-500 dark:text-slate-400">
            Catalog: {{ rel.controlSource || rel.catalogId }}
          </div>
        </div>
        <SecondaryButton
          size="small"
          severity="danger"
          @click="handleUnlink(rel)"
        >
          Unlink
        </SecondaryButton>
      </div>
    </div>

    <!-- Link Control Dialog -->
    <Dialog
      header="Link Control to Workflow"
      :draggable="false"
      v-model:visible="showLinkDialog"
      modal
      class="w-full max-w-2xl"
    >
      <div class="space-y-4">
        <!-- Catalog Selection -->
        <div>
          <Label for="catalog">Select Catalog</Label>
          <Select
            id="catalog"
            v-model="selectedCatalogId"
            :options="catalogs"
            optionLabel="metadata.title"
            optionValue="uuid"
            placeholder="Select a catalog"
            class="w-full"
            @change="onCatalogChange"
          />
        </div>

        <!-- Control Search/Selection -->
        <div v-if="selectedCatalogId">
          <Label for="control">Select Control</Label>
          <Select
            id="control"
            v-model="selectedControlId"
            :options="controlOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Search controls..."
            class="w-full"
            filter
            :filterFields="['label', 'value']"
          />
        </div>

        <!-- Error Message -->
        <Message v-if="linkError" severity="error">
          {{ linkError }}
        </Message>

        <!-- Actions -->
        <div
          class="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-slate-700"
        >
          <SecondaryButton @click="closeLinkDialog">Cancel</SecondaryButton>
          <PrimaryButton
            @click="handleLink"
            :disabled="!selectedCatalogId || !selectedControlId || isLinking"
          >
            <i v-if="isLinking" class="pi pi-spin pi-spinner mr-2"></i>
            Link Control
          </PrimaryButton>
        </div>
      </div>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useWorkflowDefinitionStore } from '@/stores/workflows/definitions';
import { useControlRelationships } from '@/composables/workflows';
import { useDataApi } from '@/composables/axios';
import { createControlList } from '@/composables/useControlList';
import type { ControlRelationship } from '@/types/workflows';
import type { Catalog, Control } from '@/oscal';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import Dialog from '@/volt/Dialog.vue';
import Select from '@/volt/Select.vue';
import Label from '@/volt/Label.vue';
import Message from '@/volt/Message.vue';

const store = useWorkflowDefinitionStore();
const {
  relationships,
  listRelationships,
  createRelationship,
  deleteRelationship,
} = useControlRelationships();

const loading = ref(false);
const showLinkDialog = ref(false);
const selectedCatalogId = ref<string | null>(null);
const selectedControlId = ref<string | null>(null);
const isLinking = ref(false);
const linkError = ref('');

// Catalogs list
const { data: catalogs } = useDataApi<Catalog[]>('/api/oscal/catalogs');
const catalogUUIDs = computed<string[]>(() =>
  selectedCatalogId.value ? [selectedCatalogId.value] : [],
);
const { controls: groupedControls } = createControlList(catalogUUIDs);
const controlOptions = computed(() =>
  groupedControls.value.flatMap((group) =>
    group.items.map((item) => ({
      label: `${item.label} · ${group.label}`,
      value: item.value,
    })),
  ),
);

async function loadRelationships() {
  if (!store.definition) return;

  loading.value = true;
  try {
    await listRelationships({
      workflowDefinitionId: store.definition.id,
    });
  } finally {
    loading.value = false;
  }
}

function onCatalogChange() {
  selectedControlId.value = null;
}

async function handleLink() {
  if (!store.definition || !selectedCatalogId.value || !selectedControlId.value)
    return;

  isLinking.value = true;
  linkError.value = '';

  try {
    await createRelationship(
      {
        workflowDefinitionId: store.definition.id,
        catalogId: selectedCatalogId.value,
        controlId: selectedControlId.value || '',
      },
      () => {
        closeLinkDialog();
        loadRelationships();
      },
    );
  } catch (error) {
    linkError.value =
      error instanceof Error ? error.message : 'Failed to link control';
  } finally {
    isLinking.value = false;
  }
}

async function handleUnlink(rel: ControlRelationship) {
  await deleteRelationship(rel.id, rel.controlTitle, () => {
    loadRelationships();
  });
}

function closeLinkDialog() {
  showLinkDialog.value = false;
  selectedCatalogId.value = null;
  selectedControlId.value = null;
  linkError.value = '';
}

onMounted(() => {
  loadRelationships();
});
</script>
