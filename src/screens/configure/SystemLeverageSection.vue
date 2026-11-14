<script setup lang="ts">
/**
 * Configure System → Leverage (reached by link): the published export offerings of other systems,
 * with Subscribe opening the classic subscribe wizard in a design-system dialog. The flat catalog
 * is the only fetch, by design: it omits upstream SSP details, so nothing here needs read access
 * to the upstream system.
 */
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import { usePermissions } from '@/composables/usePermissions';
import { RESOURCES, ACTIONS } from '@/constants/permissions';
import type { CatalogOffering } from '@/types/ssp-export-offerings';
import { plural } from '@/ds/format';
import { useApiQuery } from '@/ds/query';
import Button from '@/ds/components/Button/Button.vue';
import DataState from '@/ds/components/DataState/DataState.vue';
import DataTable from '@/ds/components/DataTable/DataTable.vue';
import type { DataTableColumn } from '@/ds/components/DataTable/types';
import Dialog from '@/ds/components/Dialog/Dialog.vue';
import Text from '@/ds/components/Text/Text.vue';
import TextLink from '@/ds/components/TextLink/TextLink.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import LegacyPage from '@/views/layouts/LegacyPage.vue';
import SubscribeOfferingWizard from '@/components/system-security-plans/SubscribeOfferingWizard.vue';

const props = defineProps<{ sspId: string }>();
const route = useRoute();
const { can } = usePermissions();

const offerings = useApiQuery<CatalogOffering[]>(
  '/api/oscal/ssp-export-offerings',
  { isEmpty: (list) => list.length === 0 },
);

const subscribeDenied = computed(() =>
  !can(RESOURCES.SSP_EXPORT_OFFERING, ACTIONS.SUBSCRIBE)
    ? "Your access doesn't include subscribing to export offerings."
    : !can(RESOURCES.SSP, ACTIONS.UPDATE)
      ? "Your access doesn't include changing this security plan."
      : undefined,
);

function itemSummary(offering: CatalogOffering): string {
  const items = offering.items ?? [];
  if (!items.length) return 'No items';
  const controlIds = [...new Set(items.map((item) => item.controlId))];
  const remaining = controlIds.length - 3;
  return `${plural(items.length, 'item')}: ${controlIds.slice(0, 3).join(', ')}${
    remaining > 0 ? ` (+${remaining} more)` : ''
  }`;
}

const rows = computed(() =>
  (offerings.data.value ?? []).map((offering) => ({
    id: offering.id,
    title: offering.title,
    description: offering.description ?? '',
    version: `v${offering.version}`,
    items: itemSummary(offering),
    offering,
  })),
);

const columns: DataTableColumn[] = [
  { key: 'title', label: 'Offering', minWidth: 'sm' },
  { key: 'version', label: 'Version', nowrap: true },
  { key: 'items', label: 'Items' },
];

const subscribing = ref<CatalogOffering>();
const subscribeOpen = computed({
  get: () => Boolean(subscribing.value),
  set: (open: boolean) => {
    if (!open) subscribing.value = undefined;
  },
});
</script>

<template>
  <Stack gap="4">
    <Text variant="secondary"
      >Subscribing inherits an offering's controls into this plan. What you
      inherit shows under
      <TextLink
        :to="{
          name: 'system-configure-inherited-capabilities',
          params: route.params,
        }"
        >Inherited capabilities</TextLink
      >.</Text
    >
    <DataState
      :status="offerings.status.value"
      subject="export offerings"
      empty-title="No published export offerings yet"
      empty-body="When another system publishes an export offering, it appears here to subscribe to."
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
            <Text v-if="r.description" as="span" variant="secondary">{{
              r.description
            }}</Text>
          </Stack>
        </template>
        <template #actions="{ row: r }">
          <Button
            :disabled-reason="subscribeDenied"
            @click="subscribing = r.offering"
            >Subscribe</Button
          >
        </template>
      </DataTable>
    </DataState>

    <Dialog
      v-model:open="subscribeOpen"
      :title="`Subscribe to ${subscribing?.title ?? 'offering'}`"
      size="l"
    >
      <LegacyPage>
        <SubscribeOfferingWizard
          v-if="subscribing"
          :ssp-id="props.sspId"
          :offering="subscribing"
          @cancel="subscribing = undefined"
          @subscribed="subscribing = undefined"
        />
      </LegacyPage>
    </Dialog>
  </Stack>
</template>
