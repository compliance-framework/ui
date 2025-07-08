<template>
  <form @submit.prevent="createSubject()">
    <h1 class="text-xl font-semibold mb-6 dark:text-slate-300">Create a new subject</h1>

    <div class="mb-4">
      <label class="inline-block pb-2 dark:text-slate-300">UUID</label>
      <div class="flex items-center place-items-stretch">
        <FormInput v-model="subject.uuid" class="rounded-r-none border-r-0" />
        <TertiaryButton type="button" @click="generateUuid" class="py-3 rounded-l-none"><BIconArrowRepeat /></TertiaryButton>
      </div>
    </div>

    <div class="mb-4">
      <label class="inline-block pb-2 dark:text-slate-300">Title</label>
      <FormInput v-model="subject.title" />
    </div>

    <div class="mb-4">
      <label class="inline-block pb-2 dark:text-slate-300">Type <span class="text-red-500">*</span></label>
      <select
        v-model="subject.type"
        required
        class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md dark:bg-slate-700 dark:text-slate-300"
      >
        <option value="">Select type...</option>
        <option value="component">Component</option>
        <option value="inventory-item">Inventory Item</option>
        <option value="location">Location</option>
        <option value="party">Party</option>
        <option value="user">User</option>
      </select>
    </div>

    <div class="mb-4">
      <label class="inline-block pb-2 dark:text-slate-300">Description <span class="text-red-500">*</span></label>
      <FormTextarea v-model="subject.description" rows="3" required />
    </div>

    <!-- Properties Section -->
    <div class="mb-6">
      <label class="inline-block pb-2 dark:text-slate-300">Properties</label>
      <div class="space-y-3">
        <div
          v-for="(prop, index) in subject.props"
          :key="index"
          class="p-3 border border-ccf-300 dark:border-slate-700 rounded-md bg-gray-50 dark:bg-slate-800"
        >
          <div class="flex justify-between items-start mb-2">
            <h4 class="text-sm font-medium dark:text-slate-300">Property {{ index + 1 }}</h4>
            <button
              type="button"
              @click="removeProperty(index)"
              class="text-red-500 hover:text-red-700"
            >
              Remove
            </button>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label class="inline-block pb-1 text-sm dark:text-slate-300">Name</label>
              <FormInput v-model="prop.name" placeholder="Property name" />
            </div>
            <div>
              <label class="inline-block pb-1 text-sm dark:text-slate-300">Value</label>
              <FormInput v-model="prop.value" placeholder="Property value" />
            </div>
          </div>
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
      <div class="space-y-3">
        <div
          v-for="(link, index) in subject.links"
          :key="index"
          class="p-3 border border-ccf-300 dark:border-slate-700 rounded-md bg-gray-50 dark:bg-slate-800"
        >
          <div class="flex justify-between items-start mb-2">
            <h4 class="text-sm font-medium dark:text-slate-300">Link {{ index + 1 }}</h4>
            <button
              type="button"
              @click="removeLink(index)"
              class="text-red-500 hover:text-red-700"
            >
              Remove
            </button>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label class="inline-block pb-1 text-sm dark:text-slate-300">Href</label>
              <FormInput v-model="link.href" placeholder="URL or reference" />
            </div>
            <div>
              <label class="inline-block pb-1 text-sm dark:text-slate-300">Rel</label>
              <FormInput v-model="link.rel" placeholder="Relationship" />
            </div>
          </div>
          <div class="mt-2">
            <label class="inline-block pb-1 text-sm dark:text-slate-300">Text</label>
            <FormInput v-model="link.text" placeholder="Link text" />
          </div>
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

    <div v-if="errorMessage" class="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
      {{ errorMessage }}
    </div>

    <div class="flex gap-2">
      <PrimaryButton type="submit">Create Subject</PrimaryButton>
      <SecondaryButton type="button" @click="$emit('cancel')">Cancel</SecondaryButton>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { type AssessmentSubject, useAssessmentPlanStore } from '@/stores/assessment-plans.ts'
import type { Property, Link } from '@/stores/types.ts'
import { useToast } from 'primevue/usetoast'
import FormInput from '@/components/forms/FormInput.vue'
import FormTextarea from '@/components/forms/FormTextarea.vue'
import PrimaryButton from '@/components/PrimaryButton.vue'
import SecondaryButton from '@/components/SecondaryButton.vue'
import TertiaryButton from '@/components/TertiaryButton.vue'
import { BIconArrowRepeat } from 'bootstrap-icons-vue'
import { v4 as uuidv4 } from 'uuid'

const assessmentPlanStore = useAssessmentPlanStore()
const toast = useToast()

const props = defineProps<{
  assessmentPlanId: string
}>()

const emit = defineEmits<{
  created: [subject: AssessmentSubject]
  cancel: []
}>()

const subject = ref<AssessmentSubject>({
  uuid: uuidv4(),
  title: '',
  type: '',
  description: '',
  props: [],
  links: []
})

const errorMessage = ref('')

const addProperty = () => {
  const newProperty: Property = {
    name: '',
    value: '',
    class: '',
    ns: '',
    uuid: crypto.randomUUID()
  };
  subject.value.props!.push(newProperty);
};

const removeProperty = (index: number) => {
  subject.value.props!.splice(index, 1);
};

const addLink = () => {
  const newLink: Link = {
    href: '',
    rel: '',
    text: ''
  };
  subject.value.links!.push(newLink);
};

const removeLink = (index: number) => {
  subject.value.links!.splice(index, 1);
};

async function createSubject(): Promise<void> {
  errorMessage.value = ''

  if (!props.assessmentPlanId) {
    errorMessage.value = 'Assessment plan ID is missing'
    return
  }

  if (!subject.value.type?.trim() || !subject.value.description?.trim()) {
    errorMessage.value = 'Type and description are required'
    return
  }

  try {
    const subjectData = {
      uuid: subject.value.uuid,
      title: subject.value.title || '',
      type: subject.value.type,
      description: subject.value.description,
      props: subject.value.props || [],
      links: subject.value.links || []
    }

    // Get current subjects and add the new one
    const response = await assessmentPlanStore.get(props.assessmentPlanId)
    const currentSubjects = response.data.assessmentSubjects || []
    const updatedSubjects = [...currentSubjects, subjectData]

    await assessmentPlanStore.updateAssessmentSubjects(props.assessmentPlanId, updatedSubjects)

    toast.add({
      severity: 'success',
      summary: 'Subject Created',
      detail: 'Subject has been created successfully',
      life: 3000
    })

    emit('created', subjectData)
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error Creating Subject',
      detail: error instanceof Error ? error.message : 'Failed to create subject',
      life: 3000
    })
    errorMessage.value = error instanceof Error ? error.message : 'Failed to create subject'
  }
}

function generateUuid() {
  subject.value.uuid = uuidv4()
}
</script>
