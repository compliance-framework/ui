<template>
  <PageHeader>Roles</PageHeader>
  <PageSubHeader>Administer roles</PageSubHeader>

  <div
    class="mt-4 rounded-md bg-white dark:bg-slate-900 border-collapse border dark:border-slate-700"
  >
    <CollapsableGroup v-for="role in roles" :key="role.id">
      <template #header>
        <div class="py-2 px-4 flex items-center gap-4">
          <h3>
            {{ role.title }}<span v-if="role.shortName"> - {{ role.shortName }}</span>
          </h3>
        </div>
      </template>
      <div class="px-4 py-4 dark:bg-slate-950 border-b dark:border-slate-700">
        <p>{{ role.description}}</p>
      </div>
    </CollapsableGroup>
  </div>
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import PageSubHeader from '@/components/PageSubHeader.vue'
import CollapsableGroup from '@/components/CollapsableGroup.vue'
import { type Role, useRoleStore } from '@/stores/roles.ts'

const roleStore = useRoleStore()
const roles = ref<Role[]>([] as Role[]);

onMounted(() => {
  roleStore.list().then((data) => {
    roles.value = data.data
  })
})
</script>
