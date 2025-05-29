<script setup lang="ts">
import {ref, onMounted} from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import { type Profile, useProfileStore} from "@/stores/profiles.ts";

const profileStore = useProfileStore()
const profiles = ref<Profile[]>([])


onMounted(() => {
  profileStore.list().then((data) => {
    profiles.value = data.data
  })
})

</script>

<template>
  <PageHeader>Profiles</PageHeader>

  <div
    class="mt-4 rounded-md bg-white dark:bg-slate-900 border-collapse border dark:border-slate-700"
  >
    <table class="table-auto w-full rounded-full dark:text-slate-300">
      <tbody class="table-auto w-full rounded-full dark:text-slate-300">
      <tr
        class="hover:bg-zinc-50 bg-white dark:bg-slate-800 border-b dark:border-slate-800"
      v-for="profile in profiles"
      :key="profile.uuid">
        <td class="py-3 px-4 whitespace-nowrap grow">{{profile.metadata.title}}</td>
        <td class="py-2 px-2 text-right whitespace-nowrap">
          <RouterLink
            class="bg-white hover:bg-zinc-100 border px-4 py-1 rounded-md dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700"
            :to="{ name: 'profile-view', params: { id: profile.uuid } }"
          >
            View
          </RouterLink>
        </td>
      </tr>
      </tbody>
    </table>

  </div>
</template>

