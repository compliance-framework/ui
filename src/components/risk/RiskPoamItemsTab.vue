<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h3 class="text-sm font-semibold text-gray-800 dark:text-slate-200">
          Plan of Action &amp; Milestones
        </h3>
        <p class="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
          POAM items tracking remediation of this risk
        </p>
      </div>
      <button
        @click="showCreateModal = true"
        class="inline-flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-md text-xs font-medium"
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
        Create POAM Item
      </button>
    </div>

    <!-- Loading -->
    <div
      v-if="loading"
      class="text-sm text-gray-500 dark:text-slate-400 py-4 text-center"
    >
      Loading POAM items...
    </div>

    <!-- Empty state -->
    <div
      v-else-if="poamItems.length === 0"
      class="text-center py-8 border border-dashed border-ccf-300 dark:border-slate-600 rounded-md"
    >
      <svg
        class="w-8 h-8 text-gray-400 mx-auto mb-2"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="1.5"
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
        />
      </svg>
      <p class="text-sm text-gray-500 dark:text-slate-400">
        No POAM items linked to this risk.
      </p>
      <p class="text-xs text-gray-400 dark:text-slate-500 mt-1">
        Create a POAM item to start tracking remediation milestones.
      </p>
    </div>

    <!-- POAM items list -->
    <div v-else class="space-y-3">
      <div
        v-for="item in poamItems"
        :key="item.id"
        class="border border-ccf-200 dark:border-slate-700 rounded-md overflow-hidden"
      >
        <!-- Item header -->
        <div
          class="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800/60 cursor-pointer"
          @click="toggleExpanded(item.id)"
        >
          <div class="flex items-center gap-3 min-w-0">
            <!-- Expand chevron -->
            <svg
              class="w-4 h-4 text-gray-400 flex-shrink-0 transition-transform"
              :class="{ 'rotate-90': expandedIds.has(item.id) }"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 5l7 7-7 7"
              />
            </svg>

            <div class="min-w-0">
              <p
                class="text-sm font-medium text-gray-900 dark:text-slate-200 truncate"
              >
                {{ item.title }}
              </p>
              <div class="flex flex-wrap items-center gap-2 mt-0.5">
                <span
                  class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                  :class="statusBadgeClass(item.status)"
                >
                  {{ statusLabel(item.status) }}
                </span>
                <span
                  v-if="item.milestones && item.milestones.length > 0"
                  class="text-xs text-gray-500 dark:text-slate-400"
                >
                  {{ completedMilestones(item) }}/{{
                    item.milestones.length
                  }}
                  milestones
                </span>
                <span
                  v-if="item.plannedCompletionDate"
                  class="text-xs text-gray-500 dark:text-slate-400"
                >
                  Due {{ formatDate(item.plannedCompletionDate) }}
                </span>
              </div>
            </div>
          </div>

          <!-- Progress bar (compact) -->
          <div
            v-if="item.milestones && item.milestones.length > 0"
            class="flex items-center gap-2 ml-4 flex-shrink-0"
          >
            <div class="w-24 bg-gray-200 dark:bg-slate-700 rounded-full h-1.5">
              <div
                class="h-1.5 rounded-full"
                :class="
                  milestoneProgress(item) === 100
                    ? 'bg-green-500'
                    : 'bg-blue-500'
                "
                :style="{ width: `${milestoneProgress(item)}%` }"
              />
            </div>
            <span
              class="text-xs text-gray-500 dark:text-slate-400 w-8 text-right"
            >
              {{ milestoneProgress(item) }}%
            </span>
          </div>
        </div>

        <!-- Expanded milestone list -->
        <div
          v-if="expandedIds.has(item.id)"
          class="p-3 border-t border-ccf-200 dark:border-slate-700"
        >
          <PoamItemMilestones :poam-item-id="item.id" />
        </div>
      </div>
    </div>

    <!-- Create POAM Item modal (simplified — pre-fills riskId) -->
    <Dialog
      v-model:visible="showCreateModal"
      header="Create POAM Item from Risk"
      modal
      :style="{ width: '560px' }"
    >
      <div class="space-y-4 py-2">
        <div>
          <label
            class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1"
          >
            Title <span class="text-red-500">*</span>
          </label>
          <input
            v-model="createForm.title"
            type="text"
            placeholder="e.g. Remediate SQL injection vulnerability"
            class="w-full border border-ccf-300 dark:border-slate-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
            :class="{ 'border-red-500': createErrors.title }"
          />
          <p v-if="createErrors.title" class="text-xs text-red-500 mt-1">
            {{ createErrors.title }}
          </p>
        </div>

        <div>
          <label
            class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1"
          >
            Description
          </label>
          <textarea
            v-model="createForm.description"
            rows="3"
            class="w-full border border-ccf-300 dark:border-slate-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label
              class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1"
            >
              Status
            </label>
            <select
              v-model="createForm.status"
              class="w-full border border-ccf-300 dark:border-slate-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="open">Open</option>
              <option value="in-progress">In Progress</option>
            </select>
          </div>
          <div>
            <label
              class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1"
            >
              Planned Completion
            </label>
            <input
              v-model="createForm.plannedCompletionDate"
              type="date"
              class="w-full border border-ccf-300 dark:border-slate-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        <!-- Pre-filled risk link info banner -->
        <div
          class="flex items-start gap-2 p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-md"
        >
          <svg
            class="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fill-rule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clip-rule="evenodd"
            />
          </svg>
          <p class="text-xs text-purple-700 dark:text-purple-300">
            This POAM item will be automatically linked to the current risk.
          </p>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end gap-2 pt-2">
          <button
            @click="showCreateModal = false"
            class="px-4 py-2 text-sm border border-ccf-300 dark:border-slate-600 rounded-md text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            @click="submitCreate"
            :disabled="creating"
            class="px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-md disabled:opacity-50"
          >
            {{ creating ? 'Creating...' : 'Create POAM Item' }}
          </button>
        </div>
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useToast } from 'primevue/usetoast';
import Dialog from '@/volt/Dialog.vue';
import PoamItemMilestones from '@/components/poam/PoamItemMilestones.vue';
import {
  usePoamItemsByRisk,
  usePoamItemCreate,
  poamStatusBadgeClass,
  milestoneStatusLabel,
} from '@/composables/usePoamItems';
import {
  computeMilestoneProgress,
  type PoamItem,
  type PoamItemStatus,
} from '@/types/poam-items';
import { useSystemStore } from '@/stores/system';

interface Props {
  riskId: string;
}

const props = defineProps<Props>();
const toast = useToast();
const systemStore = useSystemStore();

const {
  data: poamData,
  isLoading: loading,
  execute: reload,
} = usePoamItemsByRisk(props.riskId);
const poamItems = computed<PoamItem[]>(() => poamData.value ?? []);

const expandedIds = ref<Set<string>>(new Set());

function toggleExpanded(id: string) {
  if (expandedIds.value.has(id)) {
    expandedIds.value.delete(id);
  } else {
    expandedIds.value.add(id);
  }
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

function completedMilestones(item: PoamItem): number {
  return (item.milestones ?? []).filter((m) => m.status === 'completed').length;
}

function milestoneProgress(item: PoamItem): number {
  return computeMilestoneProgress(item.milestones ?? []).percentage;
}

// Create form
const showCreateModal = ref(false);
const creating = ref(false);
const createForm = ref<{
  title: string;
  description: string;
  status: PoamItemStatus;
  plannedCompletionDate: string;
}>({
  title: '',
  description: '',
  status: 'open',
  plannedCompletionDate: '',
});
const createErrors = ref<{ title?: string }>({});

const { createPoamItem } = usePoamItemCreate();

async function submitCreate() {
  createErrors.value = {};
  if (!createForm.value.title.trim()) {
    createErrors.value.title = 'Title is required';
    return;
  }

  const sspId = systemStore.system.securityPlan?.uuid;
  if (!sspId) {
    toast.add({
      severity: 'error',
      summary: 'No SSP selected',
      detail:
        'Please select a System Security Plan before creating a POAM item.',
      life: 5000,
    });
    return;
  }

  creating.value = true;
  try {
    const result = await createPoamItem({
      sspId,
      title: createForm.value.title.trim(),
      description: createForm.value.description.trim() || undefined,
      status: createForm.value.status,
      plannedCompletionDate:
        createForm.value.plannedCompletionDate || undefined,
      createdFromRiskId: props.riskId,
    });

    toast.add({
      severity: 'success',
      summary: 'POAM item created',
      life: 3000,
    });
    showCreateModal.value = false;
    createForm.value = {
      title: '',
      description: '',
      status: 'open',
      plannedCompletionDate: '',
    };
    await reload();
  } catch {
    toast.add({
      severity: 'error',
      summary: 'Failed to create POAM item',
      life: 4000,
    });
  } finally {
    creating.value = false;
  }
}

onMounted(() => {
  reload();
});
</script>
