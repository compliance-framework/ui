<script setup lang="ts">
/**
 * A POA&M's Local definitions tab: the components, inventory items and assessment assets defined
 * in the plan itself, plus remarks. They are edited together in one classic form, in a
 * design-system dialog. The API answers 404 while a plan has none.
 */
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import type { POAMLocalDefinitions } from '@/oscal';
import { usePermissions } from '@/composables/usePermissions';
import { RESOURCES, ACTIONS } from '@/constants/permissions';
import { useApiQuery } from '@/ds/query';
import Button from '@/ds/components/Button/Button.vue';
import DataState from '@/ds/components/DataState/DataState.vue';
import Dialog from '@/ds/components/Dialog/Dialog.vue';
import ItemList from '@/ds/components/ItemList/ItemList.vue';
import Text from '@/ds/components/Text/Text.vue';
import Panel from '@/ds/components/layout/Panel.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import LegacyPage from '@/views/layouts/LegacyPage.vue';
import LocalDefinitionsForm from '@/components/poam/LocalDefinitionsForm.vue';

const route = useRoute();
const { can } = usePermissions();

const poamId = route.params.id as string;

const definitions = useApiQuery<POAMLocalDefinitions | null>(
  `/api/oscal/plan-of-action-and-milestones/${poamId}/local-definitions`,
  {
    notFoundIsEmpty: true,
    isEmpty: (data) =>
      !data ||
      (!data.components?.length &&
        !data.inventoryItems?.length &&
        !data.assessmentAssets?.components?.length &&
        !data.remarks),
  },
);
const data = computed(() => definitions.data.value ?? undefined);
const exists = computed(() => definitions.status.value === 'ready');

const editDenied = computed(() =>
  can(RESOURCES.POAM_OSCAL, exists.value ? ACTIONS.UPDATE : ACTIONS.CREATE)
    ? undefined
    : "Your access doesn't include changing POA&M local definitions.",
);

const components = computed(() =>
  (data.value?.components ?? []).map((c) => ({
    id: c.uuid,
    title: c.title || 'Untitled component',
    meta: [c.type, c.status?.state, c.description].filter(Boolean).join(' · '),
  })),
);
const inventory = computed(() =>
  (data.value?.inventoryItems ?? []).map((item, index) => ({
    id: item.uuid,
    title: item.description || `Inventory item ${index + 1}`,
    meta: [item.remarks, item.uuid].filter(Boolean).join(' · '),
  })),
);
const assets = computed(() =>
  (data.value?.assessmentAssets?.components ?? []).map((c) => ({
    id: c.uuid,
    title: c.title || 'Untitled component',
    meta: [c.type, c.uuid].filter(Boolean).join(' · '),
  })),
);

const editing = ref(false);

function saved(next: POAMLocalDefinitions) {
  definitions.data.value = next;
  editing.value = false;
}
</script>

<template>
  <Stack gap="5">
    <div>
      <Button
        :variant="exists ? 'secondary' : 'primary'"
        :icon="exists ? 'edit' : 'add'"
        :disabled-reason="editDenied"
        @click="editing = true"
        >{{
          exists ? 'Edit local definitions' : 'Add local definitions'
        }}</Button
      >
    </div>
    <DataState
      :status="definitions.status.value"
      subject="local definitions"
      empty-title="No local definitions yet"
      empty-body="Local definitions describe components, inventory items and assessment assets that only this plan refers to."
      icon="components"
      @retry="definitions.retry"
    >
      <Stack gap="4">
        <Panel title="Components" :level="2">
          <ItemList :items="components" empty-text="No local components." />
        </Panel>
        <Panel title="Inventory items" :level="2">
          <ItemList :items="inventory" empty-text="No local inventory items." />
        </Panel>
        <Panel title="Assessment assets" :level="2">
          <ItemList :items="assets" empty-text="No assessment assets." />
        </Panel>
        <Panel v-if="data?.remarks" title="Remarks" :level="2">
          <Text preserve-whitespace>{{ data.remarks }}</Text>
        </Panel>
      </Stack>
    </DataState>

    <Dialog
      v-model:open="editing"
      :title="exists ? 'Edit local definitions' : 'Add local definitions'"
      size="l"
    >
      <LegacyPage>
        <LocalDefinitionsForm
          v-if="editing"
          :poam-id="poamId"
          :local-definitions="data || undefined"
          @cancel="editing = false"
          @saved="saved"
        />
      </LegacyPage>
    </Dialog>
  </Stack>
</template>
