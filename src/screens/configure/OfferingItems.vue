<script setup lang="ts">
/**
 * The items in an export offering: each capability it offers (control, statement, component and
 * what the component provides) with Remove, and a picker of the plan's other statement-level
 * capabilities to add one more. Requirement-level ("legacy") capabilities are listed but can't be
 * chosen: the API rejects an item without a statement. A revoked offering can't change.
 */
import { computed, ref } from 'vue';
import { useToast } from '@/ds/toasts';
import { useAuthenticatedInstance } from '@/composables/axios';
import { usePermissions } from '@/composables/usePermissions';
import { ACTIONS, RESOURCES } from '@/constants/permissions';
import {
  useOfferableCapabilities,
  type OfferableCapability,
} from '@/composables/useOfferableCapabilities';
import type { ControlImplementation, SystemImplementation } from '@/oscal';
import type { DataResponse } from '@/stores/types';
import type {
  SSPExportOffering,
  SSPExportOfferingItem,
} from '@/types/ssp-export-offerings';
import { getErrorDetail } from '@/utils/httpErrors';
import Button from '@/ds/components/Button/Button.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import IconButton from '@/ds/components/IconButton/IconButton.vue';
import InlineMessage from '@/ds/components/InlineMessage/InlineMessage.vue';
import Select from '@/ds/components/Select/Select.vue';
import Text from '@/ds/components/Text/Text.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Stack from '@/ds/components/layout/Stack.vue';

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
const api = useAuthenticatedInstance();
const { can } = usePermissions();

const revoked = computed(() => props.offering.status === 'revoked');
const revokedReason = 'A revoked offering can no longer change.';
const addDenied = computed(() =>
  revoked.value
    ? revokedReason
    : can(RESOURCES.SSP_EXPORT_OFFERING, ACTIONS.CREATE)
      ? undefined
      : "Your access doesn't include adding offering items.",
);
const removeDenied = computed(() =>
  revoked.value
    ? revokedReason
    : can(RESOURCES.SSP_EXPORT_OFFERING, ACTIONS.DELETE)
      ? undefined
      : "Your access doesn't include removing offering items.",
);

const base = `/api/oscal/system-security-plans/${props.sspId}/export-offerings/${props.offering.id}/items`;
const items = ref<SSPExportOfferingItem[]>([...(props.offering.items ?? [])]);

const { capabilities, legacyCapabilities, allCapabilities } =
  useOfferableCapabilities(
    computed(() => props.controlImplementation),
    computed(() => props.systemImplementation),
  );

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

const componentTitleByUuid = computed(
  () =>
    new Map(
      allCapabilities.value.map((c) => [c.componentUuid, c.componentTitle]),
    ),
);
const providedDescriptionByUuid = computed(
  () =>
    new Map(
      allCapabilities.value.map((c) => [c.providedUuid, c.providedDescription]),
    ),
);

const itemTitle = (item: SSPExportOfferingItem) =>
  `${item.controlId}${item.statementId ? ` · Statement ${item.statementId}` : ''}`;
const itemDetail = (item: SSPExportOfferingItem) =>
  `${componentTitleByUuid.value.get(item.componentUuid) ?? item.componentUuid}: ${
    providedDescriptionByUuid.value.get(item.providedUuid) ?? item.providedUuid
  }`;

function capabilityLabel(c: OfferableCapability): string {
  return `${c.controlId}${c.statementId ? ` · Statement ${c.statementId}` : ''} · ${c.componentTitle} · ${c.providedDescription}`;
}

const pickerOptions = computed(() => {
  const existing = new Set(items.value.map(capabilityKey));
  return [
    ...capabilities.value
      .filter((c) => !existing.has(capabilityKey(c)))
      .map((c) => ({
        value: capabilityKey(c),
        label: capabilityLabel(c),
        capability: c,
      })),
    ...legacyCapabilities.value.map((c) => ({
      value: capabilityKey(c),
      label: `${capabilityLabel(c)} (on the requirement: move it to a statement to offer it)`,
      disabled: true,
      capability: c,
    })),
  ];
});

const chosen = ref('');
const adding = ref(false);
const addError = ref('');

async function add() {
  if (!chosen.value) return;
  addError.value = '';
  // Resolved against every option, legacy ones included, so a legacy choice explains itself
  // here instead of falling through silently.
  const capability = pickerOptions.value.find(
    (o) => o.value === chosen.value,
  )?.capability;
  if (!capability) {
    addError.value =
      'That capability is no longer available. Choose another one.';
    return;
  }
  if (!capability.statementId) {
    addError.value =
      'This capability is authored on the requirement, not a statement, so it cannot be offered. Move it to a statement first.';
    return;
  }

  adding.value = true;
  try {
    const response = await api.post<DataResponse<SSPExportOfferingItem>>(base, {
      controlId: capability.controlId,
      statementId: capability.statementId,
      componentUuid: capability.componentUuid,
      providedUuid: capability.providedUuid,
    });
    items.value = [...items.value, response.data.data];
    chosen.value = '';
    emit('updated', items.value);
    toast.add({ severity: 'success', summary: 'Item added', life: 3000 });
  } catch (error) {
    // A 400 is the API refusing an incoherent capability: shown by the picker that chose it.
    addError.value = await getErrorDetail(error, 'Try again.');
  } finally {
    adding.value = false;
  }
}

async function remove(item: SSPExportOfferingItem) {
  try {
    await api.delete(`${base}/${item.id}`);
    items.value = items.value.filter((i) => i.id !== item.id);
    emit('updated', items.value);
    toast.add({ severity: 'success', summary: 'Item removed', life: 3000 });
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: "The item wasn't removed",
      detail: await getErrorDetail(error, 'Try again.'),
      life: 5000,
    });
  }
}
</script>

<template>
  <Stack gap="4">
    <InlineMessage v-if="revoked" tone="info"
      >This offering has been revoked and can no longer be
      changed.</InlineMessage
    >
    <Text v-if="!items.length" variant="caption"
      >No items yet. Add one from the capabilities this system's components
      provide.</Text
    >
    <Stack v-else gap="2" as="ul">
      <li v-for="item in items" :key="item.id">
        <Cluster justify="between" gap="2">
          <Stack gap="1">
            <Text as="span" variant="label">{{ itemTitle(item) }}</Text>
            <Text as="span" variant="caption">{{ itemDetail(item) }}</Text>
          </Stack>
          <IconButton
            icon="close"
            :label="`Remove ${itemTitle(item)}`"
            :disabled-reason="removeDenied"
            @click="remove(item)"
          />
        </Cluster>
      </li>
    </Stack>
    <Stack gap="2">
      <FormField label="Add a capability" :error="addError || undefined">
        <Select
          v-model="chosen"
          :options="pickerOptions"
          placeholder="Choose a capability to offer"
          :disabled="Boolean(addDenied)"
        />
      </FormField>
      <div>
        <Button
          icon="add"
          :loading="adding"
          :disabled-reason="
            addDenied ?? (chosen ? undefined : 'Choose a capability first.')
          "
          @click="add"
          >Add item</Button
        >
      </div>
    </Stack>
  </Stack>
</template>
