<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <h3 class="text-lg font-medium text-gray-900 dark:text-slate-200">
        Characterizations
      </h3>
      <button
        class="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-md text-sm"
        @click="startCreate"
        :disabled="saving"
      >
        Add Characterization
      </button>
    </div>

    <div
      v-if="!risk?.characterizations?.length"
      class="text-sm text-gray-600 dark:text-slate-400"
    >
      No characterizations have been recorded for this risk.
    </div>

    <div v-else class="space-y-4">
      <div
        v-for="(characterization, index) in risk.characterizations"
        :key="index"
        class="border border-ccf-300 dark:border-slate-700 rounded-lg p-4"
      >
        <div class="flex justify-between items-start mb-3">
          <div>
            <h4 class="font-medium text-gray-800 dark:text-slate-200">
              Characterization {{ index + 1 }}
            </h4>
            <p
              v-if="characterization.origin?.actors?.length"
              class="text-xs text-gray-500 dark:text-slate-400 mt-1"
            >
              Origin actors: {{ characterization.origin.actors.length }}
            </p>
          </div>
          <div class="flex gap-2">
            <button
              class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-xs"
              @click="startEdit(index)"
              :disabled="saving"
            >
              Edit
            </button>
            <button
              class="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-xs"
              @click="removeCharacterization(index)"
              :disabled="saving"
            >
              Delete
            </button>
          </div>
        </div>

        <div class="space-y-2">
          <div
            v-for="(facet, facetIndex) in characterization.facets"
            :key="facetIndex"
            class="bg-slate-50 dark:bg-slate-800 rounded-md px-3 py-2"
          >
            <div
              class="flex flex-wrap items-center gap-2 text-sm text-gray-700 dark:text-slate-300"
            >
              <span class="font-semibold">{{ facet.name }}</span>
              <span class="text-xs text-gray-500 dark:text-slate-400"
                >({{ facet.system }})</span
              >
            </div>
            <div class="text-sm text-gray-700 dark:text-slate-200 mt-1">
              {{ facet.value }}
            </div>
            <div
              v-if="facet.remarks"
              class="text-xs text-gray-500 dark:text-slate-400 mt-1"
            >
              {{ facet.remarks }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <Dialog v-model:visible="showEditor" modal :header="editorTitle" size="lg">
      <div class="space-y-4">
        <div class="space-y-4">
          <div
            v-for="(facet, index) in workingFacets"
            :key="index"
            class="border border-ccf-300 dark:border-slate-600 rounded-md p-4 space-y-3"
          >
            <div class="flex justify-between items-center">
              <h5
                class="text-sm font-semibold text-gray-700 dark:text-slate-200"
              >
                Facet {{ index + 1 }}
              </h5>
              <button
                v-if="workingFacets.length > 1"
                class="text-red-600 hover:text-red-700 text-xs"
                type="button"
                @click="removeFacet(index)"
              >
                Remove
              </button>
            </div>

            <div class="space-y-3">
              <div>
                <label
                  class="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1"
                >
                  Name
                </label>
                <input
                  v-model="facet.name"
                  type="text"
                  class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:text-slate-200"
                  placeholder="e.g. Likelihood"
                />
              </div>

              <div>
                <label
                  class="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1"
                >
                  System (optional)
                </label>
                <input
                  v-model="facet.system"
                  type="text"
                  class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:text-slate-200"
                  placeholder="e.g. custom"
                />
              </div>

              <div>
                <label
                  class="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1"
                >
                  Value
                </label>
                <input
                  v-model="facet.value"
                  type="text"
                  class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:text-slate-200"
                  placeholder="e.g. Medium"
                />
              </div>

              <div>
                <label
                  class="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1"
                >
                  Remarks (optional)
                </label>
                <textarea
                  v-model="facet.remarks"
                  rows="2"
                  class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:text-slate-200"
                ></textarea>
              </div>
            </div>
          </div>
        </div>

        <button
          type="button"
          class="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
          @click="addFacet"
        >
          + Add Facet
        </button>

        <div class="flex justify-end gap-3 pt-4">
          <button
            type="button"
            class="px-3 py-2 text-gray-700 dark:text-slate-300 bg-gray-200 dark:bg-slate-700 rounded-md hover:bg-gray-300 dark:hover:bg-slate-600 text-sm"
            @click="closeEditor"
            :disabled="saving"
          >
            Cancel
          </button>
          <button
            type="button"
            class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
            @click="saveCharacterization"
            :disabled="saving"
          >
            {{ saving ? 'Saving...' : 'Save' }}
          </button>
        </div>
      </div>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import Dialog from '@/volt/Dialog.vue';
import { useToast } from 'primevue/usetoast';
import type { Risk } from '@/stores/plan-of-action-and-milestones';
import type { Characterization, Facet } from '@/oscal/assessment';

const props = defineProps<{
  risk: Risk | null;
  saving: boolean;
}>();

const emit = defineEmits<{
  save: [characterizations: Characterization[]];
}>();

interface EditableFacet extends Pick<Facet, 'name' | 'value' | 'remarks'> {
  system?: string;
}

const toast = useToast();

const showEditor = ref(false);
const editingIndex = ref<number | null>(null);
const workingFacets = ref<EditableFacet[]>([]);

const editorTitle = computed(() =>
  editingIndex.value === null
    ? 'Add Characterization'
    : 'Edit Characterization',
);

function cloneDeep<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function startCreate() {
  editingIndex.value = null;
  workingFacets.value = [
    {
      name: '',
      value: '',
      system: '',
      remarks: '',
    },
  ];
  showEditor.value = true;
}

function startEdit(index: number) {
  if (!props.risk?.characterizations?.[index]) return;
  editingIndex.value = index;
  workingFacets.value = props.risk.characterizations[index].facets.map(
    (facet) => ({
      name: facet.name,
      value: facet.value,
      system: facet.system,
      remarks: facet.remarks,
    }),
  );
  showEditor.value = true;
}

function closeEditor() {
  showEditor.value = false;
}

function addFacet() {
  workingFacets.value.push({ name: '', value: '', system: '', remarks: '' });
}

function removeFacet(index: number) {
  if (workingFacets.value.length <= 1) return;
  workingFacets.value.splice(index, 1);
}

function sanitizeFacets(facets: EditableFacet[]): Facet[] {
  return facets.map((facet) => ({
    name: facet.name.trim(),
    system: facet.system?.trim() || 'custom',
    value: facet.value.trim(),
    remarks: facet.remarks?.trim() || undefined,
  }));
}

function saveCharacterization() {
  if (!props.risk) return;
  if (!workingFacets.value.length) {
    toast.add({
      severity: 'error',
      summary: 'Validation Error',
      detail: 'Add at least one facet.',
      life: 3000,
    });
    return;
  }

  if (
    workingFacets.value.some(
      (facet) => !facet.name.trim() || !facet.value.trim(),
    )
  ) {
    toast.add({
      severity: 'error',
      summary: 'Validation Error',
      detail: 'Facet name and value are required.',
      life: 3000,
    });
    return;
  }

  const sanitizedFacets = sanitizeFacets(workingFacets.value);

  const current = props.risk.characterizations
    ? props.risk.characterizations.map((item) => cloneDeep(item))
    : [];

  if (editingIndex.value === null) {
    const originSource = props.risk.origins?.[0];
    current.push({
      origin: originSource ? cloneDeep(originSource) : { actors: [] },
      facets: sanitizedFacets,
    });
  } else {
    const existing = current[editingIndex.value];
    if (!existing) return;
    existing.facets = sanitizedFacets;
  }

  emit('save', current);
  showEditor.value = false;
}

function removeCharacterization(index: number) {
  if (!props.risk?.characterizations) return;
  const next = props.risk.characterizations.map((item) => cloneDeep(item));
  next.splice(index, 1);
  emit('save', next);
}
</script>
