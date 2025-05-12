<script setup lang="ts">
import {ref, onMounted} from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import { type Profile, useProfileStore} from "@/stores/profiles.ts";
import PageSubHeader from "@/components/PageSubHeader.vue";
import { useRoute } from 'vue-router'
import CollapsableGroup from "@/components/CollapsableGroup.vue";

const profileStore = useProfileStore()
const profile = ref<Profile>({} as Profile)
const imports = ref<Import[]>([])

const route = useRoute();
const id = route.params.id as string;

onMounted(() => {
  profileStore.get(id).then((data) => {
    profile.value = data.data
    profileStore.listImports(id).then((data) => {
      imports.value = data.data
      console.log(imports.value)
    })
  })
})

</script>

<template>
  <PageHeader>Profile</PageHeader>
  <PageSubHeader>{{ profile.metadata?.title }}</PageSubHeader>

  <h3>Imports</h3>
  <div class="mt-4 rounded-md bg-white border-collapse border">
    <template v-for="imp in imports" :key="imp.href">
      <CollapsableGroup>
        <template #header>
          <div class="py-4 p-4">
            Catalog {{imp.href}}
          </div>
        </template>
        <div class="px-4 py-4 border-b">
          <strong>Included Controls by ID</strong>
          <ul class="list-disc pl-6 columns-4">
            <li v-for="controlId in imp['include-controls'][0]['with-ids']">{{controlId}}</li>
          </ul>

          <strong>Excluded Controls by ID</strong>
          <template v-if="imp['exclude-controls'].length > 0">
            <ul class="list-disc pl-6 columns-4">
              <li v-for="controlId in imp['exclude-controls'][0]['with-ids']">{{ controlId }}</li>
            </ul>
          </template>
          <span class="px-4" v-else>No Excluded controls found</span>
        </div>
      </CollapsableGroup>
    </template>
  </div>
</template>

<style scoped>

</style>
