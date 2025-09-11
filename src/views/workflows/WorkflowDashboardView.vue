<template>
  <div class="mb-6">
    <PageHeader>Workflow Dashboard</PageHeader>
    <PageSubHeader>Overview of tasks and timing for the selected assessment plan</PageSubHeader>
  </div>

  <Message v-if="!systemStore.system.assessmentPlan" severity="error" variant="outlined">
    <h4 class="font-bold">Assessment Plan not selected</h4>
    <p>You have not selected an assessment plan.</p>
    <p>
      Please go to
      <RouterLink :to="{ name: 'assessment-plans' }" class="underline">Assessment Plans</RouterLink>
      to select one.
    </p>
  </Message>

  <div v-else class="space-y-6">
    <!-- Summary cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      <div class="rounded-lg border border-ccf-300 dark:border-slate-700 p-4 bg-white dark:bg-slate-900">
        <div class="text-sm text-slate-500 dark:text-slate-400">Total Tasks</div>
        <div class="text-3xl font-semibold">{{ totalTasks }}</div>
      </div>

      <div class="rounded-lg border border-ccf-300 dark:border-slate-700 p-4 bg-white dark:bg-slate-900">
        <div class="text-sm text-slate-500 dark:text-slate-400">Tasks With Timing</div>
        <div class="text-3xl font-semibold">{{ tasksWithTiming }}</div>
      </div>

      <div class="rounded-lg border border-ccf-300 dark:border-slate-700 p-4 bg-white dark:bg-slate-900">
        <div class="text-sm text-slate-500 dark:text-slate-400">Tasks With Dependencies</div>
        <div class="text-3xl font-semibold">{{ tasksWithDependencies }}</div>
      </div>

      <div class="rounded-lg border border-ccf-300 dark:border-slate-700 p-4 bg-white dark:bg-slate-900">
        <div class="text-sm text-slate-500 dark:text-slate-400">Associated Activities</div>
        <div class="text-3xl font-semibold">{{ totalAssociatedActivities }}</div>
      </div>
    </div>

    <!-- Upcoming tasks -->
    <div class="rounded-lg border border-ccf-300 dark:border-slate-700 p-0 bg-white dark:bg-slate-900 overflow-hidden">
      <div class="border-b border-ccf-300 dark:border-slate-700 p-4 text-sm font-semibold">Upcoming Tasks (next 14 days)</div>
      <div v-if="upcomingTasks.length" class="divide-y divide-ccf-300 dark:divide-slate-700">
        <div
          v-for="task in upcomingTasks"
          :key="task.uuid"
          class="p-4 flex items-center justify-between gap-4"
        >
          <div class="min-w-0">
            <div class="font-medium truncate">{{ task.title }}</div>
            <div class="text-xs text-slate-500 dark:text-slate-400 truncate">{{ task.description }}</div>
          </div>
          <div class="text-right">
            <div class="text-sm">
              {{ formatDate(task.timing?.onDate || task.timing?.withinDateRange?.start) }}
            </div>
            <div class="text-xs text-slate-500 dark:text-slate-400">
              {{ task.type }}
            </div>
          </div>
        </div>
      </div>
      <div v-else class="p-6 text-center text-slate-500 dark:text-slate-400 text-sm">
        No upcoming tasks.
      </div>
    </div>

    <!-- Quick links -->
    <div class="flex flex-wrap gap-3">
      <RouterLink :to="{ name: 'workflow:index' }" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md">Manage Workflows</RouterLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useSystemStore } from '@/stores/system';
import { useDataApi } from '@/composables/axios';
import type { Task } from '@/stores/assessment-plans';
import PageHeader from '@/components/PageHeader.vue';
import PageSubHeader from '@/components/PageSubHeader.vue';
import Message from '@/volt/Message.vue';

const systemStore = useSystemStore();

const { data: tasks } = useDataApi<Task[]>(
  systemStore.system.assessmentPlan
    ? `/api/oscal/assessment-plans/${systemStore.system.assessmentPlan.uuid}/tasks`
    : null,
);

const totalTasks = computed(() => tasks.value?.length ?? 0);

const tasksWithTiming = computed(() =>
  (tasks.value ?? []).filter((t) => !!t.timing && (t.timing.onDate || t.timing.withinDateRange)).length,
);

const tasksWithDependencies = computed(() =>
  (tasks.value ?? []).filter((t) => (t.dependencies?.length ?? 0) > 0).length,
);

const totalAssociatedActivities = computed(() =>
  (tasks.value ?? []).reduce((sum, t) => sum + (t.associatedActivities?.length ?? 0), 0),
);

function withinNextDays(dateStr?: string, days = 14): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  const limit = new Date();
  limit.setDate(now.getDate() + days);
  return d >= now && d <= limit;
}

const upcomingTasks = computed(() => {
  const list = (tasks.value ?? []).filter((t) => {
    const on = t.timing?.onDate;
    const start = t.timing?.withinDateRange?.start;
    return withinNextDays(on) || withinNextDays(start);
  });

  return list.sort((a, b) => {
    const aDate = a.timing?.onDate || a.timing?.withinDateRange?.start || '';
    const bDate = b.timing?.onDate || b.timing?.withinDateRange?.start || '';
    return aDate.localeCompare(bDate);
  });
});

function formatDate(dateStr?: string) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleString();
  } catch {
    return dateStr;
  }
}
</script>

<style scoped>
@reference "@/assets/main.css";
</style>

