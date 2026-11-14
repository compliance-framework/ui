<script setup lang="ts">
/**
 * A component definition's Components tab: each component is a disclosure with its type, purpose,
 * attributes and control implementations, and actions to edit it or download its OSCAL JSON.
 */
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import type {
  ComponentDefinitionControlImplementation,
  DefinedComponent,
} from '@/oscal';
import { useAuthenticatedInstance } from '@/composables/axios';
import { usePermissions } from '@/composables/usePermissions';
import { RESOURCES, ACTIONS } from '@/constants/permissions';
import { getErrorDetail } from '@/utils/httpErrors';
import { plural } from '@/ds/format';
import { useApiQuery } from '@/ds/query';
import Button from '@/ds/components/Button/Button.vue';
import DataState from '@/ds/components/DataState/DataState.vue';
import DescriptionList from '@/ds/components/DescriptionList/DescriptionList.vue';
import Dialog from '@/ds/components/Dialog/Dialog.vue';
import Disclosure from '@/ds/components/Disclosure/Disclosure.vue';
import ItemList from '@/ds/components/ItemList/ItemList.vue';
import Menu from '@/ds/components/Menu/Menu.vue';
import type { MenuEntry } from '@/ds/components/Menu/menuEntries';
import Tag from '@/ds/components/Tag/Tag.vue';
import Text from '@/ds/components/Text/Text.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import DefinedComponentForm from './DefinedComponentForm.vue';
import { downloadText } from '@/utils/download-json';

const route = useRoute();
const toast = useToast();
const api = useAuthenticatedInstance();
const { can } = usePermissions();

const id = route.params.id as string;
const base = `/api/oscal/component-definitions/${id}/components`;

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

const components = useApiQuery<DefinedComponent[]>(base, {
  isEmpty: (list) => list.length === 0,
});

/** Control implementations by component, loaded once the components are. */
const implementations = ref<
  Record<string, ComponentDefinitionControlImplementation[]>
>({});

async function loadImplementations(component: DefinedComponent) {
  try {
    const response = await api.get<{
      data: ComponentDefinitionControlImplementation[];
    }>(`${base}/${component.uuid}/control-implementations`);
    implementations.value[component.uuid] = response.data.data ?? [];
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: `The control implementations of ${component.title} didn't load`,
      detail: await getErrorDetail(error, 'Reload the page to try again.'),
      life: 5000,
    });
  }
}

watch(
  () => components.data.value,
  (list) => {
    for (const component of list ?? []) {
      if (!(component.uuid in implementations.value))
        void loadImplementations(component);
    }
  },
  { immediate: true },
);

const facts = (component: DefinedComponent) => [
  { key: 'description', label: 'Description', value: component.description },
  { key: 'purpose', label: 'Purpose', value: component.purpose },
  {
    key: 'roles',
    label: 'Responsible roles',
    value: component.responsibleRoles?.length
      ? String(component.responsibleRoles.length)
      : '',
  },
  {
    key: 'protocols',
    label: 'Protocols',
    value: component.protocols?.length
      ? String(component.protocols.length)
      : '',
  },
  { key: 'uuid', label: 'UUID', value: component.uuid },
];

const implementationItems = (component: DefinedComponent) =>
  (implementations.value[component.uuid] ?? []).map((impl) => ({
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
const editing = ref<DefinedComponent>();
const editOpen = computed({
  get: () => Boolean(editing.value),
  set: (open: boolean) => {
    if (!open) editing.value = undefined;
  },
});

function created(component: DefinedComponent) {
  components.data.value = [...(components.data.value ?? []), component];
  creating.value = false;
}

function updated(component: DefinedComponent) {
  components.data.value = (components.data.value ?? []).map((c) =>
    c.uuid === component.uuid ? component : c,
  );
  editing.value = undefined;
}

async function download(component: DefinedComponent) {
  try {
    // As text, so the file keeps the API's own (kebab-case) keys.
    const response = await api.get<string>(`${base}/${component.uuid}`, {
      responseType: 'text',
    });
    downloadText(
      `${component.title.replace(/[^a-zA-Z0-9]/g, '_') || 'component'}-component.json`,
      response.data,
    );
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Download failed',
      detail: await getErrorDetail(
        error,
        `We couldn't download ${component.title}. Try again.`,
      ),
      life: 5000,
    });
  }
}

const actions = (component: DefinedComponent): MenuEntry[] => [
  {
    label: 'Edit component',
    icon: 'edit',
    disabledReason: updateDenied.value,
    onSelect: () => (editing.value = component),
  },
  {
    label: 'Download JSON',
    icon: 'download',
    onSelect: () => void download(component),
  },
];
</script>

<template>
  <Stack gap="5">
    <div>
      <Button
        variant="primary"
        icon="add"
        :disabled-reason="createDenied"
        @click="creating = true"
        >New component</Button
      >
    </div>
    <DataState
      :status="components.status.value"
      subject="components"
      empty-title="No components yet"
      empty-body="Components describe the software, services or hardware this definition offers, and the controls they implement."
      icon="components"
      @retry="components.retry"
    >
      <Stack gap="3">
        <Disclosure
          v-for="component in components.data.value"
          :key="component.uuid"
          :label="component.title"
        >
          <Stack gap="4">
            <Cluster justify="between" gap="2">
              <Tag :label="component.type || 'No type'" />
              <Menu
                :label="`Actions for ${component.title}`"
                :items="actions(component)"
              />
            </Cluster>
            <DescriptionList :items="facts(component)" layout="stacked" />
            <Stack gap="2">
              <Text variant="label">Control implementations</Text>
              <ItemList
                :items="implementationItems(component)"
                empty-text="No control implementations."
                dense
              />
            </Stack>
          </Stack>
        </Disclosure>
      </Stack>
    </DataState>

    <Dialog v-model:open="creating" title="New component">
      <DefinedComponentForm
        :component-definition-id="id"
        @cancel="creating = false"
        @created="created"
      />
    </Dialog>
    <Dialog v-model:open="editOpen" title="Edit component">
      <DefinedComponentForm
        v-if="editing"
        :component-definition-id="id"
        :component="editing"
        @cancel="editing = undefined"
        @updated="updated"
      />
    </Dialog>
  </Stack>
</template>
