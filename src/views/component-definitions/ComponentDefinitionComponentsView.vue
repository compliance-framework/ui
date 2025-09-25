<template>
  <template v-if="components">
    <div
      class="my-4 rounded-md bg-white dark:bg-slate-900 border-collapse border border-ccf-300 dark:border-slate-700"
    >
      <div v-if="components.length > 0">
        <ComponentDefinitionComponent
          v-for="component in components"
          :key="component.uuid"
          :component="component"
          :componentDefinitionId="componentDefinitionId"
          @edit="editComponent"
        />
      </div>
      <div v-else class="p-8 text-center">
        <p class="text-gray-500 dark:text-slate-400 mb-4">
          No components defined yet.
        </p>
        <TertiaryButton @click="showCreateForm = true"
          >Add Component</TertiaryButton
        >
      </div>
    </div>

    <div class="mt-4" v-if="components.length > 0">
      <TertiaryButton @click="showCreateForm = true"
        >Add Component</TertiaryButton
      >
    </div>

    <ComponentCreateModal
      @created="componentCreated"
      :component-definition-id="componentDefinitionId"
      v-model="showCreateForm"
    />

    <ComponentEditModal
      v-if="editingComponent"
      @updated="componentUpdated"
      :component-definition-id="componentDefinitionId"
      :component="editingComponent"
      v-model="showEditForm"
    />
  </template>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { type DefinedComponent } from '@/oscal';
import { useRoute } from 'vue-router';
import TertiaryButton from '@/volt/TertiaryButton.vue';
import ComponentDefinitionComponent from '@/components/component-definitions/ComponentDefinitionComponent.vue';
import ComponentCreateModal from '@/components/component-definitions/ComponentCreateModal.vue';
import ComponentEditModal from '@/components/component-definitions/ComponentEditModal.vue';
import { useDataApi } from '@/composables/axios';

const route = useRoute();
const componentDefinitionId = computed(() => route.params.id as string);
const showCreateForm = ref<boolean>(false);
const showEditForm = ref<boolean>(false);
const editingComponent = ref<DefinedComponent | null>(null);

const { data: components } = useDataApi<DefinedComponent[]>(
  `/api/oscal/component-definitions/${componentDefinitionId.value}/components`,
);

function componentCreated(component: DefinedComponent) {
  if (!components.value) return;
  components.value.push(component);
  showCreateForm.value = false;
}

function editComponent(component: DefinedComponent) {
  editingComponent.value = component;
  showEditForm.value = true;
}

function componentUpdated(updatedComponent: DefinedComponent) {
  if (!components.value || !updatedComponent) return;
  const index = components.value.findIndex(
    (c) => c.uuid === updatedComponent.uuid,
  );
  if (index !== -1) {
    components.value[index] = updatedComponent;
  }
  showEditForm.value = false;
  editingComponent.value = null;
}
</script>
