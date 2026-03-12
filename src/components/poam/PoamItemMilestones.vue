<template>
  <div class="space-y-3">
    <!-- Header row -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <h4 class="text-sm font-medium text-gray-700 dark:text-slate-400">
          Milestones
        </h4>
        <!-- Progress pill -->
        <span
          v-if="milestones.length > 0"
          class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium"
          :class="progressPillClass"
        >
          {{ progress.completed }}/{{ progress.total }} completed
        </span>
        <!-- Overdue warning -->
        <span
          v-if="progress.overdue > 0"
          class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
        >
          <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path
              fill-rule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clip-rule="evenodd"
            />
          </svg>
          {{ progress.overdue }} overdue
        </span>
      </div>
      <button
        @click="openCreateModal"
        class="inline-flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-md text-xs font-medium"
      >
        <svg
          class="w-3.5 h-3.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 4v16m8-8H4"
          />
        </svg>
        Add Milestone
      </button>
    </div>

    <!-- Progress bar -->
    <div
      v-if="milestones.length > 0"
      class="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-1.5"
    >
      <div
        class="h-1.5 rounded-full transition-all duration-300"
        :class="progress.percentage === 100 ? 'bg-green-500' : 'bg-blue-500'"
        :style="{ width: `${progress.percentage}%` }"
      />
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-sm text-gray-500 dark:text-slate-400 py-2">
      Loading milestones...
    </div>

    <!-- Empty state -->
    <div
      v-else-if="milestones.length === 0"
      class="text-sm text-gray-500 dark:text-slate-400 py-3 text-center border border-dashed border-ccf-300 dark:border-slate-600 rounded-md"
    >
      No milestones yet. Add one to track remediation progress.
    </div>

    <!-- Milestone list -->
    <div v-else class="space-y-2">
      <div
        v-for="milestone in sortedMilestones"
        :key="milestone.id"
        class="flex items-start gap-3 p-3 bg-gray-50 dark:bg-slate-800/50 rounded-md border border-ccf-200 dark:border-slate-700"
        :class="{
          'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10':
            isOverdue(milestone),
        }"
      >
        <!-- Status dot -->
        <div class="mt-1 flex-shrink-0">
          <div
            class="w-2.5 h-2.5 rounded-full"
            :class="statusDotClass(milestone.status)"
          />
        </div>

        <!-- Content -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-sm font-medium text-gray-900 dark:text-slate-200">
              {{ milestone.title }}
            </span>
            <span
              class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
              :class="statusBadgeClass(milestone.status)"
            >
              {{ statusLabel(milestone.status) }}
            </span>
            <span
              v-if="isOverdue(milestone)"
              class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
            >
              Overdue
            </span>
          </div>
          <p
            v-if="milestone.description"
            class="text-xs text-gray-600 dark:text-slate-400 mt-0.5 line-clamp-2"
          >
            {{ milestone.description }}
          </p>
          <div
            class="flex flex-wrap gap-3 mt-1.5 text-xs text-gray-500 dark:text-slate-400"
          >
            <span
              v-if="milestone.plannedCompletionDate"
              class="flex items-center gap-1"
            >
              <svg
                class="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              Due {{ formatDate(milestone.plannedCompletionDate) }}
            </span>
            <span
              v-if="milestone.responsibleParty"
              class="flex items-center gap-1"
            >
              <svg
                class="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              {{ milestone.responsibleParty }}
            </span>
            <span
              v-if="milestone.completedAt"
              class="flex items-center gap-1 text-green-600 dark:text-green-400"
            >
              <svg
                class="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Completed {{ formatDate(milestone.completedAt) }}
            </span>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-1 flex-shrink-0">
          <button
            @click="openEditModal(milestone)"
            class="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded"
            title="Edit milestone"
          >
            <svg
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </button>
          <button
            @click="confirmDelete(milestone)"
            class="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded"
            title="Delete milestone"
          >
            <svg
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Create/Edit modal -->
    <MilestoneCreateEditModal
      v-model="showModal"
      :poam-item-id="poamItemId"
      :milestone="editingMilestone"
      @saved="onMilestoneSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useToast } from 'primevue/usetoast';
import MilestoneCreateEditModal from './MilestoneCreateEditModal.vue';
import {
  useMilestonesList,
  useMilestoneCreate,
  useMilestoneUpdate,
  useMilestoneDelete,
  milestoneStatusDotClass,
  milestoneStatusLabel,
  poamStatusBadgeClass,
} from '@/composables/usePoamItems';
import {
  computeMilestoneProgress,
  type PoamItemMilestone,
  type CreateMilestoneRequest,
  type UpdateMilestoneRequest,
} from '@/types/poam-items';
import { useDeleteConfirmationDialog } from '@/utils/delete-dialog';

interface Props {
  poamItemId: string;
}

const props = defineProps<Props>();
const toast = useToast();
const { confirmDeleteDialog } = useDeleteConfirmationDialog();

const showModal = ref(false);
const editingMilestone = ref<PoamItemMilestone | null>(null);

const {
  data: milestonesData,
  isLoading: loading,
  execute: reloadMilestones,
} = useMilestonesList(props.poamItemId);

const milestones = computed<PoamItemMilestone[]>(
  () => milestonesData.value ?? [],
);

const sortedMilestones = computed(() =>
  [...milestones.value].sort((a, b) => a.orderIndex - b.orderIndex),
);

const progress = computed(() => computeMilestoneProgress(milestones.value));

const progressPillClass = computed(() => {
  if (progress.value.percentage === 100)
    return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
  if (progress.value.overdue > 0)
    return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
  return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
});

function isOverdue(m: PoamItemMilestone): boolean {
  if (m.status === 'completed' || m.status === 'cancelled') return false;
  return new Date(m.plannedCompletionDate) < new Date();
}

function statusDotClass(status: string): string {
  return milestoneStatusDotClass(status);
}

function statusBadgeClass(status: string): string {
  return poamStatusBadgeClass(status);
}

function statusLabel(status: string): string {
  return milestoneStatusLabel(status);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function openCreateModal() {
  editingMilestone.value = null;
  showModal.value = true;
}

function openEditModal(m: PoamItemMilestone) {
  editingMilestone.value = m;
  showModal.value = true;
}

const { createMilestone } = useMilestoneCreate(props.poamItemId);
const { deleteMilestone } = useMilestoneDelete();

async function onMilestoneSaved(payload: PoamItemMilestone) {
  try {
    if (editingMilestone.value) {
      const { updateMilestone } = useMilestoneUpdate(
        props.poamItemId,
        editingMilestone.value.id,
      );
      await updateMilestone(payload as UpdateMilestoneRequest);
      toast.add({
        severity: 'success',
        summary: 'Milestone updated',
        life: 3000,
      });
    } else {
      await createMilestone(payload as CreateMilestoneRequest);
      toast.add({
        severity: 'success',
        summary: 'Milestone added',
        life: 3000,
      });
    }
    await reloadMilestones();
  } catch {
    toast.add({
      severity: 'error',
      summary: 'Failed to save milestone',
      life: 4000,
    });
  }
}

function confirmDelete(m: PoamItemMilestone) {
  confirmDeleteDialog(
    async () => {
      await deleteMilestone(props.poamItemId, m.id);
      await reloadMilestones();
      toast.add({
        severity: 'success',
        summary: 'Milestone deleted',
        life: 3000,
      });
    },
    { itemType: 'milestone' },
  );
}

onMounted(() => {
  reloadMilestones();
});
</script>
