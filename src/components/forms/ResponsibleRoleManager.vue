<template>
  <div class="mb-6">
    <label class="inline-block pb-2 dark:text-slate-300">Responsible Roles</label>
    <div class="space-y-3">
      <div
        v-for="(role, index) in responsibleRoles"
        :key="index"
        class="p-3 border border-ccf-300 dark:border-slate-700 rounded-md bg-gray-50 dark:bg-slate-800"
      >
        <div class="flex justify-between items-start mb-2">
          <h4 class="text-sm font-medium dark:text-slate-300">Responsible Role {{ index + 1 }}</h4>
          <button
            type="button"
            @click="removeRole(index)"
            class="text-red-500 hover:text-red-700"
          >
            Remove
          </button>
        </div>

        <div class="space-y-3">
          <div>
            <label class="inline-block pb-1 text-sm dark:text-slate-300">Role ID</label>
            <FormInput v-model="role.roleId" placeholder="Role identifier" />
          </div>

          <div>
            <label class="inline-block pb-1 text-sm dark:text-slate-300">Party UUIDs</label>
            <FormTextarea
              v-model="partyUuidsText[index]"
              @input="updatePartyUuids(index, $event.target.value)"
              placeholder="Enter party UUIDs, one per line"
              rows="3"
            />
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Enter one UUID per line
            </p>
          </div>

          <div v-if="role.props && role.props.length > 0">
            <label class="inline-block pb-1 text-sm dark:text-slate-300">Properties</label>
            <PropertyManager v-model="role.props" />
          </div>

          <div v-if="role.links && role.links.length > 0">
            <label class="inline-block pb-1 text-sm dark:text-slate-300">Links</label>
            <LinkManager v-model="role.links" />
          </div>

          <div class="flex gap-2">
            <button
              type="button"
              @click="addProperties(index)"
              class="px-3 py-1 bg-blue-500 text-white text-sm rounded-md hover:bg-blue-600 transition-colors"
            >
              Add Properties
            </button>
            <button
              type="button"
              @click="addLinks(index)"
              class="px-3 py-1 bg-blue-500 text-white text-sm rounded-md hover:bg-blue-600 transition-colors"
            >
              Add Links
            </button>
          </div>
        </div>
      </div>

      <button
        type="button"
        @click="addRole"
        class="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
      >
        Add Responsible Role
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import FormInput from '@/components/forms/FormInput.vue'
import FormTextarea from '@/components/forms/FormTextarea.vue'
import PropertyManager from '@/components/forms/PropertyManager.vue'
import LinkManager from '@/components/forms/LinkManager.vue'
import type { ResponsibleRole } from '@/stores/assessment-plans.ts'

const props = defineProps<{
  modelValue: ResponsibleRole[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: ResponsibleRole[]]
}>()

const responsibleRoles = computed({
  get: () => props.modelValue || [],
  set: (value: ResponsibleRole[]) => emit('update:modelValue', value)
})

// Track party UUIDs as text for easier editing
const partyUuidsText = ref<string[]>([])

// Initialize party UUIDs text when roles change
watch(responsibleRoles, (newRoles) => {
  partyUuidsText.value = newRoles.map(role =>
    role.partyUuids ? role.partyUuids.join('\n') : ''
  )
}, { immediate: true })

const addRole = () => {
  const newRoles = [...responsibleRoles.value]
  newRoles.push({
    roleId: '',
    partyUuids: []
  })
  responsibleRoles.value = newRoles
  partyUuidsText.value.push('')
}

const removeRole = (index: number) => {
  const newRoles = [...responsibleRoles.value]
  newRoles.splice(index, 1)
  responsibleRoles.value = newRoles
  partyUuidsText.value.splice(index, 1)
}

const updatePartyUuids = (index: number, text: string) => {
  partyUuidsText.value[index] = text
  const newRoles = [...responsibleRoles.value]
  newRoles[index].partyUuids = text
    .split('\n')
    .map(uuid => uuid.trim())
    .filter(uuid => uuid.length > 0)
  responsibleRoles.value = newRoles
}

const addProperties = (index: number) => {
  const newRoles = [...responsibleRoles.value]
  if (!newRoles[index].props) {
    newRoles[index].props = []
  }
  responsibleRoles.value = newRoles
}

const addLinks = (index: number) => {
  const newRoles = [...responsibleRoles.value]
  if (!newRoles[index].links) {
    newRoles[index].links = []
  }
  responsibleRoles.value = newRoles
}
</script>
