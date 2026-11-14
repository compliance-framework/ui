<script setup lang="ts">
/**
 * A component definition's Capabilities tab: each capability is a disclosure with its description,
 * remarks, the components it incorporates (by title where the component is known) and its control
 * implementations.
 */
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import type { Capability, DefinedComponent } from '@/oscal';
import { usePermissions } from '@/composables/usePermissions';
import { RESOURCES, ACTIONS } from '@/constants/permissions';
import { plural } from '@/ds/format';
import { useApiQuery } from '@/ds/query';
import Button from '@/ds/components/Button/Button.vue';
import DataState from '@/ds/components/DataState/DataState.vue';
import DescriptionList from '@/ds/components/DescriptionList/DescriptionList.vue';
import Dialog from '@/ds/components/Dialog/Dialog.vue';
import Disclosure from '@/ds/components/Disclosure/Disclosure.vue';
import IconButton from '@/ds/components/IconButton/IconButton.vue';
import ItemList from '@/ds/components/ItemList/ItemList.vue';
import Text from '@/ds/components/Text/Text.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import CapabilityForm from './CapabilityForm.vue';

const route = useRoute();
const { can } = usePermissions();

const id = route.params.id as string;
const base = `/api/oscal/component-definitions/${id}`;

const createDenied = computed(() =>
  can(RESOURCES.COMPONENT_DEFINITION, ACTIONS.CREATE)
    ? undefined
    : "Your access doesn't include changing component definitions.",
);
const updateDenied = computed(() =>
  can(RESOURCES.COMPONENT_DEFINITION, ACTIONS.UPDATE)
    ? undefined
    : "Your access doesn't include changing component definitions.",
);

const capabilities = useApiQuery<Capability[]>(`${base}/capabilities`, {
  isEmpty: (list) => list.length === 0,
});
/** Only to name incorporated components; without it they show by UUID. */
const components = useApiQuery<DefinedComponent[]>(`${base}/components`);
const componentTitle = (uuid: string) =>
  components.data.value?.find((c) => c.uuid === uuid)?.title ?? uuid;

const facts = (capability: Capability) => [
  { key: 'description', label: 'Description', value: capability.description },
  { key: 'remarks', label: 'Remarks', value: capability.remarks },
  { key: 'uuid', label: 'UUID', value: capability.uuid },
];

const incorporated = (capability: Capability) =>
  (capability.incorporatesComponents ?? []).map((c) => ({
    id: c.componentUuid,
    title: componentTitle(c.componentUuid),
    meta: c.description,
  }));

const implementationItems = (capability: Capability) =>
  (capability.controlImplementations ?? []).map((impl) => ({
    id: impl.uuid,
    title: impl.source,
    meta: [
      impl.description,
      plural(impl.implementedRequirements?.length ?? 0, 'requirement'),
    ]
      .filter(Boolean)
      .join(' · '),
  }));

// Create and edit ----------------------------------------------------------------------------

const creating = ref(false);
const editing = ref<Capability>();
const editOpen = computed({
  get: () => Boolean(editing.value),
  set: (open: boolean) => {
    if (!open) editing.value = undefined;
  },
});

function created(capability: Capability) {
  capabilities.data.value = [...(capabilities.data.value ?? []), capability];
  creating.value = false;
}

function updated(capability: Capability) {
  capabilities.data.value = (capabilities.data.value ?? []).map((c) =>
    c.uuid === capability.uuid ? capability : c,
  );
  editing.value = undefined;
}
</script>

<template>
  <Stack gap="5">
    <div>
      <Button
        variant="primary"
        icon="add"
        :disabled-reason="createDenied"
        @click="creating = true"
        >New capability</Button
      >
    </div>
    <DataState
      :status="capabilities.status.value"
      subject="capabilities"
      empty-title="No capabilities yet"
      empty-body="Capabilities group components that together implement a set of controls."
      icon="components"
      @retry="capabilities.retry"
    >
      <Stack gap="3">
        <Disclosure
          v-for="capability in capabilities.data.value"
          :key="capability.uuid"
          :label="capability.name"
        >
          <Stack gap="4">
            <Cluster justify="end">
              <IconButton
                icon="edit"
                :label="`Edit ${capability.name}`"
                :disabled-reason="updateDenied"
                @click="editing = capability"
              />
            </Cluster>
            <DescriptionList :items="facts(capability)" layout="stacked" />
            <Stack gap="2">
              <Text variant="label">Incorporated components</Text>
              <ItemList
                :items="incorporated(capability)"
                empty-text="No components incorporated."
                dense
              />
            </Stack>
            <Stack gap="2">
              <Text variant="label">Control implementations</Text>
              <ItemList
                :items="implementationItems(capability)"
                empty-text="No control implementations."
                dense
              />
            </Stack>
          </Stack>
        </Disclosure>
      </Stack>
    </DataState>

    <Dialog v-model:open="creating" title="New capability">
      <CapabilityForm
        :component-definition-id="id"
        @cancel="creating = false"
        @created="created"
      />
    </Dialog>
    <Dialog v-model:open="editOpen" title="Edit capability">
      <CapabilityForm
        v-if="editing"
        :component-definition-id="id"
        :capability="editing"
        @cancel="editing = undefined"
        @updated="updated"
      />
    </Dialog>
  </Stack>
</template>
