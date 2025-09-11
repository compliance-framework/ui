<script setup lang="ts">
import { v4 as uuidv4 } from 'uuid';
import type { ByComponent, Statement, SystemComponent } from '@/oscal';
import StatementByComponent from '@/views/control-implementations/partials/StatementByComponent.vue';
import type { ImplementedRequirement } from '@/stores/system-security-plans.ts';
import { computed, onMounted, ref, toValue, watch } from 'vue';
import { useSystemStore } from '@/stores/system.ts';
import Select from '@/volt/Select.vue';
import Textarea from '@/volt/Textarea.vue';
import { useCloned } from '@vueuse/core';
import BurgerMenu from '@/components/BurgerMenu.vue';
import { useToggle } from '@/composables/useToggle';
import { useDataApi, decamelizeKeys } from '@/composables/axios';
import { useToast } from 'primevue/usetoast';

const { system } = useSystemStore();
const toast = useToast();

const showError = ref(false);

const { value: showCreateForm, set: setCreateForm } = useToggle(false);

const { statement, implementation } = defineProps<{
  statement: Statement;
  implementation: ImplementedRequirement;
}>();
const localStatement = ref<Statement>(statement);

const emit = defineEmits<{
  updated: [statement: Statement];
}>();

const { data: components, isLoading: componentsLoading } = useDataApi<
  SystemComponent[]
>(
  `/api/oscal/system-security-plans/${system.securityPlan?.uuid as string}/system-implementation/components`,
);
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

function resetCreateForm() {
  setCreateForm(false);
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
  const updatedStatement = useCloned(localStatement).cloned;
  updatedStatement.value.byComponents =
    updatedStatement.value.byComponents?.filter(
      (comp: ByComponent) => byComp.uuid !== comp.uuid,
    );
  try {
    await executeDelete(
      `/api/oscal/system-security-plans/${system.securityPlan?.uuid}/control-implementation/implemented-requirements/${implementation.uuid}/statements/${statement.uuid}/by-components/${byComp.uuid}`,
    );
    localStatement.value = updatedStatement.value;
    setCreateForm(false);
    emit('updated', localStatement.value);
    newByComponent.value = {
      uuid: uuidv4(),
    } as ByComponent;
  } catch (err) {
    console.error(err);
  }
}

async function updateByComponent(byComp: ByComponent) {
  try {
    await executeUpdate(
      `/api/oscal/system-security-plans/${system.securityPlan?.uuid}/control-implementation/implemented-requirements/${implementation.uuid}/statements/${statement.uuid}/by-components/${byComp.uuid}`,
      {
        data: byComp,
      },
    );
    setCreateForm(false);
    emit('updated', localStatement.value);
    newByComponent.value = {
      uuid: uuidv4(),
    } as ByComponent;
  } catch (err) {
    console.error(err);
  }
}

async function create() {
  if (!newByComponent.value.componentUuid) {
    showError.value = true;
    return;
  }
  try {
    const res = await executeCreate(
      `/api/oscal/system-security-plans/${system.securityPlan?.uuid}/control-implementation/implemented-requirements/${implementation.uuid}/statements/${statement.uuid}/by-components`,
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
    setCreateForm(false);
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
</script>

<template>
  <div class="pb-24">
    <div class="flex items-center mb-4 gap-x-4">
      <h4 class="font-medium text-xl">Components</h4>
      <BurgerMenu
        :items="[
          {
            label: 'Add Component',
            command: () => {
              setCreateForm(true);
            },
          },
        ]"
      />
    </div>
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

    <form @submit.prevent="create" v-if="showCreateForm">
      <div class="h-0.5 dark:bg-slate-800 bg-gray-400 w-full my-4"></div>
      <h4 class="mb-4">New Component Implementation</h4>
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
        />
      </div>
      <div class="text-right">
        <secondary-button @click="resetCreateForm">Cancel</secondary-button>
        <primary-button type="submit">Create</primary-button>
      </div>
    </form>
  </div>

  <!--  uuid: string;-->
  <!--  componentUuid: string;-->
  <!--  description: string;-->
  <!--  props: Property[];-->
  <!--  links: Link[];-->
  <!--  setParameters?: SetParameter[];-->
  <!--  responsibleRoles?: ResponsibleRole[];-->
  <!--  remarks?: string;-->
  <!--  implementationStatus?: ImplementationStatus;-->
  <!--  export?: Export;-->
  <!--  inherited?: InheritedControlImplementation[];-->
  <!--  satisfied?: SatisfiedControlImplementationResponsibility[];-->
</template>

<style scoped></style>
