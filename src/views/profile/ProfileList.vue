<template>
  <PageHeader>Profiles</PageHeader>
    <div
    class="mt-4 rounded-md bg-white dark:bg-slate-900 border border-ccf-300 dark:border-slate-700"
  >
    <table class="table-auto w-full rounded-full dark:text-slate-300 border-collapse">
      <tbody>
      <tr
        class="hover:bg-zinc-50 dark:hover:bg-slate-800 border-b border-ccf-300 dark:border-slate-800"
        v-for="profile in profiles"
        :key="profile.uuid"
      >
        <td class="py-3 px-4 whitespace-nowrap grow">{{ profile.metadata.title }}</td>
        <td class="py-3 px-4 text-right">
            <RouterLink
              class="bg-white hover:bg-zinc-100 border border-ccf-300 px-4 py-1 rounded-md dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700"
              :to="{ name: 'profile-view-controls', params: { id: profile.uuid } }"
            >View
            </RouterLink>
        </td>
      </tr>
      </tbody>
    </table>
  </div>
</template>

<script lang="ts" setup>
import PageHeader from '@/components/PageHeader.vue';
import { useProfileStore, type Profile } from '@/stores/profiles';
import { onMounted, ref } from 'vue';

const profileStore = useProfileStore();
const profiles = ref<Profile[]>([]);

onMounted(() => {
  profileStore.list().then(resp => {
    profiles.value = resp.data;
  }).catch(async (response) => {
    const error = await response.json();
    console.error('Error fetching profiles:', error);
  });
});

  </script>
