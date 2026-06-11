<template>
  <div class="px-12 py-8">
    <form @submit.prevent="saveInventoryItem()">
      <h1 class="text-xl font-semibold mb-6 dark:text-slate-300">
        Edit Inventory Item
      </h1>

      <div class="mb-4">
        <label class="inline-block pb-2 dark:text-slate-300">UUID</label>
        <InputText
          v-model="inventoryItemData.uuid"
          placeholder="Inventory Item UUID"
          readonly
          class="w-full"
        />
      </div>

      <div class="mb-4">
        <label class="inline-block pb-2 dark:text-slate-300"
          >Description <span class="text-red-500">*</span></label
        >
        <Textarea
          v-model="inventoryItemData.description"
          required
          class="w-full"
        />
      </div>

      <div class="mb-4">
        <label class="inline-block pb-2 dark:text-slate-300">Remarks</label>
        <Textarea v-model="inventoryItemData.remarks" class="w-full" />
      </div>

      <div class="flex justify-end gap-4">
        <button
          type="button"
          @click="$emit('cancel')"
          class="px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 rounded-md hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          :disabled="saving"
          class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 transition-colors"
        >
          {{ saving ? 'Saving...' : 'Save Inventory Item' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { reactive, onMounted } from 'vue';
import { useToast } from 'primevue/usetoast';
import InputText from '@/volt/InputText.vue';
import Textarea from '@/volt/Textarea.vue';
import type { InventoryItem } from '@/oscal';
import { useDataApi, decamelizeKeys } from '@/composables/axios';

const props = defineProps<{
  sspId: string;
  inventoryItem: InventoryItem;
}>();

const emit = defineEmits<{
  cancel: [];
  saved: [inventoryItem: InventoryItem];
}>();

const toast = useToast();

const {
  data: updatedItem,
  isLoading: saving,
  execute: updateItem,
} = useDataApi<InventoryItem>(
  `/api/oscal/system-security-plans/${props.sspId}/system-implementation/inventory-items/${props.inventoryItem.uuid}`,
  {
    method: 'PUT',
    transformRequest: [decamelizeKeys],
  },
  { immediate: false },
);

const inventoryItemData = reactive<InventoryItem>({
  uuid: '',
  description: '',
  remarks: '',
  props: [],
  links: [],
  responsibleParties: [],
  implementedComponents: [],
});

onMounted(() => {
  Object.assign(inventoryItemData, {
    ...props.inventoryItem,
    implementedComponents: [
      ...(props.inventoryItem.implementedComponents || []),
    ],
  });
});

async function saveInventoryItem() {
  try {
    await updateItem({
      data: inventoryItemData,
    });

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Inventory item updated successfully.',
      life: 3000,
    });

    emit('saved', updatedItem.value!);
  } catch (error) {
    console.error('Failed to update inventory item:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to update inventory item. Please try again.',
      life: 5000,
    });
  }
}
</script>
