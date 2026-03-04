<script setup lang="ts">
import { ref } from 'vue';
import { useToast } from 'primevue/usetoast';
import V2PageHeader from '@/components/v2/patterns/V2PageHeader.vue';
import V2FormField from '@/components/v2/forms/V2FormField.vue';
import V2FormErrorSummary, {
  type V2FormError,
} from '@/components/v2/forms/V2FormErrorSummary.vue';
import V2StatusChip from '@/components/v2/primitives/V2StatusChip.vue';
import V2InlineAlert from '@/components/v2/primitives/V2InlineAlert.vue';
import V2DestructiveActionMenu from '@/components/v2/patterns/V2DestructiveActionMenu.vue';
import Button from '@/volt/Button.vue';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import TertiaryButton from '@/volt/TertiaryButton.vue';
import DangerButton from '@/volt/DangerButton.vue';
import InputText from '@/volt/InputText.vue';
import Password from '@/volt/Password.vue';
import Textarea from '@/volt/Textarea.vue';
import Select from '@/volt/Select.vue';
import MultiSelect from '@/volt/MultiSelect.vue';
import DatePicker from '@/volt/DatePicker.vue';
import Checkbox from '@/volt/Checkbox.vue';
import RadioButton from '@/volt/RadioButton.vue';
import ToggleSwitch from '@/volt/ToggleSwitch.vue';
import SelectButton from '@/volt/SelectButton.vue';
import Badge from '@/volt/Badge.vue';
import Chip from '@/volt/Chip.vue';
import Tabs from '@/volt/Tabs.vue';
import TabList from '@/volt/TabList.vue';
import Tab from '@/volt/Tab.vue';
import TabPanels from '@/volt/TabPanels.vue';
import TabPanel from '@/volt/TabPanel.vue';
import DataTable from '@/volt/DataTable.vue';
import Column from '@/volt/Column.vue';
import Dialog from '@/volt/Dialog.vue';
import Drawer from '@/volt/Drawer.vue';

type SelectOption = {
  label: string;
  value: string;
};

type UserRow = {
  id: string;
  name: string;
  role: string;
  status: string;
};

type ToastPreviewSeverity = 'warn' | 'info' | 'success' | 'error';

type ToastPreviewItem = {
  severity: ToastPreviewSeverity;
  summary: string;
};

const toast = useToast();

const demoName = ref('Jane Doe');
const demoPassword = ref('');
const demoDescription = ref('');
const demoEnvironment = ref<SelectOption['value']>('production');
const demoScopes = ref<SelectOption['value'][]>(['system']);
const demoDate = ref<Date | null>(new Date());

const demoCheckbox = ref(true);
const demoRadio = ref('a');
const demoToggle = ref(false);
const demoSelectButton = ref('strict');

const activeTab = ref('overview');
const dialogVisible = ref(false);
const drawerVisible = ref(false);

const environmentOptions: SelectOption[] = [
  { label: 'Production', value: 'production' },
  { label: 'Staging', value: 'staging' },
  { label: 'Development', value: 'development' },
];

const scopeOptions: SelectOption[] = [
  { label: 'System', value: 'system' },
  { label: 'Network', value: 'network' },
  { label: 'Application', value: 'application' },
  { label: 'Identity', value: 'identity' },
];

const selectButtonOptions = [
  { label: 'Strict', value: 'strict' },
  { label: 'Balanced', value: 'balanced' },
  { label: 'Relaxed', value: 'relaxed' },
];

const tableRows = ref<UserRow[]>([
  { id: 'U-100', name: 'Alice Kim', role: 'System Owner', status: 'active' },
  {
    id: 'U-101',
    name: 'Marcus Reed',
    role: 'Security Lead',
    status: 'pending',
  },
  { id: 'U-102', name: 'Priya Shah', role: 'Engineer', status: 'inactive' },
]);

const sampleErrors = ref<V2FormError[]>([
  { fieldId: 'library-name', message: 'Name is required.' },
  {
    fieldId: 'library-environment',
    message: 'Select a deployment environment.',
  },
]);

const toastPreviewItems: ToastPreviewItem[] = [
  { severity: 'warn', summary: 'NOTICE' },
  { severity: 'info', summary: 'INFO' },
  { severity: 'success', summary: 'SUCCESS' },
  { severity: 'error', summary: 'ERROR' },
];

const toastPreviewMessageClass: Record<ToastPreviewSeverity, string> = {
  warn: 'border-[var(--ui-v2-primary-stroke-30)] bg-[var(--ui-v2-primary-tint-10)]',
  info: 'border-[var(--ui-v2-info-stroke-30)] bg-[var(--ui-v2-info-tint-10)]',
  success:
    'border-[var(--ui-v2-success-stroke-30)] bg-[var(--ui-v2-success-tint-10)]',
  error: 'border-[var(--ui-v2-error)] bg-[var(--ui-v2-error-tint-10)]',
};

const toastPreviewAccentClass: Record<ToastPreviewSeverity, string> = {
  warn: 'bg-[var(--ui-v2-primary)]',
  info: 'bg-[var(--ui-v2-info)]',
  success: 'bg-[var(--ui-v2-success)]',
  error: 'bg-[var(--ui-v2-error)]',
};

function notify(type: 'success' | 'info', summary: string, detail: string) {
  toast.add({
    severity: type,
    summary,
    detail,
    life: 2200,
  });
}

function handleDangerConfirmed() {
  notify('success', 'Deleted', 'Destructive action pattern executed.');
}

function handleMenuAction(actionId: string) {
  notify('info', 'Action', `Executed action: ${actionId}`);
}
</script>

<template>
  <div class="space-y-8">
    <V2PageHeader
      eyebrow="Sandbox"
      title="V2 Component Library"
      description="Reference implementation of V2 primitives and interaction rules used during migration."
    />

    <section class="ui-v2-surface-card space-y-4 p-6">
      <h2 class="ui-v2-section-title text-[var(--ui-v2-foreground)]">
        P4-01 Buttons
      </h2>
      <div class="flex flex-wrap gap-3">
        <PrimaryButton>Primary</PrimaryButton>
        <SecondaryButton>Secondary</SecondaryButton>
        <TertiaryButton>Ghost</TertiaryButton>
        <DangerButton>Danger</DangerButton>
        <Button size="small">Small</Button>
      </div>
    </section>

    <section class="ui-v2-surface-card space-y-6 p-6">
      <h2 class="ui-v2-section-title text-[var(--ui-v2-foreground)]">
        P4-02 Inputs
      </h2>

      <V2FormErrorSummary :errors="sampleErrors" />

      <div class="grid gap-4 md:grid-cols-2">
        <V2FormField
          label="Display Name"
          input-id="library-name"
          required
          helper-text="Visible in audit reports and dashboards."
          error="Name is required."
        >
          <template #default="fieldProps">
            <InputText
              v-model="demoName"
              :input-id="fieldProps.inputId"
              :aria-describedby="fieldProps.describedBy"
              :aria-invalid="fieldProps.invalid"
              fluid
            />
          </template>
        </V2FormField>

        <V2FormField label="Password" input-id="library-password" required>
          <template #default="fieldProps">
            <Password
              v-model="demoPassword"
              :input-id="fieldProps.inputId"
              :aria-describedby="fieldProps.describedBy"
              :aria-invalid="fieldProps.invalid"
              toggle-mask
              fluid
            />
          </template>
        </V2FormField>

        <V2FormField
          label="Environment"
          input-id="library-environment"
          required
        >
          <template #default="fieldProps">
            <Select
              v-model="demoEnvironment"
              :options="environmentOptions"
              option-label="label"
              option-value="value"
              :input-id="fieldProps.inputId"
              :aria-describedby="fieldProps.describedBy"
              :aria-invalid="fieldProps.invalid"
              fluid
            />
          </template>
        </V2FormField>

        <V2FormField
          label="Scopes"
          input-id="library-scopes"
          helper-text="Select one or more scope groups."
        >
          <template #default="fieldProps">
            <MultiSelect
              v-model="demoScopes"
              :options="scopeOptions"
              option-label="label"
              option-value="value"
              :input-id="fieldProps.inputId"
              :aria-describedby="fieldProps.describedBy"
              :aria-invalid="fieldProps.invalid"
              display="chip"
              fluid
            />
          </template>
        </V2FormField>

        <V2FormField label="Effective Date" input-id="library-date">
          <template #default="fieldProps">
            <DatePicker
              v-model="demoDate"
              :input-id="fieldProps.inputId"
              :aria-describedby="fieldProps.describedBy"
              :aria-invalid="fieldProps.invalid"
              show-icon
              fluid
            />
          </template>
        </V2FormField>

        <V2FormField
          label="Description"
          input-id="library-description"
          helper-text="Short implementation note shown in System overview."
        >
          <template #default="fieldProps">
            <Textarea
              v-model="demoDescription"
              :input-id="fieldProps.inputId"
              :aria-describedby="fieldProps.describedBy"
              :aria-invalid="fieldProps.invalid"
              rows="4"
              fluid
            />
          </template>
        </V2FormField>
      </div>
    </section>

    <section class="ui-v2-surface-card space-y-4 p-6">
      <h2 class="ui-v2-section-title text-[var(--ui-v2-foreground)]">
        P4-03 Selection Controls
      </h2>

      <div class="flex flex-wrap items-center gap-6">
        <label class="inline-flex items-center gap-2">
          <Checkbox v-model="demoCheckbox" binary input-id="library-checkbox" />
          <span class="ui-v2-body text-[var(--ui-v2-foreground)]"
            >Enable evidence checks</span
          >
        </label>

        <div class="flex items-center gap-4">
          <label class="inline-flex items-center gap-2">
            <RadioButton
              v-model="demoRadio"
              input-id="radio-a"
              name="library-radio"
              value="a"
            />
            <span class="ui-v2-body text-[var(--ui-v2-foreground)]"
              >Option A</span
            >
          </label>
          <label class="inline-flex items-center gap-2">
            <RadioButton
              v-model="demoRadio"
              input-id="radio-b"
              name="library-radio"
              value="b"
            />
            <span class="ui-v2-body text-[var(--ui-v2-foreground)]"
              >Option B</span
            >
          </label>
        </div>

        <label class="inline-flex items-center gap-2">
          <ToggleSwitch v-model="demoToggle" input-id="library-toggle" />
          <span class="ui-v2-body text-[var(--ui-v2-foreground)]"
            >Realtime monitoring</span
          >
        </label>
      </div>

      <div>
        <SelectButton
          v-model="demoSelectButton"
          :options="selectButtonOptions"
          option-label="label"
          option-value="value"
        />
      </div>
    </section>

    <section class="ui-v2-surface-card space-y-4 p-6">
      <h2 class="ui-v2-section-title text-[var(--ui-v2-foreground)]">
        P4-04 and P4-13 Status Chips
      </h2>

      <div class="flex flex-wrap items-center gap-2">
        <V2StatusChip status="active" />
        <V2StatusChip status="pending" />
        <V2StatusChip status="failed" />
        <V2StatusChip status="draft" />
        <Badge severity="info" value="INFO" />
        <Chip label="SOC2" removable />
      </div>
    </section>

    <section class="ui-v2-surface-card space-y-4 p-6">
      <h2 class="ui-v2-section-title text-[var(--ui-v2-foreground)]">
        P4-05 Table Primitives
      </h2>

      <DataTable
        :value="tableRows"
        data-key="id"
        paginator
        :rows="5"
        responsive-layout="scroll"
      >
        <Column field="id" header="ID" />
        <Column field="name" header="Name" />
        <Column field="role" header="Role" />
        <Column header="Status">
          <template #body="slotProps">
            <V2StatusChip :status="slotProps.data.status" />
          </template>
        </Column>
        <Column header="Actions">
          <template #body="slotProps">
            <div class="flex justify-end gap-2">
              <SecondaryButton
                size="small"
                @click="notify('info', 'Edit', `Editing ${slotProps.data.id}`)"
              >
                Edit
              </SecondaryButton>
              <DangerButton
                size="small"
                @click="notify('info', 'Delete', `Delete ${slotProps.data.id}`)"
              >
                Delete
              </DangerButton>
            </div>
          </template>
        </Column>
      </DataTable>
    </section>

    <section class="ui-v2-surface-card space-y-4 p-6">
      <h2 class="ui-v2-section-title text-[var(--ui-v2-foreground)]">
        P4-06 Tabs / P4-07 Dialog + Drawer / P4-08 Alerts
      </h2>

      <Tabs :value="activeTab">
        <TabList>
          <Tab value="overview">Overview</Tab>
          <Tab value="alerts">Alerts</Tab>
          <Tab value="actions">Actions</Tab>
        </TabList>
        <TabPanels>
          <TabPanel value="overview">
            <p class="ui-v2-body text-[var(--ui-v2-foreground)]">
              Tabs share one style system across V2 detail pages.
            </p>
          </TabPanel>

          <TabPanel value="alerts">
            <div class="space-y-3">
              <V2InlineAlert
                severity="info"
                title="Information"
                message="This is the standard info banner pattern."
              />
              <V2InlineAlert
                severity="error"
                title="Error"
                message="This is the standard inline error/banner pattern."
              />
            </div>
          </TabPanel>

          <TabPanel value="actions">
            <div class="flex flex-wrap gap-2">
              <SecondaryButton @click="dialogVisible = true"
                >Open Dialog</SecondaryButton
              >
              <SecondaryButton @click="drawerVisible = true"
                >Open Drawer</SecondaryButton
              >
            </div>
          </TabPanel>
        </TabPanels>
      </Tabs>

      <Dialog
        v-model:visible="dialogVisible"
        modal
        header="Create Example"
        :style="{ width: '45rem' }"
      >
        <div class="space-y-3">
          <V2InlineAlert
            severity="secondary"
            message="Dialog pattern uses the same V2 shell tokens."
          />
          <V2FormField label="Example Field" input-id="dialog-example" required>
            <template #default="fieldProps">
              <InputText
                :input-id="fieldProps.inputId"
                :aria-describedby="fieldProps.describedBy"
                :aria-invalid="fieldProps.invalid"
                fluid
              />
            </template>
          </V2FormField>
        </div>
      </Dialog>

      <Drawer
        v-model:visible="drawerVisible"
        position="right"
        header="Drawer Example"
      >
        <div class="space-y-2">
          <p class="ui-v2-body text-[var(--ui-v2-foreground)]">
            Drawer uses the same border/radius and typography rules.
          </p>
          <V2StatusChip status="active" />
        </div>
      </Drawer>
    </section>

    <section class="ui-v2-surface-card space-y-4 p-6">
      <h2 class="ui-v2-section-title text-[var(--ui-v2-foreground)]">
        P4-08 Toasts
      </h2>
      <p class="ui-v2-body text-[var(--ui-v2-muted-foreground)]">
        Latte toast specimens rendered inline for side-by-side comparison.
      </p>

      <div class="space-y-3 max-w-[420px]">
        <div
          v-for="item in toastPreviewItems"
          :key="item.summary"
          class="rounded-none border text-[var(--ui-v2-foreground)]"
          :class="toastPreviewMessageClass[item.severity]"
          role="status"
          aria-live="polite"
        >
          <div class="flex items-stretch gap-[10px] p-3">
            <span
              class="block w-[3px] shrink-0 self-stretch"
              :class="toastPreviewAccentClass[item.severity]"
            />

            <div class="flex flex-col gap-1">
              <p
                class="font-[var(--ui-v2-font-secondary)] text-[11px] font-bold uppercase tracking-[1px] text-[var(--ui-v2-foreground)]"
              >
                {{ item.summary }}
              </p>
              <p
                class="font-[var(--ui-v2-font-secondary)] text-[12px] leading-[1.6] text-[var(--ui-v2-muted-foreground)]"
              >
                Message goes here.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="ui-v2-surface-card space-y-4 p-6">
      <h2 class="ui-v2-section-title text-[var(--ui-v2-foreground)]">
        P4-12 Destructive Action Hierarchy
      </h2>

      <V2DestructiveActionMenu
        :actions="[
          { id: 'duplicate', label: 'Duplicate' },
          { id: 'archive', label: 'Archive' },
        ]"
        destructive-label="Delete Record"
        confirm-header="Delete this record?"
        confirm-message="This operation permanently removes the record and cannot be undone."
        @action="handleMenuAction"
        @confirm-destructive="handleDangerConfirmed"
      >
        <template #primary>
          <PrimaryButton
            size="small"
            @click="notify('success', 'Saved', 'Primary safe action executed.')"
          >
            Save
          </PrimaryButton>
        </template>
      </V2DestructiveActionMenu>
    </section>
  </div>
</template>
