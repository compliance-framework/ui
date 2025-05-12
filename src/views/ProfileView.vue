<script setup lang="ts">
import {ref, onMounted} from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import { type Profile, useProfileStore} from "@/stores/profiles.ts";
import PageSubHeader from "@/components/PageSubHeader.vue";
import { useRoute } from 'vue-router'

const profileStore = useProfileStore()
const profile = ref<Profile>({} as Profile)

const route = useRoute();
const id = route.params.id as string;

onMounted(() => {
  profileStore.get(id).then((data) => {
    profile.value = data.data
  })
})

</script>

<template>
  <PageHeader>Profile</PageHeader>
  <PageSubHeader>{{ profile.metadata?.title }}</PageSubHeader>
</template>

<style scoped>

</style>
