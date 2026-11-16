<template>
  <Stack gap="3">
    <Cluster justify="between" gap="2">
      <Cluster gap="2">
        <Text as="span" variant="label">Tasks</Text>
        <Tag
          v-if="milestones.length > 0"
          :label="`${progress.completed} of ${progress.total} done`"
        />
        <Tag
          v-if="progress.overdue > 0"
          :label="`${progress.overdue} overdue`"
        />
      </Cluster>
      <Button
        icon="add"
        :disabled-reason="denied(ACTIONS.CREATE)"
        @click="openCreateModal"
        >Add task</Button
      >
    </Cluster>
    <DataState
      :status="loading ? 'loading' : milestones.length ? 'ready' : 'empty'"
      subject="the tasks"
      empty-title="No tasks yet"
      empty-body="Add one to track the mitigation's progress."
      skeleton="text"
    >
      <Stack gap="2" as="ul">
        <li v-for="milestone in sortedMilestones" :key="milestone.id">
          <Cluster justify="between" gap="2">
            <Stack gap="1">
              <Cluster gap="2">
                <Text as="span">{{ milestone.title }}</Text>
                <Tag :label="statusLabel(milestone.status)" />
                <Tag v-if="isOverdue(milestone)" label="Overdue" />
              </Cluster>
              <Text v-if="milestone.description" variant="caption">{{
                milestone.description
              }}</Text>
              <Text v-if="taskDetails(milestone)" variant="caption">{{
                taskDetails(milestone)
              }}</Text>
            </Stack>
            <Menu
              :label="`Actions for ${milestone.title}`"
              :items="taskActions(milestone)"
            />
          </Cluster>
        </li>
      </Stack>
    </DataState>
    <MilestoneCreateEditModal
      v-model="showModal"
      :milestone="editingMilestone"
      :saving="modalSaving"
      :save-error="modalSaveError"
      @saved="onMilestoneSaved"
    />
  </Stack>
</template>

<script setup lang="ts">
/**
 * A POA&M item's tasks (milestones): progress and overdue count, then each task with its status,
 * due date, the person responsible and completion, quick status changes, Edit and Delete, and Add
 * task. The script is the classic panel's.
 */
import { ref, computed, watch } from 'vue';
import { useToast } from '@/ds/toasts';
import MilestoneCreateEditModal from './MilestoneCreateEditModal.vue';
import {
  useMilestonesList,
  useMilestoneCreate,
  useMilestoneUpdate,
  useMilestoneDelete,
  milestoneStatusLabel,
} from '@/composables/usePoamItems';
import {
  computeMilestoneProgress,
  type PoamItemMilestone,
  type CreateMilestoneRequest,
  type UpdateMilestoneRequest,
  type MilestoneStatus,
} from '@/types/poam-items';
import { useDeleteConfirmationDialog } from '@/utils/delete-dialog';
import { useUserSearch } from '@/composables/workflows/useUserSearch';
import Button from '@/ds/components/Button/Button.vue';
import DataState from '@/ds/components/DataState/DataState.vue';
import Menu from '@/ds/components/Menu/Menu.vue';
import type { MenuEntry } from '@/ds/components/Menu/menuEntries';
import Tag from '@/ds/components/Tag/Tag.vue';
import Text from '@/ds/components/Text/Text.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import { usePermissions } from '@/composables/usePermissions';
import { RESOURCES, ACTIONS } from '@/constants/permissions';

interface Props {
  poamItemId: string;
}

const props = defineProps<Props>();
const toast = useToast();
const { can } = usePermissions();
const denied = (action: string) =>
  can(RESOURCES.POAM_ITEM, action)
    ? undefined
    : "Your access doesn't include changing POA&M items.";
const { confirmDeleteDialog } = useDeleteConfirmationDialog();

const showModal = ref(false);
const editingMilestone = ref<PoamItemMilestone | null>(null);
const modalSaving = ref(false);
const modalSaveError = ref('');

const { loadUsersByIds, getCachedUser } = useUserSearch();

const {
  data: milestonesData,
  isLoading: loading,
  execute: reloadMilestones,
} = useMilestonesList(props.poamItemId);

const milestones = computed<PoamItemMilestone[]>(
  () => milestonesData.value ?? [],
);

watch(
  () => milestones.value,
  (newMilestones) => {
    const userIds = newMilestones
      .map((m) => m.responsibleParty)
      .filter((id): id is string => !!id);
    if (userIds.length > 0) {
      loadUsersByIds(userIds);
    }
  },
  { immediate: true, deep: true },
);

const sortedMilestones = computed(() =>
  [...milestones.value].sort((a, b) => a.orderIndex - b.orderIndex),
);

const progress = computed(() => computeMilestoneProgress(milestones.value));

function isOverdue(m: PoamItemMilestone): boolean {
  if (!m) return false;
  if (m.status === 'completed' || m.status === 'cancelled') return false;
  if (!m.plannedCompletionDate || typeof m.plannedCompletionDate !== 'string')
    return false;
  // Compare date strings in local timezone to avoid UTC-vs-local skew
  const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
  return m.plannedCompletionDate.substring(0, 10) < todayStr;
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
  modalSaveError.value = '';
  showModal.value = true;
}

function openEditModal(m: PoamItemMilestone) {
  editingMilestone.value = m;
  modalSaveError.value = '';
  showModal.value = true;
}

const { createMilestone, error: createError } = useMilestoneCreate(
  props.poamItemId,
);
const { updateMilestone, error: updateError } = useMilestoneUpdate(
  props.poamItemId,
);
const { deleteMilestone, error: deleteError } = useMilestoneDelete();

async function quickUpdateStatus(
  m: PoamItemMilestone,
  newStatus: MilestoneStatus,
) {
  try {
    await updateMilestone(m.id, {
      title: m.title,
      description: m.description || undefined,
      status: newStatus,
      plannedCompletionDate: m.plannedCompletionDate,
      responsibleParty: m.responsibleParty || undefined,
      remarks: m.remarks || undefined,
    });
    if (updateError.value) throw updateError.value;
    toast.add({
      severity: 'success',
      summary: 'Task updated',
      life: 3000,
    });
    await reloadMilestones();
  } catch {
    toast.add({
      severity: 'error',
      summary: 'Failed to update task',
      life: 4000,
    });
  }
}

async function onMilestoneSaved(
  payload: CreateMilestoneRequest | UpdateMilestoneRequest,
) {
  modalSaving.value = true;
  modalSaveError.value = '';
  try {
    if (editingMilestone.value) {
      await updateMilestone(
        editingMilestone.value.id,
        payload as UpdateMilestoneRequest,
      );
      if (updateError.value) throw updateError.value;
      toast.add({
        severity: 'success',
        summary: 'Milestone updated',
        life: 3000,
      });
    } else {
      await createMilestone(payload as CreateMilestoneRequest);
      if (createError.value) throw createError.value;
      toast.add({
        severity: 'success',
        summary: 'Milestone added',
        life: 3000,
      });
    }
    showModal.value = false;
    await reloadMilestones();
  } catch (err) {
    const maybeError = err as {
      message?: string;
      response?: { data?: { message?: string } };
    };
    modalSaveError.value =
      maybeError?.response?.data?.message ||
      maybeError?.message ||
      'Failed to save milestone. Please try again.';
    toast.add({
      severity: 'error',
      summary: 'Failed to save milestone',
      detail: modalSaveError.value,
      life: 4000,
    });
  } finally {
    modalSaving.value = false;
  }
}

function confirmDelete(m: PoamItemMilestone) {
  confirmDeleteDialog(
    async () => {
      await deleteMilestone(props.poamItemId, m.id);
      if (deleteError.value) throw deleteError.value;
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
const responsibleName = (m: PoamItemMilestone) =>
  m.responsibleParty
    ? getCachedUser(m.responsibleParty)?.displayName || m.responsibleParty
    : '';
const taskDetails = (m: PoamItemMilestone) =>
  [
    m.plannedCompletionDate ? `Due ${formatDate(m.plannedCompletionDate)}` : '',
    responsibleName(m),
    m.completionDate ? `Completed ${formatDate(m.completionDate)}` : '',
  ]
    .filter(Boolean)
    .join(' · ');
const taskActions = (m: PoamItemMilestone): MenuEntry[] => [
  ...(m.status === 'open'
    ? [
        {
          label: 'Mark in progress',
          icon: 'inProgress' as const,
          disabledReason: denied(ACTIONS.UPDATE),
          onSelect: () => void quickUpdateStatus(m, 'in-progress'),
        },
      ]
    : []),
  ...(m.status === 'in-progress'
    ? [
        {
          label: 'Mark completed',
          icon: 'check' as const,
          disabledReason: denied(ACTIONS.UPDATE),
          onSelect: () => void quickUpdateStatus(m, 'completed'),
        },
      ]
    : []),
  ...(m.status !== 'completed' && m.status !== 'cancelled'
    ? [
        {
          label: 'Mark cancelled',
          icon: 'close' as const,
          disabledReason: denied(ACTIONS.UPDATE),
          onSelect: () => void quickUpdateStatus(m, 'cancelled'),
        },
      ]
    : []),
  {
    label: 'Edit task',
    icon: 'edit',
    disabledReason: denied(ACTIONS.UPDATE),
    onSelect: () => openEditModal(m),
  },
  {
    label: 'Delete task',
    icon: 'delete',
    tone: 'danger',
    disabledReason: denied(ACTIONS.DELETE),
    onSelect: () => confirmDelete(m),
  },
];
</script>
