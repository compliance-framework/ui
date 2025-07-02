<template>
  <div class="px-12 py-8">
    <form @submit.prevent="createUser()">
      <h1 class="text-xl font-semibold mb-6 dark:text-slate-300">Create User</h1>

    <div class="mb-4">
      <label class="inline-block pb-2 dark:text-slate-300">UUID</label>
      <div class="flex gap-2">
        <FormInput v-model="userData.uuid" placeholder="User UUID" class="flex-1" readonly />
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
      <label class="inline-block pb-2 dark:text-slate-300">Title <span class="text-red-500">*</span></label>
      <FormInput v-model="userData.title" placeholder="User title or role name" required />
    </div>

    <div class="mb-4">
      <label class="inline-block pb-2 dark:text-slate-300">Short Name</label>
      <FormInput v-model="userData.shortName" placeholder="Short name or abbreviation" />
    </div>

    <div class="mb-4">
      <label class="inline-block pb-2 dark:text-slate-300">Description <span class="text-red-500">*</span></label>
      <FormTextarea v-model="userData.description" required />
    </div>

    <div class="mb-4">
      <label class="inline-block pb-2 dark:text-slate-300">Role IDs</label>
      <div class="space-y-2">
        <div v-for="(roleId, index) in userData.roleIds || []" :key="index" class="flex gap-2">
          <FormInput 
            v-model="userData.roleIds![index]" 
            placeholder="Role ID"
            class="flex-1"
          />
          <button 
            type="button"
            @click="removeRoleId(index)"
            class="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
          >
            Remove
          </button>
        </div>
        <button 
          type="button"
          @click="addRoleId"
          class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
        >
          Add Role ID
        </button>
      </div>
    </div>

    <!-- Authorized Privileges -->
    <div class="mb-6">
      <label class="inline-block pb-2 dark:text-slate-300">Authorized Privileges</label>
      <div class="space-y-4">
        <div 
          v-for="(privilege, index) in userData.authorizedPrivileges" 
          :key="index"
          class="p-4 border border-ccf-300 dark:border-slate-700 rounded-md bg-gray-50 dark:bg-slate-800"
        >
          <div class="flex justify-between items-start mb-3">
            <h4 class="text-sm font-medium dark:text-slate-300">Privilege {{ index + 1 }}</h4>
            <button 
              type="button"
              @click="removePrivilege(index)"
              class="text-red-500 hover:text-red-700"
            >
              Remove
            </button>
          </div>
          
          <div class="mb-3">
            <label class="inline-block pb-1 text-sm dark:text-slate-300">Title</label>
            <FormInput v-model="privilege.title" placeholder="Privilege title" />
          </div>
          
          <div class="mb-3">
            <label class="inline-block pb-1 text-sm dark:text-slate-300">Description</label>
            <FormTextarea v-model="privilege.description" rows="2" />
          </div>
          
          <div class="mb-3">
            <label class="inline-block pb-1 text-sm dark:text-slate-300">Functions Performed</label>
            <div class="space-y-2">
              <div v-for="(func, funcIndex) in privilege.functionsPerformed || []" :key="funcIndex" class="flex gap-2">
                <FormInput 
                  v-model="privilege.functionsPerformed![funcIndex]" 
                  placeholder="Function description"
                  class="flex-1"
                />
                <button 
                  type="button"
                  @click="removeFunctionPerformed(index, funcIndex)"
                  class="px-2 py-1 text-red-500 hover:text-red-700"
                >
                  ×
                </button>
              </div>
              <button 
                type="button"
                @click="addFunctionPerformed(index)"
                class="text-sm px-3 py-1 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors"
              >
                Add Function
              </button>
            </div>
          </div>
        </div>
        
        <button 
          type="button"
          @click="addPrivilege"
          class="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
        >
          Add Authorized Privilege
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
        {{ saving ? 'Creating...' : 'Create User' }}
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
  type SystemImplementationUser, 
  type AuthorizedPrivilege,
  useSystemSecurityPlanStore 
} from '@/stores/system-security-plans.ts';

const props = defineProps<{
  sspId: string;
}>();

const emit = defineEmits<{
  cancel: [];
  created: [user: SystemImplementationUser];
}>();

const sspStore = useSystemSecurityPlanStore();
const toast = useToast();
const saving = ref(false);

const userData = reactive<Partial<SystemImplementationUser>>({
  uuid: '',
  title: '',
  shortName: '',
  description: '',
  props: [],
  links: [],
  roleIds: [],
  authorizedPrivileges: []
});

onMounted(() => {
  generateUUID();
});

const generateUUID = () => {
  userData.uuid = crypto.randomUUID();
};

const addRoleId = () => {
  userData.roleIds!.push('');
};

const removeRoleId = (index: number) => {
  userData.roleIds!.splice(index, 1);
};

const addPrivilege = () => {
  userData.authorizedPrivileges!.push({
    title: '',
    description: '',
    props: [],
    links: [],
    functionsPerformed: []
  });
};

const removePrivilege = (index: number) => {
  userData.authorizedPrivileges!.splice(index, 1);
};

const addFunctionPerformed = (privilegeIndex: number) => {
  userData.authorizedPrivileges![privilegeIndex].functionsPerformed!.push('');
};

const removeFunctionPerformed = (privilegeIndex: number, functionIndex: number) => {
  userData.authorizedPrivileges![privilegeIndex].functionsPerformed!.splice(functionIndex, 1);
};

const createUser = async () => {
  if (!userData.title?.trim() || !userData.description?.trim()) {
    toast.add({
      severity: 'error',
      summary: 'Validation Error',
      detail: 'Title and description are required fields.',
      life: 3000
    });
    return;
  }

  saving.value = true;
  try {
    const response = await sspStore.createSystemImplementationUser(
      props.sspId,
      userData
    );
    
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'User created successfully.',
      life: 3000
    });
    
    emit('created', response.data);
  } catch (error) {
    console.error('Failed to create user:', error);
    const errorMessage = error instanceof Response 
      ? `HTTP ${error.status}: ${error.statusText}`
      : 'Failed to create user. Please try again.';
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: errorMessage,
      life: 5000
    });
  } finally {
    saving.value = false;
  }
};
</script>