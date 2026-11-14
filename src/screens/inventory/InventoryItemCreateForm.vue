<script setup lang="ts">
/**
 * A new inventory item: where it goes (unattached, a security plan, a POA&M, an assessment plan
 * or assessment results, optionally which one), its description, asset type and remarks. Opened
 * from a system's inventory, it goes to that system's security plan by default. Emits `created`
 * (the page confirms it).
 */
import { computed, reactive, ref } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import type { InventoryItem } from '@/oscal';
import { decamelizeKeys, useAuthenticatedInstance } from '@/composables/axios';
import { getErrorDetail } from '@/utils/httpErrors';
import { useApiQuery } from '@/ds/query';
import Button from '@/ds/components/Button/Button.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import InlineMessage from '@/ds/components/InlineMessage/InlineMessage.vue';
import Select from '@/ds/components/Select/Select.vue';
import Textarea from '@/ds/components/Textarea/Textarea.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Stack from '@/ds/components/layout/Stack.vue';

const props = defineProps<{ sspId?: string }>();
const emit = defineEmits<{ created: [item: InventoryItem]; cancel: [] }>();

const api = useAuthenticatedInstance();

type Destination =
  'unattached' | 'ssp' | 'poam' | 'assessment-plan' | 'assessment-results';

interface OscalDocument {
  uuid: string;
  metadata?: { title?: string };
}

/** Each destination with its documents' endpoint, when it has any to choose from. */
const DESTINATIONS: Record<
  Destination,
  { label: string; hint: string; url?: string; noun?: string }
> = {
  unattached: {
    label: 'Unattached',
    hint: 'Created on its own; attach it to a security plan or POA&M later.',
  },
  ssp: {
    label: 'System security plan (in production)',
    hint: "Added to the security plan's operational inventory.",
    url: '/api/oscal/system-security-plans',
    noun: 'Security plan',
  },
  poam: {
    label: 'POA&M (planned)',
    hint: 'Tracked as planned inventory for future implementation.',
    url: '/api/oscal/plan-of-action-and-milestones',
    noun: 'POA&M',
  },
  'assessment-plan': {
    label: 'Assessment plan (discovery)',
    hint: 'Documented as part of assessment planning.',
    url: '/api/oscal/assessment-plans',
    noun: 'Assessment plan',
  },
  'assessment-results': {
    label: 'Assessment results (findings)',
    hint: 'Recorded as discovered during an assessment.',
    url: '/api/oscal/assessment-results',
    noun: 'Assessment results',
  },
};
const destinationOptions = (Object.keys(DESTINATIONS) as Destination[]).map(
  (value) => ({ value, label: DESTINATIONS[value].label }),
);

const ASSET_TYPES = [
  { value: 'operating-system', label: 'Operating system' },
  { value: 'database', label: 'Database' },
  { value: 'web-server', label: 'Web server' },
  { value: 'application', label: 'Application' },
  { value: 'network-device', label: 'Network device' },
  { value: 'container', label: 'Container' },
  { value: 'cloud-service', label: 'Cloud service' },
];

const draft = reactive({
  destination: (props.sspId ? 'ssp' : 'unattached') as Destination,
  documentId: props.sspId ?? '',
  description: '',
  assetType: '',
  remarks: '',
});
const destination = computed({
  get: () => draft.destination,
  set: (value: string) => {
    draft.destination = value as Destination;
    draft.documentId = value === 'ssp' && props.sspId ? props.sspId : '';
  },
});
const current = computed(() => DESTINATIONS[draft.destination]);
/** Only a security plan must be named; the others may be left unspecified. */
const documentRequired = computed(() => draft.destination === 'ssp');
// The system's own plan needs no choosing.
const choosingDocument = computed(
  () =>
    Boolean(current.value.url) && !(draft.destination === 'ssp' && props.sspId),
);

// Unattached has nothing to choose; the plans list stands in rather than fetching nothing.
const documents = useApiQuery<OscalDocument[]>(
  () => current.value.url ?? DESTINATIONS.ssp.url!,
  { isEmpty: (list) => list.length === 0 },
);
const documentOptions = computed(() =>
  (documents.data.value ?? []).map((doc) => ({
    value: doc.uuid,
    label: doc.metadata?.title || 'Untitled',
  })),
);

const documentError = ref('');
const descriptionError = ref('');
const saveError = ref('');
const saving = ref(false);

async function create() {
  documentError.value =
    documentRequired.value && !draft.documentId
      ? 'Choose a security plan.'
      : '';
  descriptionError.value = draft.description.trim()
    ? ''
    : 'Enter a description.';
  if (documentError.value || descriptionError.value) return;
  saving.value = true;
  saveError.value = '';
  const item: InventoryItem = {
    uuid: uuidv4(),
    description: draft.description.trim(),
    remarks: draft.remarks.trim(),
    props: draft.assetType
      ? [{ name: 'asset-type', value: draft.assetType }]
      : [],
    links: [],
    responsibleParties: [],
    implementedComponents: [],
  };
  try {
    const response = await api.post<{ data: InventoryItem }>(
      '/api/oscal/inventory',
      {
        destination: draft.destination,
        destination_id: draft.documentId,
        inventory_item: item,
      },
      { transformRequest: [decamelizeKeys] },
    );
    emit('created', response.data.data);
  } catch (error) {
    saveError.value = await getErrorDetail(error, 'Try again.');
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <form novalidate @submit.prevent="create">
    <Stack gap="4">
      <FormField label="Destination" required :hint="current.hint">
        <Select v-model="destination" :options="destinationOptions" />
      </FormField>
      <FormField
        v-if="choosingDocument"
        :label="current.noun!"
        :required="documentRequired"
        :hint="documentRequired ? undefined : 'Optional'"
        :error="documentError || undefined"
      >
        <Select
          v-model="draft.documentId"
          :options="documentOptions"
          :placeholder="
            documents.status.value === 'loading'
              ? 'Loading…'
              : documentRequired
                ? 'Choose one'
                : 'None in particular'
          "
        />
      </FormField>
      <FormField
        label="Description"
        required
        :error="descriptionError || undefined"
      >
        <Textarea v-model="draft.description" :rows="3" />
      </FormField>
      <FormField label="Asset type">
        <Select
          v-model="draft.assetType"
          :options="ASSET_TYPES"
          placeholder="None"
        />
      </FormField>
      <FormField label="Remarks">
        <Textarea v-model="draft.remarks" :rows="2" />
      </FormField>
      <InlineMessage v-if="saveError" tone="error" title="Not created">
        <p>{{ saveError }}</p>
      </InlineMessage>
      <Cluster justify="end" gap="2">
        <Button @click="emit('cancel')">Cancel</Button>
        <Button variant="primary" type="submit" :loading="saving"
          >Add item</Button
        >
      </Cluster>
    </Stack>
  </form>
</template>
