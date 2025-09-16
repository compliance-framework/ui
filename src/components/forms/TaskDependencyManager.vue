<template>
  <div class="mb-6">
    <label class="inline-block pb-2 dark:text-slate-300"
      >Task Dependencies</label
    >
    <div class="space-y-3">
      <div
        v-for="(dependency, index) in dependencies"
        :key="index"
        class="p-3 border border-ccf-300 dark:border-slate-700 rounded-md bg-gray-50 dark:bg-slate-800"
      >
        <div class="flex justify-between items-start mb-2">
          <h4 class="text-sm font-medium dark:text-slate-300">
            Dependency {{ index + 1 }}
          </h4>
          <button
            type="button"
            @click="removeDependency(index)"
            class="text-red-500 hover:text-red-700"
          >
            Remove
          </button>
        </div>

        <div class="space-y-3">
          <div>
            <label class="inline-block pb-1 text-sm dark:text-slate-300"
              >Select Task</label
            >

            <!-- Search Input -->
            <div class="relative mb-2">
              <FormInput
                v-model="searchTerms[index]"
                placeholder="Search tasks by title or description..."
                @input="filterTasks"
                @keydown.enter.prevent
              />
            </div>

            <!-- Task Selection Dropdown -->
            <div class="relative">
              <select
                :value="dependency.taskUuid"
                @change="
                  updateTaskSelection(
                    index,
                    ($event.target as HTMLSelectElement).value,
                  )
                "
                class="w-full px-3 py-2 border border-ccf-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a task...</option>
                <option
                  v-for="task in getFilteredTasks(index)"
                  :key="task.uuid"
                  :value="task.uuid"
                >
                  {{ task.title }}
                </option>
              </select>
            </div>

            <!-- Selected Task Info -->
            <div
              v-if="dependency.taskUuid && getSelectedTask(dependency.taskUuid)"
              class="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded border"
            >
              <div class="text-sm font-medium dark:text-slate-300">
                {{ getSelectedTask(dependency.taskUuid)?.title }}
              </div>
              <div
                v-if="getSelectedTask(dependency.taskUuid)?.description"
                class="text-sm text-gray-600 dark:text-slate-400 mt-1"
              >
                {{ getSelectedTask(dependency.taskUuid)?.description }}
              </div>
            </div>
          </div>

          <div>
            <label class="inline-block pb-1 text-sm dark:text-slate-300"
              >Remarks</label
            >
            <FormTextarea
              v-model="dependency.remarks"
              placeholder="Optional notes about this dependency"
              rows="2"
            />
          </div>
        </div>
      </div>

      <button
        type="button"
        @click="addDependency"
        class="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
      >
        Add Task Dependency
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue';
import FormInput from '@/components/forms/FormInput.vue';
import FormTextarea from '@/components/forms/FormTextarea.vue';
import type { TaskDependency, Task } from '@/oscal';
import { useAssessmentPlanStore } from '@/stores/assessment-plans.ts';

const props = defineProps<{
  modelValue: TaskDependency[];
  assessmentPlanId: string;
  currentTaskUuid?: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: TaskDependency[]];
}>();

const assessmentPlanStore = useAssessmentPlanStore();

// Reactive data
const availableTasks = ref<Task[]>([]);
const searchTerms = ref<string[]>([]);
const loading = ref(false);
const error = ref('');

const dependencies = computed({
  get: () => props.modelValue || [],
  set: (value: TaskDependency[]) => emit('update:modelValue', value),
});

// Initialize search terms array when dependencies change
watch(
  () => dependencies.value.length,
  (newLength) => {
    while (searchTerms.value.length < newLength) {
      searchTerms.value.push('');
    }
    if (searchTerms.value.length > newLength) {
      searchTerms.value.splice(newLength);
    }
  },
  { immediate: true },
);

// Fetch available tasks
const fetchTasks = async () => {
  if (!props.assessmentPlanId) return;

  loading.value = true;
  error.value = '';

  try {
    console.log(
      'TaskDependencyManager: Fetching tasks for assessment plan:',
      props.assessmentPlanId,
    );
    const response = await assessmentPlanStore.getTasks(props.assessmentPlanId);
    console.log('TaskDependencyManager: getTasks response:', response);
    availableTasks.value = response.data || [];
    console.log(
      'TaskDependencyManager: Available tasks set to:',
      availableTasks.value,
    );
  } catch (err) {
    console.error('TaskDependencyManager: Error fetching tasks:', err);
    error.value = 'Failed to load tasks';

    // Fallback: try getting tasks from the full assessment plan
    try {
      console.log('TaskDependencyManager: Trying fallback method with get()');
      const fallbackResponse = await assessmentPlanStore.get(
        props.assessmentPlanId,
      );
      console.log(
        'TaskDependencyManager: Fallback response:',
        fallbackResponse,
      );
      availableTasks.value = fallbackResponse.data?.tasks || [];
      console.log(
        'TaskDependencyManager: Fallback tasks set to:',
        availableTasks.value,
      );
      error.value = ''; // Clear error if fallback works
    } catch (fallbackErr) {
      console.error(
        'TaskDependencyManager: Fallback also failed:',
        fallbackErr,
      );
    }
  } finally {
    loading.value = false;
  }
};

// Filter tasks based on search term and exclude current task
const getFilteredTasks = (index: number): Task[] => {
  const searchTerm = searchTerms.value[index]?.toLowerCase() || '';

  // First filter out the current task being edited
  let filteredTasks = availableTasks.value.filter(
    (task) => task.uuid !== props.currentTaskUuid,
  );

  // Then apply search filter if there's a search term
  if (searchTerm) {
    filteredTasks = filteredTasks.filter(
      (task) =>
        task.title.toLowerCase().includes(searchTerm) ||
        (task.description &&
          task.description.toLowerCase().includes(searchTerm)),
    );
  }

  return filteredTasks;
};

// Get selected task details
const getSelectedTask = (taskUuid: string): Task | undefined => {
  return availableTasks.value.find((task) => task.uuid === taskUuid);
};

// Update task selection
const updateTaskSelection = (index: number, taskUuid: string) => {
  const newDependencies = [...dependencies.value];
  newDependencies[index] = {
    ...newDependencies[index],
    taskUuid,
  };
  dependencies.value = newDependencies;
};

// Filter tasks (called on search input)
const filterTasks = () => {
  // This function is called on input, filtering happens reactively in getFilteredTasks
};

const addDependency = () => {
  const newDependencies = [...dependencies.value];
  newDependencies.push({
    taskUuid: '',
    remarks: '',
  });
  dependencies.value = newDependencies;
  searchTerms.value.push('');
};

const removeDependency = (index: number) => {
  const newDependencies = [...dependencies.value];
  newDependencies.splice(index, 1);
  dependencies.value = newDependencies;
  searchTerms.value.splice(index, 1);
};

// Load tasks when component mounts or assessmentPlanId changes
onMounted(fetchTasks);
watch(() => props.assessmentPlanId, fetchTasks);
</script>
