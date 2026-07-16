<template>
  <Dialog
    v-model:visible="visible"
    size="xl"
    modal
    header="Inherit from another system"
  >
    <div
      v-if="loading"
      class="py-6 text-sm text-gray-500 dark:text-slate-400 flex items-center gap-2"
    >
      <i class="pi pi-spin pi-spinner"></i>
      Loading what other systems share…
    </div>

    <Message v-else-if="loadError" severity="error" variant="outlined">
      <div class="flex items-center justify-between gap-3">
        <span>Could not load the shared implementations catalog.</span>
        <SecondaryButton type="button" size="small" @click="reload">
          Retry
        </SecondaryButton>
      </div>
    </Message>

    <div
      v-else-if="!groups.length"
      class="py-6 text-sm text-gray-500 dark:text-slate-400"
    >
      No shared implementations are published yet. Ask the owning team to share
      theirs from their Controls page.
    </div>

    <form v-else class="space-y-4" @submit.prevent="importSelected">
      <Message
        v-if="currentControlId && hasCurrentControlMatches"
        severity="info"
        variant="simple"
      >
        Items matching {{ currentControlId }} — the control you have open — are
        listed first and preselected.
      </Message>

      <InputText
        v-model="search"
        class="w-full"
        placeholder="Search by control, statement, or system…"
      />

      <div v-for="group in filteredGroups" :key="group.sspId" class="space-y-3">
        <h4 class="text-sm font-semibold dark:text-slate-200">
          {{ group.title }}
        </h4>

        <div
          v-for="offering in group.offerings"
          :key="offering.id"
          class="p-3 border border-ccf-200 dark:border-slate-600 rounded space-y-2"
        >
          <div class="flex items-center justify-between gap-2">
            <div class="text-sm font-medium dark:text-slate-300">
              {{ offering.title }} · v{{ offering.version }}
            </div>
            <Message
              v-if="offeringErrors.get(offering.id)"
              severity="error"
              variant="simple"
            >
              {{ offeringErrors.get(offering.id) }}
            </Message>
          </div>

          <div
            v-for="item in offering.visibleItems"
            :key="item.id"
            class="ml-1"
            :class="{
              'rounded bg-blue-50/60 dark:bg-blue-950/20 p-1':
                isCurrentControlItem(item),
            }"
          >
            <label class="flex items-center gap-2">
              <input
                type="checkbox"
                :checked="selectedItemIds.has(item.id)"
                :disabled="isAlreadyImported(item)"
                @change="toggleItem(item.id)"
              />
              <span
                class="text-sm dark:text-slate-300"
                :class="{
                  'text-gray-400 dark:text-slate-500': isAlreadyImported(item),
                }"
              >
                {{ item.controlId
                }}<span v-if="item.statementId">
                  · Statement {{ item.statementId }}</span
                >
              </span>
              <Badge v-if="isAlreadyImported(item)" severity="secondary">
                Already imported
              </Badge>
            </label>

            <div
              v-if="providedDescriptionFor(item)"
              class="ml-6 text-xs text-green-600 dark:text-green-400"
            >
              {{ providedDescriptionFor(item) }}
            </div>

            <div
              v-if="
                selectedItemIds.has(item.id) && item.responsibilities?.length
              "
              class="mt-1 ml-6 space-y-1"
            >
              <div class="text-xs text-gray-500 dark:text-slate-400">
                You take these on — tick anything you already handle:
              </div>
              <label
                v-for="responsibility in item.responsibilities ?? []"
                :key="responsibility.responsibilityUuid"
                class="flex items-center gap-2"
              >
                <input
                  type="checkbox"
                  :checked="
                    isSatisfied(item.id, responsibility.responsibilityUuid)
                  "
                  @change="
                    toggleSatisfied(item.id, responsibility.responsibilityUuid)
                  "
                />
                <span class="text-sm dark:text-slate-300">
                  {{ responsibility.description }}
                </span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <div
        v-if="!filteredGroups.length"
        class="text-sm text-gray-500 dark:text-slate-400"
      >
        Nothing matches “{{ search }}”.
      </div>

      <p class="text-xs text-gray-500 dark:text-slate-400">
        Imported capabilities stay linked to the providing system — you'll be
        notified when it changes what it shares.
      </p>

      <div
        class="flex justify-end gap-3 pt-2 border-t border-gray-200 dark:border-slate-700"
      >
        <SecondaryButton type="button" @click="visible = false">
          {{ importedAnything ? 'Close' : 'Cancel' }}
        </SecondaryButton>
        <PermissionGate
          :resource="RESOURCES.SSP_EXPORT_OFFERING"
          :action="ACTIONS.SUBSCRIBE"
        >
          <PermissionGate :resource="RESOURCES.SSP" :action="ACTIONS.UPDATE">
            <PrimaryButton
              type="submit"
              :disabled="importing || !selectedItemIds.size"
            >
              {{ importing ? 'Importing…' : 'Import selected' }}
            </PrimaryButton>
          </PermissionGate>
        </PermissionGate>
      </div>
    </form>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { AxiosError } from 'axios';
import Badge from '@/volt/Badge.vue';
import Dialog from '@/volt/Dialog.vue';
import InputText from '@/volt/InputText.vue';
import Message from '@/volt/Message.vue';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import PermissionGate from '@/components/auth/PermissionGate.vue';
import { RESOURCES, ACTIONS } from '@/constants/permissions';
import { useAuthenticatedInstance } from '@/composables/axios';
import {
  buildControlOffersUrl,
  buildSharedResponsibilityUrl,
} from '@/composables/useSharedResponsibility';
import type { SystemSecurityPlan } from '@/oscal';
import type { DataResponse, ErrorBody, ErrorResponse } from '@/stores/types';
import type {
  CatalogOffering,
  CatalogOfferingItem,
  ControlExportOffer,
} from '@/types/ssp-export-offerings';
import type {
  CreatedByComponent,
  CreatedRequirement,
  CreatedStatement,
  SharedResponsibilityRollup,
  SSPLeverageLink,
  SubscribeRequest,
  SubscribeResponse,
  SubscribeResponseMeta,
} from '@/types/ssp-leverage';

const props = defineProps<{
  // The downstream SSP the import lands on.
  sspId: string;
  // The control the user launched the dialog from — its items are surfaced first and
  // preselected.
  currentControlId?: string;
}>();

const visible = defineModel<boolean>('visible', { default: false });

const emit = defineEmits<{
  imported: [
    payload: { links: SSPLeverageLink[]; meta?: SubscribeResponseMeta },
  ];
}>();

const axiosInstance = useAuthenticatedInstance();

const loading = ref(false);
const loadError = ref(false);
const offerings = ref<CatalogOffering[]>([]);
const sspTitleById = ref(new Map<string, string>());
const inheritedProvidedUuids = ref(new Set<string>());
const providedDescriptionByUuid = ref(new Map<string, string>());

const search = ref('');
const selectedItemIds = ref(new Set<string>());
const satisfiedByItem = ref(new Map<string, Set<string>>());
const importing = ref(false);
const offeringErrors = ref(new Map<string, string>());
const importedAnything = ref(false);

function normalizeId(value?: string): string {
  return (value ?? '').trim().toLowerCase();
}

function isCurrentControlItem(item: CatalogOfferingItem): boolean {
  return (
    !!props.currentControlId &&
    normalizeId(item.controlId) === normalizeId(props.currentControlId)
  );
}

function isAlreadyImported(item: CatalogOfferingItem): boolean {
  return inheritedProvidedUuids.value.has(item.providedUuid);
}

function providedDescriptionFor(item: CatalogOfferingItem): string {
  return providedDescriptionByUuid.value.get(item.providedUuid) ?? '';
}

async function reload() {
  loading.value = true;
  loadError.value = false;
  offeringErrors.value = new Map();
  importedAnything.value = false;
  try {
    // The flat catalog is the load-bearing fetch; the SSP titles, the rollup (to grey out
    // what is already imported) and the by-control enrichment are best-effort garnish.
    const [catalogResult, sspsResult, rollupResult, offersResult] =
      await Promise.allSettled([
        axiosInstance.get<DataResponse<CatalogOffering[]>>(
          '/api/oscal/ssp-export-offerings',
        ),
        axiosInstance.get<DataResponse<SystemSecurityPlan[]>>(
          '/api/oscal/system-security-plans',
        ),
        axiosInstance.get<DataResponse<SharedResponsibilityRollup>>(
          buildSharedResponsibilityUrl(props.sspId),
        ),
        props.currentControlId
          ? axiosInstance.get<DataResponse<ControlExportOffer[]>>(
              buildControlOffersUrl(props.currentControlId, props.sspId),
            )
          : Promise.reject(new Error('no control scope')),
      ]);

    if (catalogResult.status !== 'fulfilled') {
      throw catalogResult.reason;
    }
    // Never offer a system its own catalog rows back.
    offerings.value = (catalogResult.value.data.data ?? []).filter(
      (offering) => offering.sspId !== props.sspId,
    );

    const titles = new Map<string, string>();
    if (sspsResult.status === 'fulfilled') {
      for (const ssp of sspsResult.value.data.data ?? []) {
        titles.set(ssp.uuid, ssp.metadata?.title ?? ssp.uuid);
      }
    }
    sspTitleById.value = titles;

    const inherited = new Set<string>();
    if (rollupResult.status === 'fulfilled') {
      for (const row of rollupResult.value.data.data?.inherits ?? []) {
        inherited.add(row.providedUuid);
      }
    }
    inheritedProvidedUuids.value = inherited;

    const descriptions = new Map<string, string>();
    if (offersResult.status === 'fulfilled') {
      for (const offer of offersResult.value.data.data ?? []) {
        if (offer.provided) {
          descriptions.set(offer.provided.uuid, offer.provided.description);
        }
      }
    }
    providedDescriptionByUuid.value = descriptions;

    // Preselect the open control's importable items.
    const preselected = new Set<string>();
    for (const offering of offerings.value) {
      for (const item of offering.items ?? []) {
        if (isCurrentControlItem(item) && !inherited.has(item.providedUuid)) {
          preselected.add(item.id);
        }
      }
    }
    selectedItemIds.value = preselected;
    satisfiedByItem.value = new Map();
  } catch {
    loadError.value = true;
  } finally {
    loading.value = false;
  }
}

// immediate: the dialog may be mounted (v-if) at the same moment it is opened, in which
// case the first "open" would never trip the watcher.
watch(
  visible,
  (isOpen) => {
    if (isOpen) {
      search.value = '';
      void reload();
    }
  },
  { immediate: true },
);

interface OfferingGroup {
  sspId: string;
  title: string;
  hasCurrentControlItems: boolean;
  offerings: Array<CatalogOffering & { visibleItems: CatalogOfferingItem[] }>;
}

const groups = computed<OfferingGroup[]>(() => {
  const bySsp = new Map<string, OfferingGroup>();
  for (const offering of offerings.value) {
    let group = bySsp.get(offering.sspId);
    if (!group) {
      group = {
        sspId: offering.sspId,
        title:
          sspTitleById.value.get(offering.sspId) ??
          `System ${offering.sspId.slice(0, 8)}`,
        hasCurrentControlItems: false,
        offerings: [],
      };
      bySsp.set(offering.sspId, group);
    }
    // The open control's items sort first within each offering.
    const items = [...(offering.items ?? [])].sort(
      (a, b) =>
        Number(isCurrentControlItem(b)) - Number(isCurrentControlItem(a)),
    );
    if (items.some((item) => isCurrentControlItem(item))) {
      group.hasCurrentControlItems = true;
    }
    group.offerings.push({ ...offering, visibleItems: items });
  }
  // Groups with matches for the open control come first.
  return [...bySsp.values()].sort(
    (a, b) =>
      Number(b.hasCurrentControlItems) - Number(a.hasCurrentControlItems),
  );
});

const hasCurrentControlMatches = computed(() =>
  groups.value.some((group) => group.hasCurrentControlItems),
);

const filteredGroups = computed(() => {
  const term = search.value.trim().toLowerCase();
  if (!term) return groups.value;
  return groups.value
    .map((group) => {
      const groupMatches = group.title.toLowerCase().includes(term);
      const matchingOfferings = group.offerings
        .map((offering) => {
          const offeringMatches =
            groupMatches ||
            offering.title.toLowerCase().includes(term) ||
            (offering.description ?? '').toLowerCase().includes(term);
          const visibleItems = offeringMatches
            ? offering.visibleItems
            : offering.visibleItems.filter(
                (item) =>
                  item.controlId.toLowerCase().includes(term) ||
                  (item.statementId ?? '').toLowerCase().includes(term),
              );
          return { ...offering, visibleItems };
        })
        .filter((offering) => offering.visibleItems.length);
      return { ...group, offerings: matchingOfferings };
    })
    .filter((group) => group.offerings.length);
});

function toggleItem(itemId: string) {
  const next = new Set(selectedItemIds.value);
  if (next.has(itemId)) {
    next.delete(itemId);
  } else {
    next.add(itemId);
  }
  selectedItemIds.value = next;
}

function isSatisfied(itemId: string, responsibilityUuid: string): boolean {
  return satisfiedByItem.value.get(itemId)?.has(responsibilityUuid) ?? false;
}

function toggleSatisfied(itemId: string, responsibilityUuid: string) {
  const next = new Map(satisfiedByItem.value);
  const set = new Set(next.get(itemId) ?? []);
  if (set.has(responsibilityUuid)) {
    set.delete(responsibilityUuid);
  } else {
    set.add(responsibilityUuid);
  }
  next.set(itemId, set);
  satisfiedByItem.value = next;
}

function subscribeErrorMessage(error: unknown): string {
  const status = (error as AxiosError).response?.status;
  switch (status) {
    case 409:
      return 'Already imported into this system.';
    case 403:
      return 'This provider hasn’t allowed your system to import this.';
    case 422:
      return 'This item can’t be imported — ask the provider to re-share it.';
    case 404:
      return 'This offering is no longer published.';
    default: {
      const errorResponse = error as AxiosError<ErrorResponse<ErrorBody>>;
      return (
        errorResponse.response?.data?.errors?.body ||
        'The import failed. Try again.'
      );
    }
  }
}

// Subscribe is per offering, so importing items picked across N offerings is N POSTs. Each
// failure is reported on its offering row; every success is merged into one payload so the
// Controls page can reveal everything that was created at once.
async function importSelected() {
  if (importing.value || !selectedItemIds.value.size) return;
  importing.value = true;
  offeringErrors.value = new Map();

  const mergedLinks: SSPLeverageLink[] = [];
  const mergedCreated = {
    implementedRequirements: new Map<string, CreatedRequirement>(),
    statements: new Map<string, CreatedStatement>(),
    byComponents: new Map<string, CreatedByComponent>(),
  };
  const succeededItemIds = new Set<string>();

  try {
    for (const offering of offerings.value) {
      const itemIds = (offering.items ?? [])
        .map((item) => item.id)
        .filter((id) => selectedItemIds.value.has(id));
      if (!itemIds.length) continue;

      const body: SubscribeRequest = {
        downstreamSspId: props.sspId,
        items: itemIds.map((itemId) => ({
          itemId,
          satisfiedResponsibilityUuids: [
            ...(satisfiedByItem.value.get(itemId) ?? []),
          ],
        })),
      };

      try {
        const response = await axiosInstance.post<SubscribeResponse>(
          `/api/oscal/ssp-export-offerings/${offering.id}/subscribe`,
          body,
        );
        mergedLinks.push(...(response.data.data ?? []));
        const created = response.data.meta?.created;
        for (const row of created?.implementedRequirements ?? []) {
          mergedCreated.implementedRequirements.set(row.uuid, row);
        }
        for (const row of created?.statements ?? []) {
          mergedCreated.statements.set(row.uuid, row);
        }
        for (const row of created?.byComponents ?? []) {
          mergedCreated.byComponents.set(row.uuid, row);
        }
        for (const itemId of itemIds) {
          succeededItemIds.add(itemId);
        }
        // Grey the imported items out immediately.
        const importedProvided = (offering.items ?? [])
          .filter((item) => itemIds.includes(item.id))
          .map((item) => item.providedUuid);
        inheritedProvidedUuids.value = new Set([
          ...inheritedProvidedUuids.value,
          ...importedProvided,
        ]);
      } catch (error) {
        offeringErrors.value = new Map(offeringErrors.value).set(
          offering.id,
          subscribeErrorMessage(error),
        );
      }
    }
  } finally {
    importing.value = false;
  }

  if (succeededItemIds.size) {
    importedAnything.value = true;
    const remaining = new Set(selectedItemIds.value);
    for (const id of succeededItemIds) remaining.delete(id);
    selectedItemIds.value = remaining;

    const meta: SubscribeResponseMeta = {
      created: {
        implementedRequirements: [
          ...mergedCreated.implementedRequirements.values(),
        ],
        statements: [...mergedCreated.statements.values()],
        byComponents: [...mergedCreated.byComponents.values()],
      },
    };
    emit('imported', { links: mergedLinks, meta });

    // Everything went through: the dialog's job is done.
    if (!offeringErrors.value.size) {
      visible.value = false;
    }
  }
}
</script>
