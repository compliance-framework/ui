<script setup lang="ts">
/**
 * Control links (List template): typed relationships between controls, one at a time or a whole
 * catalog's at once, as tabs. Deleting confirms in the classic dialog. The script is the classic
 * page's; the template and the helpers at the end are new.
 */
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import { plural } from '@/ds/format';
import type { QueryStatus } from '@/ds/query';
import Button from '@/ds/components/Button/Button.vue';
import DataState from '@/ds/components/DataState/DataState.vue';
import DataTable from '@/ds/components/DataTable/DataTable.vue';
import Menu from '@/ds/components/Menu/Menu.vue';
import type { MenuEntry } from '@/ds/components/Menu/menuEntries';
import Tabs from '@/ds/components/Tabs/Tabs.vue';
import Tag from '@/ds/components/Tag/Tag.vue';
import Text from '@/ds/components/Text/Text.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import ListTemplate from '@/ds/templates/ListTemplate/ListTemplate.vue';
import { useToast } from 'primevue/usetoast';
import { useDataApi } from '@/composables/axios';
import { useControlLinkDelete } from '@/composables/controlLinks';
import { usePermissions } from '@/composables/usePermissions';
import { RESOURCES, ACTIONS } from '@/constants/permissions';
import {
  type CatalogLinkRequest,
  type CatalogLinkResult,
  type CatalogLinkSummary,
  type ControlLink,
} from '@/types/control-links';
import type { Catalog } from '@/oscal';

const { can } = usePermissions();
const route = useRoute();
const { deleteControlLink, deleteCatalogLink } = useControlLinkDelete();
const toast = useToast();

/** Individual links, or catalog-level links (`?view=catalog`). */
const view = computed<'links' | 'catalog'>(() =>
  route.query.view === 'catalog' ? 'catalog' : 'links',
);

// The individual-links endpoint is paginated; pull a generous page so the PoC
// shows every edge without a pager. Bump if catalogs grow large enough to need one.
const { data: links, isLoading: loading } = useDataApi<ControlLink[]>(
  '/api/control-links',
  { params: { limit: 500 } },
);

const {
  data: catalogLinks,
  isLoading: catalogLoading,
  execute: reloadCatalogLinks,
} = useDataApi<CatalogLinkSummary[]>('/api/control-links/catalog');

const { execute: syncCatalogLink } = useDataApi<CatalogLinkResult>(
  '/api/control-links/catalog',
  { headers: { 'Content-Type': 'application/json' } },
  { immediate: false },
);

const { data: catalogs } = useDataApi<Catalog[]>('/api/oscal/catalogs');
const catalogById = computed(() => {
  const map = new Map<string, string>();
  for (const c of catalogs.value ?? []) {
    if (c.uuid) map.set(c.uuid, c.metadata?.title ?? c.uuid);
  }
  return map;
});

const syncing = ref<string | null>(null);

function catalogTitle(id: string): string {
  return catalogById.value.get(id) ?? id;
}

function linkKey(link: ControlLink): string {
  return [
    link.sourceCatalogId,
    link.sourceControlId,
    link.targetCatalogId,
    link.targetControlId,
    link.relationshipType,
  ].join('|');
}

function catalogKey(summary: CatalogLinkSummary): string {
  return [
    summary.sourceCatalogId,
    summary.targetCatalogId,
    summary.targetControlId,
    summary.relationshipType,
  ].join('|');
}

async function removeLink(link: ControlLink) {
  const label = `${link.sourceControlId} ${link.relationshipType} ${link.targetControlId}`;
  await deleteControlLink(link, label, () => {
    const key = linkKey(link);
    // Reassign rather than splice: useDataApi exposes `data` as a shallowRef,
    // so in-place mutation wouldn't trigger a re-render.
    if (links.value) {
      links.value = links.value.filter((l) => linkKey(l) !== key);
    }
  });
}

async function removeCatalogLink(summary: CatalogLinkSummary) {
  const label = `${catalogTitle(summary.sourceCatalogId)} ${summary.relationshipType} ${summary.targetControlId}`;
  await deleteCatalogLink(summary, label, () => {
    const key = catalogKey(summary);
    if (catalogLinks.value) {
      catalogLinks.value = catalogLinks.value.filter(
        (s) => catalogKey(s) !== key,
      );
    }
  });
}

async function resync(summary: CatalogLinkSummary) {
  syncing.value = catalogKey(summary);
  try {
    const payload: CatalogLinkRequest = {
      sourceCatalogId: summary.sourceCatalogId,
      target: {
        catalogId: summary.targetCatalogId,
        controlId: summary.targetControlId,
      },
      relationshipType: summary.relationshipType,
    };
    const res = await syncCatalogLink({ method: 'PUT', data: payload });
    const result = res.data.value?.data as CatalogLinkResult | undefined;
    toast.add({
      severity: 'success',
      summary: 'Catalog link re-synced',
      detail: `Now ${result?.created ?? 0} link${
        (result?.created ?? 0) === 1 ? '' : 's'
      } (removed ${result?.deleted ?? 0}, skipped ${result?.skipped ?? 0}).`,
      life: 4000,
    });
    await reloadCatalogLinks();
  } catch {
    toast.add({
      severity: 'error',
      summary: 'Re-sync Failed',
      detail: 'Failed to re-sync the catalog link.',
      life: 3000,
    });
  } finally {
    syncing.value = null;
  }
}

// Design-system view ---------------------------------------------------------------------------

const tabs = computed(() => [
  {
    label: 'Individual links',
    to: { query: { ...route.query, view: undefined } },
    count: links.value?.length,
  },
  {
    label: 'Catalog links',
    to: { query: { ...route.query, view: 'catalog' } },
    count: catalogLinks.value?.length,
  },
]);
const status = (isLoading: boolean, list?: unknown[] | null): QueryStatus =>
  isLoading && !list ? 'loading' : list?.length ? 'ready' : 'empty';
const deleteDenied = computed(() =>
  can(RESOURCES.CONTROL_LINK, ACTIONS.DELETE)
    ? undefined
    : "Your access doesn't include deleting control links.",
);
const updateDenied = computed(() =>
  can(RESOURCES.CONTROL_LINK, ACTIONS.UPDATE)
    ? undefined
    : "Your access doesn't include changing control links.",
);

function linkActions(link: ControlLink): MenuEntry[] {
  return [
    {
      label: 'Delete link',
      icon: 'delete',
      tone: 'danger',
      disabledReason: deleteDenied.value,
      onSelect: () => void removeLink(link),
    },
  ];
}
function catalogActions(summary: CatalogLinkSummary): MenuEntry[] {
  return [
    {
      label: 'Re-sync with the source catalog',
      icon: 'refresh',
      disabledReason:
        updateDenied.value ??
        (syncing.value === catalogKey(summary) ? 'Re-syncing now.' : undefined),
      onSelect: () => void resync(summary),
    },
    {
      label: 'Delete all its links',
      icon: 'delete',
      tone: 'danger',
      disabledReason: deleteDenied.value,
      onSelect: () => void removeCatalogLink(summary),
    },
  ];
}
</script>

<template>
  <ListTemplate
    title="Control Links"
    description="Typed relationships between controls: one control implements or documents another."
  >
    <template #actions>
      <Button
        variant="primary"
        icon="add"
        :to="{ name: 'control-links-create' }"
        >New control link</Button
      >
    </template>

    <Tabs label="Kinds of control link" :tabs="tabs">
      <DataState
        v-if="view === 'links'"
        :status="status(loading, links)"
        subject="control links"
        empty-title="No control links yet"
        empty-body="Link a control to another to say it implements or documents it."
        icon="link"
      >
        <DataTable
          :caption="plural(links?.length ?? 0, 'control link')"
          caption-hidden
          :columns="[
            { key: 'source', label: 'Source', minWidth: 'sm' },
            { key: 'relationship', label: 'Relationship', nowrap: true },
            { key: 'target', label: 'Target', minWidth: 'sm' },
          ]"
          :rows="(links ?? []).map((link) => ({ id: linkKey(link), link }))"
          :row-key="(r) => r.id"
        >
          <template #cell-source="{ row: r }">
            <Stack gap="1">
              {{ r.link.sourceControlId }}
              <Text as="span" variant="caption">{{
                catalogTitle(r.link.sourceCatalogId)
              }}</Text>
            </Stack>
          </template>
          <template #cell-relationship="{ row: r }"
            ><Tag :label="r.link.relationshipType"
          /></template>
          <template #cell-target="{ row: r }">
            <Stack gap="1">
              {{ r.link.targetControlId }}
              <Text as="span" variant="caption">{{
                catalogTitle(r.link.targetCatalogId)
              }}</Text>
            </Stack>
          </template>
          <template #actions="{ row: r }">
            <Menu
              :label="`Actions for ${r.link.sourceControlId} to ${r.link.targetControlId}`"
              :items="linkActions(r.link)"
            />
          </template>
        </DataTable>
      </DataState>

      <DataState
        v-else
        :status="status(catalogLoading, catalogLinks)"
        subject="catalog links"
        empty-title="No catalog links yet"
        empty-body="A catalog link relates every control in a catalog to one target control. Create one with the Whole catalog scope."
        icon="link"
      >
        <DataTable
          :caption="plural(catalogLinks?.length ?? 0, 'catalog link')"
          caption-hidden
          :columns="[
            { key: 'source', label: 'Source catalog', minWidth: 'sm' },
            { key: 'relationship', label: 'Relationship', nowrap: true },
            { key: 'target', label: 'Target', minWidth: 'sm' },
            { key: 'count', label: 'Controls', align: 'end' },
          ]"
          :rows="
            (catalogLinks ?? []).map((summary) => ({
              id: catalogKey(summary),
              summary,
            }))
          "
          :row-key="(r) => r.id"
        >
          <template #cell-source="{ row: r }">{{
            catalogTitle(r.summary.sourceCatalogId)
          }}</template>
          <template #cell-relationship="{ row: r }"
            ><Tag :label="r.summary.relationshipType"
          /></template>
          <template #cell-target="{ row: r }">
            <Stack gap="1">
              {{ r.summary.targetControlId }}
              <Text as="span" variant="caption">{{
                catalogTitle(r.summary.targetCatalogId)
              }}</Text>
            </Stack>
          </template>
          <template #cell-count="{ row: r }">{{
            r.summary.controlCount
          }}</template>
          <template #actions="{ row: r }">
            <Menu
              :label="`Actions for ${catalogTitle(r.summary.sourceCatalogId)}`"
              :items="catalogActions(r.summary)"
            />
          </template>
        </DataTable>
      </DataState>
    </Tabs>
  </ListTemplate>
</template>
