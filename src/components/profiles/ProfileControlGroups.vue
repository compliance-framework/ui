<template>
  <div>
    <CollapsableGroup v-for="(controlGroup, idx) in groups" :key="idx">
      <template #header>
        <div
          class="py-4 px-4 bg-white dark:bg-slate-900 border-b border-ccf-300 dark:border-slate-700 flex flex-inline"
        >
          <p class="grow whitespace-nowrap">Group {{ idx + 1 }}</p>
          <PrimaryButton class="flex gap-2" @click="removeGroup(groups, idx)"
            >Remove</PrimaryButton
          >
        </div>
      </template>
      <div
        class="px-4 py-4 bg-ccf-100 dark:bg-slate-950 border border-ccf-300 dark:border-slate-700"
      >
        <ProfileControlEditor
          v-model="controlGroup.withIds as string[]"
          :controlList="controls"
        />
      </div>
    </CollapsableGroup>
    <PrimaryButton @click="createGroup(groups)" class="mt-4"
      >Create Group</PrimaryButton
    >
  </div>
</template>

<script setup lang="ts">
import CollapsableGroup from '@/components/CollapsableGroup.vue';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import ProfileControlEditor from '@/components/profiles/ProfileControlEditor.vue';
import { useProfileControlGroups } from './useProfileControlGroups';
import type { ProfileSelectControlByID } from '@/oscal';
import { createControlList } from '@/composables/useControlList';
import { ref } from 'vue';

const props = defineProps<{
  groups: (ProfileSelectControlByID & { _newId?: string })[];
  catalog: string;
}>();
const catalogUUID = ref<string[]>([props.catalog]);
const { createGroup, removeGroup } = useProfileControlGroups();
const { controls } = createControlList(catalogUUID);
</script>
