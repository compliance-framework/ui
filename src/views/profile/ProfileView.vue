<template>
  <PageHeader>{{ profile?.metadata.title }}</PageHeader>
  <PageSubHeader>{{ profile?.uuid }}</PageSubHeader>


  <Tabs value="main">
    <TabList>
      <Tab v-for="route in routes" :key="route.name" :value="route.name" as="div">
        <RouterLink :to="{ name: route.name, params: { id: profile?.uuid } }">
          {{ route.label }}
        </RouterLink>
      </Tab>
    </TabList>
  </Tabs>

  <RouterView v-slot="{ Component }">
    <KeepAlive>
      <component :is="Component" />
    </KeepAlive>
  </RouterView>
</template>

<script setup lang="ts">
import PageHeader from '@/components/PageHeader.vue';
import PageSubHeader from '@/components/PageSubHeader.vue';

import Tabs from '@/volt/Tabs.vue';
import TabList from '@/volt/TabList.vue';
import Tab from '@/volt/Tab.vue';

import { useProfileStore, type Profile } from '@/stores/profiles';
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useToast } from 'primevue/usetoast';


const profileStore = useProfileStore();
const profile = ref<Profile>();
const route = useRoute();
const toast = useToast();

const routes = ref([
  { name: 'profile-view-controls', label: "Controls" },
  { name: 'profile-view-merge', label: "Merge" }
]);

onMounted(() => {
  const id = route.params.id as string;
  if (id) {
    profileStore.get(id).then(resp => {
      profile.value = resp.data;
    }).catch(async (response) => {
      const error = await response.json();
      toast.add({
        severity: 'error',
        summary: `Error loading profile - ${response.statusText}`,
        detail: error.errors.body,
        life: 3000,
      });
    });
  }
});

</script>

<style scoped>

@reference "@/assets/main.css";

.router-link-exact-active {
  @apply bg-none;
}

</style>
