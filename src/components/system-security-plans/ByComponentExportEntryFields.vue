<template>
  <div>
    <Textarea
      v-model="description"
      :placeholder="descriptionPlaceholder"
      rows="2"
      class="w-full"
    />
    <div class="mt-2">
      <div class="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">
        Responsible Roles
      </div>
      <div class="space-y-1">
        <div
          v-for="(role, index) in responsibleRoles"
          :key="index"
          class="flex gap-2 items-center"
        >
          <InputText
            v-model="role.roleId"
            placeholder="Role ID"
            class="w-1/3"
          />
          <InputText
            :model-value="role.partyUuids?.join(', ')"
            @update:model-value="(value) => setPartyUuids(index, String(value))"
            placeholder="Party UUIDs (comma-separated)"
            class="flex-1"
          />
          <button
            type="button"
            class="text-red-500 hover:text-red-700 text-sm"
            @click="removeRole(index)"
          >
            Remove
          </button>
        </div>
      </div>
      <button
        type="button"
        class="text-xs px-2 py-1 mt-1 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors"
        @click="addRole"
      >
        Add Role
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import InputText from '@/volt/InputText.vue';
import Textarea from '@/volt/Textarea.vue';
import type { ResponsibleRole } from '@/oscal';

defineProps<{
  descriptionPlaceholder?: string;
}>();

const description = defineModel<string>('description', { required: true });
const responsibleRoles = defineModel<ResponsibleRole[]>('responsibleRoles', {
  required: true,
});

function addRole() {
  responsibleRoles.value.push({ roleId: '', partyUuids: [] });
}

function removeRole(index: number) {
  responsibleRoles.value.splice(index, 1);
}

function setPartyUuids(index: number, value: string) {
  const role = responsibleRoles.value[index];
  if (!role) return;
  role.partyUuids = value
    .split(',')
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
}
</script>
