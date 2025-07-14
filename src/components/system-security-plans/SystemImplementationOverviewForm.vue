<template>
  <div class="px-6 py-4">
    <form @submit.prevent="saveOverview()">
      <h3 class="text-lg font-semibold mb-6 dark:text-slate-300">System Implementation Overview</h3>

      <div class="mb-4">
        <label class="inline-block pb-2 dark:text-slate-300">Description</label>
        <FormTextarea v-model="overviewData.description" placeholder="System implementation description" />
      </div>

      <div class="mb-4">
        <label class="inline-block pb-2 dark:text-slate-300">Remarks</label>
        <FormTextarea v-model="overviewData.remarks" placeholder="Additional remarks about the system implementation" />
      </div>

      <!-- Properties Section -->
      <div class="mb-6">
        <label class="inline-block pb-2 dark:text-slate-300">Properties</label>
        <div class="space-y-2">
          <div v-for="(prop, index) in overviewData.props || []" :key="index" class="flex gap-2">
            <FormInput 
              v-model="prop.name" 
              placeholder="Property name"
              class="flex-1"
            />
            <FormInput 
              v-model="prop.value" 
              placeholder="Property value"
              class="flex-1"
            />
            <button 
              type="button"
              @click="removeProperty(index)"
              class="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
            >
              Remove
            </button>
          </div>
          <button 
            type="button"
            @click="addProperty"
            class="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
          >
            Add Property
          </button>
        </div>
      </div>

      <!-- Links Section -->
      <div class="mb-6">
        <label class="inline-block pb-2 dark:text-slate-300">Links</label>
        <div class="space-y-2">
          <div v-for="(link, index) in overviewData.links || []" :key="index" class="flex gap-2">
            <FormInput 
              v-model="link.href" 
              placeholder="Link URL"
              class="flex-1"
            />
            <FormInput 
              v-model="link.text" 
              placeholder="Link text"
              class="flex-1"
            />
            <FormInput 
              v-model="link.rel" 
              placeholder="Relationship"
              class="flex-1"
            />
            <button 
              type="button"
              @click="removeLink(index)"
              class="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
            >
              Remove
            </button>
          </div>
          <button 
            type="button"
            @click="addLink"
            class="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
          >
            Add Link
          </button>
        </div>
      </div>

      <div class="flex justify-end">
        <button 
          type="submit"
          :disabled="saving"
          class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 transition-colors"
        >
          {{ saving ? 'Saving...' : 'Save Overview' }}
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
  type SystemImplementation,
  useSystemSecurityPlanStore 
} from '@/stores/system-security-plans.ts';

const props = defineProps<{
  sspId: string;
  systemImplementation: SystemImplementation | null;
}>();

const emit = defineEmits<{
  saved: [systemImplementation: SystemImplementation];
}>();

const sspStore = useSystemSecurityPlanStore();
const toast = useToast();
const saving = ref(false);

const overviewData = reactive<SystemImplementation>({
  description: '',
  remarks: '',
  props: [],
  links: []
});

onMounted(() => {
  if (props.systemImplementation) {
    Object.assign(overviewData, {
      ...props.systemImplementation,
      props: [...(props.systemImplementation.props || [])].map(p => ({ ...p })),
      links: [...(props.systemImplementation.links || [])].map(l => ({ ...l }))
    });
  }
});

const addProperty = () => {
  if (!overviewData.props) overviewData.props = [];
  overviewData.props.push({
    name: '',
    value: ''
  });
};

const removeProperty = (index: number) => {
  if (overviewData.props) {
    overviewData.props.splice(index, 1);
  }
};

const addLink = () => {
  if (!overviewData.links) overviewData.links = [];
  overviewData.links.push({
    href: '',
    text: '',
    rel: ''
  });
};

const removeLink = (index: number) => {
  if (overviewData.links) {
    overviewData.links.splice(index, 1);
  }
};

const saveOverview = async () => {
  saving.value = true;
  try {
    const response = await sspStore.updateSystemImplementation(
      props.sspId,
      overviewData
    );
    
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'System implementation overview updated successfully.',
      life: 3000
    });
    
    emit('saved', response.data);
  } catch (error) {
    console.error('Failed to update system implementation overview:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to update system implementation overview. Please try again.',
      life: 5000
    });
  } finally {
    saving.value = false;
  }
};
</script>