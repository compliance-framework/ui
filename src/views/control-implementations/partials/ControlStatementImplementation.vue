<script setup lang="ts">
import { v4 as uuidv4 } from 'uuid';
import StatementByComponent from '@/views/control-implementations/partials/StatementByComponent.vue';
import type {
  ByComponent,
  ImplementedRequirement,
  Statement,
  SystemComponent,
} from '@/oscal';
import { computed, nextTick, onMounted, ref, toValue, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useSystemStore } from '@/stores/system.ts';
import Select from '@/volt/Select.vue';
import Textarea from '@/volt/Textarea.vue';
import { useCloned } from '@vueuse/core';
import BurgerMenu from '@/components/BurgerMenu.vue';
import { useToggle } from '@/composables/useToggle';
import { useDataApi, decamelizeKeys } from '@/composables/axios';
import { useToast } from 'primevue/usetoast';
import Dialog from '@/volt/Dialog.vue';
import Button from '@/volt/Button.vue';
import StatementCreateForm from '@/components/system-security-plans/StatementCreateForm.vue';
import StatementEditForm from '@/components/system-security-plans/StatementEditForm.vue';
import SystemImplementationComponentCreateForm from '@/components/system-security-plans/SystemImplementationComponentCreateForm.vue';

const { system } = useSystemStore();
const toast = useToast();

const showError = ref(false);

const showCreateStatementModal = ref(false);
const showEditStatementModal = ref(false);
const showCreateComponentModal = ref(false);

const { value: showCreateComponentForm, set: setCreateComponentForm } =
  useToggle(false);

const route = useRoute();

const {
  statement,
  implementation,
  sspId: providedSspId,
} = defineProps<{
  statement: Statement;
  implementation: ImplementedRequirement;
  sspId?: string;
  partid?: string;
}>();

const localStatement = ref<Statement | undefined>(statement);

const resolvedSspId = computed(() => {
  if (providedSspId) return providedSspId;
  const routeId = route.params.id;
  if (typeof routeId === 'string' && routeId.length) return routeId;
  if (Array.isArray(routeId) && routeId.length) return routeId[0];
  return system.securityPlan?.uuid;
});

const emit = defineEmits<{
  updated: [statement: Statement];
}>();

const {
  data: components,
  isLoading: componentsLoading,
  execute: fetchComponents,
} = useDataApi<SystemComponent[]>(null, null, { immediate: false });
const { execute: executeUpdate } = useDataApi<Statement>(null, {
  transformRequest: [decamelizeKeys],
  method: 'PUT',
});

const { execute: executeDelete } = useDataApi<Statement>(null, {
  transformRequest: [decamelizeKeys],
  method: 'DELETE',
});

const { execute: executeCreate } = useDataApi<ByComponent>(null, {
  transformRequest: [decamelizeKeys],
  method: 'POST',
});

watch(
  resolvedSspId,
  async (id) => {
    if (!id) return;
    await fetchComponents(
      `/api/oscal/system-security-plans/${id}/system-implementation/components`,
    );
  },
  { immediate: true },
);

const componentItems = computed(() => {
  return toValue(components.value || []).map((item) => {
    return {
      name: item.title,
      value: item.uuid,
    };
  });
});

const newByComponent = ref<ByComponent>({
  uuid: uuidv4(),
  implementationStatus: {
    state: '',
  },
} as ByComponent);
const selectedComponent = ref();
watch(selectedComponent, () => {
  // When the selected component changes, update the model
  newByComponent.value.componentUuid = selectedComponent.value.value;
});

onMounted(() => {
  if (!system.securityPlan?.uuid) {
    return;
  }
});

function resetCreateComponentForm() {
  setCreateComponentForm(false);
  showError.value = false;
  selectedComponent.value = null;

  newByComponent.value = {
    uuid: uuidv4(),
    implementationStatus: {
      state: '',
    },
  } as ByComponent;
}

async function deleteByComponent(byComp: ByComponent) {
  const sspId = resolvedSspId.value;
  if (!sspId) {
    toast.add({
      severity: 'error',
      summary: 'Missing System Plan',
      detail: 'Unable to determine which system security plan to update.',
      life: 4000,
    });
    return;
  }
  const updatedStatement = useCloned(localStatement).cloned;

  if (!updatedStatement.value || !statement) {
    console.error('No statement defined');
    return;
  }

  updatedStatement.value.byComponents =
    updatedStatement.value.byComponents?.filter(
      (comp: ByComponent) => byComp.uuid !== comp.uuid,
    );
  try {
    await executeDelete(
      `/api/oscal/system-security-plans/${sspId}/control-implementation/implemented-requirements/${implementation.uuid}/statements/${statement.uuid}/by-components/${byComp.uuid}`,
    );
    localStatement.value = updatedStatement.value;
    setCreateComponentForm(false);
    emit('updated', localStatement.value);
    newByComponent.value = {
      uuid: uuidv4(),
    } as ByComponent;
  } catch (err) {
    console.error(err);
  }
}

async function updateByComponent(byComp: ByComponent) {
  const sspId = resolvedSspId.value;
  if (!sspId) {
    toast.add({
      severity: 'error',
      summary: 'Missing System Plan',
      detail: 'Unable to determine which system security plan to update.',
      life: 4000,
    });
    return;
  }
  if (!localStatement.value || !statement) {
    return;
  }
  try {
    await executeUpdate(
      `/api/oscal/system-security-plans/${sspId}/control-implementation/implemented-requirements/${implementation.uuid}/statements/${statement.uuid}/by-components/${byComp.uuid}`,
      {
        data: byComp,
      },
    );
    setCreateComponentForm(false);
    emit('updated', localStatement.value);
    newByComponent.value = {
      uuid: uuidv4(),
    } as ByComponent;
  } catch (err) {
    console.error(err);
  }
}

async function createByComponent() {
  const sspId = resolvedSspId.value;
  if (
    !newByComponent.value.componentUuid ||
    !localStatement.value ||
    !statement
  ) {
    showError.value = true;
    return;
  }
  if (!sspId) {
    toast.add({
      severity: 'error',
      summary: 'Missing System Plan',
      detail: 'Unable to determine which system security plan to update.',
      life: 4000,
    });
    return;
  }
  try {
    const res = await executeCreate(
      `/api/oscal/system-security-plans/${sspId}/control-implementation/implemented-requirements/${implementation.uuid}/statements/${statement.uuid}/by-components`,
      {
        data: newByComponent.value,
      },
    );
    if (res.data.value && res.data.value.data) {
      if (!localStatement.value.byComponents)
        localStatement.value.byComponents = [];
      localStatement.value.byComponents.push(res.data.value.data);
    } else {
      console.error('Failed to create: response data is missing');
      return;
    }
    newByComponent.value = {
      uuid: uuidv4(),
    } as ByComponent;
    setCreateComponentForm(false);
    emit('updated', localStatement.value);
  } catch (error) {
    console.error(error);
    toast.add({
      severity: 'error',
      summary: 'Error Creating By-Component',
      detail:
        error instanceof Error
          ? error.message
          : 'Unexpected error creating a by-component.',
      life: 3000,
    });
  }
}

function updateStatement(updatedStatement: Statement) {
  localStatement.value = updatedStatement;
  showCreateStatementModal.value = false;
  showEditStatementModal.value = false;
  emit('updated', localStatement.value);
}

function handleComponentCreated(newComponent: SystemComponent) {
  if (components.value) {
    components.value.push(newComponent);
  }
  showCreateComponentModal.value = false;
  nextTick(() => {
    const found = componentItems.value.find(
      (item) => item.value === newComponent.uuid,
    );
    if (found) {
      selectedComponent.value = found;
    }
    setCreateComponentForm(true);
  });
}
</script>

<template>
  <div class="pb-24">
    <div v-if="localStatement">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
        <div>
          <h5 class="text-sm font-medium text-gray-500">Statement ID</h5>
          <p class="text-sm">{{ localStatement?.statementId }}</p>
        </div>
        <div>
          <h5 class="text-sm font-medium text-gray-500">Remarks</h5>
          <p class="text-sm">{{ localStatement?.remarks || 'None' }}</p>
        </div>
        <div>
          <h5 class="text-sm font-medium text-gray-500">Description</h5>
          <p class="text-sm">{{ localStatement?.description || 'None' }}</p>
        </div>
        <div>
          <h5 class="text-sm font-medium text-gray-500">Props</h5>
          <p class="text-sm">{{ localStatement?.props || 'None' }}</p>
        </div>
        <div>
          <h5 class="text-sm font-medium text-gray-500">Links</h5>
          <p class="text-sm">{{ localStatement?.links || 'None' }}</p>
        </div>
      </div>

      <div class="flex items-center mb-4 gap-x-4">
        <Button
          label="Edit Statement"
          @click="showEditStatementModal = true"
          class="text-blue-600 hover:text-blue-800 dark:text-blue-400 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Edit
        </Button>
      </div>

      <div class="flex items-center mb-4 gap-x-4">
        <h5 class="font-medium text-xl">Components</h5>
        <BurgerMenu
          :items="[
            {
              label: 'Add Component',
              command: () => {
                setCreateComponentForm(true);
              },
            },
            {
              label: 'Create New Component',
              command: () => {
                showCreateComponentModal = true;
              },
            },
          ]"
        />
      </div>
      <template v-if="localStatement">
        <div
          v-for="(byComponent, index) in localStatement.byComponents || []"
          :key="byComponent.uuid"
        >
          <div
            class="h-0.5 w-full bg-gray-200 dark:bg-slate-700 my-4"
            v-if="index !== 0"
          ></div>
          <StatementByComponent
            @save="updateByComponent"
            @delete="deleteByComponent"
            :by-component="byComponent"
          />
        </div>
      </template>

      <form @submit.prevent="createByComponent" v-if="showCreateComponentForm">
        <div class="h-0.5 dark:bg-slate-800 bg-gray-400 w-full my-4"></div>
        <div class="flex justify-between items-center mb-4">
          <h4 class="m-0">New Component Implementation</h4>
          <Button
            label="Create New"
            class="!text-xs !py-1 !px-2 !text-blue-600 hover:!text-blue-800 dark:!text-blue-400"
            severity="secondary"
            text
            @click="showCreateComponentModal = true"
          />
        </div>
        <div class="mb-2">
          <Select
            placeholder="Select a component"
            :loading="componentsLoading"
            checkmark
            class="w-full"
            v-model="selectedComponent"
            :options="componentItems"
            optionLabel="name"
            v-on:update:model-value="showError = false"
          />
          <small v-if="showError" class="p-error" style="color: red">
            Please select a valid component.
          </small>
        </div>

        <div class="mb-2">
          <Textarea
            v-model="newByComponent.description"
            rows="5"
            cols="30"
            class="resize-none w-full"
            placeholder="Description"
            @keyup.ctrl.enter="createByComponent"
          />
        </div>
        <div class="text-right">
          <secondary-button @click="resetCreateComponentForm"
            >Cancel</secondary-button
          >
          <primary-button
            type="submit"
            v-tooltip.bottom="'ctrl + enter to create'"
            >Create</primary-button
          >
        </div>
      </form>
    </div>
    <div v-else>
      <Button
        label="Create Statement"
        @click="showCreateStatementModal = true"
        class="text-green-600 hover:text-green-800 dark:text-green-400 disabled:opacity-50 disabled:cursor-not-allowed"
      >
      </Button>
    </div>
  </div>

  <Dialog
    v-model:visible="showCreateStatementModal"
    size="lg"
    modal
    header="Create New Statement"
  >
    <StatementCreateForm
      :ssp-id="system.securityPlan?.uuid || ''"
      :req-id="implementation.uuid || ''"
      :smt-id="partid || ''"
      @cancel="showCreateStatementModal = false"
      @created="updateStatement"
    />
  </Dialog>
  <Dialog
    v-model:visible="showEditStatementModal"
    size="lg"
    modal
    header="Edit Statement"
  >
    <StatementEditForm
      v-if="localStatement"
      :ssp-id="system.securityPlan?.uuid || ''"
      :req-id="implementation.uuid || ''"
      :statement="localStatement"
      @cancel="showEditStatementModal = false"
      @saved="updateStatement"
    />
  </Dialog>
  <Dialog
    v-model:visible="showCreateComponentModal"
    modal
    header="Create System Component"
  >
    <SystemImplementationComponentCreateForm
      :ssp-id="resolvedSspId"
      @cancel="showCreateComponentModal = false"
      @created="handleComponentCreated"
    />
  </Dialog>
</template>

<style scoped></style>
