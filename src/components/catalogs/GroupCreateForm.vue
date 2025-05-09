<script setup lang="ts">
import { type Catalog, type Group, useCatalogStore } from '@/stores/catalogs.ts'
import FormInput from '@/components/forms/FormInput.vue'
import { ref } from 'vue'
import PrimaryButton from '@/components/PrimaryButton.vue'

const catalogStore = useCatalogStore();

const props = defineProps<{
  catalog: Catalog,
  parent?: Group,
}>()

const emit = defineEmits({
  created(group: Group) {
    return !!group.id;
  }
})

const group = ref({} as Group)

async function createGroup(): Promise<void> {
  let response;
  if (props.parent) {
    response = await catalogStore.createGroupGroup(props.catalog, props.parent, group.value)
  } else {
    response = await catalogStore.createGroup(props.catalog, group.value)
  }
  emit('created', response.data)
}
</script>

<template>
  <form @submit.prevent="createGroup()">
    <h1>Create a new group</h1>

    <div class="mb-4">
      <label class="inline-block pb-2">ID</label>
      <FormInput v-model="group.id" />
    </div>

    <div class="mb-4">
      <label class="inline-block pb-2">Class</label>
      <FormInput v-model="group.class" />
    </div>

    <div class="mb-4">
      <label class="inline-block pb-2">Title</label>
      <FormInput v-model="group.title" />
    </div>

    <PrimaryButton type="submit">Submit</PrimaryButton>
  </form>
</template>

