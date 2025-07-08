<template>
  <form @submit.prevent="createAsset()">
    <h1 class="text-xl font-semibold mb-6 dark:text-slate-300">Create a new asset</h1>

    <div class="mb-4">
      <label class="inline-block pb-2 dark:text-slate-300">UUID</label>
      <div class="flex items-center place-items-stretch">
        <FormInput v-model="asset.uuid" class="rounded-r-none border-r-0" />
        <TertiaryButton type="button" @click="generateUuid" class="py-3 rounded-l-none"><BIconArrowRepeat /></TertiaryButton>
      </div>
    </div>

    <div class="mb-4">
      <label class="inline-block pb-2 dark:text-slate-300">Title</label>
      <FormInput v-model="asset.title" />
    </div>

    <div class="mb-4">
      <label class="inline-block pb-2 dark:text-slate-300">Description <span class="text-red-500">*</span></label>
      <FormTextarea v-model="asset.description" rows="3" required />
    </div>

    <!-- Properties Section -->
    <div class="mb-6">
      <label class="inline-block pb-2 dark:text-slate-300">Properties</label>
      <div class="space-y-3">
        <div
          v-for="(prop, index) in asset.props"
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
          v-for="(link, index) in asset.links"
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
      <PrimaryButton type="submit">Create Asset</PrimaryButton>
      <SecondaryButton type="button" @click="$emit('cancel')">Cancel</SecondaryButton>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { type AssessmentAsset, useAssessmentPlanStore } from '@/stores/assessment-plans.ts'
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
  created: [asset: AssessmentAsset]
  cancel: []
}>()

const asset = ref<AssessmentAsset>({
  uuid: uuidv4(),
  title: '',
  description: '',
  props: [],
  links: [],
  components: []
})

const errorMessage = ref('')

const addProperty = () => {
  const newProperty: Property = {
    name: '',
    value: '',
    class: '',
    ns: '',
    uuid: uuidv4()
  };
  asset.value.props!.push(newProperty);
};

const removeProperty = (index: number) => {
  asset.value.props!.splice(index, 1);
};

const addLink = () => {
  const newLink: Link = {
    href: '',
    rel: '',
    text: ''
  };
  asset.value.links!.push(newLink);
};

const removeLink = (index: number) => {
  asset.value.links!.splice(index, 1);
};

async function createAsset(): Promise<void> {
  errorMessage.value = ''

  if (!props.assessmentPlanId) {
    errorMessage.value = 'Assessment plan ID is missing'
    return
  }

  if (!asset.value.description?.trim()) {
    errorMessage.value = 'Description is required'
    return
  }

  try {
    // Filter out empty properties and links
    const filteredProps = (asset.value.props || []).filter(prop =>
      prop.name?.trim() || prop.value?.trim() || prop.class?.trim() || prop.ns?.trim()
    )
    const filteredLinks = (asset.value.links || []).filter(link =>
      link.href?.trim() || link.rel?.trim() || link.text?.trim()
    )

    // Create the assessment platform object
    const assessmentPlatform = {
      uuid: asset.value.uuid,
      title: asset.value.title?.trim() || asset.value.description,
      description: asset.value.description
    }

    // Add optional fields if they have meaningful values
    if (filteredProps.length > 0) {
      assessmentPlatform.props = filteredProps
    }

    if (filteredLinks.length > 0) {
      assessmentPlatform.links = filteredLinks
    }

    // Create the payload in the correct OSCAL AssessmentAssets structure
    const assetPayload = {
      'assessment-platforms': [assessmentPlatform]
    }

    // Add components if they exist
    if (asset.value.components && asset.value.components.length > 0) {
      assetPayload.components = asset.value.components
    }

    console.log('[DEBUG_LOG] Creating asset with payload:', assetPayload)

    // Use the dedicated asset creation endpoint
    await assessmentPlanStore.createAssessmentAsset(props.assessmentPlanId, assetPayload)

    toast.add({
      severity: 'success',
      summary: 'Asset Created',
      detail: 'Asset has been created successfully',
      life: 3000
    })

    // Emit the original asset data for consistency with parent components
    const assetData: AssessmentAsset = {
      uuid: asset.value.uuid,
      title: asset.value.title?.trim(),
      description: asset.value.description,
      props: filteredProps.length > 0 ? filteredProps : undefined,
      links: filteredLinks.length > 0 ? filteredLinks : undefined,
      components: asset.value.components && asset.value.components.length > 0 ? asset.value.components : undefined
    }

    emit('created', assetData)
  } catch (error) {
    console.error('[DEBUG_LOG] Asset creation error:', error)
    console.error('[DEBUG_LOG] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      assessmentPlanId: props.assessmentPlanId,
      rawAssetData: {
        uuid: asset.value.uuid,
        title: asset.value.title || '',
        description: asset.value.description,
        props: asset.value.props || [],
        links: asset.value.links || [],
        components: asset.value.components || []
      }
    })

    toast.add({
      severity: 'error',
      summary: 'Error Creating Asset',
      detail: error instanceof Error ? error.message : 'Failed to create asset',
      life: 3000
    })
    errorMessage.value = error instanceof Error ? error.message : 'Failed to create asset'
  }
}

function generateUuid() {
  asset.value.uuid = uuidv4()
}
</script>
