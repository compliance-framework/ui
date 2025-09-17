<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <h3 class="text-lg font-medium text-gray-900 dark:text-slate-200">
        Mitigating Factors
      </h3>
      <button
        class="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-md text-sm"
        @click="startCreate"
        :disabled="saving"
      >
        Add Mitigating Factor
      </button>
    </div>

    <div
      v-if="!risk?.mitigatingFactors?.length"
      class="text-sm text-gray-600 dark:text-slate-400"
    >
      No mitigating factors recorded for this risk.
    </div>

    <div v-else class="space-y-4">
      <div
        v-for="(factor, index) in risk.mitigatingFactors"
        :key="factor.uuid || index"
        class="border border-ccf-300 dark:border-slate-700 rounded-lg p-4 space-y-3"
      >
        <div class="flex justify-between items-start">
          <div class="space-y-2">
            <h4 class="text-sm font-semibold text-gray-800 dark:text-slate-200">
              {{ factor.description }}
            </h4>
            <div
              v-if="factor.implementationUuid"
              class="text-xs text-gray-500 dark:text-slate-400"
            >
              Implementation UUID: {{ factor.implementationUuid }}
            </div>
            <div
              v-if="factor.subjects?.length"
              class="text-xs text-gray-500 dark:text-slate-400"
            >
              Subjects:
              <span>
                {{
                  factor.subjects
                    .map((subject) => `${subject.type}: ${subject.subjectUuid}`)
                    .join(', ')
                }}
              </span>
            </div>
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
              @click="removeFactor(index)"
              :disabled="saving"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>

    <Dialog v-model:visible="showEditor" modal :header="editorTitle" size="lg">
      <div class="space-y-4">
        <div>
          <label
            class="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1"
          >
            Description
          </label>
          <textarea
            v-model="working.description"
            rows="3"
            class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:text-slate-200"
          ></textarea>
        </div>

        <div>
          <label
            class="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1"
          >
            Implementation UUID (optional)
          </label>
          <input
            v-model="working.implementationUuid"
            type="text"
            class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:text-slate-200"
          />
        </div>

        <div class="space-y-3">
          <div class="flex justify-between items-center">
            <h5 class="text-sm font-semibold text-gray-700 dark:text-slate-200">
              Subjects (optional)
            </h5>
            <button
              class="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-xs"
              type="button"
              @click="addSubject"
            >
              + Add Subject
            </button>
          </div>

          <div
            v-for="(subject, index) in working.subjects"
            :key="index"
            class="border border-ccf-300 dark:border-slate-600 rounded-md p-3 space-y-3"
          >
            <div>
              <label
                class="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1"
              >
                Subject UUID
              </label>
              <input
                v-model="subject.subjectUuid"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:text-slate-200"
              />
            </div>
            <div>
              <label
                class="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1"
              >
                Subject Type
              </label>
              <input
                v-model="subject.type"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:text-slate-200"
                placeholder="e.g. component"
              />
            </div>
            <div class="text-right">
              <button
                type="button"
                class="text-red-600 hover:text-red-700 text-xs"
                @click="removeSubject(index)"
              >
                Remove
              </button>
            </div>
          </div>

          <p
            v-if="!working.subjects.length"
            class="text-xs text-gray-500 dark:text-slate-400"
          >
            No subjects added.
          </p>
        </div>

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
            @click="saveFactor"
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
import { computed, reactive, ref } from 'vue';
import Dialog from '@/volt/Dialog.vue';
import { useToast } from 'primevue/usetoast';
import type { Risk } from '@/stores/plan-of-action-and-milestones';
import type { MitigatingFactor, SubjectReference } from '@/oscal/assessment';
import { cloneDeep } from '@/utils/clone-deep';

const DEFAULT_SUBJECT_TYPE = 'subject';

const props = defineProps<{
  risk: Risk | null;
  saving: boolean;
}>();

const emit = defineEmits<{
  save: [factors: MitigatingFactor[]];
}>();

type EditableSubject = Pick<SubjectReference, 'subjectUuid' | 'type'>;

interface EditableMitigatingFactor {
  uuid?: string;
  description: string;
  implementationUuid?: string;
  subjects: EditableSubject[];
}

const toast = useToast();

const showEditor = ref(false);
const editingIndex = ref<number | null>(null);
const working = reactive<EditableMitigatingFactor>({
  description: '',
  implementationUuid: '',
  subjects: [],
});

const editorTitle = computed(() =>
  editingIndex.value === null
    ? 'Add Mitigating Factor'
    : 'Edit Mitigating Factor',
);

function resetWorking() {
  working.uuid = undefined;
  working.description = '';
  working.implementationUuid = '';
  working.subjects = [];
}

function startCreate() {
  resetWorking();
  editingIndex.value = null;
  showEditor.value = true;
}

function startEdit(index: number) {
  if (!props.risk?.mitigatingFactors?.[index]) return;
  const factor = props.risk.mitigatingFactors[index];
  editingIndex.value = index;
  working.uuid = factor.uuid;
  working.description = factor.description;
  working.implementationUuid = factor.implementationUuid ?? '';
  working.subjects = factor.subjects
    ? factor.subjects.map((subject) => ({
        subjectUuid: subject.subjectUuid,
        type: subject.type,
      }))
    : [];
  showEditor.value = true;
}

function closeEditor() {
  showEditor.value = false;
  resetWorking();
}

function addSubject() {
  working.subjects.push({ subjectUuid: '', type: '' });
}

function removeSubject(index: number) {
  working.subjects.splice(index, 1);
}

function sanitizeSubjects(
  subjects: EditableSubject[],
): SubjectReference[] | undefined {
  const sanitized = subjects
    .map((subject) => ({
      subjectUuid: subject.subjectUuid.trim(),
      type: subject.type.trim() || DEFAULT_SUBJECT_TYPE,
    }))
    .filter((subject) => subject.subjectUuid);
  return sanitized.length ? sanitized : undefined;
}

function saveFactor() {
  if (!props.risk) return;
  if (!working.description.trim()) {
    toast.add({
      severity: 'error',
      summary: 'Validation Error',
      detail: 'Description is required.',
      life: 3000,
    });
    return;
  }

  const current = props.risk.mitigatingFactors
    ? props.risk.mitigatingFactors.map((factor) => cloneDeep(factor))
    : [];

  const baseFactor: MitigatingFactor =
    editingIndex.value !== null && current[editingIndex.value]
      ? current[editingIndex.value]
      : {
          uuid: crypto.randomUUID(),
          description: '',
        };

  baseFactor.description = working.description.trim();
  baseFactor.implementationUuid =
    working.implementationUuid?.trim() || undefined;
  baseFactor.subjects = sanitizeSubjects(working.subjects);

  if (editingIndex.value === null) {
    current.push(baseFactor);
  } else {
    current.splice(editingIndex.value, 1, baseFactor);
  }

  emit('save', current);
  showEditor.value = false;
  resetWorking();
}

function removeFactor(index: number) {
  if (!props.risk?.mitigatingFactors) return;
  const next = props.risk.mitigatingFactors.map((factor) => cloneDeep(factor));
  next.splice(index, 1);
  emit('save', next);
}
</script>
