<template>
  <div class="px-12 py-8">
    <form @submit.prevent="saveLeveragedAuthorization()">
      <h1 class="text-xl font-semibold mb-6 dark:text-slate-300">Edit Leveraged Authorization</h1>

      <div class="mb-4">
        <label class="inline-block pb-2 dark:text-slate-300">UUID</label>
        <FormInput v-model="authData.uuid" placeholder="Authorization UUID" readonly />
      </div>

      <div class="mb-4">
        <label class="inline-block pb-2 dark:text-slate-300">Title <span class="text-red-500">*</span></label>
        <FormInput v-model="authData.title" placeholder="Authorization title (e.g., GovCloud, FedRAMP)" required />
      </div>

      <div class="mb-4">
        <label class="inline-block pb-2 dark:text-slate-300">Party UUID <span class="text-red-500">*</span></label>
        <FormInput v-model="authData.partyUuid" placeholder="UUID of the party providing the authorization" required />
      </div>

      <div class="mb-4">
        <label class="inline-block pb-2 dark:text-slate-300">Date Authorized <span class="text-red-500">*</span></label>
        <FormInput 
          v-model="authData.dateAuthorized" 
          type="date" 
          placeholder="Date when authorization was granted"
          required 
        />
      </div>

      <div class="mb-4">
        <label class="inline-block pb-2 dark:text-slate-300">Remarks</label>
        <FormTextarea v-model="authData.remarks" placeholder="Additional remarks about this authorization" />
      </div>

      <!-- Properties Section -->
      <div class="mb-6">
        <label class="inline-block pb-2 dark:text-slate-300">Properties</label>
        <div class="space-y-2">
          <div v-for="(prop, index) in authData.props || []" :key="index" class="flex gap-2">
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
          <div v-for="(link, index) in authData.links || []" :key="index" class="flex gap-2">
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
          {{ saving ? 'Saving...' : 'Save Authorization' }}
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
  type LeveragedAuthorization,
  useSystemSecurityPlanStore 
} from '@/stores/system-security-plans.ts';

const props = defineProps<{
  sspId: string;
  auth: LeveragedAuthorization;
}>();

const emit = defineEmits<{
  cancel: [];
  saved: [auth: LeveragedAuthorization];
}>();

const sspStore = useSystemSecurityPlanStore();
const toast = useToast();
const saving = ref(false);

const authData = reactive<LeveragedAuthorization>({
  uuid: '',
  title: '',
  partyUuid: '',
  dateAuthorized: '',
  remarks: '',
  props: [],
  links: []
});

onMounted(() => {
  Object.assign(authData, {
    ...props.auth,
    props: [...(props.auth.props || [])].map(p => ({ ...p })),
    links: [...(props.auth.links || [])].map(l => ({ ...l }))
  });
});

const addProperty = () => {
  if (!authData.props) authData.props = [];
  authData.props.push({
    name: '',
    value: ''
  });
};

const removeProperty = (index: number) => {
  if (authData.props) {
    authData.props.splice(index, 1);
  }
};

const addLink = () => {
  if (!authData.links) authData.links = [];
  authData.links.push({
    href: '',
    text: '',
    rel: ''
  });
};

const removeLink = (index: number) => {
  if (authData.links) {
    authData.links.splice(index, 1);
  }
};

const saveLeveragedAuthorization = async () => {
  if (!authData.title?.trim() || !authData.partyUuid?.trim() || !authData.dateAuthorized?.trim()) {
    toast.add({
      severity: 'error',
      summary: 'Validation Error',
      detail: 'Title, Party UUID, and Date Authorized are required fields.',
      life: 3000
    });
    return;
  }

  saving.value = true;
  try {
    const response = await sspStore.updateSystemImplementationLeveragedAuthorization(
      props.sspId,
      authData.uuid,
      authData
    );
    
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Leveraged authorization updated successfully.',
      life: 3000
    });
    
    emit('saved', response.data);
  } catch (error) {
    console.error('Failed to update leveraged authorization:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to update leveraged authorization. Please try again.',
      life: 5000
    });
  } finally {
    saving.value = false;
  }
};
</script>