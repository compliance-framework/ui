<script setup lang="ts">
/**
 * Configure System → Export Offerings (reached by link): the offerings this system publishes for
 * others to inherit from, with their status, version and items, and a menu to edit, manage
 * items, set the allowed downstream systems, publish, deprecate or revoke. The forms and the
 * items and allowlist editors are classic islands in design-system dialogs.
 */
import { computed, ref } from 'vue';
import { useToast } from 'primevue/usetoast';
import { useAuthenticatedInstance } from '@/composables/axios';
import { usePermissions } from '@/composables/usePermissions';
import { RESOURCES, ACTIONS } from '@/constants/permissions';
import type { ControlImplementation, SystemImplementation } from '@/oscal';
import type {
  SSPExportOffering,
  SSPExportOfferingItem,
} from '@/types/ssp-export-offerings';
import { getErrorDetail } from '@/utils/httpErrors';
import { formatDate, plural } from '@/ds/format';
import { useApiQuery } from '@/ds/query';
import Button from '@/ds/components/Button/Button.vue';
import ConfirmDialog from '@/ds/components/ConfirmDialog/ConfirmDialog.vue';
import DataState from '@/ds/components/DataState/DataState.vue';
import DataTable from '@/ds/components/DataTable/DataTable.vue';
import type { DataTableColumn } from '@/ds/components/DataTable/types';
import Dialog from '@/ds/components/Dialog/Dialog.vue';
import Menu from '@/ds/components/Menu/Menu.vue';
import type { MenuEntry } from '@/ds/components/Menu/menuEntries';
import Tag from '@/ds/components/Tag/Tag.vue';
import Text from '@/ds/components/Text/Text.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import LegacyPage from '@/views/layouts/LegacyPage.vue';
import ExportOfferingCreateForm from '@/components/system-security-plans/ExportOfferingCreateForm.vue';
import ExportOfferingEditForm from '@/components/system-security-plans/ExportOfferingEditForm.vue';
import ExportOfferingItemsDialog from '@/components/system-security-plans/ExportOfferingItemsDialog.vue';
import ExportOfferingAllowlistDialog from '@/components/system-security-plans/ExportOfferingAllowlistDialog.vue';

const props = defineProps<{ sspId: string }>();

const toast = useToast();
const api = useAuthenticatedInstance();
const { can } = usePermissions();

const base = `/api/oscal/system-security-plans/${props.sspId}`;
const offerings = useApiQuery<SSPExportOffering[]>(`${base}/export-offerings`, {
  isEmpty: (list) => list.length === 0,
});
// The items editor picks from the plan's control and system implementation.
const controlImplementation = useApiQuery<ControlImplementation>(
  `${base}/control-implementation`,
);
const systemImplementation = useApiQuery<SystemImplementation>(
  `${base}/system-implementation`,
);

const createDenied = computed(() =>
  can(RESOURCES.SSP_EXPORT_OFFERING, ACTIONS.CREATE)
    ? undefined
    : "Your access doesn't include creating export offerings.",
);
const editDenied = computed(() =>
  can(RESOURCES.SSP_EXPORT_OFFERING, ACTIONS.UPDATE)
    ? undefined
    : "Your access doesn't include changing export offerings.",
);
const exportDenied = computed(() =>
  can(RESOURCES.SSP, ACTIONS.EXPORT)
    ? undefined
    : "Your access doesn't include exporting from this security plan.",
);

const rows = computed(() =>
  (offerings.data.value ?? []).map((offering) => ({
    id: offering.id,
    title: offering.title,
    status: offering.status,
    version: `v${offering.version}`,
    items: plural(offering.items?.length ?? 0, 'item'),
    published: offering.publishedAt ? formatDate(offering.publishedAt) : '',
    offering,
  })),
);

const columns: DataTableColumn[] = [
  { key: 'title', label: 'Offering', minWidth: 'sm' },
  { key: 'status', label: 'Status', nowrap: true },
  { key: 'version', label: 'Version', nowrap: true },
  { key: 'items', label: 'Items', nowrap: true },
  { key: 'published', label: 'Published', nowrap: true },
];

function replace(updated: SSPExportOffering) {
  const list = offerings.data.value ?? [];
  offerings.data.value = list.some((o) => o.id === updated.id)
    ? list.map((o) => (o.id === updated.id ? updated : o))
    : [...list, updated];
}

// Dialogs ------------------------------------------------------------------------------------

const creating = ref(false);
const editing = ref<SSPExportOffering>();
const managingItems = ref<SSPExportOffering>();
const allowlisting = ref<SSPExportOffering>();
const changing = ref<{
  offering: SSPExportOffering;
  status: 'deprecated' | 'revoked';
}>();
const openWhile = <T,>(target: { value: T | undefined }) =>
  computed({
    get: () => Boolean(target.value),
    set: (open: boolean) => {
      if (!open) target.value = undefined;
    },
  });
const editOpen = openWhile(editing);
const itemsOpen = openWhile(managingItems);
const allowlistOpen = openWhile(allowlisting);
const changeOpen = openWhile(changing);

function created(offering: SSPExportOffering) {
  replace(offering);
  creating.value = false;
}

function saved(offering: SSPExportOffering) {
  replace(offering);
  editing.value = undefined;
}

function itemsUpdated(items: SSPExportOfferingItem[]) {
  if (!managingItems.value) return;
  managingItems.value = { ...managingItems.value, items };
  replace(managingItems.value);
}

// Publish and status -------------------------------------------------------------------------

const publishing = ref(new Set<string>());

async function publish(offering: SSPExportOffering) {
  if (publishing.value.has(offering.id)) return;
  publishing.value.add(offering.id);
  try {
    const response = await api.post<{ data: SSPExportOffering }>(
      `${base}/export-offerings/${offering.id}/publish`,
    );
    replace(response.data.data);
    toast.add({
      severity: 'success',
      summary: 'Offering published',
      detail: `${offering.title} is published.`,
      life: 3000,
    });
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: `${offering.title} wasn't published`,
      detail: await getErrorDetail(error, 'Try again.'),
      life: 5000,
    });
  } finally {
    publishing.value.delete(offering.id);
  }
}

async function changeStatus() {
  const change = changing.value;
  changing.value = undefined;
  if (!change) return;
  const { offering, status } = change;
  try {
    const response = await api.patch<{ data: SSPExportOffering }>(
      `${base}/export-offerings/${offering.id}/status`,
      { status },
    );
    replace(response.data.data);
    toast.add({
      severity: 'success',
      summary: `Offering ${status}`,
      detail: `${offering.title} is ${status}.`,
      life: 3000,
    });
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: `${offering.title} wasn't ${status === 'deprecated' ? 'deprecated' : 'revoked'}`,
      detail: await getErrorDetail(error, 'Try again.'),
      life: 5000,
    });
  }
}

function actions(offering: SSPExportOffering): MenuEntry[] {
  const live = offering.status === 'published';
  return [
    {
      label: 'Edit offering',
      icon: 'edit',
      disabledReason: editDenied.value,
      onSelect: () => (editing.value = offering),
    },
    {
      label: 'Manage items',
      icon: 'controls',
      onSelect: () => (managingItems.value = offering),
    },
    {
      label: 'Allowed downstream systems',
      icon: 'systems',
      disabledReason: exportDenied.value,
      onSelect: () => (allowlisting.value = offering),
    },
    ...(offering.status === 'draft' || live
      ? [
          {
            label: offering.status === 'draft' ? 'Publish' : 'Republish',
            icon: 'share' as const,
            disabledReason: exportDenied.value,
            onSelect: () => void publish(offering),
          },
        ]
      : []),
    ...(live
      ? [
          {
            label: 'Deprecate',
            icon: 'paused' as const,
            disabledReason: exportDenied.value,
            onSelect: () =>
              (changing.value = { offering, status: 'deprecated' }),
          },
          {
            label: 'Revoke',
            icon: 'close' as const,
            tone: 'danger' as const,
            disabledReason: exportDenied.value,
            onSelect: () => (changing.value = { offering, status: 'revoked' }),
          },
        ]
      : []),
  ];
}
</script>

<template>
  <Stack gap="5">
    <div>
      <Button
        variant="primary"
        icon="add"
        :disabled-reason="createDenied"
        @click="creating = true"
        >New offering</Button
      >
    </div>
    <DataState
      :status="offerings.status.value"
      subject="export offerings"
      empty-title="No export offerings yet"
      empty-body="An export offering shares controls this system provides, so other systems can inherit them."
      icon="frameworks"
      @retry="offerings.retry"
    >
      <DataTable
        :caption="plural(rows.length, 'offering')"
        caption-hidden
        :columns="columns"
        :rows="rows"
        :row-key="(r) => r.id"
      >
        <template #cell-title="{ row: r }">
          <Stack gap="1">
            <Text as="span">{{ r.title }}</Text>
            <Text v-if="r.offering.description" as="span" variant="secondary">{{
              r.offering.description
            }}</Text>
          </Stack>
        </template>
        <template #cell-status="{ row: r }"><Tag :label="r.status" /></template>
        <template #cell-published="{ row: r }">{{
          r.published || 'Not yet'
        }}</template>
        <template #actions="{ row: r }">
          <Menu
            :label="`Actions for ${r.title}`"
            :items="actions(r.offering)"
          />
        </template>
      </DataTable>
    </DataState>

    <Dialog v-model:open="creating" title="New export offering" size="l">
      <LegacyPage>
        <ExportOfferingCreateForm
          :ssp-id="sspId"
          @cancel="creating = false"
          @created="created"
        />
      </LegacyPage>
    </Dialog>
    <Dialog v-model:open="editOpen" title="Edit export offering" size="l">
      <LegacyPage>
        <ExportOfferingEditForm
          v-if="editing"
          :ssp-id="sspId"
          :offering="editing"
          @cancel="editing = undefined"
          @saved="saved"
        />
      </LegacyPage>
    </Dialog>
    <Dialog
      v-model:open="itemsOpen"
      :title="`Items in ${managingItems?.title ?? 'the offering'}`"
      size="l"
    >
      <LegacyPage>
        <ExportOfferingItemsDialog
          v-if="managingItems"
          :ssp-id="sspId"
          :offering="managingItems"
          :control-implementation="controlImplementation.data.value"
          :system-implementation="systemImplementation.data.value"
          @updated="itemsUpdated"
        />
      </LegacyPage>
    </Dialog>
    <Dialog
      v-model:open="allowlistOpen"
      :title="`Systems allowed to subscribe to ${allowlisting?.title ?? 'the offering'}`"
      size="l"
    >
      <LegacyPage>
        <ExportOfferingAllowlistDialog
          v-if="allowlisting"
          :ssp-id="sspId"
          :offering-id="allowlisting.id"
        />
      </LegacyPage>
    </Dialog>
    <ConfirmDialog
      v-model:open="changeOpen"
      :title="`${changing?.status === 'revoked' ? 'Revoke' : 'Deprecate'} ${changing?.offering.title ?? 'this offering'}?`"
      :confirm-label="changing?.status === 'revoked' ? 'Revoke' : 'Deprecate'"
      @confirm="changeStatus"
      ><Text
        >Systems that inherit from it will see it as
        {{ changing?.status ?? 'changed' }}. This can't be undone.</Text
      ></ConfirmDialog
    >
  </Stack>
</template>
