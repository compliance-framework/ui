<script setup lang="ts">
/**
 * An assessment plan's Tasks tab: Add task, then each task's details. Each task's detail editor
 * and the new-task dialog are classic islands. The script is the classic page's.
 */
import { computed, onActivated, ref } from 'vue';
import type { AssessmentPlan, Task } from '@/oscal';
import { useRoute } from 'vue-router';
import TaskCreateModal from '@/components/assessment-plans/TaskCreateModal.vue';
import TaskDetail from '@/views/assessment-plans/partials/TaskDetail.vue';
import { useDataApi } from '@/composables/axios';
import { usePermissions } from '@/composables/usePermissions';
import { RESOURCES, ACTIONS } from '@/constants/permissions';
import LegacyPage from '@/views/layouts/LegacyPage.vue';
import Button from '@/ds/components/Button/Button.vue';
import Text from '@/ds/components/Text/Text.vue';
import Stack from '@/ds/components/layout/Stack.vue';

const route = useRoute();

const { can } = usePermissions();
const createDenied = computed(() =>
  can(RESOURCES.ASSESSMENT_PLAN, ACTIONS.CREATE)
    ? undefined
    : "Your access doesn't include changing assessment plans.",
);

const showCreateModal = ref(false);

const { data: assessmentPlan, execute: refreshAssessmentPlan } =
  useDataApi<AssessmentPlan>(
    `/api/oscal/assessment-plans/${route.params.id}`,
    null,
    { immediate: false },
  );
const { data: tasks, execute: refreshTasks } = useDataApi<Task[]>(
  `/api/oscal/assessment-plans/${route.params.id}/tasks`,
  null,
  { immediate: false },
);

async function taskUpdated(task: Task) {
  if (!tasks.value) return;
  tasks.value = tasks.value.map((value) =>
    value.uuid == task.uuid ? task : value,
  );
}

async function taskDeleted(task: Task) {
  if (!tasks.value) return;
  tasks.value = tasks.value.filter((value) => value.uuid != task.uuid);
}

async function taskCreated(task: Task) {
  if (!tasks.value) return;
  tasks.value.push(task);
}

onActivated(async () => {
  await refreshAssessmentPlan();
  await refreshTasks();
});
</script>

<template>
  <Stack v-if="tasks && assessmentPlan" gap="5">
    <div>
      <Button
        icon="add"
        :disabled-reason="createDenied"
        @click="showCreateModal = true"
        >Add task</Button
      >
    </div>
    <LegacyPage v-if="tasks.length">
      <Stack gap="6">
        <TaskDetail
          v-for="(task, index) in tasks"
          :key="task.uuid || index"
          :task="task"
          :assessment-plan="assessmentPlan"
          @updated="taskUpdated"
          @deleted="taskDeleted"
        />
      </Stack>
    </LegacyPage>
    <Text v-else
      >No tasks yet. A task is an assessment activity, such as a scan or an
      interview, with its schedule and subjects.</Text
    >
    <TaskCreateModal
      v-model="showCreateModal"
      :assessment-plan-id="route.params.id as string"
      @created="taskCreated"
    />
  </Stack>
</template>
