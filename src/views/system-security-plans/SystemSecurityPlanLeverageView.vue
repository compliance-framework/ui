<template>
  <div class="space-y-6">
    <div
      class="bg-white dark:bg-slate-900 border border-ccf-300 dark:border-slate-700 rounded-lg p-6"
    >
      <h3 class="text-lg font-semibold text-gray-900 dark:text-slate-300 mb-4">
        Leverage
      </h3>

      <div v-if="loading" class="text-center py-4">
        <p class="text-gray-500 dark:text-slate-400">
          Loading published export offerings...
        </p>
      </div>

      <div v-else-if="!offerings?.length" class="text-center py-8">
        <p class="text-gray-500 dark:text-slate-400">
          No published export offerings available yet.
        </p>
      </div>

      <div v-else class="space-y-4">
        <div
          v-for="offering in offerings"
          :key="offering.id"
          class="border border-gray-200 dark:border-slate-700 rounded-lg p-4"
        >
          <div class="flex justify-between items-start mb-2">
            <div>
              <div class="flex items-center gap-2">
                <h4 class="font-medium text-gray-900 dark:text-slate-300">
                  {{ offering.title }}
                </h4>
                <span class="text-xs text-gray-500 dark:text-slate-400">
                  v{{ offering.version }}
                </span>
              </div>
              <p
                v-if="offering.description"
                class="text-sm text-gray-600 dark:text-slate-400 mt-1"
              >
                {{ offering.description }}
              </p>
              <p class="text-xs text-gray-500 dark:text-slate-400 mt-1">
                {{ itemSummary(offering) }}
              </p>
            </div>
            <PermissionGate
              :resource="RESOURCES.SSP_EXPORT_OFFERING"
              :action="ACTIONS.SUBSCRIBE"
            >
              <PermissionGate
                :resource="RESOURCES.SSP"
                :action="ACTIONS.UPDATE"
              >
                <SecondaryButton
                  type="button"
                  size="small"
                  @click="openSubscribeModal(offering)"
                >
                  Subscribe
                </SecondaryButton>
              </PermissionGate>
            </PermissionGate>
          </div>
        </div>
      </div>
    </div>

    <Dialog
      v-model:visible="showSubscribeModal"
      size="xl"
      modal
      :header="`Subscribe — ${subscribingOffering?.title ?? ''}`"
    >
      <SubscribeOfferingWizard
        v-if="subscribingOffering"
        :ssp-id="sspId"
        :offering="subscribingOffering"
        @cancel="showSubscribeModal = false"
        @subscribed="handleSubscribed"
      />
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import Dialog from '@/volt/Dialog.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import PermissionGate from '@/components/auth/PermissionGate.vue';
import SubscribeOfferingWizard from '@/components/system-security-plans/SubscribeOfferingWizard.vue';
import { RESOURCES, ACTIONS } from '@/constants/permissions';
import { useDataApi } from '@/composables/axios';
import { getIdFromRoute } from '@/utils/get-poam-id-from-route';
import type { CatalogOffering } from '@/types/ssp-export-offerings';
import type { SSPLeverageLink } from '@/types/ssp-leverage';

const route = useRoute();
const sspId = computed(() => getIdFromRoute(route) ?? '');

// The catalog is the only fetch this view makes — deliberately: it already omits any
// upstream SSP title/metadata, so there is nothing here to join against an
// upstream-scoped endpoint (which would require ssp:read on the upstream SSP, the exact
// trust boundary this ticket must not cross).
const { data: offerings, isLoading: loading } = useDataApi<CatalogOffering[]>(
  '/api/oscal/ssp-export-offerings',
);

const showSubscribeModal = ref(false);
const subscribingOffering = ref<CatalogOffering | null>(null);

function itemSummary(offering: CatalogOffering): string {
  const items = offering.items ?? [];
  if (!items.length) return 'No items';
  const controlIds = [...new Set(items.map((item) => item.controlId))];
  const shown = controlIds.slice(0, 3).join(', ');
  const remaining = controlIds.length - 3;
  const suffix = remaining > 0 ? ` (+${remaining} more)` : '';
  return `${items.length} item${items.length === 1 ? '' : 's'}: ${shown}${suffix}`;
}

function openSubscribeModal(offering: CatalogOffering) {
  subscribingOffering.value = offering;
  showSubscribeModal.value = true;
}

function handleSubscribed(links: SSPLeverageLink[]) {
  void links;
  showSubscribeModal.value = false;
  subscribingOffering.value = null;
}
</script>
