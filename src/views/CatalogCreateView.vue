<template>
  <PageHeader>New Catalog</PageHeader>
  <PageSubHeader>Create a new Catalog</PageSubHeader>

  <PageCard class="mt-8 w-1/2">
    <form @submit.prevent="submit">
      <div class="mb-4">
        <label class="inline-block pb-2">ID</label>
        <div class="flex items-center place-items-stretch">
          <FormInput v-model="catalog.uuid" class="rounded-r-none border-r-0" />
          <TertiaryButton type="button" @click="generateUuid" class="py-3 rounded-l-none"><BIconArrowRepeat /></TertiaryButton>
        </div>
      </div>
      <div class="mb-4">
        <label class="inline-block pb-2">Name</label>
        <FormInput v-model="catalog.metadata.title" />
      </div>
      <div class="text-right">
        <PrimaryButton
          type="submit"
        >
          Submit
        </PrimaryButton>
      </div>
    </form>
  </PageCard>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import { type Catalog, useCatalogStore } from '@/stores/catalogs.ts'
import { useRouter } from 'vue-router'
import PageSubHeader from '@/components/PageSubHeader.vue'
import TertiaryButton from '@/components/TertiaryButton.vue'
import PageCard from '@/components/PageCard.vue'
import FormInput from '@/components/forms/FormInput.vue'
import PrimaryButton from '@/components/PrimaryButton.vue'
import { BIconArrowRepeat } from 'bootstrap-icons-vue'
import { v4 as uuidv4 } from 'uuid';

const catalogStore = useCatalogStore()
const catalog = ref<Catalog>({
  metadata: {}
} as Catalog);

const router = useRouter();

async function submit() {
  catalogStore.create(catalog.value).then((response) => {
    return router.push({
      name: 'catalog-view',
      params: { id: response.data.uuid },
    });
  })
}

function generateUuid() {
  catalog.value.uuid = uuidv4();
}
</script>
