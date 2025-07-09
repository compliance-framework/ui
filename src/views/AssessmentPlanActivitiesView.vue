<template>
  <div class="my-4 rounded-md bg-white dark:bg-slate-900 border-collapse border border-ccf-300 dark:border-slate-700 p-6">
    <div class="flex justify-between items-center mb-6">
      <h3 class="text-lg font-semibold dark:text-slate-300">Assessment Activities</h3>
      <button
        @click="showCreateModal = true"
        class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
      >
        Add Activity
      </button>
    </div>

    <div v-if="activities.length > 0">
      <div class="space-y-4">
        <div
          v-for="(activity, index) in activities"
          :key="activity.uuid || index"
          class="border border-ccf-300 dark:border-slate-700 rounded-lg p-4"
        >
          <div class="flex justify-between items-start mb-2">
            <h4 class="font-medium text-gray-900 dark:text-slate-300">{{ activity.title || 'Untitled Activity' }}</h4>
            <div class="flex gap-2">
              <button
                @click="editActivity(activity)"
                class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Edit
              </button>
              <button
                @click="removeActivity(index)"
                class="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
              >
                Remove
              </button>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div v-if="activity.uuid">
              <span class="font-medium text-gray-700 dark:text-slate-400">UUID:</span>
              <span class="ml-2 text-gray-600 dark:text-slate-400 font-mono text-xs">{{ activity.uuid }}</span>
            </div>
            <div v-if="activity.responsibleRoles && activity.responsibleRoles.length > 0">
              <span class="font-medium text-gray-700 dark:text-slate-400">Responsible Roles:</span>
              <span class="ml-2 text-gray-900 dark:text-slate-300">{{ activity.responsibleRoles.length }} role(s)</span>
            </div>
          </div>

          <div v-if="activity.description" class="mt-2">
            <span class="font-medium text-gray-700 dark:text-slate-400">Description:</span>
            <p class="mt-1 text-gray-900 dark:text-slate-300">{{ activity.description }}</p>
          </div>

          <div v-if="activity.remarks" class="mt-2">
            <span class="font-medium text-gray-700 dark:text-slate-400">Remarks:</span>
            <p class="mt-1 text-gray-900 dark:text-slate-300">{{ activity.remarks }}</p>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="text-center py-8">
      <p class="text-gray-500 dark:text-slate-400">No activities defined yet.</p>
      <p class="text-sm text-gray-400 dark:text-slate-500 mt-2">Click "Add Activity" to create your first assessment activity.</p>
    </div>

    <!-- Activity Create Modal -->
    <ActivityCreateModal
      v-model="showCreateModal"
      :assessment-plan-id="route.params.id as string"
      @created="onActivityCreated"
    />

    <!-- Activity Edit Modal -->
    <ActivityEditModal
      v-model="showEditModal"
      :assessment-plan-id="route.params.id as string"
      :activity="editingActivity"
      @updated="onActivityUpdated"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { type Activity, useAssessmentPlanStore } from '@/stores/assessment-plans.ts'
import { useRoute } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import ActivityCreateModal from '@/components/assessment-plans/ActivityCreateModal.vue'
import ActivityEditModal from '@/components/assessment-plans/ActivityEditModal.vue'

const assessmentPlanStore = useAssessmentPlanStore()
const route = useRoute()
const toast = useToast()

const activities = ref<Activity[]>([])
const showCreateModal = ref(false)
const showEditModal = ref(false)
const editingActivity = ref<Activity>({} as Activity)

function editActivity(activity: Activity) {
  editingActivity.value = { ...activity }
  showEditModal.value = true
}

async function onActivityCreated(activity: Activity) {
  // Refresh the activities list from the backend
  await loadActivities()
}

async function onActivityUpdated(activity: Activity) {
  // Refresh the activities list from the backend
  await loadActivities()
}

async function removeActivity(index: number) {
  if (confirm('Are you sure you want to remove this activity?')) {
    try {
      const activityToDelete = activities.value[index]
      const id = route.params.id as string

      // Delete from backend first
      await assessmentPlanStore.deleteActivity(id, activityToDelete.uuid)

      // Remove from local array only after successful backend deletion
      activities.value.splice(index, 1)

      toast.add({
        severity: 'success',
        summary: 'Activity Removed',
        detail: 'Activity has been removed successfully',
        life: 3000
      })
    } catch (error) {
      toast.add({
        severity: 'error',
        summary: 'Error removing activity',
        detail: 'Failed to remove activity. Please try again.',
        life: 3000
      })
    }
  }
}

async function loadActivities() {
  const id = route.params.id as string
  try {
    const response = await assessmentPlanStore.getActivities(id)
    activities.value = response.data || []
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error loading activities',
      detail: 'Failed to load assessment plan activities. Please try again.',
      life: 3000
    })
  }
}

onMounted(async () => {
  await loadActivities()
})
</script>
