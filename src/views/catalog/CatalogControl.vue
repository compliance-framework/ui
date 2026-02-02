<template>
  <CollapsableGroup>
    <template #header>
      <div class="py-2 px-4 flex items-center gap-4">
        <span
          class="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 text-gray-800 dark:text-slate-300 rounded-md text-sm whitespace-nowrap px-4 py-1"
          >{{ control.id }}</span
        >
        <div class="grow">
          {{ control.title }}
          <span class="text-gray-400 dark:text-slate-300 text-sm px-2 py-1"
            >Control</span
          >
        </div>
        <ResultStatusBadge
          v-if="complianceCounts.total"
          :gray="complianceCounts.gray"
          :red="complianceCounts.red"
          :green="complianceCounts.green"
        ></ResultStatusBadge>
        <TertiaryButton
          v-if="control.class"
          class="bg-white hover:bg-zinc-100 dark:bg-slate-800 dark:hover:bg-slate-600"
          @click.stop="gotoFindings"
          >Findings</TertiaryButton
        >
        <TertiaryButton
          class="bg-white hover:bg-zinc-100 dark:bg-slate-800 dark:hover:bg-slate-600"
          @click.stop="showEdit = true"
          >Edit</TertiaryButton
        >
        <TertiaryButton
          class="bg-white hover:bg-zinc-100 dark:bg-slate-800 dark:hover:bg-slate-600"
          @click.stop="deleteControl()"
          >Delete</TertiaryButton
        >
      </div>
    </template>
    <div
      class="px-4 py-4 dark:bg-slate-950 border-b border-ccf-300 dark:border-slate-700"
    >
      <div class="flex items-start justify-between gap-4">
        <div>
          <TertiaryButton v-if="!statement" @click="showEditStatement = true"
            >Add Statement</TertiaryButton
          >
          <TertiaryButton
            v-if="statement"
            class="ml-2"
            @click="showEditStatement = true"
            >Edit Statement</TertiaryButton
          >
          <TertiaryButton
            v-if="!objective"
            class="ml-2"
            @click="showEditObjective = true"
            >Add Objective</TertiaryButton
          >
          <TertiaryButton
            v-if="!guidance"
            class="ml-2"
            @click="showEditGuidance = true"
            >Add Guidance</TertiaryButton
          >

          <PartDisplayEditor
            v-for="part in control.parts"
            :key="part.id"
            :part="part"
          >
            <template #header>
              <h3 class="text-lg font-medium capitalize">{{ part.name }}</h3>
            </template>
          </PartDisplayEditor>
        </div>
        <div class="rounded-md border border-ccf-300 dark:border-slate-700">
          <table class="table-auto">
            <tbody>
              <tr>
                <td colspan="2" class="px-2 py-2 font-medium">Attributes</td>
              </tr>
              <tr class="border-t border-ccf-300 dark:border-slate-700">
                <td class="px-2 py-1">ID</td>
                <td class="px-2 py-1 whitespace-nowrap">{{ control?.id }}</td>
              </tr>
              <tr class="border-t border-ccf-300 dark:border-slate-700">
                <td class="px-2 py-1">Class</td>
                <td class="px-2 py-1 whitespace-nowrap">
                  {{ control?.class }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div
        class="my-4 rounded-md bg-white dark:bg-slate-900 border-collapse border border-ccf-300 dark:border-slate-700"
      >
        <CatalogControl
          v-for="child in controls"
          :key="child.id"
          :control="child"
          :catalog="props.catalog"
          @deleted="onChildDeleted"
        />
      </div>
      <div class="mt-4">
        <!--        <TertiaryButton @click="showControlForm = true" class="ml-2"-->
        <!--          >Add Control</TertiaryButton-->
        <!--        >-->
        <ControlCreateModal
          @created="controlCreated"
          :catalog="catalog"
          :parent-control="props.control"
          v-model="showControlForm"
        />
        <ControlPartEditModal
          v-model="showEditStatement"
          :catalog="catalog"
          :control="props.control"
          type="statement"
          @updated="onUpdated"
        />
        <ControlPartEditModal
          v-model="showEditObjective"
          :catalog="catalog"
          :control="props.control"
          type="assessment-objective"
          @updated="onUpdated"
        />
        <ControlPartEditModal
          v-model="showEditGuidance"
          :catalog="catalog"
          :control="props.control"
          type="guidance"
          @updated="onUpdated"
        />
        <ControlEditModal
          v-model="showEdit"
          :catalog="catalog"
          :control="props.control"
          @updated="onUpdated"
        />
      </div>
    </div>
  </CollapsableGroup>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue';
import CollapsableGroup from '@/components/CollapsableGroup.vue';
import ResultStatusBadge from '@/components/ResultStatusBadge.vue';
import { type Catalog, type Control } from '@/oscal';
import TertiaryButton from '@/volt/TertiaryButton.vue';
import ControlCreateModal from '@/components/catalogs/ControlCreateModal.vue';
import ControlEditModal from '@/components/catalogs/ControlEditModal.vue';
import ControlPartEditModal from '@/components/catalogs/ControlPartEditModal.vue';
import type { Part } from '@/oscal';
import PartDisplayEditor from '@/components/PartDisplayEditor.vue';
import { useRouter } from 'vue-router';
import { useDataApi } from '@/composables/axios';
import type { ComplianceIntervalStatus } from '@/stores/evidence';
import { computeEvidenceStatusCounts } from '@/composables/useEvidenceStatusCounts';
import { useDeleteConfirmationDialog } from '@/utils/delete-dialog';
import { useToast } from 'primevue/usetoast';

const props = defineProps<{
  catalog: Catalog;
  control: Control;
}>();

const { data: controls } = useDataApi<Control[]>(
  `/api/oscal/catalogs/${props.catalog.uuid}/controls/${props.control.id}/controls`,
  {},
  { immediate: true },
);
const { data: compliance } = useDataApi<ComplianceIntervalStatus[] | null>(
  `/api/evidence/compliance-by-control/${props.control.id}`,
  {},
  { immediate: true, initialData: null },
);

const complianceCounts = computed(() =>
  computeEvidenceStatusCounts(compliance.value || []),
);

const objective = ref<Part | undefined>(getPart('assessment-objective'));
const statement = ref<Part | undefined>(getPart('statement'));
const guidance = ref<Part | undefined>(getPart('guidance'));

const router = useRouter();
const toast = useToast();
const { confirmDeleteDialog } = useDeleteConfirmationDialog();
const emit = defineEmits<{
  (e: 'deleted', id: string): void;
  (e: 'updated', id: string): void;
}>();
const { execute: del } = useDataApi<void>(
  '/api/oscal/catalogs',
  {},
  { immediate: false },
);

function gotoFindings() {
  router.push({
    name: 'catalog-control-evidence',
    params: { catalog: props.catalog.uuid, id: props.control.id },
  });
}

function getPart(type: string) {
  return props.control.parts?.find((part) => {
    return part.name == type;
  });
}

const showControlForm = ref<boolean>(false);
const showEdit = ref<boolean>(false);
const showEditStatement = ref<boolean>(false);
const showEditObjective = ref<boolean>(false);
const showEditGuidance = ref<boolean>(false);

function controlCreated(control: Control) {
  controls.value?.push(control);
}

async function deleteControl() {
  await confirmDeleteDialog(
    async () => {
      try {
        await del(
          `/api/oscal/catalogs/${props.catalog.uuid}/controls/${props.control.id}`,
          { method: 'DELETE' },
        );
        toast.add({
          severity: 'success',
          summary: 'Control deleted',
          detail: `Control "${props.control.id}" deleted successfully`,
          life: 3000,
        });
        emit('deleted', props.control.id);
      } catch (error) {
        toast.add({
          severity: 'error',
          summary: 'Delete Failed',
          detail:
            error instanceof Error
              ? error.message
              : 'Failed to delete control.',
          life: 3000,
        });
      }
    },
    { itemName: props.control.id, itemType: 'control' },
  );
}

function onUpdated(updated: Control) {
  emit('updated', updated.id);
}

function onChildDeleted(id: string) {
  const idx = controls.value?.findIndex((c) => c.id === id) ?? -1;
  if (idx >= 0 && controls.value) {
    controls.value.splice(idx, 1);
  }
}
</script>
