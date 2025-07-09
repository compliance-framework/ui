<template>
  <div class="mb-6">
    <label class="inline-block pb-2 dark:text-slate-300">Links</label>
    <div class="space-y-3">
      <div
        v-for="(link, index) in links"
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
</template>

<script setup lang="ts">
import { computed } from 'vue'
import FormInput from '@/components/forms/FormInput.vue'
import type { Link } from '@/stores/types.ts'

const props = defineProps<{
  modelValue: Link[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: Link[]]
}>()

const links = computed({
  get: () => props.modelValue || [],
  set: (value: Link[]) => emit('update:modelValue', value)
})

const addLink = () => {
  const newLinks = [...links.value]
  newLinks.push({
    href: '',
    rel: '',
    text: ''
  })
  links.value = newLinks
}

const removeLink = (index: number) => {
  const newLinks = [...links.value]
  newLinks.splice(index, 1)
  links.value = newLinks
}
</script>
