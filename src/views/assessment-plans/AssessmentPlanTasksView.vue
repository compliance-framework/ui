<template>
  <div
    class="my-4 rounded-md bg-white dark:bg-slate-900 border-collapse border border-ccf-300 dark:border-slate-700 p-6"
  >
    <div class="flex justify-between items-center mb-6">
      <h3 class="text-lg font-semibold dark:text-slate-300">
        Assessment Tasks
      </h3>
      <button
        @click="showCreateModal = true"
        class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
      >
        Add Task
      </button>
    </div>

    <div v-if="tasks.length > 0">
      <div class="space-y-8" v-if="assessmentPlan">
        <div v-for="(task, index) in tasks" :key="task.uuid || index">
          <TaskDetail
            @updated="taskUpdated"
            @deleted="taskDeleted"
            :task="task"
            :assessment-plan="assessmentPlan"
          />
        </div>
      </div>
    </div>

    <div v-else class="text-center py-8">
      <p class="text-gray-500 dark:text-slate-400">No tasks defined yet.</p>
      <p class="text-sm text-gray-400 dark:text-slate-500 mt-2">
        Click "Add Task" to create your first assessment task.
      </p>
    </div>

    <!-- Task Create Modal -->
    <TaskCreateModal
      v-model="showCreateModal"
      :assessment-plan-id="route.params.id as string"
      @created="taskCreated"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import {
  type AssessmentPlan,
  type Task,
  useAssessmentPlanStore,
} from '@/stores/assessment-plans.ts';
import { useRoute } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import TaskCreateModal from '@/components/assessment-plans/TaskCreateModal.vue';
import TaskDetail from '@/views/assessment-plans/partials/TaskDetail.vue';

const assessmentPlanStore = useAssessmentPlanStore();
const route = useRoute();
const toast = useToast();

const tasks = ref<Task[]>([]);
const showCreateModal = ref(false);

const assessmentPlan = ref<AssessmentPlan>();

async function taskUpdated(task: Task) {
  tasks.value = tasks.value.map((value) =>
    value.uuid == task.uuid ? task : value,
  );
}

async function taskDeleted(task: Task) {
  tasks.value = tasks.value.filter((value) => value.uuid != task.uuid);
}

async function taskCreated(task: Task) {
  tasks.value.push(task);
}

async function loadTasks() {
  const id = route.params.id as string;
  try {
    const response = await assessmentPlanStore.getTasks(id);
    tasks.value = response.data || [];
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error loading tasks',
      detail: 'Failed to load assessment plan tasks. Please try again.',
      life: 3000,
    });
  }
}

onMounted(async () => {
  assessmentPlanStore.get(route.params.id as string).then((res) => {
    assessmentPlan.value = res.data;
  });
  await loadTasks();
});
</script>
