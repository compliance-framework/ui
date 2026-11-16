<template>
  <Dialog v-model:open="visible" title="Inherit from another system" size="l">
    <DataState
      v-if="loading || loadError || !groups.length"
      :status="loading ? 'loading' : loadError ? 'error' : 'empty'"
      subject="what other systems share"
      empty-title="Nothing shared yet"
      empty-body="No shared implementations are published. Ask the owning team to share theirs from their Implementation page."
      skeleton="text"
      @retry="reload"
    />
    <form v-else novalidate @submit.prevent="importSelected">
      <Stack gap="4">
        <InlineMessage
          v-if="currentControlId && hasCurrentControlMatches"
          tone="info"
          :title="`Items for ${currentControlId} come first`"
          ><p>
            They are the control you have open, and start chosen.
          </p></InlineMessage
        >
        <!-- The form's only text input, so Enter here would submit (and subscribe) by
             implicit submission. Enter in a search box should filter, not import. -->
        <FormField label="Search" hint="Control, statement or system">
          <TextInput
            v-model="search"
            type="search"
            icon="search"
            @keydown.enter.prevent
          />
        </FormField>
        <Panel
          v-for="group in filteredGroups"
          :key="group.sspId"
          :title="group.title"
          :level="3"
        >
          <Stack gap="4">
            <Stack
              v-for="offering in group.offerings"
              :key="offering.id"
              gap="2"
            >
              <Text as="span" variant="label"
                >{{ offering.title }} · v{{ offering.version }}</Text
              >
              <InlineMessage
                v-if="offeringErrors.get(offering.id)"
                tone="error"
                title="Not imported"
                ><p>{{ offeringErrors.get(offering.id) }}</p></InlineMessage
              >
              <Stack
                v-for="item in offering.visibleItems"
                :key="item.id"
                gap="2"
              >
                <Checkbox
                  :model-value="selectedItemIds.has(item.id)"
                  :label="itemLabel(item)"
                  :description="providedDescriptionFor(item) || undefined"
                  :disabled-reason="
                    isAlreadyImported(item) ? 'Already imported.' : undefined
                  "
                  @update:model-value="toggleItem(item.id)"
                />
                <Stack
                  v-if="
                    selectedItemIds.has(item.id) &&
                    item.responsibilities?.length
                  "
                  gap="1"
                >
                  <Text variant="caption"
                    >You take these on. Tick anything you already handle:</Text
                  >
                  <Checkbox
                    v-for="responsibility in item.responsibilities ?? []"
                    :key="responsibility.responsibilityUuid"
                    :model-value="
                      isSatisfied(item.id, responsibility.responsibilityUuid)
                    "
                    :label="responsibility.description"
                    @update:model-value="
                      toggleSatisfied(
                        item.id,
                        responsibility.responsibilityUuid,
                      )
                    "
                  />
                </Stack>
              </Stack>
            </Stack>
          </Stack>
        </Panel>
        <Text v-if="!filteredGroups.length" variant="caption"
          >Nothing matches “{{ search }}”.</Text
        >
        <Text variant="caption"
          >Inherited capabilities stay linked to the providing system, and
          you'll be told when it changes what it shares.</Text
        >
        <Cluster justify="end" gap="2">
          <Button @click="visible = false">{{
            importedAnything ? 'Close' : 'Cancel'
          }}</Button>
          <Button
            variant="primary"
            type="submit"
            :loading="importing"
            :disabled-reason="importDenied"
            >Import selected</Button
          >
        </Cluster>
      </Stack>
    </form>
  </Dialog>
</template>

<script setup lang="ts">
/**
 * Inheriting another system's shared implementations: every published export offering, grouped
 * by system, with the items for the open control first and preselected, a search, and for each
 * chosen item the responsibilities this system already handles. Import selected subscribes to
 * each offering. The script is the classic dialog's.
 */
import Button from '@/ds/components/Button/Button.vue';
import Checkbox from '@/ds/components/Checkbox/Checkbox.vue';
import DataState from '@/ds/components/DataState/DataState.vue';
import Dialog from '@/ds/components/Dialog/Dialog.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import InlineMessage from '@/ds/components/InlineMessage/InlineMessage.vue';
import Text from '@/ds/components/Text/Text.vue';
import TextInput from '@/ds/components/TextInput/TextInput.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Panel from '@/ds/components/layout/Panel.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import { computed, ref, watch } from 'vue';
import type { AxiosError } from 'axios';
import { RESOURCES, ACTIONS } from '@/constants/permissions';
import { usePermissions } from '@/composables/usePermissions';
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

// Mirrors the two nested <PermissionGate>s around the Import button — importSelected()
// enforces this itself, since the gates only govern what renders.
const { can } = usePermissions();
const mayImport = computed(
  () =>
    can(RESOURCES.SSP_EXPORT_OFFERING, ACTIONS.SUBSCRIBE) &&
    can(RESOURCES.SSP, ACTIONS.UPDATE),
);
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
  // Checked here, not only via the <PermissionGate> around the button: a gate that hides a
  // button is not an authorization check while another path can reach the handler. Without
  // this a denied POST 403s, and subscribeErrorMessage maps 403 to "this provider hasn't
  // allowed your system to import this" — blaming the provider for an RBAC denial.
  if (!mayImport.value) return;
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
const itemLabel = (item: CatalogOfferingItem) =>
  `${item.controlId}${item.statementId ? ` · Statement ${item.statementId}` : ''}`;
const importDenied = computed(() =>
  !mayImport.value
    ? "Your access doesn't include inheriting into this system."
    : selectedItemIds.value.size
      ? undefined
      : 'Choose at least one item first.',
);
</script>
