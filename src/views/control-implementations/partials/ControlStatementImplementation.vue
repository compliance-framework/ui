<script setup lang="ts">
import { v4 as uuidv4 } from 'uuid'
import type {
  ByComponent,
  Statement,
  SystemComponent,
} from '@/oscal';
import StatementByComponent from '@/views/control-implementations/partials/StatementByComponent.vue';
import {
  type ImplementedRequirement,
  useSystemSecurityPlanStore,
} from '@/stores/system-security-plans.ts';
import { computed, onMounted, ref, toValue, watch } from 'vue'
import { useSystemStore } from '@/stores/system.ts';
import Select from '@/volt/Select.vue';
import Button from '@/volt/Button.vue';
import Textarea from '@/volt/Textarea.vue';
import { useApi } from '@/composables/api';
import type { DataResponse } from '@/types';
import { useCloned } from '@vueuse/core'
import BurgerMenu from '@/components/BurgerMenu.vue'
import { useToggle } from '@/composables/useToggle'

const sspStore = useSystemSecurityPlanStore();
const { system } = useSystemStore();

const { value: showCreateForm, set: setCreateForm } = useToggle(false)

const { statement, implementation } = defineProps<{
  statement: Statement;
  implementation: ImplementedRequirement;
}>();
const localStatement = ref(statement);

const emit = defineEmits<{
  updated: [statement: Statement];
}>()

const { data: components, loading: componentsLoading } = useApi<
  DataResponse<SystemComponent[]>
>(
  new Request(
    `/api/oscal/system-security-plans/${system.securityPlan?.uuid as string}/system-implementation/components`,
  ),
);

const componentItems = computed(() => {
  return toValue(components.value?.data || []).map((item) => {
    return {
      name: item.title,
      value: item.uuid,
    };
  });
});

const newByComponent = ref<ByComponent>({
  uuid: uuidv4(),
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
  setCreateForm(false)
  newByComponent.value = {
    uuid: uuidv4(),
  } as ByComponent
}

async function create() {
  const clonedStatement = useCloned(localStatement).cloned;
  clonedStatement.value.byComponents = [
    ...(statement.byComponents || []),
    toValue(newByComponent),
  ];
  sspStore.updateImplementedRequirementStatement(
    system.securityPlan?.uuid as string,
    implementation.uuid,
    statement.uuid,
    clonedStatement.value,
  ).then((res) => {
    localStatement.value = res.data;
    newByComponent.value = {
      uuid: uuidv4(),
    } as ByComponent
    setCreateForm(false)
    emit('updated', res.data);
  });
}
</script>

<template>
  <div class="pb-24">
    <div class="flex items-center mb-4 gap-x-4">
      <h4 class="font-medium text-xl">Components</h4>
      <BurgerMenu :items="[
        {
          label: 'Add Component',
          command: () => {
            setCreateForm(true)
          }
        }
      ]" />
    </div>
    <div
      v-for="byComponent in localStatement.byComponents || []"
      :key="byComponent.uuid"
      class="mb-4"
    >
      <StatementByComponent :by-component="byComponent" />
    </div>

    <form @submit.prevent="create" v-if="showCreateForm">
      <div class="h-0.5 dark:bg-slate-800 bg-gray-400 w-full my-4"></div>
      <h4 class="mb-4">New Component Implementation</h4>
      <div class="mb-2">
        <Select
          placeholder="Component"
          :loading="componentsLoading"
          checkmark
          class="w-full"
          v-model="selectedComponent"
          :options="componentItems"
          optionLabel="name"
        />
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
