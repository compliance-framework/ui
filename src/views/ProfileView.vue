<script setup lang="ts">
import {ref, onMounted} from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import { type Profile, type Import, useProfileStore, type Merge} from "@/stores/profiles.ts";
import PageSubHeader from "@/components/PageSubHeader.vue";
import { useRouter, useRoute } from 'vue-router'
import CollapsableGroup from "@/components/CollapsableGroup.vue";
import PageCard from '@/components/PageCard.vue';
import TertiaryButton from '@/components/TertiaryButton.vue';

const profileStore = useProfileStore()
const profile = ref<Profile>({} as Profile)
const imports = ref<Import[]>([])
const merge = ref<Merge>({} as Merge)
const buttonText = ref('Resolve Profile')

const route = useRoute();
const router = useRouter()
const id = route.params.id as string;

onMounted(() => {
  Promise.all([
    profileStore.get(id),
    profileStore.listImports(id),
    profileStore.getMerge(id)
  ]).then(([profileData, importsData, mergeData]) => {
    profile.value = profileData.data
    imports.value = importsData.data
    merge.value = mergeData.data
  }).catch((error) => {
    console.error('Error fetching data:', error)
  })
})

function resolveProfile() {
  buttonText.value = 'Resolving...'
  profileStore.resolve(id).then((data) => {
    router.push({ name: 'catalog-view', params: { id: data.data.id } })
  })
}

function stringifyMerge(merge: Merge) {
  console.log(merge)
  if (merge.asIs) {
    return 'As Is'
  } else if (merge.combine != undefined) {
    return 'Combine'
  } else if (merge.flat != undefined) {
     return 'Flat'
  }
  return 'Unknown'
}

</script>

<template>
  <PageHeader>Profile</PageHeader>
  <PageSubHeader>{{ profile.metadata?.title }}</PageSubHeader>

  <h3>Imports</h3>
  <div class="mt-4 rounded-md bg-white border-collapse border">
    <template v-for="(imp, impIdx) in imports" :key="imp.href">
      <CollapsableGroup>
        <template #header>
          <div class="py-4 p-4">
            Catalog {{imp.href}}
          </div>
        </template>
        <div class="px-4 py-4 border-b">
          <strong>Included Controls by ID</strong>
          <ul class="list-disc pl-6 columns-4">
            <li v-for="controlId in imp.includeControls[impIdx].withIds" :key="controlId">{{controlId}}</li>
          </ul>

          <strong>Excluded Controls by ID</strong>
          <template v-if="imp.excludeControls.length > 0">
            <ul class="list-disc pl-6 columns-4">
              <li v-for="controlId in imp.excludeControls[impIdx].withIds" :key="controlId">{{ controlId }}</li>
            </ul>
          </template>
          <span class="px-4" v-else>No Excluded controls found</span>
        </div>
      </CollapsableGroup>
    </template>
  </div>

  <h3>Merge</h3>
  <PageCard>
    <strong>Merge method:</strong> {{  stringifyMerge(merge) }}
  </PageCard>

  <h3>Modify</h3>
  <PageCard>
    <h3 class="font-bold"> Set Parameters </h3>
    <p>Work in Progress</p>

    <h3 class="font-bold"> Alterations </h3>
    <p>Work in Progress</p>

  </PageCard>
  <TertiaryButton @click="resolveProfile()" class="mt-3">{{ buttonText }}</TertiaryButton>
</template>

<style scoped>

</style>
