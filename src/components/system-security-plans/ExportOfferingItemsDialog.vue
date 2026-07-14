<template>
  <div class="space-y-4">
    <div
      v-if="offering.status === 'revoked'"
      class="text-sm text-gray-500 dark:text-slate-400"
    >
      This offering has been revoked and can no longer be modified.
    </div>

    <div v-if="!items.length" class="text-sm text-gray-500 dark:text-slate-400">
      No items yet. Add one from the SSP's authored capabilities.
    </div>

    <div v-else class="space-y-2">
      <div
        v-for="item in items"
        :key="item.id"
        class="p-3 border border-ccf-200 dark:border-slate-600 rounded flex justify-between items-start"
      >
        <div class="text-sm dark:text-slate-300">
          <div class="font-medium">
            {{ item.controlId }}
            <span v-if="item.statementId">
              · Statement {{ item.statementId }}</span
            >
          </div>
          <div class="text-gray-500 dark:text-slate-400">
            {{
              componentTitleByUuid.get(item.componentUuid) ?? item.componentUuid
            }}
            —
            {{
              providedDescriptionByUuid.get(item.providedUuid) ??
              item.providedUuid
            }}
          </div>
        </div>
        <PermissionGate
          :resource="RESOURCES.SSP_EXPORT_OFFERING"
          :action="ACTIONS.DELETE"
        >
          <button
            v-if="offering.status !== 'revoked'"
            type="button"
            class="text-red-500 hover:text-red-700 text-sm shrink-0 ml-2"
            @click="removeItem(item)"
          >
            Remove
          </button>
        </PermissionGate>
      </div>
    </div>

    <PermissionGate
      :resource="RESOURCES.SSP_EXPORT_OFFERING"
      :action="ACTIONS.CREATE"
    >
      <div
        v-if="offering.status !== 'revoked'"
        class="pt-3 border-t border-gray-200 dark:border-slate-700"
      >
        <Label for="capability-picker">Add item</Label>
        <!-- Legacy (requirement-anchored) capabilities are listed but not selectable: the
             API rejects an item without a statementId. Hiding them would leave an author
             wondering where their export went. -->
        <Select
          id="capability-picker"
          v-model="selectedCapabilityKey"
          :options="pickerOptions"
          option-label="label"
          option-value="key"
          option-disabled="disabled"
          placeholder="Select a capability to offer"
          class="w-full"
        />
        <Message v-if="addError" severity="error" class="mt-2">
          {{ addError }}
        </Message>
        <div class="flex justify-end mt-2">
          <PrimaryButton
            type="button"
            :disabled="!selectedCapabilityKey || adding"
            @click="addItem"
          >
            Add Item
          </PrimaryButton>
        </div>
      </div>
    </PermissionGate>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useToast } from 'primevue/usetoast';
import Select from '@/volt/Select.vue';
import Label from '@/volt/Label.vue';
import Message from '@/volt/Message.vue';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import PermissionGate from '@/components/auth/PermissionGate.vue';
import { RESOURCES, ACTIONS } from '@/constants/permissions';
import { useAuthenticatedInstance } from '@/composables/axios';
import {
  useOfferableCapabilities,
  type OfferableCapability,
} from '@/composables/useOfferableCapabilities';
import type { ControlImplementation, SystemImplementation } from '@/oscal';
import type { DataResponse, ErrorBody, ErrorResponse } from '@/stores/types';
import type {
  SSPExportOffering,
  SSPExportOfferingItem,
} from '@/types/ssp-export-offerings';
import type { AxiosError } from 'axios';

const props = defineProps<{
  sspId: string;
  offering: SSPExportOffering;
  controlImplementation: ControlImplementation | undefined;
  systemImplementation: SystemImplementation | undefined;
}>();

const emit = defineEmits<{
  updated: [items: SSPExportOfferingItem[]];
}>();

const toast = useToast();
const axiosInstance = useAuthenticatedInstance();

const items = ref<SSPExportOfferingItem[]>([...(props.offering.items ?? [])]);

const controlImplementationRef = computed(() => props.controlImplementation);
const systemImplementationRef = computed(() => props.systemImplementation);
const { capabilities, legacyCapabilities, allCapabilities } =
  useOfferableCapabilities(controlImplementationRef, systemImplementationRef);

function capabilityKey(c: {
  controlId: string;
  statementId?: string;
  componentUuid: string;
  providedUuid: string;
}): string {
  return [
    c.controlId,
    c.statementId ?? '',
    c.componentUuid,
    c.providedUuid,
  ].join('::');
}

const componentTitleByUuid = computed(() => {
  const map = new Map<string, string>();
  for (const c of allCapabilities.value) {
    map.set(c.componentUuid, c.componentTitle);
  }
  return map;
});

const providedDescriptionByUuid = computed(() => {
  const map = new Map<string, string>();
  for (const c of allCapabilities.value) {
    map.set(c.providedUuid, c.providedDescription);
  }
  return map;
});

const existingItemKeys = computed(
  () => new Set(items.value.map((item) => capabilityKey(item))),
);

function capabilityLabel(c: OfferableCapability): string {
  return `${c.controlId}${c.statementId ? ` · Statement ${c.statementId}` : ''} · ${c.componentTitle} · ${c.providedDescription}`;
}

const availableCapabilities = computed(() =>
  capabilities.value
    .filter((c) => !existingItemKeys.value.has(capabilityKey(c)))
    .map((c) => ({
      key: capabilityKey(c),
      label: capabilityLabel(c),
      disabled: false,
      capability: c,
    })),
);

const pickerOptions = computed(() => [
  ...availableCapabilities.value,
  ...legacyCapabilities.value.map((c) => ({
    key: capabilityKey(c),
    label: `${capabilityLabel(c)} — legacy: move this export to a statement to offer it`,
    disabled: true,
    capability: c,
  })),
]);

const selectedCapabilityKey = ref<string | null>(null);
const adding = ref(false);
const addError = ref('');

function findCapability(key: string): OfferableCapability | undefined {
  return availableCapabilities.value.find((c) => c.key === key)?.capability;
}

async function addItem() {
  if (!selectedCapabilityKey.value) return;
  const capability = findCapability(selectedCapabilityKey.value);
  addError.value = '';
  if (!capability) return;
  // Defence in depth against a legacy tuple slipping through the disabled option: an item
  // without a statementId is a 400, and the picker is the only thing standing between the
  // author and that error.
  if (!capability.statementId) {
    addError.value =
      'This export is authored on the requirement, not a statement, so it cannot be offered. Move it to a statement first.';
    return;
  }

  adding.value = true;
  try {
    const response = await axiosInstance.post<
      DataResponse<SSPExportOfferingItem>
    >(
      `/api/oscal/system-security-plans/${props.sspId}/export-offerings/${props.offering.id}/items`,
      {
        controlId: capability.controlId,
        statementId: capability.statementId,
        componentUuid: capability.componentUuid,
        providedUuid: capability.providedUuid,
      },
    );
    items.value = [...items.value, response.data.data];
    selectedCapabilityKey.value = null;
    emit('updated', items.value);
    toast.add({ severity: 'success', summary: 'Item added.', life: 3000 });
  } catch (error) {
    const errorResponse = error as AxiosError<ErrorResponse<ErrorBody>>;
    const detail =
      errorResponse.response?.data?.errors?.body || 'Failed to add item.';
    // A 400 here is the API refusing an incoherent (control, statement, component, provided)
    // tuple — show it inline next to the picker that produced it, not just as a toast.
    if (errorResponse.response?.status === 400) {
      addError.value = detail;
    }
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail,
      life: 5000,
    });
  } finally {
    adding.value = false;
  }
}

async function removeItem(item: SSPExportOfferingItem) {
  try {
    await axiosInstance.delete(
      `/api/oscal/system-security-plans/${props.sspId}/export-offerings/${props.offering.id}/items/${item.id}`,
    );
    items.value = items.value.filter((i) => i.id !== item.id);
    emit('updated', items.value);
    toast.add({ severity: 'success', summary: 'Item removed.', life: 3000 });
  } catch (error) {
    const errorResponse = error as AxiosError<ErrorResponse<ErrorBody>>;
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail:
        errorResponse.response?.data?.errors?.body || 'Failed to remove item.',
      life: 5000,
    });
  }
}
</script>
