<template>
  <div
    class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
  >
    <div>
      <PageHeader>Control Links</PageHeader>
      <PageSubHeader>
        Typed relationships between controls (implements / documents)
      </PageSubHeader>
    </div>
    <RouterLinkButton :to="{ name: 'control-links-create' }">
      <i class="pi pi-plus mr-2"></i>
      Create Control Link
    </RouterLinkButton>
  </div>

  <div class="mt-6">
    <SelectButton
      v-model="view"
      :options="viewOptions"
      optionLabel="label"
      optionValue="value"
      :allowEmpty="false"
      aria-label="Toggle individual or catalog-level links"
    />
  </div>

  <!-- Individual links -->
  <div
    v-if="view === 'links'"
    class="mt-4 overflow-hidden rounded-lg border border-ccf-300 bg-white shadow dark:border-slate-700 dark:bg-slate-900"
  >
    <div
      v-if="loading"
      class="px-6 py-8 text-sm text-gray-500 dark:text-slate-400"
    >
      Loading control links…
    </div>
    <div
      v-else-if="!links || links.length === 0"
      class="px-6 py-8 text-sm text-gray-500 dark:text-slate-400"
    >
      No control links yet. Create one to relate a control to another.
    </div>
    <table v-else class="table-auto w-full dark:text-slate-300">
      <thead class="bg-gray-50 dark:bg-slate-800">
        <tr class="border-b border-ccf-300 dark:border-slate-700">
          <th :class="thLeft">Source</th>
          <th :class="thLeft">Relationship</th>
          <th :class="thLeft">Target</th>
          <th :class="thRight">Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr
          class="hover:bg-zinc-50 dark:hover:bg-slate-800 border-b border-ccf-300 dark:border-slate-800"
          v-for="link in links"
          :key="linkKey(link)"
        >
          <td class="px-6 py-4 text-sm text-gray-900 dark:text-slate-300">
            <div class="font-medium">{{ link.sourceControlId }}</div>
            <div class="text-xs text-gray-500 dark:text-slate-400">
              {{ catalogTitle(link.sourceCatalogId) }}
            </div>
          </td>
          <td class="px-6 py-4 text-sm">
            <span
              class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
              :class="relationshipClass(link.relationshipType)"
            >
              {{ link.relationshipType }}
            </span>
          </td>
          <td class="px-6 py-4 text-sm text-gray-900 dark:text-slate-300">
            <div class="font-medium">{{ link.targetControlId }}</div>
            <div class="text-xs text-gray-500 dark:text-slate-400">
              {{ catalogTitle(link.targetCatalogId) }}
            </div>
          </td>
          <td class="px-6 py-4 text-right text-sm font-medium">
            <div class="flex gap-2 justify-end">
              <TertiaryButton
                @click="removeLink(link)"
                title="Delete Control Link"
                :disabled="!can(RESOURCES.CONTROL_LINK, ACTIONS.DELETE)"
                v-tooltip.top="deleteTooltip"
                :class="dangerBtn"
              >
                Delete
              </TertiaryButton>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- Catalog-level links -->
  <div
    v-else
    class="mt-4 overflow-hidden rounded-lg border border-ccf-300 bg-white shadow dark:border-slate-700 dark:bg-slate-900"
  >
    <div
      v-if="catalogLoading"
      class="px-6 py-8 text-sm text-gray-500 dark:text-slate-400"
    >
      Loading catalog links…
    </div>
    <div
      v-else-if="!catalogLinks || catalogLinks.length === 0"
      class="px-6 py-8 text-sm text-gray-500 dark:text-slate-400"
    >
      No catalog-level links yet. Create one with the “Whole catalog” scope.
    </div>
    <table v-else class="table-auto w-full dark:text-slate-300">
      <thead class="bg-gray-50 dark:bg-slate-800">
        <tr class="border-b border-ccf-300 dark:border-slate-700">
          <th :class="thLeft">Source catalog</th>
          <th :class="thLeft">Relationship</th>
          <th :class="thLeft">Target</th>
          <th :class="thLeft">Controls</th>
          <th :class="thRight">Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr
          class="hover:bg-zinc-50 dark:hover:bg-slate-800 border-b border-ccf-300 dark:border-slate-800"
          v-for="summary in catalogLinks"
          :key="catalogKey(summary)"
        >
          <td
            class="px-6 py-4 text-sm font-medium text-gray-900 dark:text-slate-300"
          >
            {{ catalogTitle(summary.sourceCatalogId) }}
          </td>
          <td class="px-6 py-4 text-sm">
            <span
              class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
              :class="relationshipClass(summary.relationshipType)"
            >
              {{ summary.relationshipType }}
            </span>
          </td>
          <td class="px-6 py-4 text-sm text-gray-900 dark:text-slate-300">
            <div class="font-medium">{{ summary.targetControlId }}</div>
            <div class="text-xs text-gray-500 dark:text-slate-400">
              {{ catalogTitle(summary.targetCatalogId) }}
            </div>
          </td>
          <td class="px-6 py-4 text-sm text-gray-900 dark:text-slate-300">
            <span
              class="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-700 dark:text-slate-200"
            >
              {{ summary.controlCount }}
            </span>
          </td>
          <td class="px-6 py-4 text-right text-sm font-medium">
            <div class="flex gap-2 justify-end">
              <SecondaryButton
                @click="resync(summary)"
                title="Re-sync to the source catalog's current controls"
                :disabled="
                  syncing === catalogKey(summary) ||
                  !can(RESOURCES.CONTROL_LINK, ACTIONS.UPDATE)
                "
                v-tooltip.top="{
                  value: permissionTooltip(
                    RESOURCES.CONTROL_LINK,
                    ACTIONS.UPDATE,
                  ),
                  disabled: can(RESOURCES.CONTROL_LINK, ACTIONS.UPDATE),
                }"
              >
                <i
                  class="pi mr-1"
                  :class="
                    syncing === catalogKey(summary)
                      ? 'pi-spin pi-spinner'
                      : 'pi-refresh'
                  "
                ></i>
                Re-sync
              </SecondaryButton>
              <TertiaryButton
                @click="removeCatalogLink(summary)"
                title="Delete all links in this catalog link"
                :disabled="!can(RESOURCES.CONTROL_LINK, ACTIONS.DELETE)"
                v-tooltip.top="deleteTooltip"
                :class="dangerBtn"
              >
                Delete
              </TertiaryButton>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import PageHeader from '@/components/PageHeader.vue';
import PageSubHeader from '@/components/PageSubHeader.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import TertiaryButton from '@/volt/TertiaryButton.vue';
import SelectButton from '@/volt/SelectButton.vue';
import RouterLinkButton from '@/components/RouterLinkButton.vue';
import { useToast } from 'primevue/usetoast';
import { useDataApi } from '@/composables/axios';
import { useControlLinkDelete } from '@/composables/controlLinks';
import { usePermissions } from '@/composables/usePermissions';
import { RESOURCES, ACTIONS } from '@/constants/permissions';
import {
  RELATIONSHIP_IMPLEMENTS,
  type CatalogLinkRequest,
  type CatalogLinkResult,
  type CatalogLinkSummary,
  type ControlLink,
} from '@/types/control-links';
import type { Catalog } from '@/oscal';

const { can, permissionTooltip } = usePermissions();
const { deleteControlLink, deleteCatalogLink } = useControlLinkDelete();
const toast = useToast();

const view = ref<'links' | 'catalog'>('links');
const viewOptions = [
  { label: 'Individual links', value: 'links' },
  { label: 'Catalog links', value: 'catalog' },
];

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

const thLeft =
  'px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-slate-400';
const thRight =
  'px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-slate-400';
const dangerBtn =
  'border-red-200 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/40';

const syncing = ref<string | null>(null);

const deleteTooltip = computed(() => ({
  value: permissionTooltip(RESOURCES.CONTROL_LINK, ACTIONS.DELETE),
  disabled: can(RESOURCES.CONTROL_LINK, ACTIONS.DELETE),
}));

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

function relationshipClass(type: string): string {
  return type === RELATIONSHIP_IMPLEMENTS
    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
    : 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300';
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
</script>
