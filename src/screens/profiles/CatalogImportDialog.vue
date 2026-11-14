<script setup lang="ts">
/** Choose a catalog to import into a profile; catalogs already imported can't be chosen again. */
import { computed } from 'vue';
import type { Catalog } from '@/oscal';
import { usePermissions } from '@/composables/usePermissions';
import { ACTIONS, RESOURCES } from '@/constants/permissions';
import { plural } from '@/ds/format';
import { useApiQuery } from '@/ds/query';
import Button from '@/ds/components/Button/Button.vue';
import DataState from '@/ds/components/DataState/DataState.vue';
import DataTable from '@/ds/components/DataTable/DataTable.vue';
import Dialog from '@/ds/components/Dialog/Dialog.vue';

const props = defineProps<{ importedCatalogs: Record<string, string> }>();
const open = defineModel<boolean>('open', { default: false });
const emit = defineEmits<{ import: [catalog: Catalog] }>();

const { can } = usePermissions();
const catalogs = useApiQuery<Catalog[]>('/api/oscal/catalogs', {
  isEmpty: (list) => list.length === 0,
});
const rows = computed(() =>
  (catalogs.data.value ?? []).map((catalog) => ({
    id: catalog.uuid,
    title: catalog.metadata.title,
    catalog,
  })),
);
const reason = (id: string) =>
  !can(RESOURCES.PROFILE, ACTIONS.UPDATE)
    ? "Your access doesn't include changing profiles."
    : props.importedCatalogs[id]
      ? 'Already imported in this profile.'
      : undefined;
</script>

<template>
  <Dialog v-model:open="open" title="Import a catalog" size="l">
    <DataState
      :status="catalogs.status.value"
      subject="catalogs"
      empty-title="No catalogs yet"
      empty-body="Create or import a catalog first."
      icon="catalogs"
      @retry="catalogs.retry"
    >
      <DataTable
        :caption="plural(rows.length, 'catalog')"
        caption-hidden
        :columns="[{ key: 'title', label: 'Catalog', minWidth: 'sm' }]"
        :rows="rows"
        :row-key="(r) => r.id"
      >
        <template #actions="{ row: r }">
          <Button
            size="sm"
            :disabled-reason="reason(r.id)"
            @click="emit('import', r.catalog)"
            >Import</Button
          >
        </template>
      </DataTable>
    </DataState>
  </Dialog>
</template>
