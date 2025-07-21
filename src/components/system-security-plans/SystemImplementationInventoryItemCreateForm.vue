<template>
  <div class="px-12 py-8">
    <form @submit.prevent="createInventoryItem()">
      <h1 class="text-xl font-semibold mb-6 dark:text-slate-300">Create Inventory Item</h1>

    <div class="mb-4">
      <label class="inline-block pb-2 dark:text-slate-300">UUID</label>
      <div class="flex gap-2">
        <FormInput v-model="inventoryItemData.uuid" placeholder="Inventory Item UUID" class="flex-1" readonly />
        <button 
          type="button"
          @click="generateUUID"
          class="px-3 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
        >
          Generate
        </button>
      </div>
    </div>

    <div class="mb-4">
      <label class="inline-block pb-2 dark:text-slate-300">Description <span class="text-red-500">*</span></label>
      <FormTextarea v-model="inventoryItemData.description" required />
    </div>

    <div class="mb-4">
      <label class="inline-block pb-2 dark:text-slate-300">Remarks</label>
      <FormTextarea v-model="inventoryItemData.remarks" />
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
        {{ saving ? 'Creating...' : 'Create Inventory Item' }}
      </button>
    </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useToast } from 'primevue/usetoast';
import FormInput from '@/components/forms/FormInput.vue';
import FormTextarea from '@/components/forms/FormTextarea.vue';
import { 
  type InventoryItem,
  useSystemSecurityPlanStore 
} from '@/stores/system-security-plans.ts';

const props = defineProps<{
  sspId: string;
}>();

const emit = defineEmits<{
  cancel: [];
  created: [inventoryItem: InventoryItem];
}>();

const sspStore = useSystemSecurityPlanStore();
const toast = useToast();
const saving = ref(false);

const inventoryItemData = reactive<InventoryItem>({
  uuid: '',
  description: '',
  remarks: '',
  props: [],
  links: [],
  responsibleParties: [],
  implementedComponents: []
});

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function generateNewUUID() {
  inventoryItemData.uuid = generateUUID();
}

onMounted(() => {
  generateNewUUID();
});

async function createInventoryItem() {
  try {
    saving.value = true;
    
    const response = await sspStore.createSystemImplementationInventoryItem(
      props.sspId,
      inventoryItemData
    );
    
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Inventory item created successfully.',
      life: 3000
    });
    
    emit('created', response.data);
  } catch (error) {
    console.error('Failed to create inventory item:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to create inventory item. Please try again.',
      life: 5000
    });
  } finally {
    saving.value = false;
  }
}
</script> 