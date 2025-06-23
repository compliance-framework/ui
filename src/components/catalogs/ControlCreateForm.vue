<script setup lang="ts">
import {
  type Catalog,
  type Control,
  type Group,
  useCatalogStore,
} from '@/stores/catalogs.ts';
import FormInput from '@/components/forms/FormInput.vue';
import { ref } from 'vue';
import PrimaryButton from '@/components/PrimaryButton.vue';

const catalogStore = useCatalogStore();

const props = defineProps<{
  catalog: Catalog;
  parentGroup?: Group;
  parentControl?: Control;
}>();

const emit = defineEmits({
  created(control: Control) {
    return !!control.id;
  },
});

const control = ref({} as Control);

async function createControl(): Promise<void> {
  let response;
  if (props.parentControl) {
    response = await catalogStore.createControlControl(
      props.catalog,
      props.parentControl,
      control.value,
    );
  } else if (props.parentGroup) {
    response = await catalogStore.createGroupControl(
      props.catalog,
      props.parentGroup,
      control.value,
    );
  } else {
    response = await catalogStore.createControl(
      props.catalog,
      control.value,
    );
  }
  emit('created', response.data);
}
</script>

<template>
  <form @submit.prevent="createControl()">
    <div class="mb-4">
      <label class="inline-block pb-2">ID</label>
      <FormInput v-model="control.id" />
    </div>

    <div class="mb-4">
      <label class="inline-block pb-2">Class</label>
      <FormInput v-model="control.class" />
    </div>

    <div class="mb-4">
      <label class="inline-block pb-2">Title</label>
      <FormInput v-model="control.title" />
    </div>

    <PrimaryButton type="submit">Submit</PrimaryButton>
  </form>
</template>
