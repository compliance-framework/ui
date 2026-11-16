<template>
  <Dialog
    v-model:open="localVisible"
    :title="isEdit ? 'Edit task' : 'New task'"
  >
    <form novalidate @submit.prevent="submit">
      <Stack gap="4">
        <FormField label="Title" required :error="errors.title">
          <TextInput v-model="form.title" />
        </FormField>
        <FormField label="Description">
          <Textarea v-model="form.description" :rows="3" />
        </FormField>
        <FormField label="Status"
          ><Select v-model="status" :options="STATUSES"
        /></FormField>
        <FormField label="Planned completion">
          <TextInput v-model="form.plannedCompletionDate" type="date" />
        </FormField>
        <FormField label="Responsible">
          <Combobox
            v-model="form.responsibleParty"
            :options="userOptions"
            :loading="users.status.value === 'loading'"
            placeholder="Name or email"
          />
        </FormField>
        <FormField label="Remarks">
          <Textarea v-model="form.remarks" :rows="2" />
        </FormField>
        <InlineMessage v-if="saveError" tone="error" title="Not saved"
          ><p>{{ saveError }}</p></InlineMessage
        >
        <Cluster justify="end" gap="2">
          <Button @click="localVisible = false">Cancel</Button>
          <Button
            variant="primary"
            type="submit"
            :loading="saving"
            :disabled-reason="saveDenied"
            >{{ isEdit ? 'Save task' : 'Add task' }}</Button
          >
        </Cluster>
      </Stack>
    </form>
  </Dialog>
</template>

<script setup lang="ts">
/**
 * A mitigation task's dialog (add or edit): title, description, status, planned completion, the
 * person responsible and remarks. It emits `saved` with the request; the parent saves it, then
 * closes the dialog or passes back `saveError`. The script is the classic dialog's.
 */
import { computed, ref, watch } from 'vue';
import { useApiQuery } from '@/ds/query';
import Button from '@/ds/components/Button/Button.vue';
import Combobox from '@/ds/components/Combobox/Combobox.vue';
import Dialog from '@/ds/components/Dialog/Dialog.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import InlineMessage from '@/ds/components/InlineMessage/InlineMessage.vue';
import Select from '@/ds/components/Select/Select.vue';
import TextInput from '@/ds/components/TextInput/TextInput.vue';
import Textarea from '@/ds/components/Textarea/Textarea.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import type {
  PoamItemMilestone,
  CreateMilestoneRequest,
  UpdateMilestoneRequest,
  MilestoneStatus,
} from '@/types/poam-items';
import { usePermissions } from '@/composables/usePermissions';
import { RESOURCES, ACTIONS } from '@/constants/permissions';

const { can } = usePermissions();

interface Props {
  modelValue: boolean;
  milestone?: PoamItemMilestone | null;
  /** Pass true while the parent is executing the API call to keep the modal in saving state */
  saving?: boolean;
  /** Pass an error message from the parent if the API call fails */
  saveError?: string;
}

const props = withDefaults(defineProps<Props>(), {
  milestone: null,
  saving: false,
  saveError: '',
});

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  saved: [payload: CreateMilestoneRequest | UpdateMilestoneRequest];
}>();

const localVisible = ref(props.modelValue);
const isEdit = ref(false);

const milestoneAction = computed(() =>
  isEdit.value ? ACTIONS.UPDATE : ACTIONS.CREATE,
);

// Derive saving and saveError from props so the parent controls modal state
const saving = computed(() => props.saving);
const saveError = computed(() => props.saveError ?? '');

// Every selectable user, for the "Responsible" picker.
const users =
  useApiQuery<{ id: string; displayName: string }[]>('/api/users/select');
const userOptions = computed(() => {
  const options = (users.data.value ?? []).map((u) => ({
    value: u.id,
    label: u.displayName || u.id,
  }));
  // Someone not in the list (e.g. since removed) still shows, by ID.
  const current = form.value.responsibleParty;
  return current && !options.some((o) => o.value === current)
    ? [...options, { value: current, label: current }]
    : options;
});
const STATUSES = [
  { value: 'open', label: 'Open' },
  { value: 'in-progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];
const status = computed({
  get: () => form.value.status,
  set: (value: string) => (form.value.status = value as MilestoneStatus),
});
const saveDenied = computed(() =>
  can(RESOURCES.POAM_ITEM, milestoneAction.value)
    ? undefined
    : "Your access doesn't include changing POA&M items.",
);

interface FormState {
  title: string;
  description: string;
  status: MilestoneStatus;
  plannedCompletionDate?: string;
  responsibleParty: string;
  remarks: string;
}

const form = ref<FormState>({
  title: '',
  description: '',
  status: 'open',
  plannedCompletionDate: '',
  responsibleParty: '',
  remarks: '',
});

const errors = ref<Partial<Record<keyof FormState, string>>>({});

watch(
  () => props.modelValue,
  (val) => {
    localVisible.value = val;
  },
);

watch(localVisible, (val) => {
  emit('update:modelValue', val);
});

watch(
  () => props.milestone,
  (m) => {
    if (m) {
      isEdit.value = true;
      form.value = {
        title: m.title,
        description: m.description ?? '',
        status: m.status,
        plannedCompletionDate: m.plannedCompletionDate
          ? m.plannedCompletionDate.substring(0, 10)
          : '',
        responsibleParty: m.responsibleParty ?? '',
        remarks: m.remarks ?? '',
      };
    } else {
      isEdit.value = false;
      resetForm();
    }
  },
  { immediate: true },
);

function resetForm() {
  isEdit.value = false;
  errors.value = {};
  form.value = {
    title: '',
    description: '',
    status: 'open',
    plannedCompletionDate: '',
    responsibleParty: '',
    remarks: '',
  };
}

function validate(): boolean {
  errors.value = {};
  if (!form.value.title.trim()) {
    errors.value.title = 'Enter a title.';
  }
  return Object.keys(errors.value).length === 0;
}

function submit() {
  if (!validate()) return;

  const payload: CreateMilestoneRequest | UpdateMilestoneRequest = {
    title: form.value.title.trim(),
    description: form.value.description.trim() || undefined,
    status: form.value.status,
    plannedCompletionDate: form.value.plannedCompletionDate || undefined,
    responsibleParty: form.value.responsibleParty.trim() || undefined,
    remarks: form.value.remarks.trim() || undefined,
  };

  // Emit the payload to the parent; the parent is responsible for calling the
  // API and closing the modal (or passing back a saveError) so that the user
  // does not lose their input if the API call fails.
  emit('saved', payload);
}
</script>
