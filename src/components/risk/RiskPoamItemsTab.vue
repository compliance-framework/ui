<template>
  <Stack gap="4">
    <Cluster justify="between" gap="3">
      <Text>The POA&amp;M items tracking how this risk is mitigated.</Text>
      <Button variant="primary" icon="add" @click="showCreateModal = true"
        >Create a mitigation plan</Button
      >
    </Cluster>
    <DataState
      :status="loading ? 'loading' : poamItems.length ? 'ready' : 'empty'"
      subject="the mitigation plans"
      empty-title="No mitigation plans yet"
      empty-body="Create one to start tracking mitigation tasks."
      skeleton="panel"
    >
      <Stack gap="3">
        <Disclosure
          v-for="item in poamItems"
          :key="item.id"
          :label="item.title"
        >
          <Stack gap="4">
            <Cluster justify="between" gap="2">
              <Cluster gap="2">
                <Tag :label="statusLabel(item.status)" />
                <Text
                  v-if="item.plannedCompletionDate"
                  as="span"
                  variant="caption"
                  >Due {{ formatDate(item.plannedCompletionDate) }}</Text
                >
              </Cluster>
              <Button icon="edit" @click="openEditModal(item)">Edit</Button>
            </Cluster>
            <ProgressBar
              v-if="item.milestones && item.milestones.length > 0"
              :label="`Tasks done for ${item.title}`"
              :value="completedMilestones(item)"
              :max="item.milestones.length"
              :value-text="`${completedMilestones(item)} of ${item.milestones.length} tasks (${milestoneProgress(item)}%)`"
            />
            <PoamItemMilestones :poam-item-id="item.id" />
          </Stack>
        </Disclosure>
      </Stack>
    </DataState>

    <Dialog v-model:open="showCreateModal" title="Create a mitigation plan">
      <form novalidate @submit.prevent="submitCreate">
        <Stack gap="4">
          <FormField label="Title" required :error="createErrors.title">
            <TextInput v-model="createForm.title" />
          </FormField>
          <FormField label="Description">
            <Textarea v-model="createForm.description" :rows="3" />
          </FormField>
          <FormField label="Status">
            <Select v-model="createForm.status" :options="CREATE_STATUSES" />
          </FormField>
          <FormField label="Planned completion">
            <TextInput v-model="createForm.plannedCompletionDate" type="date" />
          </FormField>
          <Text variant="caption">It is linked to this risk.</Text>
          <Cluster justify="end" gap="2">
            <Button @click="showCreateModal = false">Cancel</Button>
            <Button variant="primary" type="submit" :loading="creating"
              >Create plan</Button
            >
          </Cluster>
        </Stack>
      </form>
    </Dialog>
    <Dialog v-model:open="showEditModal" title="Edit mitigation plan">
      <form novalidate @submit.prevent="submitEdit">
        <Stack gap="4">
          <FormField label="Title" required :error="editErrors.title">
            <TextInput v-model="editForm.title" />
          </FormField>
          <FormField label="Description">
            <Textarea v-model="editForm.description" :rows="3" />
          </FormField>
          <FormField label="Status">
            <Select v-model="editForm.status" :options="EDIT_STATUSES" />
          </FormField>
          <FormField label="Planned completion">
            <TextInput v-model="editForm.plannedCompletionDate" type="date" />
          </FormField>
          <Cluster justify="end" gap="2">
            <Button @click="showEditModal = false">Cancel</Button>
            <Button variant="primary" type="submit" :loading="editing"
              >Save plan</Button
            >
          </Cluster>
        </Stack>
      </form>
    </Dialog>
  </Stack>
</template>

<script setup lang="ts">
/**
 * A risk's Mitigation Plan tab: the POA&M items mitigating it, each a disclosure with its status,
 * milestone progress, due date and tasks, with Edit, plus Create a mitigation plan. The script is
 * the classic tab's.
 */
import { ref, computed } from 'vue';
import { useToast } from '@/ds/toasts';
import Button from '@/ds/components/Button/Button.vue';
import DataState from '@/ds/components/DataState/DataState.vue';
import Dialog from '@/ds/components/Dialog/Dialog.vue';
import Disclosure from '@/ds/components/Disclosure/Disclosure.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import ProgressBar from '@/ds/components/ProgressBar/ProgressBar.vue';
import Select from '@/ds/components/Select/Select.vue';
import Tag from '@/ds/components/Tag/Tag.vue';
import Text from '@/ds/components/Text/Text.vue';
import TextInput from '@/ds/components/TextInput/TextInput.vue';
import Textarea from '@/ds/components/Textarea/Textarea.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import PoamItemMilestones from '@/components/poam/PoamItemMilestones.vue';
import {
  usePoamItemsByRisk,
  usePoamItemCreate,
  usePoamItemUpdate,
  poamStatusLabel,
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

function statusLabel(status: string): string {
  return poamStatusLabel(status);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

const CREATE_STATUSES = [
  { value: 'open', label: 'Open' },
  { value: 'mitigating-planned', label: 'Mitigating Planned' },
  { value: 'mitigating-implemented', label: 'Mitigating Implemented' },
];
const EDIT_STATUSES = [
  ...CREATE_STATUSES,
  { value: 'completed', label: 'Completed' },
];

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
        'Please select a System Security Plan before creating a Mitigation Plan.',
      life: 5000,
    });
    return;
  }

  creating.value = true;
  try {
    await createPoamItem({
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
      summary: 'Mitigation Plan created',
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
      summary: 'Failed to create Mitigation Plan',
      life: 4000,
    });
  } finally {
    creating.value = false;
  }
}
// Edit form
const showEditModal = ref(false);
const editing = ref(false);
const editItemId = ref<string>('');
const editForm = ref<{
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
const editErrors = ref<{ title?: string }>({});

const { updatePoamItem } = usePoamItemUpdate();

function openEditModal(item: PoamItem) {
  editItemId.value = item.id;
  editForm.value = {
    title: item.title,
    description: item.description ?? '',
    status: item.status,
    plannedCompletionDate: item.plannedCompletionDate
      ? item.plannedCompletionDate.substring(0, 10)
      : '',
  };
  editErrors.value = {};
  showEditModal.value = true;
}

async function submitEdit() {
  editErrors.value = {};
  if (!editForm.value.title.trim()) {
    editErrors.value.title = 'Title is required';
    return;
  }

  editing.value = true;
  try {
    await updatePoamItem(editItemId.value, {
      title: editForm.value.title.trim(),
      description: editForm.value.description.trim() || undefined,
      status: editForm.value.status,
      plannedCompletionDate: editForm.value.plannedCompletionDate || undefined,
    });

    toast.add({
      severity: 'success',
      summary: 'Mitigation Plan updated',
      life: 3000,
    });
    showEditModal.value = false;
    await reload();
  } catch {
    toast.add({
      severity: 'error',
      summary: 'Failed to update Mitigation Plan',
      life: 4000,
    });
  } finally {
    editing.value = false;
  }
}
</script>
